import { requireUser } from "@/lib/session"
import { signOutAction } from "@/actions/auth"
import { SidebarNav } from "./sidebar-nav"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import type { Role } from "@prisma/client"

export type NavItem = { href: string; label: string; roles: Role[] }

// Roles that can see each section. ADMIN sees everything.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  { href: "/dashboard/students", label: "Students", roles: ["ADMIN"] },
  { href: "/dashboard/teachers", label: "Teachers", roles: ["ADMIN"] },
  { href: "/dashboard/classes", label: "Classes", roles: ["ADMIN", "TEACHER"] },
  { href: "/dashboard/subjects", label: "Subjects", roles: ["ADMIN"] },
  { href: "/dashboard/attendance", label: "Attendance", roles: ["ADMIN", "TEACHER"] },
  { href: "/dashboard/exams", label: "Exams & Grading", roles: ["ADMIN", "TEACHER"] },
  { href: "/dashboard/grades", label: "My Grades", roles: ["STUDENT", "PARENT"] },
  { href: "/dashboard/timetable", label: "Timetable", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  { href: "/dashboard/fees", label: "Fees", roles: ["ADMIN", "STUDENT", "PARENT"] },
  { href: "/dashboard/announcements", label: "Announcements", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  { href: "/dashboard/messages", label: "Messages", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"] },
]

export async function Sidebar() {
  const user = await requireUser()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-4">
        <Logo className="h-9" />
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <SidebarNav items={NAV_ITEMS.filter((item) => item.roles.includes(user.role))} />
      </nav>

      <div className="border-t border-border p-3">
        <form action={signOutAction}>
          <Button variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  )
}
