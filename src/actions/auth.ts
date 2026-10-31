"use server"

import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { signIn, signOut } from "@/auth"
import { loginSchema } from "@/lib/validations"

type LoginState = { error?: string }

export async function login(
  _state: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!validated.success) {
    return { error: "Please enter a valid email and password." }
  }

  const next = String(formData.get("next") ?? "") || "/dashboard"

  try {
    await signIn("credentials", {
      email: validated.data.email,
      password: validated.data.password,
      redirectTo: next,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." }
    }
    // NEXT_REDIRECT — rethrow so the redirect happens
    throw error
  }
  // unreachable — signIn redirects on success
  return {}
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" })
}
