import { Suspense } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh bg-muted/30">
      {/* Sidebar reads the session, so streams in behind a boundary; the rest
          of the shell renders instantly */}
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 border-b border-border bg-card animate-pulse" />}>
          <Header />
        </Suspense>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="h-16 animate-pulse border-b border-border" />
      <div className="animate-pulse space-y-2 p-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 rounded-md bg-muted" />
        ))}
      </div>
    </aside>
  )
}
