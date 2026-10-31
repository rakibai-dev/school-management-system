"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createFeeSchema, idSchema } from "@/lib/validations"

export async function createFeeAction(formData: FormData) {
  await requireRole("ADMIN")

  const parsed = createFeeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  await db.fee.create({ data: parsed.data })
}

export async function payFeeAction(formData: FormData) {
  await requireRole("ADMIN")

  const { id } = idSchema.parse(Object.fromEntries(formData))
  await db.fee.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  })
}

export async function deleteFeeAction(formData: FormData) {
  await requireRole("ADMIN")

  const { id } = idSchema.parse(Object.fromEntries(formData))
  await db.fee.delete({ where: { id } })
}
