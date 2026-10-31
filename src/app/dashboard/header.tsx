import { requireUser } from "@/lib/session"
import { signOutAction } from "@/actions/auth"
import { Badge } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { initials } from "@/lib/utils"

export async function Header() {
  const user = await requireUser()

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6">
      {/* Mobile: the dashboard is served on wider screens first */}
      <div className="flex items-center gap-2 md:hidden">
        <span className="font-semibold">EduDesk</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
            {initials(user.name ?? "?")}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Badge>{user.role[0] + user.role.slice(1).toLowerCase()}</Badge>
        <form action={signOutAction} className="md:hidden">
          <Button variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}
