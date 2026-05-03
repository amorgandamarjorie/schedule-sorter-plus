import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { GraduationCap, LayoutDashboard, ListChecks, CalendarDays, NotebookPen, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/inspire", label: "Inspire", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">StudentLife</p>
              <p className="text-[11px] text-muted-foreground">Organizer</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-6">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
