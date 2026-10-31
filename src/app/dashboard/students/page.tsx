import { Suspense } from "react"
import Link from "next/link"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { createStudentAction, deleteStudentAction } from "@/actions/students"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
import { Input, Label, Select, Textarea } from "@/components/ui/basics"
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

export const metadata = { title: "Students" }

export default function StudentsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <StudentsList />
    </Suspense>
  )
}

async function StudentsList() {
  await requireRole("ADMIN")

  const [students, classes] = await Promise.all([
    db.student.findMany({
      include: { user: true, class: true },
      orderBy: [{ classId: "asc" }, { rollNo: "asc" }],
    }),
    db.class.findMany({ orderBy: [{ name: "asc" }, { section: "asc" }] }),
  ])

  return (
    <div>
      <PageHeader
        title="Students"
        description="Enroll students, assign them to classes and manage profiles."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {students.length} enrolled
          </h2>
          {students.length === 0 ? (
            <EmptyState title="No students yet" description="Add your first student with the form on the right." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>{""}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/dashboard/students/${s.id}`} className="font-medium hover:underline">
                        {s.user.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.user.email}</TableCell>
                    <TableCell>
                      {s.class ? (
                        <Badge>
                          {s.class.name} {s.class.section}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{s.rollNo || "—"}</TableCell>
                    <TableCell className="text-right">
                      <form action={deleteStudentAction}>
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

        <CreateStudentForm classes={classes} />
      </div>
    </div>
  )
}

function CreateStudentForm({ classes }: { classes: { id: string; name: string; section: string }[] }) {
  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Add student</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createStudentAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (login)</Label>
            <Input id="email" name="email" type="email" required placeholder="jane@student.school.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="text" placeholder="password123 (default)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" name="gender" defaultValue="">
                <option value="">—</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bloodGroup">Blood group</Label>
              <Input id="bloodGroup" name="bloodGroup" placeholder="O+" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="+1 555 …" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={2} />
          </div>
          <p className="text-xs text-muted-foreground">
            Students are enrolled into a class from their profile page.
          </p>
          <SubmitButton className="w-full">Create student</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

function LoadingBlock() {
  return <div className="h-96 animate-pulse rounded-lg bg-muted" />
}
