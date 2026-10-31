import { Suspense } from "react"
import { Role } from "@prisma/client"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { createAnnouncementAction, deleteAnnouncementAction } from "@/actions/announcements"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { Input, Label, Select, Textarea } from "@/components/ui/basics"
import { SubmitButton } from "@/components/ui/submit-button"
import { EmptyState, PageHeader } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

export const metadata = { title: "Announcements" }

export default function AnnouncementsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <Announcements />
    </Suspense>
  )
}

async function Announcements() {
  const user = await requireUser()
  const isAdmin = user.role === "ADMIN"
  const canCreate = isAdmin || user.role === "TEACHER"

  // teacher profile needed (a) to scope class options, (b) to scope visibility
  const teacher = canCreate
    ? await db.teacher.findUnique({ where: { userId: user.id } })
    : null
  let teacherClassIds: string[] = []
  if (teacher) {
    const [assignmentRows, classTeacherRow] = await Promise.all([
      db.teacherSubject.findMany({ where: { teacherId: teacher.id }, select: { classId: true } }),
      db.class.findFirst({ where: { classTeacherId: teacher.id }, select: { id: true } }),
    ])
    teacherClassIds = [
      ...assignmentRows.map((row) => row.classId),
      classTeacherRow?.id,
    ].filter((id): id is string => id != null)
  }

  // build the visibility filter for this role
  let where: Record<string, unknown> = {}
  if (isAdmin) {
    where = {}
  } else {
    const scope: Record<string, unknown>[] = [{ audienceRole: null }]
    scope.push({ audienceRole: user.role })
    if (teacher && teacherClassIds && teacherClassIds.length > 0) {
      scope.push({ classId: { in: teacherClassIds } })
    }
    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { userId: user.id }, select: { classId: true } })
      scope.push({ classId: student?.classId ?? "__none__" })
    }
    if (user.role === "PARENT") {
      const parent = await db.parent.findUnique({
        where: { userId: user.id },
        include: { children: true },
      })
      scope.push({ classId: { in: parent?.children.map((c) => c.classId).filter(Boolean) ?? [] } })
    }
    where = { OR: scope }
  }

  const [announcements, classes] = await Promise.all([
    db.announcement.findMany({
      where: where as never,
      include: {
        author: true,
        class: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.class.findMany({
      where:
        isAdmin || !teacher
          ? {}
          : {
              OR: [
                { classTeacherId: teacher.id },
                { assignments: { some: { teacherId: teacher.id } } },
              ],
            },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    }),
  ])

  return (
    <div>
      <PageHeader
        title="Announcements"
        description={isAdmin ? "Post notices for everyone, a role, or a class." : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          {announcements.length === 0 ? (
            <EmptyState title="No announcements yet" />
          ) : (
            announcements.map((a) => (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>{a.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge tone={a.audienceRole ? "secondary" : "default"}>
                        {a.audienceRole ? a.audienceRole.toLowerCase() : "everyone"}
                      </Badge>
                      {a.class && (
                        <Badge tone="secondary">
                          {a.class.name} {a.class.section}
                        </Badge>
                      )}
                      {(isAdmin || a.authorId === user.id) && (
                        <form action={deleteAnnouncementAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="text-xs text-destructive hover:underline">delete</button>
                        </form>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.author.name} · {formatDate(a.createdAt)}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{a.body}</p>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        {canCreate && (
          <Card className="self-start">
            <CardHeader>
              <CardTitle>New announcement</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createAnnouncementAction} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required placeholder="Sports day next Friday" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="body">Message</Label>
                  <Textarea id="body" name="body" required rows={4} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="audienceRole">Audience</Label>
                  <Select id="audienceRole" name="audienceRole" defaultValue="">
                    <option value="">Everyone</option>
                    {user.role === "ADMIN" &&
                      (["TEACHER", "STUDENT", "PARENT"] as Role[]).map((role) => (
                        <option key={role} value={role}>
                          {role[0] + role.slice(1).toLowerCase()}
                        </option>
                      ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classId">Class (optional)</Label>
                  <Select id="classId" name="classId" defaultValue="">
                    <option value="">— All classes —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section}
                      </option>
                    ))}
                  </Select>
                </div>
                {teacher && classes.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Teachers must target a class — but you have none assigned.
                  </p>
                )}
                <SubmitButton className="w-full">Post announcement</SubmitButton>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
