"use server"

import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { sendMessageSchema } from "@/lib/validations"

export async function sendMessageAction(formData: FormData) {
  const actor = await requireUser()

  const parsed = sendMessageSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid message")

  const receiver = await db.user.findUniqueOrThrow({
    where: { id: parsed.data.receiverId },
    select: { id: true },
  })
  if (receiver.id === actor.id) throw new Error("You cannot message yourself")

  await db.message.create({
    data: {
      senderId: actor.id,
      receiverId: receiver.id,
      body: parsed.data.body,
    },
  })
}

// mark a conversation as read (invoked from the messages page)
export async function markThreadReadAction(formData: FormData) {
  const actor = await requireUser()
  const otherId = String(formData.get("otherId") ?? "")
  if (!otherId) return

  await db.message.updateMany({
    where: { senderId: otherId, receiverId: actor.id, readAt: null },
    data: { readAt: new Date() },
  })
}
