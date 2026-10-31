import { redirect } from "next/navigation"
import { cache } from "react"
import type { Role } from "@prisma/client"
import { auth } from "@/auth"

export type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  role: Role
}

/** Request-cached session read for the current render */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth()
  return session?.user ?? null
})

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  return user
}

/** Restrict a page/action to the given roles; otherwise bounce to the dashboard */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect("/dashboard")
  return user
}
