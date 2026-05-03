import { useEffect, useState } from "react";

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
  completed: boolean;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useLocalState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read<T>(key, initial));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state, hydrated]);

  return [state, setState, hydrated] as const;
}

export const TASKS_KEY = "studentlife.tasks";
export const NOTES_KEY = "studentlife.notes";
export const PROFILE_KEY = "studentlife.profile";

export interface Profile {
  name: string;
  school: string;
  notifications: boolean;
}
