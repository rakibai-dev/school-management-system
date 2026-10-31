import { Suspense } from "react"
import Link from "next/link"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { sendMessageAction, markThreadReadAction } from "@/actions/messages"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/basics"
import { SubmitButton } from "@/components/ui/submit-button"
import { EmptyState, PageHeader } from "@/components/ui/table"
import { initials } from "@/lib/utils"

export const metadata = { title: "Messages" }

export default function MessagesPage(props: PageProps<"/dashboard/messages">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <Messages searchParams={props.searchParams} />
    </Suspense>
  )
}

async function Messages({
  searchParams,
}: {
  searchParams: Promise<{ with?: string | string[] }>
}) {
  const user = await requireUser()
  const params = await searchParams

  // ---- Build contact list per role ----
  const where: Record<string, unknown> = { NOT: { id: user.id } }
  if (user.role === "STUDENT") {
    // students can reach admins & the teachers of their class
    const student = await db.student.findUnique({
      where: { userId: user.id },
      select: { classId: true },
    })
    where.OR = [
      { role: "ADMIN" },
      {
        role: "TEACHER",
        teacher: { assignments: { some: { classId: student?.classId ?? "" } } },
      },
    ]
  } else if (user.role === "PARENT") {
    where.OR = [{ role: "ADMIN" }]
  } else {
    // admin/teachers can message everyone
  }

  const contacts = await db.user.findMany({
    where: where as never,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  if (contacts.length === 0) {
    return (
      <div>
        <PageHeader title="Messages" />
        <EmptyState title="No contacts available" />
      </div>
    )
  }

  const otherId = typeof params.with === "string" ? params.with : ""
  const active = contacts.find((c) => c.id === otherId) ?? contacts[0]

  const thread = await db.message.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: active.id },
        { senderId: active.id, receiverId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  })

  // count unread per contact for the sidebar list
  const unreadCounts = await db.message.groupBy({
    by: ["senderId"],
    where: { receiverId: user.id, readAt: null },
    _count: { _all: true },
  })
  const unreadBySender = new Map(
    unreadCounts.map((u) => [u.senderId, u._count._all]),
  )

  // opening a thread marks it read (idempotent)
  if (unreadBySender.get(active.id)) {
    await db.message.updateMany({
      where: { senderId: active.id, receiverId: user.id, readAt: null },
      data: { readAt: new Date() },
    })
  }
  void markThreadReadAction

  return (
    <div>
      <PageHeader title="Messages" />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Contact list — plain links, works without JS */}
        <Card>
          <CardContent className="max-h-[70vh] overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {contacts.map((c) => {
                const unread = unreadBySender.get(c.id)
                const isActive = c.id === active.id
                return (
                  <li key={c.id}>
                    <Link
                      href={`?with=${c.id}`}
                      className={
                        isActive
                          ? "flex items-center gap-2.5 rounded-md bg-accent px-2.5 py-2"
                          : "flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-accent/60"
                      }
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.role.toLowerCase()}
                        </span>
                      </span>
                      {unread ? <Badge>{unread}</Badge> : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="flex min-h-[60vh] flex-col">
          <CardHeader>
            <CardTitle>{active.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {active.email} · {active.role.toLowerCase()}
            </p>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <div className="flex-1 space-y-2 overflow-y-auto rounded-md bg-muted/40 p-3">
              {thread.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No messages yet — say hello!
                </p>
              ) : (
                thread.map((m) => {
                  const mine = m.senderId === user.id
                  return (
                    <div
                      key={m.id}
                      className={mine ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={
                          mine
                            ? "max-w-[80%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                            : "max-w-[80%] rounded-lg rounded-bl-sm bg-card px-3 py-2 text-sm border border-border"
                        }
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p
                          className={
                            mine
                              ? "mt-1 text-[10px] text-primary-foreground/60"
                              : "mt-1 text-[10px] text-muted-foreground"
                          }
                        >
                          {new Date(m.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <form action={sendMessageAction} className="flex flex-col gap-2">
              <input type="hidden" name="receiverId" value={active.id} />
              <Textarea name="body" rows={2} required placeholder={`Message ${active.name}…`} />
              <div className="flex justify-end">
                <SubmitButton>Send</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
