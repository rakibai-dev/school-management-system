import { z } from "zod"
import { AttendanceStatus } from "@prisma/client"

/** Form fields arrive as strings — "" means "not provided" */
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional(),
)

const optionalBoolean = z.preprocess(
  (v) => v === "on" || v === "true" || v === true,
  z.boolean().optional(),
)

const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce.date().optional(),
)

const optionalNumber = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce.number().int().min(0).optional(),
)

export const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

// ---------- Students ----------
export const createStudentSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.email("Valid email required"),
  password: optionalString,
  admissionNo: optionalString,
  dateOfBirth: optionalDate,
  gender: optionalString,
  address: optionalString,
  phone: optionalString,
  bloodGroup: optionalString,
})

export const updateStudentSchema = z.object({
  id: z.string().min(1),
  classId: optionalString,
  parentId: optionalString,
  rollNo: optionalNumber,
  dateOfBirth: optionalDate,
  gender: optionalString,
  address: optionalString,
  phone: optionalString,
  bloodGroup: optionalString,
})

// ---------- Teachers ----------
export const createTeacherSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.email("Valid email required"),
  password: optionalString,
  employeeNo: optionalString,
  qualification: optionalString,
  phone: optionalString,
})

export const updateTeacherSchema = z.object({
  id: z.string().min(1),
  qualification: optionalString,
  phone: optionalString,
})

// ---------- Classes ----------
export const createClassSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  section: z.string().trim().min(1, "Section is required").max(10),
  room: optionalString,
  classTeacherId: optionalString,
})

export const updateClassSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  section: z.string().trim().min(1).max(10),
  room: optionalString,
  classTeacherId: optionalString,
})

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  code: z
    .string()
    .trim()
    .min(2, "Code is required")
    .max(12)
    .transform((v) => v.toUpperCase()),
})

export const assignSubjectSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: optionalString,
})

// ---------- Attendance ----------
export const markAttendanceSchema = z.object({
  classId: z.string().min(1),
  date: z.coerce.date(),
  statuses: z.record(z.string(), z.enum(AttendanceStatus)),
  note: optionalString,
})

// ---------- Exams & Results ----------
export const createExamSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  classId: z.string().min(1),
  date: z.coerce.date(),
  maxScore: z.coerce.number().int().positive().default(100),
})

export const saveResultsSchema = z.object({
  examId: z.string().min(1),
  // dynamic fields score_<studentId>_<subjectId>; validated manually
})

// ---------- Timetable ----------
export const addSlotSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: optionalString,
  day: z.coerce.number().int().min(1).max(5),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Start time is required (HH:MM)"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "End time is required (HH:MM)"),
  room: optionalString,
})

// ---------- Fees ----------
export const createFeeSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().trim().min(2, "Title is required").max(120),
  amount: z.coerce.number().positive("Amount must be positive"),
  dueDate: z.coerce.date(),
  note: optionalString,
})

export const payFeeSchema = z.object({
  id: z.string().min(1),
})

// ---------- Announcements ----------
export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(140),
  body: z.string().trim().min(5, "Body is required"),
  audienceRole: optionalString,
  classId: optionalString,
})

// ---------- Messages ----------
export const sendMessageSchema = z.object({
  receiverId: z.string().min(1),
  body: z.string().trim().min(1, "Message cannot be empty").max(4000),
})

// ---------- Misc ----------
export const idSchema = z.object({ id: z.string().min(1) })
