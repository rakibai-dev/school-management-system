import { Suspense } from "react"
import { login } from "@/actions/auth"
import { LoginForm } from "./login-form"
import { Logo } from "@/components/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Sign in" }

const demos = [
  { label: "Admin", email: "admin@school.com" },
  { label: "Teacher", email: "rachel.green@school.com" },
  { label: "Student", email: "ava.thompson@student.school.com" },
  { label: "Parent", email: "marta.thompson@family.com" },
]

export default function LoginPage(
  props: PageProps<"/login">,
) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-2 max-w-full">
            <Logo className="h-12 max-w-full" />
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to the school management system
          </p>
        </div>

        {/* `next` redirect target comes from the URL (searchParams) — a request
            read, so the form streams in behind the boundary */}
        <Suspense
          fallback={
            <Card>
              <CardContent className="h-72 animate-pulse" />
            </Card>
          }
        >
          <LoginFormSection searchParams={props.searchParams} />
        </Suspense>

        <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">
            Demo accounts (password: password123)
          </p>
          <ul className="space-y-0.5">
            {demos.map((demo) => (
              <li key={demo.email} className="flex justify-between gap-2">
                <span className="font-medium">{demo.label}</span>
                <span className="font-mono">{demo.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}

async function LoginFormSection({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const params = await searchParams
  const next = typeof params.next === "string" ? params.next : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your school account credentials</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
      </CardContent>
    </Card>
  )
}
