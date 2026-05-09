import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { doc, getFirestore, onSnapshot, setDoc } from "firebase/firestore";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

type Screen = "Dashboard" | "Tasks" | "Calendar" | "Notes" | "Inspire" | "Profile";
type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  notes?: string;
  dueDate: string;
  dueTime?: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
}

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

interface Profile {
  name: string;
  school: string;
  notifications: boolean;
}

interface DailyQuote {
  text: string;
  author: string;
  date: string; // YYYY-MM-DD
}

interface Favorite {
  id: string;
  type: "quote" | "advice";
  content: string;
  authorOrId?: string;
  createdAt: number;
}

interface RemoteState {
  tasks: Task[];
  notes: Note[];
  profile: Profile;
  favorites: Favorite[];
}

interface LocalUser {
  uid: string;
  displayName: string;
  email: string;
}

interface QuoteData {
  text: string;
  author: string;
}

interface AdviceData {
  id: number;
  advice: string;
}

const TASKS_KEY = "studentlife.tasks";
const NOTES_KEY = "studentlife.notes";
const PROFILE_KEY = "studentlife.profile";
const FAVORITES_KEY = "studentlife.favorites";
const DAILY_QUOTE_KEY = "studentlife.dailyQuote";
const LOCAL_SESSION_KEY = "studentlife.localSession";
const EMPTY_TASKS: Task[] = [];
const EMPTY_NOTES: Note[] = [];
const EMPTY_FAVORITES: Favorite[] = [];
const DEFAULT_PROFILE: Profile = {
  name: "",
  school: "",
  notifications: true,
};
const firebaseConfig = {
  apiKey: "AIzaSyBVht-wO-m_l5ctqnHg19QjswAJTsV06Js",
  authDomain: "schedule-sorter-plus-mai-a1021.firebaseapp.com",
  projectId: "schedule-sorter-plus-mai-a1021",
  storageBucket: "schedule-sorter-plus-mai-a1021.firebasestorage.app",
  messagingSenderId: "944246574567",
  appId: "1:944246574567:android:bd4a51305dcf106c7a4142",
};
const QUOTE_API = "https://dummyjson.com/quotes/random";
const ADVICE_API = "https://api.adviceslip.com/advice";

const tabs: Screen[] = ["Dashboard", "Tasks", "Calendar", "Notes", "Inspire", "Profile"];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function todayStr() {
  const d = new Date();
  return formatDateKey(d);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function prettyDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateKey
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function prettyDue(task: Task) {
  return `${prettyDate(task.dueDate)}${task.dueTime ? ` at ${task.dueTime}` : ""}`;
}

function taskSortValue(task: Task) {
  return `${task.dueDate}T${task.dueTime || "23:59"}`;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getFriendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("auth/api-key-not-valid")) {
    return "Firebase API key is not valid for this project. Replace google-services.json with the latest file from Firebase.";
  }
  if (message.includes("auth/configuration-not-found")) {
    return "Firebase Authentication is not fully set up for this project. Enable Email/Password in Firebase Console.";
  }
  if (message.includes("auth/network-request-failed")) {
    return "Could not reach Firebase. Check your internet connection and try again.";
  }
  if (message.includes("auth/operation-not-allowed")) {
    return "Email/Password sign-in is not enabled in Firebase Authentication.";
  }
  if (message.includes("auth/user-not-found")) {
    return "No account exists for this email yet. Tap Create a new account first.";
  }
  if (message.includes("auth/wrong-password")) return "Password is incorrect.";
  if (message.includes("auth/email-already-in-use"))
    return "An account already exists for this email.";
  if (message.includes("auth/invalid-credential")) return "Email or password is incorrect.";
  if (message.includes("auth/invalid-email")) return "Enter a valid email address.";
  if (message.includes("auth/weak-password")) return "Password must be at least 6 characters.";
  if (message.includes("auth/unauthorized-domain")) {
    return "Firebase needs this app domain added under Authentication authorized domains.";
  }
  return message || "Authentication failed.";
}

