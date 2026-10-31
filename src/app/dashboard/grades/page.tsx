import { Suspense } from "react"
import Link from "next/link"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { StatCard } from "@/components/ui/stat-card"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { GroupedResults } from "@/components/ui/timetable-grid"
import { EmptyState, PageHeader } from "@/components/ui/table"

export const metadata = { title: "My Grades" }

export default function GradesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <Grades />
    </Suspense>
  )
}

async function Grades() {
  const user = await requireRole("STUDENT", "PARENT")

  // STUDENT → their own profile; PARENT → all linked children
  const profiles =
    user.role === "STUDENT"
      ? [await db.student.findUnique({ where: { userId: user.id } })]
      : (await db.parent.findUnique({
          where: { userId: user.id },
          include: { children: true },
        }))?.children ?? []
  const links = profiles.filter(Boolean) as { id: string }[]

  if (links.length === 0) {
    return (
      <div>
        <PageHeader title="My Grades" />
        <EmptyState
          title="No student profile found"
          description="Contact the school office if you think this is a mistake."
        />
      </div>
    )
  }

  const reports = await Promise.all(
    links.map(async (profile) =>
      db.student.findUnique({
        where: { id: profile.id },
        include: {
          user: true,
          class: true,
          results: { include: { subject: true, exam: true }, orderBy: { exam: { date: "desc" } } },
          attendance: { orderBy: { date: "desc" }, take: 30 },
          fees: true,
        },
      }),
    ),
  )
  const valid = reports.filter(
    (s): s is NonNullable<typeof s> => s !== null,
  )

  return (
    <div>
      <PageHeader
        title="My Grades"
        description="Exam results and attendance records."
      />
      <div className="space-y-6">
        {valid.map((student) => {
          const presentDays = student.attendance.filter((a) => a.status === "PRESENT").length
          const rate = student.attendance.length
            ? Math.round((presentDays / student.attendance.length) * 100)
            : null
          const unpaid = student.fees.filter((f) => f.status !== "PAID")

          return (
            <Card key={student.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{student.user.name}</CardTitle>
                  <Badge>{student.class ? `${student.class.name} ${student.class.section}` : "No class"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    label="Attendance rate"
                    value={rate === null ? "—" : `${rate}%`}
                    hint="Last 30 records"
                  />
                  <StatCard
                    label="Latest exam average"
                    value={
                      student.results.length
                        ? (
                            student.results.reduce((s, r) => s + r.score, 0) /
                            student.results.length
                          ).toFixed(1)
                        : "—"
                    }
                  />
                  <StatCard
                    label="Fees due"
                    value={unpaid.length}
                    tone={unpaid.length ? "warning" : "success"}
                  />
                </div>

                {student.results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No grades recorded yet.</p>
                ) : (
                  <GroupedResults results={student.results} />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
