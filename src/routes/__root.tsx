import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AppShell } from "@/components/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "StudentLife Organizer — Plan smarter, study calmer" },
      { name: "description", content: "All-in-one student planner with tasks, calendar, notes and daily inspiration." },
      { property: "og:title", content: "StudentLife Organizer — Plan smarter, study calmer" },
      { name: "twitter:title", content: "StudentLife Organizer — Plan smarter, study calmer" },
      { property: "og:description", content: "All-in-one student planner with tasks, calendar, notes and daily inspiration." },
      { name: "twitter:description", content: "All-in-one student planner with tasks, calendar, notes and daily inspiration." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/db9e537e-a460-4732-a665-f0667d336fc6/id-preview-f1af7b2e--5efa86d7-4ffc-4f72-a879-dabaf007efaf.lovable.app-1777825125257.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/db9e537e-a460-4732-a665-f0667d336fc6/id-preview-f1af7b2e--5efa86d7-4ffc-4f72-a879-dabaf007efaf.lovable.app-1777825125257.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: () => <AppShell />,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
