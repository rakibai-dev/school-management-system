import { Suspense } from "react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { markAttendanceAction } from "@/actions/attendance"
import { ATTENDANCE_STATUS } from "@/components/ui/timetable-grid"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { Input, Label, Select } from "@/components/ui/basics"
import { SubmitButton } from "@/components/ui/submit-button"
import { EmptyState, PageHeader } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export const metadata = { title: "Attendance" }

export default function AttendancePage(props: PageProps<"/dashboard/attendance">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <AttendanceSection searchParams={props.searchParams} />
    </Suspense>
  )
}

async function AttendanceSection({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string | string[]; date?: string | string[] }>
}) {
  const actor = await requireRole("ADMIN", "TEACHER")
  const params = await searchParams

  const today = new Date().toISOString().slice(0, 10)
  const classIdRaw = typeof params.classId === "string" ? params.classId : ""
  const dateRaw = typeof params.date === "string" ? params.date : today

  // Teachers can only work with their own classes
  const classes =
    actor.role === "ADMIN"
      ? await db.class.findMany({
          orderBy: [{ name: "asc" }, { section: "asc" }],
        })
      : await db.class.findMany({
          where: {
            OR: [
              { assignments: { some: { teacher: { userId: actor.id } } } },
              { classTeacher: { userId: actor.id } },
            ],
          },
          orderBy: [{ name: "asc" }, { section: "asc" }],
        })

  if (classes.length === 0) {
    return (
      <div>
        <PageHeader title="Attendance" description="No classes assigned to you yet." />
        <EmptyState title="No classes" description="Once you are assigned subjects in a class, you can mark attendance here." />
      </div>
    )
  }

  const selected = classes.find((c) => c.id === classIdRaw) ?? classes[0]

  const [students, existing] = await Promise.all([
    db.student.findMany({
      where: { classId: selected.id },
      include: { user: true },
      orderBy: { rollNo: "asc" },
    }),
    db.attendance.findMany({
      where: { classId: selected.id, date: new Date(dateRaw) },
    }),
  ])
  const existingByStudent = new Map(existing.map((a) => [a.studentId, a]))
  const dateLabel = new Date(dateRaw).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Choose a class and date, then mark each student and save."
      />

      {/* Class/date picker — plain GET form, works without JS */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 w-56">
              <Label htmlFor="classId">Class</Label>
              <Select id="classId" name="classId" defaultValue={selected.id}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={dateRaw} className="w-40" />
            </div>
            <SubmitButton size="sm" variant="outline" pendingLabel="Loading…">
              Load
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>
              {selected.name} {selected.section} · {dateLabel}
            </CardTitle>
            {existing.length > 0 && <Badge>Marked earlier — editing</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students enrolled in this class.</p>
          ) : (
            <form action={markAttendanceAction} className="space-y-2">
              <input type="hidden" name="classId" value={selected.id} />
              <input type="hidden" name="date" value={dateRaw} />

              <ul className="divide-y divide-border">
                {students.map((s) => {
                  const current = existingByStudent.get(s.id)?.status
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="flex items-baseline gap-2">
                        <span className="w-8 text-xs text-muted-foreground tabular-nums">
                          #{s.rollNo}
                        </span>
                        <span className="text-sm font-medium">{s.user.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {ATTENDANCE_STATUS.map((status) => {
                          const checked = current ? current === status : status === "PRESENT"
                          return (
                            <label
                              key={status}
                              className={cn(
                                "col cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                                "has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground",
                              )}
                            >
                              <input
                                type="radio"
                                name={`status_${s.id}`}
                                value={status}
                                defaultChecked={checked}
                                className="sr-only"
                              />
                              {status.toLowerCase()}
                            </label>
                          )
                        })}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="pt-2">
                <SubmitButton pendingLabel="Saving…">Save attendance</SubmitButton>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
