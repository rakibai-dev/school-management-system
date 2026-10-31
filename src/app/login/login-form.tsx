"use client"

import { useActionState } from "react"
import { login } from "@/actions/auth"
import { Input, Label } from "@/components/ui/basics"
import { SubmitButton } from "@/components/ui/submit-button"

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, undefined)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@school.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  )
}
