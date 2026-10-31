"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import {
  createClassSchema,
  updateClassSchema,
  createSubjectSchema,
  assignSubjectSchema,
  idSchema,
} from "@/lib/validations"

// ---------- Classes ----------
export async function createClassAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = createClassSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const { name, section, ...extra } = parsed.data
  await db.class.create({ data: { name, section, ...extra } })
}

export async function updateClassAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = updateClassSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const { id, name, section, ...extra } = parsed.data
  await db.class.update({ where: { id }, data: { name, section, ...extra } })
}

export async function deleteClassAction(formData: FormData) {
  await requireRole("ADMIN")

  const { id } = idSchema.parse(Object.fromEntries(formData))
  await db.class.delete({ where: { id } })
}

// ---------- Subjects ----------
export async function createSubjectAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = createSubjectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  await db.subject.create({ data: parsed.data })
}

export async function deleteSubjectAction(formData: FormData) {
  await requireRole("ADMIN")

  const { id } = idSchema.parse(Object.fromEntries(formData))
  await db.subject.delete({ where: { id } })
}

// ---------- Class ↔ Subject ↔ Teacher assignments ----------
export async function assignSubjectAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = assignSubjectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  // one teacher per class-subject pair; last assignment wins.
  // Relation is nullable, so "no teacher" == disconnect.
  const { classId, subjectId, teacherId } = parsed.data
  const teacherData = teacherId
    ? { connect: { id: teacherId } }
    : { disconnect: true }

  await db.teacherSubject.upsert({
    where: { classId_subjectId: { classId, subjectId } },
    update: { teacher: teacherData },
    create: {
      class: { connect: { id: classId } },
      subject: { connect: { id: subjectId } },
      teacher: teacherId ? { connect: { id: teacherId } } : {},
    },
  })
}

export async function unassignSubjectAction(formData: FormData) {
  await requireRole("ADMIN")

  const { id } = idSchema.parse(Object.fromEntries(formData))
  await db.teacherSubject.delete({ where: { id } })
}