function useStoredState<T>(key: string, initial: T) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!mounted) return;
        setState(raw ? (JSON.parse(raw) as T) : initial);
      })
      .catch(() => undefined)
      .finally(() => mounted && setReady(true));
    return () => {
      mounted = false;
    };
  }, [initial, key]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => undefined);
  }, [key, ready, state]);

  return [state, setState, ready] as const;
}

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firebaseAuth: Auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export default function App() {
  const [screen, setScreen] = useState<Screen>("Dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [localUser, setLocalUser, localReady] = useStoredState<LocalUser | null>(
    LOCAL_SESSION_KEY,
    null,
  );
  const [tasks, setTasks] = useStoredState<Task[]>(TASKS_KEY, EMPTY_TASKS);
  const [notes, setNotes] = useStoredState<Note[]>(NOTES_KEY, EMPTY_NOTES);
  const [favorites, setFavorites] = useStoredState<Favorite[]>(FAVORITES_KEY, EMPTY_FAVORITES);
  const [profile, setProfile] = useStoredState<Profile>(PROFILE_KEY, DEFAULT_PROFILE);
  const [dailyQuote, setDailyQuote] = useStoredState<DailyQuote | null>(DAILY_QUOTE_KEY, null);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) setRemoteReady(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const stateRef = doc(firestore, "users", user.uid, "organizer", "state");
    return onSnapshot(
      stateRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setRemoteReady(true);
          return;
        }
        const data = snapshot.data() as Partial<RemoteState> | undefined;
        setTasks(data?.tasks ?? EMPTY_TASKS);
        setNotes(data?.notes ?? EMPTY_NOTES);
        setFavorites(data?.favorites ?? EMPTY_FAVORITES);
        setProfile({
          ...DEFAULT_PROFILE,
          ...(data?.profile ?? {}),
          name: data?.profile?.name || user.displayName || "",
        });
        setRemoteReady(true);
      },
      () => setRemoteReady(true),
    );
  }, [setNotes, setProfile, setTasks, setFavorites, user]);

  useEffect(() => {
    if (!user || !remoteReady) return;
    const stateRef = doc(firestore, "users", user.uid, "organizer", "state");
    setDoc(stateRef, { tasks, notes, profile, favorites }, { merge: true }).catch(() => undefined);
  }, [notes, profile, remoteReady, tasks, favorites, user]);

  const activeUser = user
    ? { displayName: user.displayName || "", email: user.email || "" }
    : localUser;

  const ready = authReady && localReady && (!user || remoteReady);

  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!activeUser) {
    return <AuthScreen auth={firebaseAuth} setProfile={setProfile} setLocalUser={setLocalUser} />;
  }

  const signOut = () => {
    firebaseSignOut(firebaseAuth).catch(() => undefined);
    setLocalUser(null);
    setScreen("Dashboard");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <View>
          <Text style={styles.appName}>StudentLife</Text>
          <Text style={styles.appSubhead}>{activeUser.displayName || activeUser.email}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {screen === "Dashboard" && (
          <Dashboard tasks={tasks} setTasks={setTasks} notes={notes} go={setScreen} />
        )}
        {screen === "Tasks" && <TasksScreen tasks={tasks} setTasks={setTasks} />}
        {screen === "Calendar" && <CalendarScreen tasks={tasks} />}
        {screen === "Notes" && <NotesScreen notes={notes} setNotes={setNotes} />}
        {screen === "Inspire" && (
          <InspireScreen
            setTasks={setTasks}
            favorites={favorites}
            setFavorites={setFavorites}
            profile={profile}
            dailyQuote={dailyQuote}
            setDailyQuote={setDailyQuote}
          />
        )}
        {screen === "Profile" && (
          <ProfileScreen profile={profile} setProfile={setProfile} onSignOut={signOut} />
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="button"
            onPress={() => setScreen(tab)}
            style={[styles.tabButton, screen === tab && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, screen === tab && styles.tabLabelActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function AuthScreen({
  auth,
  setProfile,
  setLocalUser,
}: {
  auth: Auth;
  setProfile: Dispatch<SetStateAction<Profile>>;
  setLocalUser: Dispatch<SetStateAction<LocalUser | null>>;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [canUseLocal, setCanUseLocal] = useState(false);

  const submit = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    setError("");
    setCanUseLocal(false);

    if (!cleanEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (mode === "signup") {
      if (!cleanName) {
        setError("Enter your name.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(credential.user, { displayName: cleanName });
        setProfile((current) => ({ ...current, name: current.name || cleanName }));
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err) {
      setError(getFriendlyAuthError(err));
      setCanUseLocal(true);
    } finally {
      setBusy(false);
    }
  };

  const continueLocally = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split("@")[0] || "Student";
    if (!cleanEmail) {
      setError("Enter your email first.");
      return;
    }
    setProfile((current) => ({ ...current, name: current.name || cleanName }));
    setLocalUser({
      uid: `local-${cleanEmail}`,
      displayName: cleanName,
      email: cleanEmail,
    });
  };

  const switchMode = () => {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setError("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
        <View style={styles.authLogo}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={styles.authTitle}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </Text>
        <Text style={styles.authSubtitle}>
          {mode === "login"
            ? "Sign in with Firebase to open your organizer."
            : "Create a Firebase account for your organizer."}
        </Text>

        <View style={styles.authCard}>
          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {!!error && <Text style={styles.authError}>{error}</Text>}
          {mode === "login" && (
            <Text style={styles.authHint}>
              First time in this Firebase project? Create an account first.
            </Text>
          )}
          <PrimaryButton
            label={busy ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}
            onPress={submit}
          />
          {canUseLocal && (
            <SecondaryButton label="Continue on this device" onPress={continueLocally} />
          )}
          <Text style={styles.authHint}>
            This Android app uses Firebase Email/Password. Native Google sign-in needs SHA
            fingerprints and Android OAuth setup.
          </Text>
          <Pressable onPress={switchMode} style={styles.authSwitch}>
            <Text style={styles.authSwitchText}>
              {mode === "login"
                ? "Need an account? Create one"
                : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Dashboard({
  tasks,
  setTasks,
  notes,
  go,
}: {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  notes: Note[];
  go: (screen: Screen) => void;
}) {
  const today = todayStr();
  const todays = useMemo(() => tasks.filter((task) => task.dueDate === today), [tasks, today]);
  const upcoming = useMemo(
    () =>
      tasks
        .filter((task) => task.dueDate > today && !task.completed)
        .sort((a, b) => taskSortValue(a).localeCompare(taskSortValue(b)))
        .slice(0, 5),
    [tasks, today],
  );
  const completed = tasks.filter((task) => task.completed).length;

  const toggle = (id: string) =>
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroDate}>
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <Text style={styles.heroTitle}>Welcome back</Text>
        <Text style={styles.heroCopy}>
          You have {todays.filter((task) => !task.completed).length} task
          {todays.length === 1 ? "" : "s"} due today and {upcoming.length} coming up.
        </Text>
        <View style={styles.row}>
          <PrimaryButton label="Add task" onPress={() => go("Tasks")} />
          <SecondaryButton label="Inspiration" onPress={() => go("Inspire")} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Today" value={todays.length} />
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Completed" value={completed} />
      </View>

      <Panel title="Today's Tasks">
        {todays.length === 0 ? (
          <Empty text="Nothing due today." />
        ) : (
          todays.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={() => toggle(task.id)} />
          ))
        )}
      </Panel>

      <Panel title="Upcoming Deadlines">
        {upcoming.length === 0 ? (
          <Empty text="You are all caught up." />
        ) : (
          upcoming.map((task) => <CompactTask key={task.id} task={task} />)
        )}
      </Panel>

      <Panel title="Recent Notes">
        {notes.length === 0 ? (
          <Empty text="Capture your first lecture note." />
        ) : (
          notes.slice(0, 3).map((note) => (
            <View key={note.id} style={styles.notePreview}>
              <Text style={styles.itemTitle}>{note.title || "Untitled"}</Text>
              <Text style={styles.mutedText} numberOfLines={3}>
                {note.body}
              </Text>
            </View>
          ))
        )}
      </Panel>
    </View>
  );
}

function TasksScreen({
  tasks,
  setTasks,
}: {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const filtered = useMemo(() => {
    const list =
      filter === "all"
        ? tasks
        : filter === "done"
          ? tasks.filter((task) => task.completed)
          : tasks.filter((task) => !task.completed);
    return [...list].sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        taskSortValue(a).localeCompare(taskSortValue(b)),
    );
  }, [filter, tasks]);

  const addTask = () => {
    if (!title.trim()) return;
    if (dueTime.trim() && !isValidTime(dueTime.trim())) {
      Alert.alert("Check the time", "Use 24-hour time like 09:00 or 18:30.");
      return;
    }
    setTasks((current) => [
      {
        id: uid(),
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueDate,
        dueTime: dueTime.trim() || undefined,
        priority,
        completed: false,
        createdAt: Date.now(),
      },
      ...current,
    ]);
    setTitle("");
    setNotes("");
    setDueTime("");
    setPriority("medium");
  };

  const toggle = (id: string) =>
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );

  const remove = (id: string) => {
    Alert.alert("Delete task?", "This will remove the task from your list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => setTasks((current) => current.filter((task) => task.id !== id)),
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenTitle title="Tasks" subtitle="Add, prioritize, and complete assignments." />
      <Panel title="New Task">
        <TextInput
          style={styles.input}
          placeholder="What needs doing?"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Due date: YYYY-MM-DD"
          value={dueDate}
          onChangeText={setDueDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Due time: HH:MM"
          value={dueTime}
          onChangeText={setDueTime}
          keyboardType="numbers-and-punctuation"
        />
        <Segmented<Priority>
          value={priority}
          options={["low", "medium", "high"]}
          onChange={setPriority}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
        <PrimaryButton label="Add task" onPress={addTask} />
      </Panel>

      <Segmented value={filter} options={["all", "active", "done"]} onChange={setFilter} />

      {filtered.length === 0 ? (
        <Empty text="No tasks here. Add one above to get started." />
      ) : (
        filtered.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => toggle(task.id)}
            onDelete={() => remove(task.id)}
          />
        ))
      )}
    </View>
  );
}

function CalendarScreen({ tasks }: { tasks: Task[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(todayStr());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: Array<Date | null> = Array.from({ length: firstDay }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) list.push(new Date(year, month, day));
    return list;
  }, [month, year]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
    });
    return map;
  }, [tasks]);

  const selectedTasks = tasksByDate.get(selected) ?? [];
  const sortedSelectedTasks = [...selectedTasks].sort((a, b) =>
    taskSortValue(a).localeCompare(taskSortValue(b)),
  );

  return (
    <View style={styles.screen}>
      <ScreenTitle title="Calendar" subtitle="Tasks appear here by due date." />
      <View style={styles.monthHeader}>
        <SecondaryButton label="Prev" onPress={() => setCursor(new Date(year, month - 1, 1))} />
        <Text style={styles.monthTitle}>
          {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </Text>
        <SecondaryButton label="Next" onPress={() => setCursor(new Date(year, month + 1, 1))} />
      </View>
      <View style={styles.calendarCard}>
        <View style={styles.weekRow}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <Text key={day} style={styles.weekLabel}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((date, index) => {
            if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
            const key = formatDateKey(date);
            const dayTasks = tasksByDate.get(key) ?? [];
            const isSelected = key === selected;
            const isToday = key === todayStr();
            return (
              <Pressable
                key={key}
                style={[styles.dayCell, isSelected && styles.daySelected]}
                onPress={() => setSelected(key)}
              >
                <Text style={[styles.dayNumber, isToday && styles.dayToday]}>{date.getDate()}</Text>
                {dayTasks.length > 0 && (
                  <Text style={styles.dayDots}>{"*".repeat(Math.min(dayTasks.length, 3))}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      <Panel title={prettyDate(selected)}>
        {selectedTasks.length === 0 ? (
          <Empty text="No tasks scheduled for this day." />
        ) : (
          sortedSelectedTasks.map((task) => <CompactTask key={task.id} task={task} />)
        )}
      </Panel>
    </View>
  );
}

function NotesScreen({
  notes,
  setNotes,
}: {
  notes: Note[];
  setNotes: Dispatch<SetStateAction<Note[]>>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const addNote = () => {
    if (!title.trim() && !body.trim()) return;
    setNotes((current) => [
      { id: uid(), title: title.trim(), body: body.trim(), updatedAt: Date.now() },
      ...current,
    ]);
    setTitle("");
    setBody("");
  };

  const remove = (id: string) => setNotes((current) => current.filter((note) => note.id !== id));

  return (
    <View style={styles.screen}>
      <ScreenTitle title="Notes" subtitle="Capture lecture summaries and quick reminders." />
      <Panel title="New Note">
        <TextInput
          style={styles.input}
          placeholder="Note title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textAreaLarge]}
          placeholder="Start typing..."
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />
        <PrimaryButton label="Save note" onPress={addNote} />
      </Panel>
      {notes.length === 0 ? (
        <Empty text="No notes yet. Save your first study summary above." />
      ) : (
        notes.map((note) => (
          <View key={note.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{note.title || "Untitled"}</Text>
              <Pressable onPress={() => remove(note.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
            <Text style={styles.noteBody}>{note.body}</Text>
            <Text style={styles.mutedText}>{new Date(note.updatedAt).toLocaleString()}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function InspireScreen({
  setTasks,
  favorites,
  setFavorites,
  profile,
  dailyQuote,
  setDailyQuote,
}: {
  setTasks: Dispatch<SetStateAction<Task[]>>;
  favorites: Favorite[];
  setFavorites: Dispatch<SetStateAction<Favorite[]>>;
  profile: Profile;
  dailyQuote: DailyQuote | null;
  setDailyQuote: Dispatch<SetStateAction<DailyQuote | null>>;
}) {
  const [advice, setAdvice] = useState<AdviceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tipIndex, setTipIndex] = useState(0);

  const today = todayStr();

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError("");
    try {
      // Logic for daily quote: only fetch if missing or date changed
      let currentQuote = dailyQuote;
      if (forceRefresh || !dailyQuote || dailyQuote.date !== today) {
        const quoteRes = await fetch(QUOTE_API);
        if (!quoteRes.ok) throw new Error("Unable to reach quote service.");
        const quoteJson = await quoteRes.json();
        currentQuote = { text: quoteJson.quote, author: quoteJson.author, date: today };
        setDailyQuote(currentQuote);
      }

      // Advice still refreshes every time or once per day? 
      // The user said "only qoute na everyday mulahi siya", 
      // which usually implies the quote is the "of the day" part.
      const adviceRes = await fetch(`${ADVICE_API}?t=${Date.now()}`);
      if (!adviceRes.ok) throw new Error("Unable to reach advice service.");
      const adviceJson = await adviceRes.json();
      setAdvice({ id: adviceJson.slip.id, advice: adviceJson.slip.advice });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [dailyQuote, setDailyQuote, today]);

  useEffect(() => {
    // Initial load: will only fetch quote if it's a new day
    load();
    setTipIndex(Math.floor(Math.random() * PRODUCTIVITY_TIPS.length));
  }, [load]);

  const saveAdviceAsTask = () => {
    if (!advice) return;
    setTasks((current) => [
      {
        id: uid(),
        title: `Reflect: ${advice.advice}`,
        dueDate: todayStr(),
        dueTime: undefined,
        priority: "low",
        completed: false,
        createdAt: Date.now(),
      },
      ...current,
    ]);
  };

  const toggleFavorite = (type: "quote" | "advice", content: string, authorOrId?: string) => {
    const exists = favorites.find((f) => f.content === content);
    if (exists) {
      setFavorites((current) => current.filter((f) => f.content !== content));
    } else {
      setFavorites((current) => [
        {
          id: uid(),
          type,
          content,
          authorOrId,
          createdAt: Date.now(),
        },
        ...current,
      ]);
    }
  };

  const isFavorite = (content: string) => favorites.some((f) => f.content === content);

  return (
    <View style={styles.screen}>
      <ScreenTitle
        title="Daily Inspiration"
        subtitle="A new quote every single day to keep you going."
      />

      {/* Quote of the Day Section */}
      {dailyQuote && dailyQuote.date === today && (
        <View style={styles.hero}>
          <Text style={styles.heroDate}>QUOTE OF THE DAY • {prettyDate(today).toUpperCase()}</Text>
          <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
          <Text style={styles.heroCopy}>{dailyQuote.author}</Text>
          <View style={[styles.row, { marginTop: 12 }]}>
            <Pressable
              onPress={() => toggleFavorite("quote", dailyQuote.text, dailyQuote.author)}
              style={styles.favoriteToggle}
            >
              <Text style={{ color: colors.white, fontWeight: "700", fontSize: 12 }}>
                {isFavorite(dailyQuote.text) ? "★ Saved" : "☆ Save to Favorites"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Productivity Tip */}
      <Panel title="Productivity Tip">
        <Text style={styles.tipText}>{PRODUCTIVITY_TIPS[tipIndex]}</Text>
        <Pressable
          onPress={() => setTipIndex((tipIndex + 1) % PRODUCTIVITY_TIPS.length)}
          style={{ marginTop: 8 }}
        >
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Next Tip →</Text>
        </Pressable>
      </Panel>

      {loading && <ActivityIndicator color={colors.primary} />}
      
      {!!error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not load inspiration</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {advice && (
        <Panel title={`Daily Advice #${advice.id}`}>
          <Text style={styles.adviceText}>{advice.advice}</Text>
          <View style={styles.row}>
            <View style={styles.flexOne}>
              <PrimaryButton label="Add to today" onPress={saveAdviceAsTask} />
            </View>
            <View style={styles.flexOne}>
              <SecondaryButton
                label={isFavorite(advice.advice) ? "★ Saved" : "☆ Save"}
                onPress={() => toggleFavorite("advice", advice.advice, String(advice.id))}
              />
            </View>
          </View>
        </Panel>
      )}

      {/* Force refresh removed or kept for troubleshooting? 
          I'll change the button to "Refresh Advice" only, 
          since the quote is meant to be the same all day. */}
      <SecondaryButton label={loading ? "Refreshing" : "Refresh Advice"} onPress={() => load(false)} />

      {/* Saved Favorites Section */}
      {favorites.length > 0 && (
        <Panel title="Saved Favorites">
          {favorites.map((fav) => (
            <View key={fav.id} style={styles.favoriteItem}>
              <View style={styles.flexOne}>
                <Text style={styles.favoriteContent}>"{fav.content}"</Text>
                {fav.type === "quote" && <Text style={styles.favoriteAuthor}>— {fav.authorOrId}</Text>}
                {fav.type === "advice" && <Text style={styles.favoriteAuthor}>Advice #{fav.authorOrId}</Text>}
              </View>
              <Pressable onPress={() => setFavorites(f => f.filter(i => i.id !== fav.id))}>
                <Text style={styles.deleteText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </Panel>
      )}
    </View>
  );
}

const PRODUCTIVITY_TIPS = [
  "Pomodoro Technique: Work for 25 mins, then take a 5 min break.",
  "Eat the Frog: Tackle your hardest task first thing in the morning.",
  "Active Recall: Test yourself instead of just re-reading notes.",
  "Spaced Repetition: Review information at increasing intervals.",
  "Batching: Group similar tasks together to maintain flow.",
  "2-Minute Rule: If a task takes less than 2 minutes, do it now.",
];

function ProfileScreen({
  profile,
  setProfile,
  onSignOut,
}: {
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.screen}>
      <ScreenTitle
        title="Profile & Settings"
        subtitle="Personal info and preferences stored on this device."
      />
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.logoText}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : "S"}
          </Text>
        </View>
        <View>
          <Text style={styles.itemTitle}>{profile.name || "Add your name"}</Text>
          <Text style={styles.mutedText}>{profile.school || "Add your school"}</Text>
        </View>
      </View>
      <Panel title="Details">
        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={profile.name}
          onChangeText={(name) => setProfile((current) => ({ ...current, name }))}
        />
        <TextInput
          style={styles.input}
          placeholder="School / University"
          value={profile.school}
          onChangeText={(school) => setProfile((current) => ({ ...current, school }))}
        />
        <View style={styles.rowBetween}>
          <View style={styles.flexOne}>
            <Text style={styles.itemTitle}>Reminder notifications</Text>
            <Text style={styles.mutedText}>Get nudged about tasks due today.</Text>
          </View>
          <Switch
            value={profile.notifications}
            onValueChange={(notifications) =>
              setProfile((current) => ({ ...current, notifications }))
            }
            trackColor={{ true: colors.primarySoft, false: colors.border }}
            thumbColor={profile.notifications ? colors.primary : colors.white}
          />
        </View>
      </Panel>
      <SecondaryButton label="Sign out" onPress={onSignOut} />
    </View>
  );
}

function ScreenTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.mutedText}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.taskRow}>
      <Pressable
        onPress={onToggle}
        style={[styles.checkCircle, task.completed && styles.checkCircleDone]}
      >
        <Text style={styles.checkText}>{task.completed ? "OK" : ""}</Text>
      </Pressable>
      <View style={styles.flexOne}>
        <Text style={[styles.itemTitle, task.completed && styles.completedText]}>{task.title}</Text>
        <Text style={styles.mutedText}>
          Due {prettyDue(task)} - {task.priority}
        </Text>
        {!!task.notes && <Text style={styles.noteBody}>{task.notes}</Text>}
      </View>
      {onDelete && (
        <Pressable onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      )}
    </View>
  );
}

function CompactTask({ task }: { task: Task }) {
  return (
    <View style={styles.compactTask}>
      <View style={styles.flexOne}>
        <Text style={[styles.itemTitle, task.completed && styles.completedText]}>{task.title}</Text>
        <Text style={styles.mutedText}>Due {prettyDue(task)}</Text>
      </View>
      <PriorityBadge priority={task.priority} />
    </View>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <View
      style={[
        styles.badge,
        priority === "high" && styles.badgeHigh,
        priority === "medium" && styles.badgeMedium,
      ]}
    >
      <Text style={[styles.badgeText, priority === "high" && styles.badgeTextHigh]}>
        {priority}
      </Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[styles.segment, value === option && styles.segmentActive]}
          onPress={() => onChange(option)}
        >
          <Text style={[styles.segmentText, value === option && styles.segmentTextActive]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const colors = {
  background: "#f8fafc",
  card: "#ffffff",
  text: "#172033",
  muted: "#64748b",
  border: "#d9e2ec",
  primary: "#2563eb",
  primaryDark: "#1e3a8a",
  primarySoft: "#bfdbfe",
  accent: "#f59e0b",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  success: "#16a34a",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  logoText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
  },
  appName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  appSubhead: {
    color: colors.muted,
    fontSize: 12,
  },
  content: {
    padding: 18,
    paddingBottom: 112,
  },
  screen: {
    gap: 16,
  },
  authContent: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 14,
    padding: 22,
  },
  authLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
  },
  authTitle: {
    color: colors.text,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "800",
  },
  authSubtitle: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  authCard: {
    gap: 12,
    marginTop: 10,
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authError: {
    borderRadius: 8,
    overflow: "hidden",
    padding: 10,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    fontWeight: "700",
  },
  authHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  authSwitch: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  authSwitchText: {
    color: colors.primary,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  hero: {
    gap: 12,
    borderRadius: 8,
    padding: 22,
    backgroundColor: colors.primary,
  },
  heroDate: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "600",
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
  },
  heroCopy: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 21,
  },
  quoteText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 28,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  flexOne: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    marginTop: 6,
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  card: {
    gap: 12,
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 15,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 12,
  },
  textAreaLarge: {
    minHeight: 150,
    paddingTop: 12,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  segmentTextActive: {
    color: colors.white,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkText: {
    color: colors.white,
    fontWeight: "900",
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  mutedText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  completedText: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  noteBody: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  notePreview: {
    gap: 4,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.background,
  },
  compactTask: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.background,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.primarySoft,
  },
  badgeMedium: {
    backgroundColor: "#fef3c7",
  },
  badgeHigh: {
    backgroundColor: colors.dangerSoft,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  badgeTextHigh: {
    color: colors.danger,
  },
  emptyText: {
    borderRadius: 8,
    padding: 18,
    overflow: "hidden",
    textAlign: "center",
    color: colors.muted,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  calendarCard: {
    gap: 8,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.285%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  daySelected: {
    backgroundColor: colors.primarySoft,
  },
  dayNumber: {
    color: colors.text,
    fontWeight: "800",
  },
  dayToday: {
    color: colors.primary,
  },
  dayDots: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 0,
  },
  errorCard: {
    gap: 6,
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.dangerSoft,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: "800",
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
  adviceText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 27,
  },
  tipText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  favoriteToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  favoriteItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  favoriteContent: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    fontStyle: "italic",
  },
  favoriteAuthor: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  tabLabelActive: {
    color: colors.primaryDark,
  },
});
