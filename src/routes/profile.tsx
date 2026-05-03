import { createFileRoute } from "@tanstack/react-router";
import { User, Bell, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocalState, PROFILE_KEY, type Profile } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — StudentLife Organizer" },
      { name: "description", content: "Personalize your StudentLife experience." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [profile, setProfile] = useLocalState<Profile>(PROFILE_KEY, { name: "", school: "", notifications: true });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Profile & settings</h1>
        <p className="text-sm text-muted-foreground">Personal info and preferences. Stored locally on your device.</p>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)]"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <User className="h-7 w-7" />
        </span>
        <div>
          <p className="text-lg font-semibold">{profile.name || "Add your name"}</p>
          <p className="text-sm text-muted-foreground">{profile.school || "Add your school"}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); setSaved(true); }}
        className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Jane Student" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="school">School / University</Label>
          <Input id="school" value={profile.school} onChange={(e) => setProfile({ ...profile, school: e.target.value })} placeholder="State University" />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Reminder notifications</p>
              <p className="text-xs text-muted-foreground">Get nudged about tasks due today.</p>
            </div>
          </div>
          <Switch checked={profile.notifications} onCheckedChange={(v) => setProfile({ ...profile, notifications: v })} />
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-xs text-success">Saved ✓</span>}
          <Button type="submit" className="gap-1"><Save className="h-4 w-4" />Save changes</Button>
        </div>
      </form>
    </div>
  );
}
