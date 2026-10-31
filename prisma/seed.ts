import bcrypt from "bcryptjs"
import { PrismaClient, type AttendanceStatus, type FeeStatus } from "@prisma/client"

const db = new PrismaClient()

const PASSWORD = "password123"
const hash = bcrypt.hashSync(PASSWORD, 12)

const pastWeekdays = (count: number) => {
  const dates: Date[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  while (dates.length < count) {
    if (d.getDay() > 0 && d.getDay() < 6) dates.push(new Date(d))
    d.setDate(d.getDate() - 1)
  }
  return dates.reverse()
}

type StudentSeed = {
  name: string
  email: string
  admissionNo: string
  rollNo: number
}

const STUDENTS_BY_CLASS: Record<string, StudentSeed[]> = {
  "10-A": [
    { name: "Ava Thompson", email: "ava.thompson@student.school.com", admissionNo: "ADM-1001", rollNo: 1 },
    { name: "Liam Carter", email: "liam.carter@student.school.com", admissionNo: "ADM-1002", rollNo: 2 },
    { name: "Sofia Nguyen", email: "sofia.nguyen@student.school.com", admissionNo: "ADM-1003", rollNo: 3 },
    { name: "Noah Patel", email: "noah.patel@student.school.com", admissionNo: "ADM-1004", rollNo: 4 },
  ],
  "9-B": [
    { name: "Maya Okafor", email: "maya.okafor@student.school.com", admissionNo: "ADM-2001", rollNo: 1 },
    { name: "Ethan Brooks", email: "ethan.brooks@student.school.com", admissionNo: "ADM-2002", rollNo: 2 },
    { name: "Zoe Ramirez", email: "zoe.ramirez@student.school.com", admissionNo: "ADM-2003", rollNo: 3 },
  ],
  "11-A": [
    { name: "Lucas Meyer", email: "lucas.meyer@student.school.com", admissionNo: "ADM-3001", rollNo: 1 },
    { name: "Emma Chen", email: "emma.chen@student.school.com", admissionNo: "ADM-3002", rollNo: 2 },
    { name: "Omar Haddad", email: "omar.haddad@student.school.com", admissionNo: "ADM-3003", rollNo: 3 },
  ],
}

const SUBJECTS = [
  { name: "Mathematics", code: "MATH" },
  { name: "English", code: "ENG" },
  { name: "Science", code: "SCI" },
  { name: "History", code: "HIST" },
]

const TEACHERS = [
  { name: "Rachel Green", email: "rachel.green@school.com", employeeNo: "EMP-001", qualification: "MSc Mathematics" },
  { name: "Daniel Kim", email: "daniel.kim@school.com", employeeNo: "EMP-002", qualification: "MA Literature" },
  { name: "Priya Sharma", email: "priya.sharma@school.com", employeeNo: "EMP-003", qualification: "MSc Physics" },
  { name: "James Wright", email: "james.wright@school.com", employeeNo: "EMP-004", qualification: "MA History" },
]

// teacher index by subject code
const SUBJECT_TEACHER: Record<string, number> = {
  MATH: 0,
  ENG: 1,
  SCI: 2,
  HIST: 3,
}

async function main() {
  console.log("Seeding database…")

  // wipe everything to keep the seed idempotent
  await db.$transaction([
    db.message.deleteMany(),
    db.announcement.deleteMany(),
    db.fee.deleteMany(),
    db.result.deleteMany(),
    db.exam.deleteMany(),
    db.timetableSlot.deleteMany(),
    db.attendance.deleteMany(),
    db.teacherSubject.deleteMany(),
    db.subject.deleteMany(),
    db.class.deleteMany(),
    db.student.deleteMany(),
    db.teacher.deleteMany(),
    db.parent.deleteMany(),
    db.user.deleteMany(),
  ])

  const days = pastWeekdays(5)

  // ---- Admin ----
  const admin = await db.user.create({
    data: {
      name: "Principal Adams",
      email: "admin@school.com",
      passwordHash: hash,
      role: "ADMIN",
    },
  })

  // ---- Subjects ----
  const subjects = await Promise.all(
    SUBJECTS.map((s) => db.subject.create({ data: s })),
  )
  const subjectByCode = new Map(subjects.map((s) => [s.code, s]))

  // ---- Teachers ----
  const teachers = await Promise.all(
    TEACHERS.map((t) =>
      db.teacher.create({
        data: {
          employeeNo: t.employeeNo,
          qualification: t.qualification,
          phone: "+1 555 010" + t.employeeNo.slice(-3),
          user: { create: { name: t.name, email: t.email, passwordHash: hash, role: "TEACHER" } },
        },
      }),
    ),
  )

  // ---- Parent ----
  const parentUser = await db.user.create({
    data: { name: "Marta Thompson", email: "marta.thompson@family.com", passwordHash: hash, role: "PARENT" },
  })
  const parent = await db.parent.create({
    data: { userId: parentUser.id, relation: "Mother", phone: "+1 555 0199" },
  })

  // ---- Classes, students, assignments, timetable ----
  const periodTimes = ["08:00", "08:55", "09:50", "10:45", "11:40"]
  const classNames = Object.keys(STUDENTS_BY_CLASS)

  for (let ci = 0; ci < classNames.length; ci++) {
    const label = classNames[ci] // e.g. "10-A"
    const [grade, section] = label.split("-")
    const name = `Grade ${grade}`

    const cls = await db.class.create({
      data: {
        name,
        section,
        room: `Room ${100 + ci + 1}`,
        classTeacherId: teachers[ci % teachers.length].id,
      },
    })

    // Teach every subject in every class
    await Promise.all(
      subjects.map((subject) => {
        const teacher = teachers[SUBJECT_TEACHER[subject.code]]
        return db.teacherSubject.create({
          data: { classId: cls.id, subjectId: subject.id, teacherId: teacher.id },
        })
      }),
    )

    // Students
    for (const s of STUDENTS_BY_CLASS[label]) {
      const studentUser = await db.user.create({
        data: { name: s.name, email: s.email, passwordHash: hash, role: "STUDENT" },
      })
      const student = await db.student.create({
        data: {
          userId: studentUser.id,
          admissionNo: s.admissionNo,
          rollNo: s.rollNo,
          classId: cls.id,
          parentId: s.name.includes("Thompson") ? parent.id : null,
          dateOfBirth: new Date(2008 + ci, 5, 15),
          gender: null,
          address: "12 Maple Street",
        },
      })

      // Attendance for the last 5 school days
      for (const date of days) {
        const roll = Math.random()
        const status: AttendanceStatus =
          roll > 0.93 ? "ABSENT" : roll > 0.87 ? "LATE" : "PRESENT"
        await db.attendance.create({
          data: { studentId: student.id, classId: cls.id, date, status },
        })
      }

      // One exam with results, graded a week ago
      const exam = await db.exam.create({
        data: {
          name: "Mid Terms",
          classId: cls.id,
          date: days[0],
          maxScore: 100,
        },
      })
      await Promise.all(
        subjects.map((subject) =>
          db.result.create({
            data: {
              examId: exam.id,
              studentId: student.id,
              subjectId: subject.id,
              score: 55 + Math.floor(Math.random() * 40),
            },
          }),
        ),
      )

      // Fees
      const paid = Math.random() > 0.5
      await db.fee.create({
        data: {
          studentId: student.id,
          title: `Tuition — ${days[0].toLocaleString("en-US", { month: "long" })}`,
          amount: 450,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: paid ? "PAID" : "UNPAID",
          paidAt: paid ? new Date() : null,
        },
      })
    }

    // Timetable — Mon–Fri, 5 periods/day, rotating subjects & teachers
    for (let day = 1; day <= 5; day++) {
      for (let period = 0; period < 5; period++) {
        const subject = subjects[(ci + day + period) % subjects.length]
        const teacher = teachers[SUBJECT_TEACHER[subject.code]]
        const start = periodTimes[period]
        const [h, m] = start.split(":").map(Number)
        const end = `${String(h + (m + 45 >= 60 ? 1 : 0)).padStart(2, "0")}:${String((m + 45) % 60).padStart(2, "0")}`
        await db.timetableSlot.create({
          data: {
            classId: cls.id,
            subjectId: subject.id,
            teacherId: teacher.id,
            day,
            start,
            end,
            room: `Room ${100 + ci + 1}`,
          },
        })
      }
    }
  }

  // ---- Announcements ----
  await db.announcement.create({
    data: {
      title: "Science Fair — sign up open",
      body: "Register your project with your class teacher before Friday. Participation is compulsory for Grade 9 and above.",
      authorId: admin.id,
      audienceRole: null,
    },
  })
  await db.announcement.create({
    data: {
      title: "Parent–teacher meeting",
      body: "scheduled this Saturday, 10:00 AM in the main hall. Please confirm attendance with your child's class teacher.",
      authorId: admin.id,
      audienceRole: "PARENT",
    },
  })

  console.log(`Seed complete.`)
  console.log(`  Admin:    admin@school.com / ${PASSWORD}`)
  console.log(`  Teacher:  rachel.green@school.com / ${PASSWORD}`)
  console.log(`  Student:  ava.thompson@student.school.com / ${PASSWORD}`)
  console.log(`  Parent:   marta.thompson@family.com / ${PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
