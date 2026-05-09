import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase";

const firebaseAuthDomainHelp = [
  "localhost",
  "id-preview--5efa86d7-4ffc-4f72-a879-dabaf007efaf.lovable.app",
  "schedule-sorter-plus.lovable.app",
].join(", ");

function getFriendlyAuthError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("auth/unauthorized-domain")) {
    const currentDomain = typeof window !== "undefined" ? window.location.hostname : "this domain";
    return new Error(
      `Firebase sign-in is not authorized for ${currentDomain}. Add it to Firebase Authentication > Settings > Authorized domains. Expected domains: ${firebaseAuthDomainHelp}.`,
    );
  }
  return error instanceof Error ? error : new Error(message);
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    signInEmail: async (email, password) => {
      try {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      } catch (error) {
        throw getFriendlyAuthError(error);
      }
    },
    signUpEmail: async (email, password, name) => {
      try {
        const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
      } catch (error) {
        throw getFriendlyAuthError(error);
      }
    },
    signInGoogle: async () => {
      try {
        await signInWithPopup(getFirebaseAuth(), googleProvider);
      } catch (error) {
        throw getFriendlyAuthError(error);
      }
    },
    logout: async () => {
      await signOut(getFirebaseAuth());
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
