import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { saveResultsAction } from "@/actions/exams"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { SubmitButton } from "@/components/ui/submit-button"
import { PageHeader } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

export const metadata = { title: "Enter grades" }

export default function ExamDetailPage(
  props: PageProps<"/dashboard/exams/[id]">,
) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <GradeGrid params={props.params} />
    </Suspense>
  )
}

async function GradeGrid({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = await params
  const actor = await requireRole("ADMIN", "TEACHER")

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      class: true,
      results: true,
    },
  })
  if (!exam) notFound()

  const assignments = await db.teacherSubject.findMany({
    where: { classId: exam.classId },
    include: { subject: true, teacher: { include: { user: true } } },
    orderBy: { subject: { name: "asc" } },
  })

  // teachers may only grade subjects assigned to them; admins can grade all
  const editableSubjectIds = new Set(
    (actor.role === "TEACHER"
      ? assignments.filter((a) => a.teacher?.userId === actor.id)
      : assignments
    ).map((a) => a.subjectId),
  )
  const [students, existingResults] = await Promise.all([
    db.student.findMany({
      where: { classId: exam.classId },
      include: { user: true },
      orderBy: { rollNo: "asc" },
    }),
    db.result.findMany({ where: { examId } }),
  ])
  const existing = new Map(
    existingResults.map((r) => [`${r.studentId}_${r.subjectId}`, r.score]),
  )

  return (
    <div>
      <PageHeader
        title={`${exam.name} — ${exam.class.name} ${exam.class.section}`}
        description={`${formatDate(exam.date)} · max score ${exam.maxScore}`}
      >
        <Link href="/dashboard/exams" className="text-sm text-muted-foreground hover:underline">
          ← Back to exams
        </Link>
      </PageHeader>

      {assignments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You have no subject assignments in this class, so there is nothing to grade.
        </p>
      ) : students.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No students enrolled in this class.
        </p>
      ) : (
        <form action={saveResultsAction}>
          <input type="hidden" name="examId" value={exam.id} />
          <div className="w-full overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">
                    Student
                  </th>
                  {assignments.map((a) => (
                    <th
                      key={a.id}
                      className="px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground"
                    >
                      {a.subject.name}
                      {a.teacher?.user.name && (
                        <span className="block normal-case font-normal">{a.teacher.user.name}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        #{s.rollNo}
                      </span>{" "}
                      <Link
                        href={`/dashboard/students/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.user.name}
                      </Link>
                    </td>
                    {assignments.map((a) => {
                      const key = `${s.id}_${a.subjectId}`
                      return (
                        <td key={a.id} className="px-3 py-2">
                          {actor.role === "ADMIN" || editableSubjectIds.has(a.subjectId) ? (
                            <input
                              name={`score_${key}`}
                              type="number"
                              min={0}
                              max={exam.maxScore}
                              step="0.5"
                              defaultValue={existing.get(key) ?? ""}
                              className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            />
                          ) : (
                            <span className="text-muted-foreground">
                              {existing.get(key) !== undefined ? (
                                <Badge>{existing.get(key)}</Badge>
                              ) : (
                                "—"
                              )}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <SubmitButton pendingLabel="Saving…">Save grades</SubmitButton>
            <p className="text-xs text-muted-foreground">
              Leave a field blank to keep it unrecorded. Saving is per-subject, upsert style.
            </p>
          </div>
        </form>
      )}
    </div>
  )
}
