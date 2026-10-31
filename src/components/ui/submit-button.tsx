"use client"

import { useFormStatus } from "react-dom"
import { Button, type ButtonProps } from "./button"

// A submit button that shows a pending state while the enclosing server action runs
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
