import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import {
  updateClassAction,
  assignSubjectAction,
  unassignSubjectAction,
} from "@/actions/classes"
import {
  createExamAction,
  deleteExamAction,
} from "@/actions/exams"
import { addSlotAction, deleteSlotAction } from "@/actions/timetable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label, Select } from "@/components/ui/basics"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import { EmptyState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/card"
import { TimetableGrid } from "@/components/ui/timetable-grid"
import { WEEK_DAYS, formatDate } from "@/lib/utils"

export const metadata = { title: "Class" }

export default function ClassPage(props: PageProps<"/dashboard/classes/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <ClassDetail params={props.params} />
    </Suspense>
  )
}

async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireRole("ADMIN", "TEACHER")

  const cls = await db.class.findUnique({
    where: { id },
    include: {
      classTeacher: { include: { user: true } },
      students: { include: { user: true }, orderBy: { rollNo: "asc" } },
      assignments: { include: { subject: true, teacher: { include: { user: true } } }, orderBy: { subject: { name: "asc" } } },
      exams: { orderBy: { date: "desc" } },
      timetable: {
        orderBy: [{ day: "asc" }, { start: "asc" }],
        include: { subject: true, teacher: { include: { user: true } } },
      },
    },
  })
  if (!cls) notFound()

  const [teachers, subjects] = await Promise.all([
    db.teacher.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
  ])

  const isAdmin = session.role === "ADMIN"

  return (
    <div>
      <PageHeader title={`${cls.name} ${cls.section}`} description={`Room ${cls.room ?? "—"}`}>
        <Link href="/dashboard/classes" className="text-sm text-muted-foreground hover:underline">
          ← Back to classes
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subjects & teachers */}
        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cls.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {cls.assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <span className="font-medium">{a.subject.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {a.teacher ? a.teacher.user.name : "No teacher assigned"}
                      </span>
                    </div>
                    {isAdmin && (
                      <form action={unassignSubjectAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button size="sm" variant="ghost" className="text-destructive">
                          Remove
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {isAdmin && (
              <form action={assignSubjectAction} className="mt-4 flex gap-2 border-t border-border pt-4">
                <input type="hidden" name="classId" value={cls.id} />
                <Select name="subjectId" required className="flex-1">
                  {subjects
                    .filter((s) => !cls.assignments.some((a) => a.subjectId === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
                <Select name="teacherId" className="flex-1">
                  <option value="">No teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.name}
                    </option>
                  ))}
                </Select>
                <SubmitButton size="sm">Assign</SubmitButton>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Students */}
        <Card>
          <CardHeader>
            <CardTitle>Students ({cls.students.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {cls.students.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students. Enroll them from{" "}
                <Link href="/dashboard/students" className="text-primary hover:underline">
                  Students → profile → class
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {cls.students.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                    <Link href={`/dashboard/students/${s.id}`} className="font-medium hover:underline">
                      {s.user.name}
                    </Link>
                    <span className="text-muted-foreground">Roll {s.rollNo}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Timetable add/delete — admins only view-all else */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly timetable</CardTitle>
          </CardHeader>
          <CardContent>
            <TimetableGrid
              slots={cls.timetable.map((slot) => ({
                id: slot.id,
                day: slot.day,
                start: slot.start,
                end: slot.end,
                subject: slot.subject.name,
                teacher: slot.teacher?.user.name,
                room: slot.room,
              }))}
              actionsSlot={isAdmin}
              onDelete={isAdmin ? deleteSlotAction : undefined}
            />

            {isAdmin && (
              <form action={addSlotAction} className="mt-4 grid gap-2 border-t border-border pt-4 md:grid-cols-7">
                <input type="hidden" name="classId" value={cls.id} />
                <Select name="day" required defaultValue="1">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {WEEK_DAYS[d].slice(0, 3)}
                    </option>
                  ))}
                </Select>
                <Input name="start" required placeholder="Start 08:00" pattern="\d{2}:\d{2}" />
                <Input name="end" required placeholder="End 08:45" pattern="\d{2}:\d{2}" />
                <Select name="subjectId" required className="md:col-span-1">
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Select name="teacherId" defaultValue="">
                  <option value="">Teacher? opt.</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.name}
                    </option>
                  ))}
                </Select>
                <Input name="room" placeholder="Room" />
                <SubmitButton size="sm">Add slot</SubmitButton>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Exams */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Exams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cls.exams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exams scheduled.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Max score</TableHead>
                    <TableHead>{""}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls.exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <Link href={`/dashboard/exams/${exam.id}`} className="font-medium hover:underline">
                          {exam.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(exam.date)}</TableCell>
                      <TableCell>{exam.maxScore}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/dashboard/exams/${exam.id}`}>
                            <Button variant="outline" size="sm">
                              Enter grades
                            </Button>
                          </Link>
                          {isAdmin && (
                            <form action={deleteExamAction}>
                              <input type="hidden" name="id" value={exam.id} />
                              <Button variant="ghost" size="sm" className="text-destructive">
                                Delete
                              </Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <form action={createExamAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
              <input type="hidden" name="classId" value={cls.id} />
              <div className="space-y-1.5">
                <Label htmlFor="name">Exam name</Label>
                <Input name="name" id="name" required placeholder="Finals" className="w-40" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input name="date" id="date" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxScore">Max score</Label>
                <Input name="maxScore" id="maxScore" type="number" min={1} defaultValue={100} className="w-24" />
              </div>
              <SubmitButton size="sm">Schedule exam</SubmitButton>
            </form>
          </CardContent>
        </Card>

        {/* Admin: class settings */}
        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Class settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateClassAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={cls.id} />
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input name="name" id="name" required defaultValue={cls.name} className="w-36" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="section">Section</Label>
                  <Input name="section" id="section" required defaultValue={cls.section} className="w-20" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="room">Room</Label>
                  <Input name="room" id="room" defaultValue={cls.room ?? ""} className="w-28" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classTeacherId">Class teacher</Label>
                  <Select name="classTeacherId" id="classTeacherId" defaultValue={cls.classTeacherId ?? ""} className="w-48">
                    <option value="">— None —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.user.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <SubmitButton size="sm">Save</SubmitButton>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
