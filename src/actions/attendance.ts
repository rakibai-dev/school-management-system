"use server"

import { AttendanceStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { markAttendanceSchema } from "@/lib/validations"

/**
 * Upsert attendance for a whole class/day. Each input is named
 * `status_<studentId>`; students without an input are skipped (they keep
 * their previous value, e.g. nothing recorded).
 */
export async function markAttendanceAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "TEACHER")

  // Build { studentId: AttendanceStatus } from the dynamic inputs
  const statuses: Record<string, AttendanceStatus> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("status_")) {
      const studentId = key.slice("status_".length)
      const status = String(value) as AttendanceStatus
      if (Object.values(AttendanceStatus).includes(status)) {
        statuses[studentId] = status
      }
    }
  }

  const parsed = markAttendanceSchema.safeParse({
    classId: formData.get("classId"),
    date: formData.get("date"),
    statuses,
  })
  if (!parsed.success) throw new Error("Invalid attendance data")
  const { classId, date } = parsed.data

  // Teachers may only mark attendance for classes they are assigned to
  if (actor.role === "TEACHER") {
    const assigned = await db.teacherSubject.count({
      where: { teacher: { userId: actor.id }, classId },
    })
    if (assigned === 0) throw new Error("You can only mark attendance for your classes")
  }

  await db.$transaction(
    Object.entries(statuses).map(([studentId, status]) =>
      db.attendance.upsert({
        where: { studentId_classId_date: { studentId, classId, date } },
        update: { status },
        create: { studentId, classId, date, status },
      }),
    ),
  )
}
