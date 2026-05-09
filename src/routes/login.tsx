import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import type ReCAPTCHA from "react-google-recaptcha";
import { ClientReCAPTCHA } from "@/components/ClientReCAPTCHA";
import { GraduationCap, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { RECAPTCHA_SITE_KEY, RECAPTCHA_TEST_KEY } from "@/lib/firebase";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — StudentLife Organizer" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signInEmail, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const siteKey = RECAPTCHA_SITE_KEY.startsWith("YOUR_") ? RECAPTCHA_TEST_KEY : RECAPTCHA_SITE_KEY;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!captcha) {
      setErr("Please complete the reCAPTCHA.");
      return;
    }
    setBusy(true);
    try {
      await signInEmail(email, password);
      navigate({ to: "/" });
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed");
      recaptchaRef.current?.reset();
      setCaptcha(null);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setErr("");
    setBusy(true);
    try {
      await signInGoogle();
      navigate({ to: "/" });
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your study journey">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="email" label="Email" icon={<Mail className="h-4 w-4" />}>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
        </Field>
        <Field id="password" label="Password" icon={<Lock className="h-4 w-4" />}>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>

        <div className="flex justify-center">
          <ClientReCAPTCHA ref={recaptchaRef} sitekey={siteKey} onChange={setCaptcha} />
        </div>

        {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in
        </Button>
      </form>

      <Divider />

      <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
        <GoogleIcon /> Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-glow)]"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <GraduationCap className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">{children}</div>
      </div>
    </div>
  );
}

export function Field({ id, label, icon, children }: { id: string; label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</Label>
      {children}
    </div>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.1 5C40.9 35 43.5 30 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
