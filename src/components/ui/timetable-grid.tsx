import { WEEK_DAYS } from "@/lib/utils"
import { Badge } from "./card"

export type Slot = {
  id: string
  day: number
  start: string
  end: string
  subject: string
  teacher?: string | null
  room?: string | null
}

export const ATTENDANCE_STATUS = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const

export function TimetableGrid({
  slots,
  actionsSlot,
  onDelete,
}: {
  slots: Slot[]
  actionsSlot?: boolean
  onDelete?: (formData: FormData) => Promise<void>
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((day) => (
        <div key={`day-${day}`} className="rounded-md border border-border p-2">
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {WEEK_DAYS[day]}
          </p>
          {slots.filter((s) => s.day === day).length === 0 ? (
            <p className="py-1 text-xs text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-1.5">
              {slots
                .filter((s) => s.day === day)
                .map((slot) => (
                  <li key={slot.id} className="rounded bg-secondary/60 px-2 py-1 text-xs">
                    <div className="font-medium">{slot.subject}</div>
                    <div className="text-muted-foreground tabular-nums">
                      {slot.start}–{slot.end}
                      {slot.teacher ? ` · ${slot.teacher}` : ""}
                    </div>
                    {slot.room && (
                      <div className="text-muted-foreground">{slot.room}</div>
                    )}
                    {actionsSlot && onDelete && (
                      <form action={onDelete} className="mt-0.5">
                        <input type="hidden" name="id" value={slot.id} />
                        <button
                          title="Remove slot"
                          className="text-[10px] text-destructive hover:underline"
                        >
                          ✕ remove
                        </button>
                      </form>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

export function AttendanceBadgeGroup({
  records,
}: {
  records: { id: string; date: Date; status: string }[]
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {records.map((a) => (
        <li key={a.id} className="text-center">
          <span className="block text-xs text-muted-foreground">
            {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <Badge
            tone={
              a.status === "PRESENT"
                ? "success"
                : a.status === "ABSENT"
                  ? "destructive"
                  : "warning"
            }
          >
            {a.status[0]}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

export function GroupedResults({
  results,
}: {
  results: {
    id: string
    score: number
    exam: { id: string; name: string; date: Date }
    subject: { name: string }
  }[]
}) {
  const byExam = new Map<string, { name: string; date: Date; items: typeof results }>()
  for (const r of results) {
    const key = r.exam.id
    if (!byExam.has(key)) byExam.set(key, { name: r.exam.name, date: r.exam.date, items: [] })
    byExam.get(key)!.items.push(r)
  }

  return (
    <div className="space-y-4">
      {[...byExam.entries()].map(([examId, exam]) => {
        const avg = exam.items.reduce((s, r) => s + r.score, 0) / exam.items.length
        return (
          <div key={examId}>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-semibold">
                {exam.name}{" "}
                <span className="font-normal text-muted-foreground">
                  ·{" "}
                  {exam.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
              <p className="text-sm">
                Avg <span className="font-semibold tabular-nums">{avg.toFixed(1)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exam.items.map((r) => (
                <span key={r.id} className="rounded-md bg-secondary px-2 py-1 text-xs">
                  {r.subject.name}: <strong>{r.score}</strong>
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
