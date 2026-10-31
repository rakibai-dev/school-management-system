# EduDesk — School Management System

Full-stack school management web app built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + PostgreSQL (Prisma) + NextAuth v5 (credentials auth)**.

## Features

- **Role-based dashboards** — Admin, Teacher, Student, Parent (each sees a filtered UI)
- **Students** — enroll, assign to classes, guardian linking, profile with attendance/grades/fees
- **Teachers** — staff records, class-teacher and subject assignments
- **Classes & Subjects** — grade levels + sections, per-class subject/teacher assignments
- **Attendance** — per class + date marking with Present/Absent/Late/Excused
- **Exams & Grades** — schedule exams, spreadsheet-style grade entry, auto averages
- **Timetable** — weekly schedule per class with teacher/subject/room
- **Fees** — assign fees per student, track outstanding/paid
- **Announcements** — targeted at everyone, a role, or a specific class
- **Messaging** — internal 1:1 messaging between users

## Tech notes (Next.js 16)

- `cacheComponents` is enabled: every page prerenders a static shell and streams session/DB data inside `<Suspense>`.
- Auth guarding happens in `src/proxy.ts` (Next 16's renamed middleware) for optimistic redirects, plus `requireUser()/requireRole()` in the data layer for real authorization.
- All mutations are Server Actions with Zod validation.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (Docker) — matches the .env DATABASE_URL
docker compose up -d

# 3. Create schema + seed demo data
npm run db:migrate
npm run db:seed

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000 and sign in with a demo account (password: `password123`):

| Role    | Email                          |
| ------- | ------------------------------ |
| Admin   | admin@school.com               |
| Teacher | rachel.green@school.com        |
| Student | ava.thompson@student.school.com|
| Parent  | marta.thompson@family.com      |

> If port 5432 is busy on your machine the compose file maps Postgres to **5433** (already reflected in `.env`).

## Scripts

| Command                 | What it does                          |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Start the dev server                  |
| `npm run build`         | Production build                      |
| `npm run db:migrate`    | Apply schema changes (prisma migrate) |
| `npm run db:seed`       | Reseed demo data (wipes tables first) |
| `npm run db:studio`     | Open Prisma Studio                    |
| `npm run lint`          | ESLint                                |

## Project structure

```
prisma/               schema, migrations, seed script
src/app/
  api/auth/[...all]/  NextAuth route handler
  login/              sign-in page
  dashboard/          all app pages (role-filtered nav in sidebar.tsx)
src/actions/          server actions ("use server"), per module
src/components/ui/    small component library (Tailwind)
src/lib/              db client, session helpers, zod schemas, utils
src/proxy.ts          auth redirects (Next 16 middleware)
src/auth.ts           NextAuth config (credentials provider, JWT sessions)
```

## Not implemented (deliberate MVP scope)

- Password reset / change password (accounts are created by admins with `password123`)
- Mobile-app-style navigation polish (sidebar is desktop-first; use a wide window)
