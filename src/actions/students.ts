"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createStudentSchema, updateStudentSchema, idSchema } from "@/lib/validations"

const DEFAULT_PASSWORD = "password123"

export async function createStudentAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = createStudentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const { name, email, password, admissionNo, ...extra } = parsed.data

  await db.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash: bcrypt.hashSync(password ?? DEFAULT_PASSWORD, 12),
        role: "STUDENT",
      },
    })
    const user = await tx.user.findUniqueOrThrow({
      where: { email: email.toLowerCase().trim() },
    })
    await tx.student.create({
      data: {
        userId: user.id,
        admissionNo: admissionNo ?? `ADM-${Date.now().toString().slice(-8)}`,
        rollNo: 0,
        ...extra,
      },
    })
  })
}

export async function updateStudentAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = updateStudentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const { id, ...data } = parsed.data
  await db.student.update({ where: { id }, data })
}

export async function deleteStudentAction(formData: FormData) {
  await requireRole("ADMIN")

  const { id } = idSchema.parse(Object.fromEntries(formData))
  const student = await db.student.findUniqueOrThrow({ where: { id } })
  await db.student.delete({ where: { id } })
  await db.user.delete({ where: { id: student.userId } })
}
