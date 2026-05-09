import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CheckCircle2, Circle, Plus, CalendarDays, Sparkles, ListChecks, NotebookPen } from "lucide-react";
import { useLocalState, TASKS_KEY, NOTES_KEY, type Task, type Note } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — StudentLife Organizer" },
      { name: "description", content: "Your day at a glance: today's tasks, upcoming deadlines, and quick links." },
    ],
  }),
  component: Dashboard,
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Dashboard() {
  const [tasks, setTasks] = useLocalState<Task[]>(TASKS_KEY, []);
  const [notes] = useLocalState<Note[]>(NOTES_KEY, []);
  const today = todayStr();

  const todays = useMemo(() => tasks.filter((t) => t.dueDate === today), [tasks, today]);
  const upcoming = useMemo(
    () => tasks.filter((t) => t.dueDate > today && !t.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5),
    [tasks, today]
  );
  const done = tasks.filter((t) => t.completed).length;

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-3xl p-8 text-primary-foreground shadow-[var(--shadow-lg)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm/6 opacity-80" suppressHydrationWarning>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Welcome back 👋</h1>
          <p className="mt-2 text-sm/6 opacity-90">
            You have <span className="font-semibold">{todays.filter((t) => !t.completed).length}</span> task{todays.length === 1 ? "" : "s"} due today and <span className="font-semibold">{upcoming.length}</span> coming up.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="rounded-full">
              <Link to="/tasks"><Plus className="mr-1 h-4 w-4" />Add task</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full bg-white/10 text-primary-foreground hover:bg-white/20">
              <Link to="/inspire"><Sparkles className="mr-1 h-4 w-4" />Daily inspiration</Link>
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Today" value={todays.length} icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="Upcoming" value={upcoming.length} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard label="Completed" value={done} icon={<CheckCircle2 className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Today's tasks" link={{ to: "/tasks", label: "Manage" }}>
          {todays.length === 0 ? (
            <Empty text="Nothing due today. Enjoy a focused study block ✨" />
          ) : (
            <ul className="divide-y divide-border">
              {todays.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <button onClick={() => toggle(t.id)} aria-label="toggle">
                    {t.completed ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <span className={`flex-1 text-sm ${t.completed ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                  <PriorityBadge p={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming deadlines" link={{ to: "/calendar", label: "Calendar" }}>
          {upcoming.length === 0 ? (
            <Empty text="You're all caught up. 🎉" />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.dueDate).toDateString()}</p>
                  </div>
                  <PriorityBadge p={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section>
        <Panel title="Recent notes" link={{ to: "/notes", label: "All notes" }}>
          {notes.length === 0 ? (
            <Empty text="Capture your first lecture note." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {notes.slice(0, 4).map((n) => (
                <div key={n.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold"><NotebookPen className="h-4 w-4 text-primary" />{n.title || "Untitled"}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Panel({ title, link, children }: { title: string; link?: { to: "/tasks" | "/calendar" | "/notes"; label: string }; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {link && <Link to={link.to} className="text-xs font-medium text-primary hover:underline">{link.label} →</Link>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function PriorityBadge({ p }: { p: "low" | "medium" | "high" }) {
  const map = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-accent/30 text-accent-foreground",
    high: "bg-destructive/15 text-destructive",
  } as const;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${map[p]}`}>{p}</span>;
}
