"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { addSlotSchema, idSchema } from "@/lib/validations"

export async function addSlotAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = addSlotSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const { start, end, ...rest } = parsed.data
  if (start >= end) throw new Error("End time must be after start time")

  await db.timetableSlot.create({ data: { start, end, ...rest } })
}

export async function deleteSlotAction(formData: FormData) {
  await requireRole("ADMIN")
  const { id } = idSchema.parse(Object.fromEntries(formData))
  await db.timetableSlot.delete({ where: { id } })
}
