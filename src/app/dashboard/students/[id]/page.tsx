import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { updateStudentAction } from "@/actions/students"
import { payFeeAction, deleteFeeAction } from "@/actions/fees"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { Input, Label, Select } from "@/components/ui/basics"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import {
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatCard } from "@/components/ui/stat-card"
import { GroupedResults } from "@/components/ui/timetable-grid"
import { formatDate, formatCurrency } from "@/lib/utils"

export const metadata = { title: "Student profile" }

export default function StudentPage(props: PageProps<"/dashboard/students/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <StudentDetail params={props.params} />
    </Suspense>
  )
}

async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireRole("ADMIN")

  const [student, classes, parents] = await Promise.all([
    db.student.findUnique({
      where: { id },
      include: {
        user: true,
        class: true,
        parent: { include: { user: true } },
        attendance: { orderBy: { date: "desc" }, take: 30 },
        results: { include: { subject: true, exam: true }, orderBy: { exam: { date: "desc" } } },
        fees: { orderBy: { dueDate: "desc" } },
      },
    }),
    db.class.findMany({ orderBy: [{ name: "asc" }, { section: "asc" }] }),
    db.parent.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ])

  if (!student) notFound()

  const presentDays = student.attendance.filter((a) => a.status === "PRESENT").length
  const attendanceRate = student.attendance.length
    ? Math.round((presentDays / student.attendance.length) * 100)
    : null
  const unpaid = student.fees.filter((f) => f.status !== "PAID")
  const paidTotal = student.fees.filter((f) => f.status === "PAID").reduce((s, f) => s + f.amount, 0)

  return (
    <div>
      <PageHeader
        title={student.user.name}
        description={`${student.user.email} · ${student.admissionNo}`}
      >
        <Link href="/dashboard/students" className="text-sm text-muted-foreground hover:underline">
          ← Back to students
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Attendance rate" value={attendanceRate === null ? "—" : `${attendanceRate}%`} hint="Last 30 records" />
        <StatCard label="Fees due" value={unpaid.length} tone={unpaid.length ? "warning" : "success"} />
        <StatCard label="Fees paid (total)" value={formatCurrency(paidTotal)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="space-y-1.5">
                <Row label="Class">
                  {student.class ? (
                    <Badge>
                      {student.class.name} {student.class.section}
                    </Badge>
                  ) : (
                    "Not enrolled"
                  )}
                </Row>
                <Row label="Roll no.">{student.rollNo || "—"}</Row>
                <Row label="Guardian">{student.parent?.user.name ?? "—"}</Row>
                <Row label="Date of birth">{formatDate(student.dateOfBirth)}</Row>
                <Row label="Gender">{student.gender ?? "—"}</Row>
                <Row label="Phone">{student.phone ?? "—"}</Row>
                <Row label="Blood group">{student.bloodGroup ?? "—"}</Row>
                <Row label="Address">{student.address ?? "—"}</Row>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment & guardian</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateStudentAction} className="space-y-3">
                <input type="hidden" name="id" value={student.id} />
                <div className="space-y-1.5">
                  <Label htmlFor="classId">Class</Label>
                  <Select id="classId" name="classId" defaultValue={student.classId ?? ""}>
                    <option value="">— Not enrolled —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rollNo">Roll number</Label>
                  <Input id="rollNo" name="rollNo" type="number" min={0} defaultValue={student.rollNo || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentId">Guardian</Label>
                  <Select id="parentId" name="parentId" defaultValue={student.parentId ?? ""}>
                    <option value="">— None —</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.user.name} {p.relation ? `(${p.relation})` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dateOfBirth">Date of birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      defaultValue={student.dateOfBirth?.toISOString().slice(0, 10) ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <Select id="gender" name="gender" defaultValue={student.gender ?? ""}>
                      <option value="">—</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={student.phone ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bloodGroup">Blood group</Label>
                    <Input id="bloodGroup" name="bloodGroup" defaultValue={student.bloodGroup ?? ""} />
                  </div>
                </div>
                <SubmitButton className="w-full" size="sm">
                  Save changes
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Recent attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {student.attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {student.attendance.map((a) => (
                    <li key={a.id} className="text-center">
                      <span className="block text-xs text-muted-foreground">
                        {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <Badge
                        tone={
                          a.status === "PRESENT"
                            ? "success"
                            : a.status === "ABSENT"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {a.status[0]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Grades */}
          <Card>
            <CardHeader>
              <CardTitle>Grades</CardTitle>
            </CardHeader>
            <CardContent>
              {student.results.length === 0 ? (
                <p className="text-sm text-muted-foreground">No grades recorded yet.</p>
              ) : (
                <GroupedResults results={student.results} />
              )}
            </CardContent>
          </Card>

          {/* Fees */}
          <Card>
            <CardHeader>
              <CardTitle>Fees</CardTitle>
            </CardHeader>
            <CardContent>
              {student.fees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No fees assigned.{" "}
                  <Link href="/dashboard/fees" className="text-primary hover:underline">
                    Assign a fee →
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {student.fees.map((fee) => (
                    <li key={fee.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="font-medium">{fee.title}</p>
                        <p className="text-xs text-muted-foreground">due {formatDate(fee.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">{formatCurrency(fee.amount)}</span>
                        {fee.status === "PAID" ? (
                          <Badge tone="success">Paid</Badge>
                        ) : (
                          <>
                            <Badge tone="warning">Unpaid</Badge>
                            <form action={payFeeAction}>
                              <input type="hidden" name="id" value={fee.id} />
                              <SubmitButton size="sm" variant="outline" pendingLabel="…">
                                Mark paid
                              </SubmitButton>
                            </form>
                            <form action={deleteFeeAction}>
                              <input type="hidden" name="id" value={fee.id} />
                              <Button size="sm" variant="ghost" className="text-destructive">
                                ×
                              </Button>
                            </form>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}
