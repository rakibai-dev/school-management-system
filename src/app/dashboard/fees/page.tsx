import { Suspense } from "react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createFeeAction, payFeeAction, deleteFeeAction } from "@/actions/fees"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { Input, Label, Select } from "@/components/ui/basics"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import { EmptyState, PageHeader } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"

export const metadata = { title: "Fees" }

export default function FeesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <Fees />
    </Suspense>
  )
}

async function FeeRow({
  fee,
  showStudent,
  isAdmin,
}: {
  fee: {
    id: string
    title: string
    amount: number
    status: string
    dueDate: Date
    paidAt: Date | null
    student: { user: { name: string }; class: { name: string; section: string } | null }
  }
  showStudent: boolean
  isAdmin: boolean
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-sm font-medium">
          {showStudent && fee.student ? `${fee.student.user.name} · ` : ""}
          {fee.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {showStudent && fee.student?.class
            ? `${fee.student.class.name} ${fee.student.class.section} · `
            : ""}
          due {formatDate(fee.dueDate)}
          {fee.paidAt ? ` · paid ${formatDate(fee.paidAt)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm tabular-nums">{formatCurrency(fee.amount)}</span>
        {fee.status === "PAID" ? (
          <Badge tone="success">Paid</Badge>
        ) : (
          <>
            <Badge tone="warning">Unpaid</Badge>
            {isAdmin && (
              <form action={payFeeAction}>
                <input type="hidden" name="id" value={fee.id} />
                <SubmitButton size="sm" variant="outline" pendingLabel="…">
                  Mark paid
                </SubmitButton>
              </form>
            )}
          </>
        )}
        {isAdmin && (
          <form action={deleteFeeAction}>
            <input type="hidden" name="id" value={fee.id} />
            <Button variant="ghost" size="sm" className="text-destructive">
              ×
            </Button>
          </form>
        )}
      </div>
    </li>
  )
}

async function Fees() {
  const user = await requireRole("ADMIN", "STUDENT", "PARENT")

  if (user.role === "ADMIN") return <AdminFees />
  return <OwnFees userId={user.id} role={user.role as "STUDENT" | "PARENT"} />
}

// ---------- Admin ----------
async function AdminFees() {
  const [fees, students] = await Promise.all([
    db.fee.findMany({
      include: { student: { include: { user: true, class: true } } },
      orderBy: { dueDate: "desc" },
    }),
    db.student.findMany({
      include: { user: true, class: true },
      orderBy: [{ classId: "asc" }, { rollNo: "asc" }],
    }),
  ])

  const outstanding = fees.filter((f) => f.status !== "PAID")
  const paid = fees.filter((f) => f.status === "PAID")

  return (
    <div>
      <PageHeader title="Fees" description="Assign fees per student and track payments." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding ({outstanding.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {outstanding.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everything is settled 🎉</p>
              ) : (
                <ul className="divide-y divide-border">
                  {outstanding.map((fee) => (
                    <FeeRow
                      key={fee.id}
                      fee={fee as never}
                      showStudent
                      isAdmin
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paid ({paid.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {paid.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {paid.slice(0, 20).map((fee) => (
                    <FeeRow key={fee.id} fee={fee as never} showStudent isAdmin />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Assign fee</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFeeAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="studentId">Student</Label>
                <Select id="studentId" name="studentId" required>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user.name}
                      {s.class ? ` — ${s.class.name} ${s.class.section}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="Tuition — January" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input id="amount" name="amount" type="number" min={0.5} step="0.5" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Due date</Label>
                  <Input id="dueDate" name="dueDate" type="date" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Note (optional)</Label>
                <Input id="note" name="note" placeholder="Installment plan" />
              </div>
              <SubmitButton className="w-full">Assign fee</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------- Student / Parent ----------
async function OwnFees({ userId, role }: { userId: string; role: "STUDENT" | "PARENT" }) {
  let fees
  if (role === "STUDENT") {
    const profile = await db.student.findUnique({ where: { userId } })
    fees = profile
      ? await db.fee.findMany({
          where: { studentId: profile.id },
          include: { student: { include: { user: true, class: true } } },
          orderBy: { dueDate: "desc" },
        })
      : []
  } else {
    const parent = await db.parent.findUnique({
      where: { userId },
      include: { children: true },
    })
    fees = parent
      ? await db.fee.findMany({
          where: { studentId: { in: parent.children.map((c) => c.id) } },
          include: { student: { include: { user: true, class: true } } },
          orderBy: { dueDate: "desc" },
        })
      : []
  }

  const unpaid = fees.filter((f) => f.status !== "PAID")
  const totalDue = unpaid.reduce((s, f) => s + f.amount, 0)

  return (
    <div>
      <PageHeader title="Fees" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-warning/10 p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Outstanding
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatCurrency(totalDue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {unpaid.length} unpaid item(s)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Paid</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatCurrency(fees.filter((f) => f.status === "PAID").reduce((s, f) => s + f.amount, 0))}
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          {fees.length === 0 ? (
            <EmptyState title="No fees assigned" />
          ) : (
            <ul className="divide-y divide-border">
              {fees.map((fee) => (
                <FeeRow key={fee.id} fee={fee as never} showStudent={role === "PARENT"} isAdmin={false} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
