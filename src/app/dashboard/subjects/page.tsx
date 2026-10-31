import { Suspense } from "react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createSubjectAction, deleteSubjectAction } from "@/actions/classes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export const metadata = { title: "Subjects" }

export default function SubjectsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <SubjectsList />
    </Suspense>
  )
}

async function SubjectsList() {
  await requireRole("ADMIN")

  const subjects = await db.subject.findMany({
    include: { assignments: { include: { class: true, teacher: { include: { user: true } } } } },
    orderBy: { name: "asc" },
  })

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Subjects offered across the school. Assign teachers per class from each class page."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          {subjects.length === 0 ? (
            <EmptyState title="No subjects yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Used in classes</TableHead>
                  <TableHead>{""}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.assignments.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={deleteSubjectAction}>
                        <input type="hidden" name="id" value={s.id} />
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
            <CardTitle>Add subject</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSubjectAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="Computer Science" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" required placeholder="CS" className="uppercase" />
              </div>
              <SubmitButton className="w-full">Create subject</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
