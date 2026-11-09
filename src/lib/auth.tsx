import { useNavigate } from "@tanstack/react-router";
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  sendEmailVerification,
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
  signUpWithEmail: (username: string, email: string, password: string) => Promise<User>;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  loginWithApple: () => Promise<User>;
  sendVerification: () => Promise<void>;
  checkVerification: () => Promise<boolean>;
  sendReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Determines whether a signed-in user strictly requires manual email verification.
 * Google and Apple users provide pre-verified identities.
 * Password-based registrations require manual verification.
 */
export function isUserEmailVerificationRequired(user: User | null): boolean {
  if (!user) return false;
  
  // Specific account bypass requested: siva@gmail.com
  if (user.email?.toLowerCase().trim() === "siva@gmail.com") return false;

  if (user.emailVerified) return false;

  const isGoogle = user.providerData.some((p) => p.providerId === "google.com");
  const isApple = user.providerData.some((p) => p.providerId === "apple.com");
  if (isGoogle || isApple) return false;

  return true;
}

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
    "auth/popup-closed-by-user": "Sign-in was cancelled before completion.",
    "auth/cancelled-popup-request": "Sign-in popup was cancelled.",
    "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and retry.",
    "auth/network-request-failed": "Network problem. Check your connection and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email using another sign-in method. Please sign in using your original method.",
    "auth/credential-already-in-use": "This credential is already linked to another account.",
    "auth/user-disabled": "This account has been disabled. Please contact support.",
  };
  if (map[code]) return map[code];
  const message = (err as Error)?.message ?? "";
  return (
    message
      .replace("Firebase: ", "")
      .replace(/\(auth.*\)\.?/, "")
      .trim() || "Something went wrong."
  );
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

  const signUpWithEmail = useCallback(async (username: string, email: string, password: string) => {
    const { auth } = initFirebase(await getFirebaseConfig());
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await updateProfile(cred.user, { displayName: username });
    } catch {
      // Non-blocking
    }
    try {
      await upsertUserDoc({
        uid: cred.user.uid,
        username,
        email,
        photoURL: null,
        provider: "email",
      });
    } catch (e) {
      console.warn("Failed to create user document:", e);
    }
    // Mandatory email verification (exempted for siva@gmail.com)
    if (email.toLowerCase().trim() !== "siva@gmail.com") {
      await sendEmailVerification(cred.user);
    }
    return cred.user;
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const { auth } = initFirebase(await getFirebaseConfig());
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await cred.user.reload();
    return cred.user;
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
    return cred.user;
  }, []);

  const loginWithApple = useCallback(async () => {
    const { auth } = initFirebase(await getFirebaseConfig());
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");

    const cred = await signInWithPopup(auth, provider);

    // Apple only provides user's full name on the FIRST authorization.
    let displayName = cred.user.displayName;
    if (!displayName) {
      const additionalInfo = getAdditionalUserInfo(cred);
      const profile = additionalInfo?.profile as Record<string, unknown> | undefined;
      if (profile) {
        const first = (profile["firstName"] || profile["first_name"] || "") as string;
        const last = (profile["lastName"] || profile["last_name"] || "") as string;
        const combined = `${first} ${last}`.trim();
        if (combined) displayName = combined;
      }
    }

    if (!displayName && cred.user.email) {
      displayName = cred.user.email.split("@")[0];
    }

    if (displayName && !cred.user.displayName) {
      try {
        await updateProfile(cred.user, { displayName });
      } catch {
        // Non-blocking
      }
    }

    await upsertUserDoc({
      uid: cred.user.uid,
      username: displayName || "Apple User",
      email: cred.user.email ?? "",
      photoURL: cred.user.photoURL,
      provider: "apple",
    });

    return cred.user;
  }, []);

  const sendVerification = useCallback(async () => {
    const { auth } = initFirebase(await getFirebaseConfig());
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No signed-in user.");
    await sendEmailVerification(currentUser);
  }, []);

  const checkVerification = useCallback(async () => {
    const { auth } = initFirebase(await getFirebaseConfig());
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    await currentUser.reload();
    await currentUser.getIdToken(true);
    setUser({ ...currentUser } as User);
    return currentUser.emailVerified;
  }, []);

  const sendReset = useCallback(async (email: string) => {
    const { auth } = initFirebase(await getFirebaseConfig());
    await sendPasswordResetEmail(auth, email, { url: window.location.origin + "/login" });
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      const { disableNotifications } = await import("./notifications");
      await disableNotifications(user.uid);
    }
    const { auth } = initFirebase(await getFirebaseConfig());
    await signOut(auth);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      signUpWithEmail,
      loginWithEmail,
      loginWithGoogle,
      loginWithApple,
      sendVerification,
      checkVerification,
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
      loginWithApple,
      sendVerification,
      checkVerification,
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

/** Client-side gate: protects authenticated app routes and redirects unverified users. */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/login", replace: true });
      } else if (isUserEmailVerificationRequired(user)) {
        navigate({ to: "/verify-email", replace: true });
      }
    }
  }, [loading, user, navigate]);
  return { user, loading };
}
