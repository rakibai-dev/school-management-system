import { Suspense } from "react"
import Link from "next/link"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createClassAction, deleteClassAction } from "@/actions/classes"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { Input, Label, Select } from "@/components/ui/basics"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import {
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Classes" }

export default function ClassesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <ClassesList />
    </Suspense>
  )
}

async function ClassesList() {
  await requireRole("ADMIN")

  const [classes, teachers] = await Promise.all([
    db.class.findMany({
      include: {
        classTeacher: { include: { user: true } },
        _count: { select: { students: true, assignments: true } },
      },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    }),
    db.teacher.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ])

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Grade levels and sections. Open a class to manage subjects, students and its timetable."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          {classes.length === 0 ? (
            <EmptyState title="No classes yet" description="Create your first class." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Class teacher</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>{""}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/dashboard/classes/${c.id}`} className="font-medium hover:underline">
                        {c.name} {c.section}
                      </Link>
                      {c.room && (
                        <span className="block text-xs text-muted-foreground">{c.room}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.classTeacher ? c.classTeacher.user.name : "—"}
                    </TableCell>
                    <TableCell>{c._count.students}</TableCell>
                    <TableCell>{c._count.assignments}</TableCell>
                    <TableCell className="text-right">
                      <form action={deleteClassAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <Button variant="ghost" size="sm" className="text-destructive">
                          Delete
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Create class</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createClassAction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Grade name</Label>
                  <Input id="name" name="name" required placeholder="Grade 10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="section">Section</Label>
                  <Input id="section" name="section" required placeholder="A" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classTeacherId">Class teacher</Label>
                <Select id="classTeacherId" name="classTeacherId" defaultValue="">
                  <option value="">— None —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room">Room</Label>
                <Input id="room" name="room" placeholder="Room 101" />
              </div>
              <SubmitButton className="w-full">Create class</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
