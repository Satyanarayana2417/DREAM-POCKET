import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { App } from '@capacitor/app';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Fingerprint, Lock, ShieldCheck, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/lib/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb, isFirebaseReady } from '@/lib/firebase';
import { toast } from 'sonner';

interface AppLockContextType {
  isBiometricEnabled: boolean;
  isBiometricSupported: boolean;
  authenticatorLabel: string;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  verifyAuth: () => Promise<boolean>;
  lockNow: () => void;
  isLocked: boolean;
}

const AppLockContext = createContext<AppLockContextType | null>(null);

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (!context) throw new Error("useAppLock must be used within AppLockProvider");
  return context;
}

// Helpers for WebAuthn ArrayBuffer / Base64 conversions
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBuffer(base64: string): ArrayBuffer {
  let str = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = window.atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Universal storage helpers (Native Keystore on Mobile, LocalStorage on Web)
const getStorage = async (key: string): Promise<string | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await SecureStoragePlugin.get({ key });
      return res.value;
    } catch {
      return null;
    }
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStorage = async (key: string, value: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await SecureStoragePlugin.set({ key, value });
    } catch {
      // fallback
    }
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // Non-blocking
  }
};

const removeStorage = async (key: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await SecureStoragePlugin.remove({ key });
    } catch {
      // Non-blocking
    }
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // Non-blocking
  }
};

/**
 * Checks platform support for biometrics (Fingerprint, Face ID, Touch ID, Windows Hello)
 */
