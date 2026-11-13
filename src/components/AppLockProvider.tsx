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

/**
 * Accurately detects whether the client is a mobile device (Android, iPhone, iPad, Capacitor)
 * vs a desktop/laptop computer (Windows PC, Mac, Linux).
 */
export function isMobileOrTablet(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;

  const ua = navigator.userAgent || "";
  // Check typical mobile & tablet user agent keywords
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
  
  // iPads running iOS 13+ report as Macintosh with touch points
  const isIPadSafari = /Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;

  // Touch screen on mobile/tablet viewport sizes
  const isTouchMobileViewport = window.matchMedia("(max-width: 1024px)").matches && (navigator.maxTouchPoints || 0) > 0;

  return isMobileUA || isIPadSafari || isTouchMobileViewport;
}

// Helpers for WebAuthn ArrayBuffer / Base64 conversions (Mobile Web/PWA)
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

// Universal storage helpers (Native Keystore on Mobile App, LocalStorage on Mobile Web/PWA)
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
      // Non-blocking fallback
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
 * Checks biometric hardware support strictly on mobile devices (Android & iOS).
 * On laptops and desktop computers, biometrics are disabled.
 */
async function checkMobileBiometricSupport(): Promise<{ supported: boolean; label: string }> {
  // If running on desktop/laptop, biometrics are not used
  if (!isMobileOrTablet()) {
    return { supported: false, label: "Mobile Only" };
  }

  // 1. Native Capacitor (Android APK / iOS app)
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

  // 2. Mobile Web / Mobile PWA (Android Chrome, iOS Safari, PWA)
  if (
    typeof window !== "undefined" &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  ) {
    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
        const label = isIOS ? "Face ID / Touch ID" : "Fingerprint Lock";
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

  const isMobile = isMobileOrTablet();
  const isNative = Capacitor.isNativePlatform();

  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [authenticatorLabel, setAuthenticatorLabel] = useState("Biometric Lock");
  const [storedCredId, setStoredCredId] = useState<string | null>(null);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Transient verification resolver (for sensitive action re-auth)
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
      // On laptops / desktops: Biometric App Lock is strictly disabled (no lock screen, no prompt)
      if (!isMobile) {
        if (active) {
          setIsBiometricSupported(false);
          setIsBiometricEnabled(false);
          setIsLocked(false);
          setIsChecking(false);
        }
        return;
      }

      // On Mobile Devices (Android, iPhone, iPad, Native & PWA): check hardware & restore state
      try {
        const { supported, label } = await checkMobileBiometricSupport();
        if (!active) return;
        setIsBiometricSupported(supported);
        setAuthenticatorLabel(label);

        const localBioEnabled = (await getStorage('appLock_biometric_enabled')) === 'true';
        const localCredId = await getStorage('appLock_biometric_cred_id');
        let enabled = localBioEnabled;
        let credId = localCredId;

        // Optionally sync with Firestore profile on mobile
        if (user && isFirebaseReady()) {
          try {
            const userSnap = await getDoc(doc(firebaseDb(), "users", user.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              if (data?.["biometricLock"]?.["mobileEnabled"] !== undefined) {
                enabled = Boolean(data["biometricLock"]["mobileEnabled"]);
                credId = data["biometricLock"]["credentialId"] || credId;
              } else if (data?.["biometricLock"]?.["enabled"] !== undefined) {
                enabled = Boolean(data["biometricLock"]["enabled"]);
                credId = data["biometricLock"]["credentialId"] || credId;
              }
            }
          } catch {
            // Non-blocking fallback
          }
        }

        if (active) {
          setIsBiometricEnabled(enabled);
          setStoredCredId(credId);

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
  }, [user, isMobile]);

  // 2. Auto-lock on Mobile Backgrounding / Tab Inactivity
  useEffect(() => {
    if (!isMobile || !isBiometricEnabled) return;

    let nativeListener: Promise<any> | null = null;
    if (isNative) {
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
    }

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
  }, [isMobile, isNative, isBiometricEnabled]);

  // WebAuthn Registration helper (Mobile Web/PWA)
  const registerWebAuthn = async (): Promise<string | null> => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      throw new Error("Biometrics not supported on this browser.");
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
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) throw new Error("No credential was created.");
    return bufferToBase64(credential.rawId);
  };

  // WebAuthn Authentication helper (Mobile Web/PWA)
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

  // 3. Trigger Biometric Prompt (Strictly Mobile: Native or Mobile Web/PWA)
  const triggerBiometric = useCallback(async (): Promise<boolean> => {
    if (!isMobile) {
      setIsLocked(false);
      return true;
    }

    if (isAuthenticatingRef.current) return false;
    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      let success = false;

      if (isNative) {
        await NativeBiometric.verifyIdentity({
          reason: "Authenticate to unlock Dream Pocket",
          title: "Dream Pocket Security",
          subtitle: "Confirm your identity to access expenses",
          negativeButtonText: "Cancel",
        });
        success = true;
      } else {
        // Mobile Web/PWA WebAuthn verification
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
      console.warn("Mobile biometric verification error:", err);
      const isCancelled =
        err?.message?.includes("cancel") ||
        err?.message?.includes("10") ||
        err?.code === "10" ||
        err?.name === "NotAllowedError";
      setAuthError(isCancelled ? "Authentication was cancelled." : "Verification failed. Tap below to retry.");
      return false;
    } finally {
      isAuthenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, [isMobile, isNative, storedCredId, verifyOnly]);

  // Automatically trigger biometric prompt on mobile when locked
  useEffect(() => {
    if (isMobile && isLocked && isBiometricEnabled && !isAuthenticatingRef.current) {
      const timer = setTimeout(() => {
        triggerBiometric();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isLocked, isBiometricEnabled, triggerBiometric]);

  // 4. Enable / Disable Biometric Lock (Mobile Only)
  const setBiometricEnabledHandler = async (enabled: boolean): Promise<boolean> => {
    if (!isMobile) {
      toast.info("Biometric App Lock is available on mobile devices (Android & iPhone).");
      return false;
    }

    if (enabled) {
      // Verify identity before enabling
      setIsAuthenticating(true);
      try {
        let credId: string | null = null;

        if (isNative) {
          await NativeBiometric.verifyIdentity({
            reason: "Verify your biometric to enable Dream Pocket App Lock",
            title: "Enable Biometric Lock",
            subtitle: "Scan your fingerprint or face to protect your account",
            negativeButtonText: "Cancel",
          });
          credId = "native-device-biometric";
        } else {
          // Mobile Web / PWA enrollment
          credId = await registerWebAuthn();
        }

        if (!credId) throw new Error("Could not register biometric authenticator.");

        await setStorage('appLock_biometric_enabled', 'true');
        await setStorage('appLock_biometric_cred_id', credId);
        setStoredCredId(credId);
        setIsBiometricEnabled(true);

        if (user && isFirebaseReady()) {
          try {
            await updateDoc(doc(firebaseDb(), "users", user.uid), {
              "biometricLock.mobileEnabled": true,
              "biometricLock.enabled": true,
              "biometricLock.credentialId": credId,
              "biometricLock.updatedAt": serverTimestamp(),
            });
          } catch {
            // Non-blocking
          }
        }

        toast.success("Biometric App Lock enabled on this device!");
        return true;
      } catch (err: any) {
        console.error("Biometric setup error:", err);
        const isCancelled = err?.message?.includes("cancel") || err?.name === "NotAllowedError";
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
      await removeStorage('appLock_biometric_cred_id');
      setStoredCredId(null);
      setIsBiometricEnabled(false);
      setIsLocked(false);

      if (user && isFirebaseReady()) {
        try {
          await updateDoc(doc(firebaseDb(), "users", user.uid), {
            "biometricLock.mobileEnabled": false,
            "biometricLock.enabled": false,
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
    if (!isMobile || !isBiometricEnabled) return Promise.resolve(true);

    return new Promise((resolve) => {
      setVerifyOnly({ resolve });
      setIsLocked(true);
      setAuthError(null);
    });
  };

  // 6. Manual Lock action (Mobile Only)
  const lockNow = () => {
    if (isMobile && isBiometricEnabled) {
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
        isLocked: isMobile ? isLocked : false,
      }}
    >
      {children}

      {/* Biometric Unlock Overlay Screen - RENDERED STRICTLY ON MOBILE PHONES & TABLETS */}
      {isMobile && isLocked && (
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
