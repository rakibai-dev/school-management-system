"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createTeacherSchema, updateTeacherSchema, idSchema } from "@/lib/validations"

const DEFAULT_PASSWORD = "password123"

export async function createTeacherAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = createTeacherSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const { name, email, password, employeeNo, ...extra } = parsed.data

  await db.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash: bcrypt.hashSync(password ?? DEFAULT_PASSWORD, 12),
        role: "TEACHER",
      },
    })
    const user = await tx.user.findUniqueOrThrow({
      where: { email: email.toLowerCase().trim() },
    })
    await tx.teacher.create({
      data: {
        userId: user.id,
        employeeNo: employeeNo ?? `EMP-${Date.now().toString().slice(-6)}`,
        ...extra,
      },
    })
  })
}

export async function updateTeacherAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = updateTeacherSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const { id, ...data } = parsed.data
  await db.teacher.update({ where: { id }, data })
}

export async function deleteTeacherAction(formData: FormData) {
  await requireRole("ADMIN")

  const { id } = idSchema.parse(Object.fromEntries(formData))
  const teacher = await db.teacher.findUniqueOrThrow({ where: { id } })
  // unassign from classes first (FK SetNull handles relations, but unique
  // classTeacherId column needs the row gone cleanly)
  await db.teacher.delete({ where: { id } })
  await db.user.delete({ where: { id: teacher.userId } })
}
