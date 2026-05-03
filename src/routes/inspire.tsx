import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles, Quote, AlertTriangle, BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalState, TASKS_KEY, type Task } from "@/lib/storage";

export const Route = createFileRoute("/inspire")({
  head: () => ({
    meta: [
      { title: "Daily Inspiration — StudentLife Organizer" },
      { name: "description", content: "Live motivational quotes and an Advice Slip from public APIs to keep you focused." },
    ],
  }),
  component: InspirePage,
});

interface QuoteData {
  text: string;
  author: string;
}

interface AdviceData {
  id: number;
  advice: string;
}

const QUOTE_API = "https://api.quotable.io/random?tags=education|wisdom|inspirational";
const ADVICE_API = "https://api.adviceslip.com/advice";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function InspirePage() {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [advice, setAdvice] = useState<AdviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceFail, setForceFail] = useState(false);
  const [, setTasks] = useLocalState<Task[]>(TASKS_KEY, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (forceFail) throw new Error("Simulated failure: unable to reach inspiration service.");

      const [qRes, aRes] = await Promise.all([
        fetch(QUOTE_API, { cache: "no-store" }),
        fetch(`${ADVICE_API}?t=${Date.now()}`, { cache: "no-store" }),
      ]);
      if (!qRes.ok) throw new Error(`Quote API failed (${qRes.status})`);
      if (!aRes.ok) throw new Error(`Advice API failed (${aRes.status})`);

      const q = await qRes.json();
      const a = await aRes.json();
      setQuote({ text: q.content, author: q.author });
      setAdvice({ id: a.slip.id, advice: a.slip.advice });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setQuote(null);
      setAdvice(null);
    } finally {
      setLoading(false);
    }
  }, [forceFail]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAsTask = () => {
    if (!advice) return;
    setTasks((prev) => [
      { id: uid(), title: `Reflect: ${advice.advice}`, dueDate: todayStr(), priority: "low", completed: false, createdAt: Date.now() },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold"><Sparkles className="h-7 w-7 text-accent" />Daily Inspiration</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Live data from <code className="rounded bg-muted px-1">api.quotable.io</code> and <code className="rounded bg-muted px-1">api.adviceslip.com</code>. Refresh to fetch a new quote and advice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={forceFail} onChange={(e) => setForceFail(e.target.checked)} className="accent-destructive" />
            Simulate failure
          </label>
          <Button onClick={load} disabled={loading} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <h2 className="font-semibold text-destructive">Couldn't load inspiration</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button onClick={load} variant="outline" size="sm" className="mt-3 gap-1"><RefreshCw className="h-3.5 w-3.5" />Try again</Button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && quote && advice && (
        <div className="grid gap-4 sm:grid-cols-2">
          <article
            className="relative overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-[var(--shadow-glow)]"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Quote className="h-7 w-7 opacity-80" />
            <p className="mt-3 text-lg/relaxed font-medium">"{quote.text}"</p>
            <p className="mt-4 text-sm opacity-90">— {quote.author}</p>
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-accent-foreground">
                <BookOpen className="h-3.5 w-3.5" />Advice #{advice.id}
              </span>
              <Button onClick={saveAsTask} variant="outline" size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" />Add to today
              </Button>
            </div>
            <p className="mt-4 text-lg/relaxed font-medium">{advice.advice}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Endpoint</dt>
                <dd className="truncate font-mono">{ADVICE_API}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Field used</dt>
                <dd className="font-mono">slip.advice</dd>
              </div>
            </dl>
          </article>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-muted/40 p-5 text-sm">
        <h3 className="font-semibold">About this feature</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li><b>APIs:</b> Quotable (<code>/random</code>) returns <code>content</code> and <code>author</code>. Advice Slip (<code>/advice</code>) returns <code>slip.id</code> and <code>slip.advice</code>.</li>
          <li><b>States handled:</b> loading skeletons, success cards, and an error panel with retry.</li>
          <li><b>Refresh:</b> the Refresh button re-issues both requests in parallel.</li>
          <li><b>Sync:</b> "Add to today" creates a low-priority task on the current date — visible on Tasks and the Calendar.</li>
        </ul>
      </section>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-48 animate-pulse rounded-2xl border border-border bg-muted/40" />
  );
}
