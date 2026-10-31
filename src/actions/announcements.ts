"use server"

import { Role } from "@prisma/client"
import { db } from "@/lib/db"
import { requireUser, requireRole } from "@/lib/session"
import { createAnnouncementSchema, idSchema } from "@/lib/validations"

export async function createAnnouncementAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "TEACHER")

  const parsed = createAnnouncementSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const audienceRole =
    parsed.data.audienceRole && Object.values(Role).includes(parsed.data.audienceRole as Role)
      ? (parsed.data.audienceRole as Role)
      : null

  // Teachers can only post class-scoped announcements for their classes
  if (actor.role === "TEACHER" && !parsed.data.classId) {
    throw new Error("Teachers must target a class")
  }

  await db.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      authorId: actor.id,
      audienceRole,
      classId: parsed.data.classId ?? null,
    },
  })
}

export async function deleteAnnouncementAction(formData: FormData) {
  const actor = await requireUser()
  const { id } = idSchema.parse(Object.fromEntries(formData))

  const where =
    actor.role === "ADMIN"
      ? { id }
      : { id, authorId: actor.id } // only the author may delete

  await db.announcement.deleteMany({ where })
}