async function checkBiometricSupport(): Promise<{ supported: boolean; label: string }> {
  // 1. Native Mobile (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeBiometric.isAvailable();
      if (res.isAvailable) {
        let label = "Biometric Lock";
        if (res.biometryType === 1) label = "Touch ID";
        else if (res.biometryType === 2) label = "Face ID";
        else if (res.biometryType === 3) label = "Fingerprint";
        return { supported: true, label };
      }
    } catch {
      // Fallback to WebAuthn check
    }
  }

  // 2. Web / Desktop WebAuthn Platform Authenticator (Windows Hello, Touch ID, Android Biometrics)
  if (
    typeof window !== "undefined" &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  ) {
    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        const isMacOrIOS = /Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent);
        const isWindows = /Windows/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        let label = "Biometric Passkey";
        if (isMacOrIOS) label = "Face ID / Touch ID";
        else if (isWindows) label = "Windows Hello";
        else if (isAndroid) label = "Fingerprint / Screen Lock";
        return { supported: true, label };
      }
    } catch {
      // Unsupported
    }
  }

  return { supported: false, label: "Biometrics Unavailable" };
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [authenticatorLabel, setAuthenticatorLabel] = useState("Biometric Lock");
  const [storedCredId, setStoredCredId] = useState<string | null>(null);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Transient verification resolver (for settings re-auth)
  const [verifyOnly, setVerifyOnly] = useState<{ resolve: (v: boolean) => void } | null>(null);
  const isAuthenticatingRef = useRef(false);

  // Clean up legacy PIN storage keys permanently
  useEffect(() => {
    removeStorage('appLock_pin');
    removeStorage('appLock_pin_enabled');
    removeStorage('appLock_enabled');
  }, []);

  // 1. Initial State Initialization
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const { supported, label } = await checkBiometricSupport();
        if (!active) return;
        setIsBiometricSupported(supported);
        setAuthenticatorLabel(label);

        // Check local secure storage
        const localBioEnabled = (await getStorage('appLock_biometric_enabled')) === 'true';
        const localCredId = await getStorage('appLock_biometric_cred_id');

        let enabled = localBioEnabled;
        let credId = localCredId;

        // Sync with Firestore profile if user is logged in
        if (user && isFirebaseReady()) {
          try {
            const userSnap = await getDoc(doc(firebaseDb(), "users", user.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              if (data?.["biometricLock"]?.["enabled"] !== undefined) {
                enabled = Boolean(data["biometricLock"]["enabled"]);
                credId = data["biometricLock"]["credentialId"] || credId;
              }
            }
          } catch {
            // Non-blocking fallback to local storage
          }
        }

        if (active) {
          setIsBiometricEnabled(enabled);
          setStoredCredId(credId);

          // If enabled, lock immediately on startup
          if (enabled) {
            setIsLocked(true);
          }
        }
      } catch (err) {
        console.error("Biometric init error:", err);
      } finally {
        if (active) setIsChecking(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [user]);

  // 2. Auto-lock on Mobile Backgrounding & Desktop Tab Inactivity
  useEffect(() => {
    if (!isBiometricEnabled) return;

    // A. Native Capacitor App Background Listener
    let nativeListener: Promise<any> | null = null;
    if (Capacitor.isNativePlatform()) {
      nativeListener = App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive && isBiometricEnabled) {
          setIsLocked(true);
          setAuthError(null);
          setVerifyOnly(null);
        }
      });
    }

    // B. Web Tab Visibility Listener
    const handleVisibilityChange = () => {
      if (document.hidden && isBiometricEnabled) {
        setIsLocked(true);
        setAuthError(null);
        setVerifyOnly(null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (nativeListener) {
        nativeListener.then((l) => l.remove()).catch(() => {});
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isBiometricEnabled]);

  // 3. WebAuthn Registration (Enroll Authenticator)
  const registerWebAuthn = async (): Promise<string | null> => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      throw new Error("WebAuthn is not supported by your browser.");
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(user?.uid || "dreampocket_user");

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Dream Pocket",
          id: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: user?.email || "user@dreampocket.app",
          displayName: user?.displayName || user?.email || "Dream Pocket Account",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256 (standard for mobile/face/fingerprint)
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Enforces device's built-in biometric sensor
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) throw new Error("No credential was created.");

    return bufferToBase64(credential.rawId);
  };

  // 4. WebAuthn Authentication (Verify Authenticator)
  const authenticateWebAuthn = async (credId: string | null): Promise<boolean> => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredentials = credId
      ? [
          {
            id: base64ToBuffer(credId),
            type: "public-key" as const,
          },
        ]
      : undefined;

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
        timeout: 60000,
        userVerification: "required",
        allowCredentials,
      },
    });

    return Boolean(assertion);
  };

  // 5. Trigger Native or Web Biometric Prompt
  const triggerBiometric = useCallback(async (): Promise<boolean> => {
    if (isAuthenticatingRef.current) return false;
    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      let success = false;

      // Native Capacitor Biometrics
      if (Capacitor.isNativePlatform()) {
        await NativeBiometric.verifyIdentity({
          reason: "Authenticate to unlock Dream Pocket",
          title: "Dream Pocket Security",
          subtitle: "Confirm your identity to access expenses",
          negativeButtonText: "Cancel",
        });
        success = true;
      } else {
        // Web Platform Biometrics (WebAuthn / Passkeys)
        success = await authenticateWebAuthn(storedCredId);
      }

      if (success) {
        if (verifyOnly) {
          verifyOnly.resolve(true);
          setVerifyOnly(null);
        }
        setIsLocked(false);
        setAuthError(null);
        return true;
      } else {
        setAuthError("Biometric verification failed. Please try again.");
        return false;
      }
    } catch (err: any) {
      console.warn("Biometric verification error:", err);
      const msg =
        err?.message?.includes("cancelled") || err?.name === "NotAllowedError"
          ? "Authentication was cancelled."
          : "Biometric authentication failed. Tap below to retry.";
      setAuthError(msg);
      return false;
    } finally {
      isAuthenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, [storedCredId, verifyOnly]);

  // Automatically trigger biometric prompt on initial lock mount
  useEffect(() => {
    if (isLocked && isBiometricEnabled && !isAuthenticatingRef.current) {
      const timer = setTimeout(() => {
        triggerBiometric();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLocked, isBiometricEnabled, triggerBiometric]);

  // 6. Enable / Disable Biometric Lock
  const setBiometricEnabledHandler = async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      // User is enabling biometric lock: must register and verify first
      setIsAuthenticating(true);
      try {
        let credId: string | null = null;

        if (Capacitor.isNativePlatform()) {
          // Native verification
          await NativeBiometric.verifyIdentity({
            reason: "Verify your biometric to enable Dream Pocket App Lock",
            title: "Enable Biometric Lock",
            subtitle: "Scan your fingerprint or face to protect your account",
          });
          credId = "native-device-biometric";
        } else {
          // WebAuthn Passkey Registration
          credId = await registerWebAuthn();
        }

        if (!credId) throw new Error("Could not register biometric authenticator.");

        // Persist locally
        await setStorage('appLock_biometric_enabled', 'true');
        await setStorage('appLock_biometric_cred_id', credId);
        setStoredCredId(credId);
        setIsBiometricEnabled(true);

        // Persist in Firestore
        if (user && isFirebaseReady()) {
          try {
            await updateDoc(doc(firebaseDb(), "users", user.uid), {
              "biometricLock.enabled": true,
              "biometricLock.credentialId": credId,
              "biometricLock.authenticatorLabel": authenticatorLabel,
              "biometricLock.updatedAt": serverTimestamp(),
            });
          } catch {
            // Non-blocking
          }
        }

        toast.success("Biometric App Lock enabled successfully!");
        return true;
      } catch (err: any) {
        console.error("Biometric setup error:", err);
        const isCancelled = err?.name === "NotAllowedError" || err?.message?.includes("cancel");
        toast.error(isCancelled ? "Biometric setup cancelled." : "Could not enable Biometric Lock on this device.");
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      // Disabling Biometric Lock: requires re-authentication
      const verified = await triggerBiometric();
      if (!verified) {
        toast.error("Authentication required to disable Biometric Lock.");
        return false;
      }

      await setStorage('appLock_biometric_enabled', 'false');
      await removeStorage('appLock_biometric_cred_id');
      setStoredCredId(null);
      setIsBiometricEnabled(false);
      setIsLocked(false);

      if (user && isFirebaseReady()) {
        try {
          await updateDoc(doc(firebaseDb(), "users", user.uid), {
            "biometricLock.enabled": false,
            "biometricLock.updatedAt": serverTimestamp(),
          });
        } catch {
          // Non-blocking
        }
      }

      toast.success("Biometric App Lock has been disabled.");
      return true;
    }
  };

  // 7. Re-auth helper (for sensitive actions)
  const verifyAuth = (): Promise<boolean> => {
    if (!isBiometricEnabled) return Promise.resolve(true);

    return new Promise((resolve) => {
      setVerifyOnly({ resolve });
      setIsLocked(true);
      setAuthError(null);
    });
  };

  // 8. Manual Lock action
  const lockNow = () => {
    if (isBiometricEnabled) {
      setIsLocked(true);
      setAuthError(null);
      setVerifyOnly(null);
    }
  };

  const handleSignOutFromLock = async () => {
    try {
      await logout();
      setIsLocked(false);
    } catch {
      // Non-blocking
    }
  };

  return (
    <AppLockContext.Provider
      value={{
        isBiometricEnabled,
        isBiometricSupported,
        authenticatorLabel,
        setBiometricEnabled: setBiometricEnabledHandler,
        verifyAuth,
        lockNow,
        isLocked,
      }}
    >
      {children}

      {/* Biometric Unlock Overlay Screen */}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            {/* Verify Only Cancel Button */}
            {verifyOnly && (
              <button
                type="button"
                onClick={() => {
                  verifyOnly.resolve(false);
                  setVerifyOnly(null);
                  setIsLocked(false);
                }}
                className="self-start text-xs font-semibold text-muted-foreground hover:text-foreground mb-6 cursor-pointer"
              >
                ← Cancel
              </button>
            )}

            {/* Dream Pocket Branding */}
            <div className="flex items-center gap-2.5 mb-8">
              <img src="/logo.png" alt="Dream Pocket" className="size-10 object-contain drop-shadow-sm" />
              <img src="/logo-text.png" alt="Dream Pocket" className="h-6.5 object-contain" />
            </div>

            {/* Biometric Icon with Pulsing Emerald Glow */}
            <div className="relative mb-6">
              <div className="size-24 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <Fingerprint className="size-12 text-emerald-600 dark:text-emerald-400 stroke-[1.8] animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-xs ring-2 ring-background">
                <Lock className="size-3.5 stroke-[2.2]" />
              </div>
            </div>

            {/* Heading & Subtitle */}
            <h2 className="text-xl font-bold font-display text-foreground tracking-tight mb-2">
              App Locked
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-8 max-w-[280px] leading-relaxed">
              Authenticate to unlock Dream Pocket and protect your financial privacy.
            </p>

            {/* Error Message if Verification Failed */}
            {authError && (
              <div className="w-full mb-6 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-2.5 text-xs text-destructive text-left animate-in fade-in">
                <AlertCircle className="size-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => triggerBiometric()}
              disabled={isAuthenticating}
              className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-soft hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Waiting for authentication...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="size-4.5" />
                  <span>Unlock with Biometrics</span>
                </>
              )}
            </button>

            {/* Sign Out Option */}
            <div className="mt-8 pt-6 border-t border-border/60 w-full flex items-center justify-center">
              <button
                type="button"
                onClick={handleSignOutFromLock}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Sign out of account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLockContext.Provider>
  );
}
