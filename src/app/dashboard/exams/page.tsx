import { Suspense } from "react"
import Link from "next/link"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createExamAction, deleteExamAction } from "@/actions/exams"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { formatDate } from "@/lib/utils"

export const metadata = { title: "Exams" }

export default function ExamsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <ExamsList />
    </Suspense>
  )
}

async function ExamsList() {
  const actor = await requireRole("ADMIN", "TEACHER")

  const classWhere =
    actor.role === "ADMIN"
      ? {}
      : {
          OR: [
            { assignments: { some: { teacher: { userId: actor.id } } } },
            { classTeacher: { userId: actor.id } },
          ],
        }

  const [exams, classes] = await Promise.all([
    db.exam.findMany({
      where: { class: classWhere },
      include: { class: true, _count: { select: { results: true } } },
      orderBy: { date: "desc" },
    }),
    db.class.findMany({
      where: classWhere,
      orderBy: [{ name: "asc" }, { section: "asc" }],
    }),
  ])

  return (
    <div>
      <PageHeader
        title="Exams"
        description="Schedule exams and record grades. Open an exam to enter results."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          {exams.length === 0 ? (
            <EmptyState title="No exams yet" description="Create one with the form on the right." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Grades recorded</TableHead>
                  <TableHead>{""}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <Link href={`/dashboard/exams/${exam.id}`} className="font-medium hover:underline">
                        {exam.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {exam.class.name} {exam.class.section}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(exam.date)}</TableCell>
                    <TableCell>{exam._count.results}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dashboard/exams/${exam.id}`}
                          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input px-3 text-xs font-medium transition-colors hover:bg-accent"
                        >
                          Open
                        </Link>
                        {actor.role === "ADMIN" && (
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
        </section>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Schedule exam</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes assigned to you.</p>
            ) : (
              <form action={createExamAction} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required placeholder="Finals" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classId">Class</Label>
                  <Select id="classId" name="classId" required>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" name="date" type="date" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxScore">Max score</Label>
                    <Input id="maxScore" name="maxScore" type="number" min={1} defaultValue={100} />
                  </div>
                </div>
                <SubmitButton className="w-full">Create exam</SubmitButton>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
