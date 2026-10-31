import { Suspense } from "react"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { deleteSlotAction } from "@/actions/timetable"
import { TimetableGrid } from "@/components/ui/timetable-grid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/table"

export const metadata = { title: "Timetable" }

export default function TimetablePage(props: PageProps<"/dashboard/timetable">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <Timetable searchParams={props.searchParams} />
    </Suspense>
  )
}

async function Timetable({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string | string[] }>
}) {
  const user = await requireUser()
  const params = await searchParams

  const isAdmin = user.role === "ADMIN"

  // Which classes can this role see?
  let classes: Awaited<ReturnType<typeof db.class.findMany>> = []
  if (isAdmin) {
    classes = await db.class.findMany({ orderBy: [{ name: "asc" }, { section: "asc" }] })
  } else if (user.role === "TEACHER") {
    classes = await db.class.findMany({
      where: {
        OR: [
          { assignments: { some: { teacher: { userId: user.id } } } },
          { classTeacher: { userId: user.id } },
        ],
      },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    })
  } else if (user.role === "STUDENT") {
    const me = await db.student.findUnique({ where: { userId: user.id }, select: { class: true } })
    if (me?.class) classes = [me.class]
  } else {
    const parent = await db.parent.findUnique({
      where: { userId: user.id },
      include: { children: { include: { class: true } } },
    })
    classes = [
      ...new Map(
        parent?.children.filter((c) => c.class).map((c) => [c.class!.id, c.class!]) ?? [],
      ).values(),
    ]
  }

  if (classes.length === 0) {
    return (
      <div>
        <PageHeader title="Timetable" />
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No classes available for your account yet.
        </p>
      </div>
    )
  }

  const selected = classes.find((c) => c.id === params.classId) ?? classes[0]

  const slots = await db.timetableSlot.findMany({
    where: { classId: selected.id },
    include: { subject: true, teacher: { include: { user: true } } },
    orderBy: [{ day: "asc" }, { start: "asc" }],
  })

  return (
    <div>
      <PageHeader
        title="Timetable"
        description={
          classes.length > 1
            ? "Switch between classes using the tabs below."
            : `Weekly schedule for ${selected.name} ${selected.section}`
        }
      />

      {classes.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-2">
          {classes.map((c) => (
            <a
              key={c.id}
              href={`?classId=${c.id}`}
              className={
                c.id === selected.id
                  ? "rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                  : "rounded-md border border-input px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/60"
              }
            >
              {c.name} {c.section}
            </a>
          ))}
        </nav>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selected.name} {selected.section}
            {selected.room ? ` · ${selected.room}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimetableGrid
            slots={slots.map((slot) => ({
              id: slot.id,
              day: slot.day,
              start: slot.start,
              end: slot.end,
              subject: slot.subject.name,
              teacher: slot.teacher?.user.name,
              room: slot.room,
            }))}
            actionsSlot={isAdmin}
            onDelete={isAdmin ? deleteSlotAction : undefined}
          />
          {isAdmin && (
            <p className="mt-3 text-xs text-muted-foreground">
              To add or remove slots, open the class page (
              <a href={`/dashboard/classes/${selected.id}`} className="text-primary hover:underline">
                {selected.name} {selected.section}
              </a>
              ).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
