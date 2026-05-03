import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocalState, NOTES_KEY, type Note } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — StudentLife Organizer" },
      { name: "description", content: "Save lecture notes, reminders, and study summaries." },
    ],
  }),
  component: NotesPage,
});

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function NotesPage() {
  const [notes, setNotes] = useLocalState<Note[]>(NOTES_KEY, []);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    setNotes((prev) => [{ id: uid(), title: title.trim(), body: body.trim(), updatedAt: Date.now() }, ...prev]);
    setTitle("");
    setBody("");
  };
  const remove = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Notes</h1>
        <p className="text-sm text-muted-foreground">Capture lecture summaries and quick reminders.</p>
      </header>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
        <Input placeholder="Note title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Start typing…" value={body} onChange={(e) => setBody(e.target.value)} className="mt-3 min-h-[120px]" />
        <div className="mt-3 flex justify-end">
          <Button type="submit" className="gap-1"><Plus className="h-4 w-4" />Save note</Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          No notes yet. Save your first study summary above.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((n) => (
            <article key={n.id} className="group relative rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]">
              <button onClick={() => remove(n.id)} className="absolute right-3 top-3 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive" aria-label="delete">
                <Trash2 className="h-4 w-4" />
              </button>
              <h3 className="pr-6 font-semibold">{n.title || "Untitled"}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">{new Date(n.updatedAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
