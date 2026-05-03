import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocalState, TASKS_KEY, type Task } from "@/lib/storage";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — StudentLife Organizer" },
      { name: "description", content: "Monthly view of all your tasks, exams, and deadlines." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const [tasks] = useLocalState<Task[]>(TASKS_KEY, []);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ date: null, key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), key: `${year}-${month}-${d}` });
    return cells;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const arr = map.get(t.dueDate) ?? [];
      arr.push(t);
      map.set(t.dueDate, arr);
    }
    return map;
  }, [tasks]);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayKey = fmt(new Date());

  const [selected, setSelected] = useState<string>(todayKey);
  const selectedTasks = tasksByDate.get(selected) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Tasks sync here automatically by due date.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1 shadow-[var(--shadow-sm)]">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-full p-1.5 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <span className="px-2 text-sm font-medium">{monthName}</span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-full p-1.5 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((c) => {
            if (!c.date) return <div key={c.key} className="aspect-square" />;
            const key = fmt(c.date);
            const dayTasks = tasksByDate.get(key) ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selected;
            return (
              <button
                key={c.key}
                onClick={() => setSelected(key)}
                className={`group relative flex aspect-square flex-col items-stretch rounded-lg border p-1.5 text-left text-xs transition ${
                  isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-border hover:bg-muted/40"
                }`}
              >
                <span className={`inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] ${isToday ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"}`}>
                  {c.date.getDate()}
                </span>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className={`h-1.5 w-1.5 rounded-full ${
                        t.priority === "high" ? "bg-destructive" : t.priority === "medium" ? "bg-accent" : "bg-primary/60"
                      } ${t.completed ? "opacity-30" : ""}`}
                    />
                  ))}
                  {dayTasks.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayTasks.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold">{new Date(selected).toDateString()}</h2>
        {selectedTasks.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No tasks scheduled for this day.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                <span className={`text-sm ${t.completed ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  t.priority === "high" ? "bg-destructive/15 text-destructive" : t.priority === "medium" ? "bg-accent/30 text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}>{t.priority}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
