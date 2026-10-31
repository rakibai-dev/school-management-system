import { Suspense } from "react"
import Link from "next/link"
import { db } from "@/lib/db"
import { requireUser, type SessionUser } from "@/lib/session"
import { StatCard } from "@/components/ui/stat-card"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card"
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
import { formatDate, WEEK_DAYS } from "@/lib/utils"

export const metadata = { title: "Overview" }

export default function DashboardPage() {
  // The overview is fully session-dependent — keep it dynamic behind Suspense
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  )
}

async function Overview() {
  const user = await requireUser()

  switch (user.role) {
    case "ADMIN":
      return <AdminOverview />
    case "TEACHER":
      return <TeacherOverview />
    case "PARENT":
      return <ParentOverview />
    default:
      return <StudentOverview />
  }
}

// ---------- Admin ----------
async function AdminOverview() {
  const [studentCount, teacherCount, classCount, subjectCount, unpaidFees, announcements] =
    await Promise.all([
      db.student.count(),
      db.teacher.count(),
      db.class.count(),
      db.subject.count(),
      db.fee.findMany({ where: { status: { not: "PAID" } }, include: { student: { include: { user: true } } }, orderBy: { dueDate: "asc" } }),
      db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ])

  const totalDue = unpaidFees.reduce((sum, fee) => sum + fee.amount, 0)

  return (
    <div>
      <PageHeader title="Overview" description="School-wide summary" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={studentCount} />
        <StatCard label="Teachers" value={teacherCount} />
        <StatCard label="Classes" value={classCount} />
        <StatCard label="Subjects" value={subjectCount} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outstanding fees</CardTitle>
          </CardHeader>
          <CardContent>
            {unpaidFees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">All fees are settled 🎉</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {unpaidFees.length} unpaid fee(s) · Total{" "}
                  <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalDue)}
                  </span>
                </p>
                <ul className="divide-y divide-border text-sm">
                  {unpaidFees.slice(0, 5).map((fee) => (
                    <li key={fee.id} className="flex items-center justify-between gap-2 py-2">
                      <Link href={`/dashboard/students/${fee.studentId}`} className="font-medium hover:underline">
                        {fee.student.user.name}
                      </Link>
                      <span className="text-muted-foreground">due {formatDate(fee.dueDate)}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard/fees" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                  Manage fees →
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nothing posted yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {announcements.map((a) => (
                  <li key={a.id} className="py-2">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-muted-foreground">{formatDate(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------- Teacher ----------
async function TeacherOverview() {
  const user = await requireUser()

  const [assignments, classTeacherOf, timetable, announcements] = await Promise.all([
    db.teacherSubject.findMany({
      where: { teacher: { userId: user.id } },
      include: { class: true, subject: true },
    }),
    db.class.findFirst({ where: { classTeacher: { userId: user.id } } }),
    db.timetableSlot.findMany({
      where: { teacher: { userId: user.id }, day: todayDay() },
      include: { class: true, subject: true },
      orderBy: { start: "asc" },
    }),
    db.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  return (
    <div>
      <PageHeader title="Overview" description={`Welcome back, ${user.name}`} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Class–subject assignments" value={assignments.length} />
        <StatCard label="Classes today" value={timetable.length} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schedule today</CardTitle>
          </CardHeader>
          <CardContent>
            {timetable.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No classes on {WEEK_DAYS[todayDay()]}.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {timetable.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between py-2">
                    <span className="font-medium">{slot.subject.name}</span>
                    <span className="text-muted-foreground">
                      {slot.class.name} {slot.class.section} · {slot.start}–{slot.end}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No subject assignments yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <span className="font-medium">{a.subject.name}</span>
                    <Badge>
                      {a.class.name} {a.class.section}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {classTeacherOf && (
              <Link
                href={`/dashboard/classes/${classTeacherOf.id}`}
                className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
              >
                Class teacher of {classTeacherOf.name} {classTeacherOf.section} →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------- Student ----------
async function StudentOverview() {
  const user = await requireUser()

  const studentProfile = await db.student.findUnique({
    where: { userId: user.id },
    include: { class: true, fees: true },
  })
  if (!studentProfile) {
    return <EmptyState title="Profile not found" description="Please contact the school office." />
  }

  const [recentResults, attendance, announcements, timetable] = await Promise.all([
    db.result.findMany({
      where: { studentId: studentProfile.id },
      include: { subject: true, exam: true },
      orderBy: { exam: { date: "desc" } },
    }),
    db.attendance.groupBy({
      by: ["status"],
      where: { studentId: studentProfile.id },
      _count: { _all: true },
    }),
    db.announcement.findMany({
      where: {
        OR: [{ audienceRole: null }, { audienceRole: "STUDENT" }, { classId: studentProfile.classId ?? undefined }],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.timetableSlot.findMany({
      where: { classId: studentProfile.classId ?? "", day: todayDay() },
      include: { subject: true },
      orderBy: { start: "asc" },
    }),
  ])

  const absent = attendance.find((a) => a.status === "ABSENT")?._count._all ?? 0
  const totalDays = attendance.reduce((sum, a) => sum + a._count._all, 0)
  const attendanceRate = totalDays > 0 ? Math.round(((totalDays - absent) / totalDays) * 100) : null
  const unpaid = studentProfile.fees.filter((f) => f.status !== "PAID")

  return (
    <div>
      <PageHeader
        title={`Hi, ${user.name}`}
        description={
          studentProfile.class
            ? `${studentProfile.class.name} ${studentProfile.class.section} · Roll no. ${studentProfile.rollNo}`
            : "Not enrolled in a class yet"
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Attendance"
          value={attendanceRate === null ? "—" : `${attendanceRate}%`}
          hint="All recorded days"
        />
        <StatCard label="Latest exam average" value={examAverage(recentResults)} />
        <StatCard
          label="Fees due"
          value={unpaid.length}
          hint={unpaid.length ? totalDue(unpaid) : "All settled ✅"}
          tone={unpaid.length ? "warning" : "success"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {timetable.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nothing scheduled today.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {timetable.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between py-2">
                    <span className="font-medium">{slot.subject.name}</span>
                    <span className="text-muted-foreground">
                      {slot.start}–{slot.end} {slot.room ? `· ${slot.room}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nothing new.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {announcements.map((a) => (
                  <li key={a.id} className="py-2">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-muted-foreground">{formatDate(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------- Parent ----------
async function ParentOverview() {
  const user = await requireUser()

  const parent = await db.parent.findUnique({
    where: { userId: user.id },
    include: {
      children: {
        include: {
          user: true,
          class: true,
          fees: true,
          results: { include: { subject: true, exam: true }, orderBy: { exam: { date: "desc" } } },
          attendance: { where: { date: { gte: attendanceWindow() } } },
        },
      },
    },
  })

  if (!parent || parent.children.length === 0) {
    return (
      <EmptyState
        title="No children linked"
        description="Your account is not linked to any student yet. Contact the school office."
      />
    )
  }

  return (
    <div>
      <PageHeader title="Overview" description={`${parent.children.length} child(ren)`} />

      <div className="grid gap-4 lg:grid-cols-2">
        {parent.children.map((child) => {
          const presentDays = child.attendance.filter((a) => a.status !== "ABSENT").length
          const rate = child.attendance.length
            ? Math.round((presentDays / child.attendance.length) * 100)
            : null
          const unpaid = child.fees.filter((f) => f.status !== "PAID")

          return (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/dashboard/students/${child.id}`} className="hover:underline">
                    {child.user.name}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {child.class ? `${child.class.name} ${child.class.section}` : "Not enrolled"} ·{" "}
                  {child.class ? `Roll ${child.rollNo}` : "—"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Attendance (30d)"
                    value={rate === null ? "—" : `${rate}%`}
                  />
                  <StatCard
                    label="Fees due"
                    value={unpaid.length}
                    tone={unpaid.length ? "warning" : "success"}
                    hint={unpaid.length ? totalDue(unpaid) : "All settled ✅"}
                  />
                </div>
                <Link
                  href={`/dashboard/grades`}
                  className="inline-block text-sm font-medium text-primary hover:underline"
                >
                  View grades →
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ---------- helpers ----------
function totalDue(fees: { amount: number }[]) {
  const total = fees.reduce((s, f) => s + f.amount, 0)
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)
}

function examAverage(results: { score: number }[]) {
  if (results.length === 0) return "—"
  const avg = results.reduce((s, r) => s + r.score, 0) / results.length
  return `${avg.toFixed(1)}`
}

function attendanceWindow() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  d.setHours(0, 0, 0, 0)
  return d
}

function todayDay(): number {
  const d = new Date()
  const day = d.getDay() // 0 = Sun
  return day >= 1 && day <= 5 ? day : 5 // Fri view on weekends
}

function OverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  )
}

