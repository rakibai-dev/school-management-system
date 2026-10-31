"use server"

import { db } from "@/lib/db"
import { requireUser, requireRole } from "@/lib/session"
import { createExamSchema, idSchema } from "@/lib/validations"

export async function createExamAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "TEACHER")

  const parsed = createExamSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const { name, classId, date, maxScore } = parsed.data

  if (actor.role === "TEACHER") {
    const assigned = await db.teacherSubject.count({
      where: { teacher: { userId: actor.id }, classId },
    })
    if (assigned === 0) throw new Error("You can only create exams for your classes")
  }

  await db.exam.create({ data: { name, classId, date, maxScore } })
}

/**
 * Save exam scores. Inputs are named `score_<studentId>_<subjectId>`;
 * blank inputs are skipped. Teachers may only grade subjects assigned to
 * them; admins may grade anything.
 */
export async function saveResultsAction(formData: FormData) {
  const actor = await requireUser()
  if (actor.role !== "ADMIN" && actor.role !== "TEACHER") {
    throw new Error("Forbidden")
  }

  const examId = String(formData.get("examId") ?? "")
  if (!examId) throw new Error("Invalid exam")

  const exam = await db.exam.findUniqueOrThrow({ where: { id: examId } })

  // collect scores
  const entries: { studentId: string; subjectId: string; score: number }[] = []
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score_")) continue
    const raw = String(value).trim()
    if (raw === "") continue
    const score = Number(raw)
    if (!Number.isFinite(score) || score < 0 || score > exam.maxScore) {
      throw new Error(`Score must be between 0 and ${exam.maxScore}`)
    }
    const [studentId, subjectId] = key.slice("score_".length).split("_")
    if (studentId && subjectId) entries.push({ studentId, subjectId, score })
  }

  // teachers: restrict to subjects they are assigned in this class
  let allowedSubjectIds: string[] | null = null
  if (actor.role === "TEACHER") {
    const assignments = await db.teacherSubject.findMany({
      where: { teacher: { userId: actor.id }, classId: exam.classId },
      select: { subjectId: true, id: true },
    })
    allowedSubjectIds = assignments.map((a) => a.subjectId)
  }

  await db.$transaction(
    entries
      .filter(
        (e) =>
          !allowedSubjectIds ||
          allowedSubjectIds.includes(e.subjectId),
      )
      .map((e) =>
        db.result.upsert({
          where: {
            examId_studentId_subjectId: {
              examId,
              studentId: e.studentId,
              subjectId: e.subjectId,
            },
          },
          update: { score: e.score },
          create: { examId, ...e },
        }),
      ),
  )
}

export async function deleteExamAction(formData: FormData) {
  await requireRole("ADMIN")
  const { id } = idSchema.parse(Object.fromEntries(formData))
  await db.exam.delete({ where: { id } })
}
