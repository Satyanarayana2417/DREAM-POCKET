import { useNavigate } from "@tanstack/react-router";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchUserDoc, upsertUserDoc } from "./data";
import { getFirebaseConfig } from "./firebase.functions";
import { initFirebase } from "./firebase";

export type Profile = {
  uid: string;
  username: string;
  email: string;
  photoURL?: string | null;
  provider?: string;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signUpWithEmail: (username: string, email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function friendlyAuthError(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "No account found with that email.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google popup. Allow popups and retry.",
    "auth/network-request-failed": "Network problem. Check your connection and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled for the project.",
  };
  if (map[code]) return map[code];
  const message = (err as Error)?.message ?? "";
  return message.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "").trim() || "Something went wrong.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    let active = true;
    (async () => {
      try {
        const config = await getFirebaseConfig();
        if (!config.apiKey) throw new Error("Firebase key missing");
        const { auth } = initFirebase(config);
        unsub = onAuthStateChanged(auth, async (next) => {
          if (!active) return;
          setUser(next);
          if (next) {
            try {
              const data = await fetchUserDoc(next.uid);
              setProfile({
                uid: next.uid,
                username: (data?.["username"] as string) ?? next.displayName ?? "",
                email: (data?.["email"] as string) ?? next.email ?? "",
                photoURL: (data?.["photoURL"] as string) ?? next.photoURL ?? null,
                provider: (data?.["provider"] as string) ?? "email",
              });
            } catch {
              setProfile({
                uid: next.uid,
                username: next.displayName ?? "",
                email: next.email ?? "",
                photoURL: next.photoURL,
              });
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
      } catch {
        if (active) {
          setError("We couldn't connect to your account service. Please refresh.");
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const data = await fetchUserDoc(user.uid);
    if (data) {
      setProfile({
        uid: user.uid,
        username: (data["username"] as string) ?? "",
        email: (data["email"] as string) ?? "",
        photoURL: (data["photoURL"] as string) ?? null,
        provider: (data["provider"] as string) ?? "email",
      });
    }
  }, [user]);

  const signUpWithEmail = useCallback(
    async (username: string, email: string, password: string) => {
      const { auth } = initFirebase(await getFirebaseConfig());
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: username });
      await upsertUserDoc({
        uid: cred.user.uid,
        username,
        email,
        photoURL: null,
        provider: "email",
      });
    },
    [],
  );

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const { auth } = initFirebase(await getFirebaseConfig());
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { auth } = initFirebase(await getFirebaseConfig());
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    await upsertUserDoc({
      uid: cred.user.uid,
      username: cred.user.displayName ?? cred.user.email?.split("@")[0] ?? "Friend",
      email: cred.user.email ?? "",
      photoURL: cred.user.photoURL,
      provider: "google",
    });
  }, []);

  const sendReset = useCallback(async (email: string) => {
    const { auth } = initFirebase(await getFirebaseConfig());
    await sendPasswordResetEmail(auth, email, { url: window.location.origin + "/login" });
  }, []);

  const logout = useCallback(async () => {
    const { auth } = initFirebase(await getFirebaseConfig());
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      signUpWithEmail,
      loginWithEmail,
      loginWithGoogle,
      sendReset,
      logout,
      refreshProfile,
    }),
    [
      user,
      profile,
      loading,
      error,
      signUpWithEmail,
      loginWithEmail,
      loginWithGoogle,
      sendReset,
      logout,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Client-side gate: everything in this app needs a signed-in user. */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);
  return { user, loading };
}
