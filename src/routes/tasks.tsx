import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, Filter } from "lucide-react";
import { useLocalState, TASKS_KEY, type Task, type Priority } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — StudentLife Organizer" },
      { name: "description", content: "Add, prioritize, and complete your assignments. Auto-syncs to your calendar." },
    ],
  }),
  component: TasksPage,
});

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TasksPage() {
  const [tasks, setTasks] = useLocalState<Task[]>(TASKS_KEY, []);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const filtered = useMemo(() => {
    const list = filter === "all" ? tasks : filter === "done" ? tasks.filter((t) => t.completed) : tasks.filter((t) => !t.completed);
    return [...list].sort((a, b) => Number(a.completed) - Number(b.completed) || a.dueDate.localeCompare(b.dueDate));
  }, [tasks, filter]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setTasks((prev) => [
      { id: uid(), title: title.trim(), notes: notes.trim() || undefined, dueDate, priority, completed: false, createdAt: Date.now() },
      ...prev,
    ]);
    setTitle("");
    setNotes("");
    setPriority("medium");
  };

  const toggle = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-sm text-muted-foreground">Stay on top of assignments. Each task automatically appears on your Calendar by due date.</p>
      </header>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <Input placeholder="What needs doing? (e.g. Read Chapter 4)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low priority</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High priority</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="gap-1"><Plus className="h-4 w-4" />Add</Button>
        </div>
        <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-3" />
      </form>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "active", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} task{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <ul className="space-y-2">
        {filtered.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            No tasks here. Add one above to get started.
          </li>
        )}
        {filtered.map((t) => (
          <li key={t.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-sm)]">
            <button onClick={() => toggle(t.id)} className="mt-0.5" aria-label="toggle">
              {t.completed ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`font-medium ${t.completed ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  t.priority === "high" ? "bg-destructive/15 text-destructive" : t.priority === "medium" ? "bg-accent/30 text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}>{t.priority}</span>
                <span className="text-xs text-muted-foreground">Due {new Date(t.dueDate).toDateString()}</span>
              </div>
              {t.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.notes}</p>}
            </div>
            <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
