import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { RECAPTCHA_SITE_KEY, RECAPTCHA_TEST_KEY } from "@/lib/firebase";
import { AuthShell, Field, Divider, GoogleIcon } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — StudentLife Organizer" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUpEmail, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
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
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (!captcha) return setErr("Please complete the reCAPTCHA.");
    setBusy(true);
    try {
      await signUpEmail(email, password, name);
      navigate({ to: "/" });
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed");
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
      setErr(e?.message ?? "Google sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start organizing your student life today">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="name" label="Full name" icon={<UserIcon className="h-4 w-4" />}>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Student" />
        </Field>
        <Field id="email" label="Email" icon={<Mail className="h-4 w-4" />}>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
        </Field>
        <Field id="password" label="Password" icon={<Lock className="h-4 w-4" />}>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </Field>

        <div className="flex justify-center">
          <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey} onChange={setCaptcha} />
        </div>

        {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account
        </Button>
      </form>

      <Divider />

      <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
        <GoogleIcon /> Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
