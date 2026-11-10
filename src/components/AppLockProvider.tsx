import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { App } from '@capacitor/app';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Fingerprint, Lock, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
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

// Storage helpers (Native Keystore on Mobile)
const getStorage = async (key: string): Promise<string | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await SecureStoragePlugin.get({ key });
      return res.value;
    } catch {
      return null;
    }
  }
  return null;
};

const setStorage = async (key: string, value: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await SecureStoragePlugin.set({ key, value });
    } catch {
      // Non-blocking fallback
    }
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
 * Checks platform support for biometrics (Mobile Native only: Android & iOS)
 */
async function checkMobileBiometricSupport(): Promise<{ supported: boolean; label: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, label: "Mobile Only" };
  }

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
    // Unsupported or permission denied
  }

  return { supported: false, label: "Biometrics Unavailable" };
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  const isNative = Capacitor.isNativePlatform();

  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [authenticatorLabel, setAuthenticatorLabel] = useState("Biometric Lock");

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Transient verification resolver (for sensitive action re-auth)
  const [verifyOnly, setVerifyOnly] = useState<{ resolve: (v: boolean) => void } | null>(null);
  const isAuthenticatingRef = useRef(false);

  // Clean up legacy PIN and desktop storage keys permanently
  useEffect(() => {
    removeStorage('appLock_pin');
    removeStorage('appLock_pin_enabled');
    removeStorage('appLock_enabled');

    if (!isNative) {
      // Ensure web / desktop storage is clean
      try {
        localStorage.removeItem('appLock_biometric_enabled');
        localStorage.removeItem('appLock_biometric_cred_id');
      } catch {
        // Non-blocking
      }
    }
  }, [isNative]);

  // 1. Initial State Initialization
  useEffect(() => {
    let active = true;

    const init = async () => {
      // On laptops / desktops (non-native): Biometric App Lock is completely disabled
      if (!isNative) {
        if (active) {
          setIsBiometricSupported(false);
          setIsBiometricEnabled(false);
          setIsLocked(false);
          setIsChecking(false);
        }
        return;
      }

      // On Mobile Native App: check biometric hardware & restore state
      try {
        const { supported, label } = await checkMobileBiometricSupport();
        if (!active) return;
        setIsBiometricSupported(supported);
        setAuthenticatorLabel(label);

        const localBioEnabled = (await getStorage('appLock_biometric_enabled')) === 'true';
        let enabled = localBioEnabled;

        // Optionally sync with Firestore profile on mobile
        if (user && isFirebaseReady()) {
          try {
            const userSnap = await getDoc(doc(firebaseDb(), "users", user.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              if (data?.["biometricLock"]?.["mobileEnabled"] !== undefined) {
                enabled = Boolean(data["biometricLock"]["mobileEnabled"]);
              } else if (data?.["biometricLock"]?.["enabled"] !== undefined) {
                enabled = Boolean(data["biometricLock"]["enabled"]);
              }
            }
          } catch {
            // Non-blocking
          }
        }

        if (active) {
          setIsBiometricEnabled(enabled);

          // Lock on mobile startup only if enabled
          if (enabled) {
            setIsLocked(true);
          }
        }
      } catch (err) {
        console.error("Mobile biometric init error:", err);
      } finally {
        if (active) setIsChecking(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [user, isNative]);

  // 2. Auto-lock on Mobile Native Backgrounding only
  useEffect(() => {
    if (!isNative || !isBiometricEnabled) return;

    let nativeListener: Promise<any> | null = null;
    try {
      nativeListener = App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive && isBiometricEnabled) {
          setIsLocked(true);
          setAuthError(null);
          setVerifyOnly(null);
        }
      });
    } catch {
      // Non-blocking
    }

    return () => {
      if (nativeListener) {
        nativeListener.then((l) => l.remove()).catch(() => {});
      }
    };
  }, [isNative, isBiometricEnabled]);

  // 3. Trigger Native Biometric Prompt (Mobile Only)
  const triggerBiometric = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      setIsLocked(false);
      return true;
    }

    if (isAuthenticatingRef.current) return false;
    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      await NativeBiometric.verifyIdentity({
        reason: "Authenticate to unlock Dream Pocket",
        title: "Dream Pocket Security",
        subtitle: "Confirm your identity to access expenses",
        negativeButtonText: "Cancel",
      });

      if (verifyOnly) {
        verifyOnly.resolve(true);
        setVerifyOnly(null);
      }
      setIsLocked(false);
      setAuthError(null);
      return true;
    } catch (err: any) {
      console.warn("Mobile biometric verification error:", err);
      const isCancelled =
        err?.message?.includes("cancel") ||
        err?.message?.includes("10") || // User cancelled code
        err?.code === "10";
      setAuthError(isCancelled ? "Authentication was cancelled." : "Verification failed. Tap below to retry.");
      return false;
    } finally {
      isAuthenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, [isNative, verifyOnly]);

  // Automatically trigger biometric prompt on mobile when locked
  useEffect(() => {
    if (isNative && isLocked && isBiometricEnabled && !isAuthenticatingRef.current) {
      const timer = setTimeout(() => {
        triggerBiometric();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isNative, isLocked, isBiometricEnabled, triggerBiometric]);

  // 4. Enable / Disable Biometric Lock (Mobile Only)
  const setBiometricEnabledHandler = async (enabled: boolean): Promise<boolean> => {
    if (!isNative) {
      toast.info("Biometric App Lock is available on the mobile application.");
      return false;
    }

    if (enabled) {
      // Verify identity before enabling
      setIsAuthenticating(true);
      try {
        await NativeBiometric.verifyIdentity({
          reason: "Verify your biometric to enable Dream Pocket App Lock",
          title: "Enable Biometric Lock",
          subtitle: "Scan your fingerprint or face to protect your account",
          negativeButtonText: "Cancel",
        });

        await setStorage('appLock_biometric_enabled', 'true');
        setIsBiometricEnabled(true);

        if (user && isFirebaseReady()) {
          try {
            await updateDoc(doc(firebaseDb(), "users", user.uid), {
              "biometricLock.mobileEnabled": true,
              "biometricLock.updatedAt": serverTimestamp(),
            });
          } catch {
            // Non-blocking
          }
        }

        toast.success("Biometric App Lock enabled on this device!");
        return true;
      } catch (err: any) {
        const isCancelled = err?.message?.includes("cancel");
        toast.error(isCancelled ? "Setup cancelled." : "Could not verify biometric on this device.");
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      // Re-authenticate before disabling
      const verified = await triggerBiometric();
      if (!verified) {
        toast.error("Authentication required to disable Biometric Lock.");
        return false;
      }

      await setStorage('appLock_biometric_enabled', 'false');
      setIsBiometricEnabled(false);
      setIsLocked(false);

      if (user && isFirebaseReady()) {
        try {
          await updateDoc(doc(firebaseDb(), "users", user.uid), {
            "biometricLock.mobileEnabled": false,
            "biometricLock.updatedAt": serverTimestamp(),
          });
        } catch {
          // Non-blocking
        }
      }

      toast.success("Biometric App Lock disabled.");
      return true;
    }
  };

  // 5. Re-auth helper (for sensitive actions)
  const verifyAuth = (): Promise<boolean> => {
    if (!isNative || !isBiometricEnabled) return Promise.resolve(true);

    return new Promise((resolve) => {
      setVerifyOnly({ resolve });
      setIsLocked(true);
      setAuthError(null);
    });
  };

  // 6. Manual Lock action (Mobile Only)
  const lockNow = () => {
    if (isNative && isBiometricEnabled) {
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
        isLocked: isNative ? isLocked : false,
      }}
    >
      {children}

      {/* Biometric Unlock Overlay Screen - RENDERED STRICTLY ON MOBILE NATIVE APPS */}
      {isNative && isLocked && (
        <div className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            {/* Cancel Button if verifying an action */}
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

            {/* Biometric Icon */}
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

            {/* Error Message */}
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
