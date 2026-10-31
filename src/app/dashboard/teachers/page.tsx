import { Suspense } from "react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createTeacherAction, deleteTeacherAction } from "@/actions/teachers"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/basics"
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

export const metadata = { title: "Teachers" }

export default function TeachersPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <TeachersList />
    </Suspense>
  )
}

async function TeachersList() {
  await requireRole("ADMIN")

  const [teachers, classes] = await Promise.all([
    db.teacher.findMany({
      include: {
        user: true,
        assignments: { include: { class: true, subject: true } },
        classTeacherOf: true,
      },
      orderBy: { user: { name: "asc" } },
    }),
    db.class.findMany({ orderBy: [{ name: "asc" }, { section: "asc" }] }),
  ])

  const classTeacherNames = new Map(
    classes
      .filter((c) => c.classTeacherId)
      .map((c) => [c.classTeacherId!, `${c.name} ${c.section}`]),
  )

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Faculty records. Assign subjects to classes from each class page."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{teachers.length} staff</h2>
          {teachers.length === 0 ? (
            <EmptyState title="No teachers yet" description="Add your first teacher with the form on the right." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee no.</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>{""}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.user.name}</div>
                      {classTeacherNames.get(t.id) && (
                        <span className="text-xs text-muted-foreground">
                          Class teacher of {classTeacherNames.get(t.id)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.user.email}</TableCell>
                    <TableCell className="font-mono text-xs">{t.employeeNo}</TableCell>
                    <TableCell>
                      {t.assignments.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {t.assignments.slice(0, 4).map((a) => (
                            <Badge key={a.id}>
                              {a.subject.name} · {a.class.name}
                              {a.class.section}
                            </Badge>
                          ))}
                          {t.assignments.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{t.assignments.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={deleteTeacherAction}>
                        <input type="hidden" name="id" value={t.id} />
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
            <CardTitle>Add teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTeacherAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" required placeholder="John Smith" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email (login)</Label>
                <Input id="email" name="email" type="email" required placeholder="john@school.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="text" placeholder="password123 (default)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="employeeNo">Employee no.</Label>
                  <Input id="employeeNo" name="employeeNo" placeholder="EMP-010 (auto)" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="+1 555 …" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qualification">Qualification</Label>
                <Input id="qualification" name="qualification" placeholder="MSc Physics" />
              </div>
              <SubmitButton className="w-full">Create teacher</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
