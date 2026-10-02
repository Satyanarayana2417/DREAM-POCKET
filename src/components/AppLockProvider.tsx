import React, { createContext, useContext, useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Fingerprint, Delete } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';

interface AppLockContextType {
  isPinEnabled: boolean;
  isBiometricEnabled: boolean;
  isBiometricSupported: boolean;
  setPinEnabled: (enabled: boolean, pin?: string) => Promise<boolean>;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  verifyAuth: () => Promise<boolean>;
  lockNow: () => void;
}

const AppLockContext = createContext<AppLockContextType | null>(null);

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (!context) throw new Error("useAppLock must be used within AppLockProvider");
  return context;
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(null);

  // Overlay state
  const [pinInput, setPinInput] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [showPinPad, setShowPinPad] = useState(false);
  const [verifyOnly, setVerifyOnly] = useState<{resolve: (v: boolean) => void} | null>(null);

  // Universal storage helpers
  const getStorage = async (key: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await SecureStoragePlugin.get({ key });
        return res.value;
      } catch { return null; }
    }
    return localStorage.getItem(key);
  };

  const setStorage = async (key: string, value: string) => {
    if (Capacitor.isNativePlatform()) {
      await SecureStoragePlugin.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  };

  const removeStorage = async (key: string) => {
    if (Capacitor.isNativePlatform()) {
      try { await SecureStoragePlugin.remove({ key }); } catch {}
    } else {
      localStorage.removeItem(key);
    }
  };

  // Load initial state
  useEffect(() => {
    const init = async () => {
      try {
        let supportsBio = false;
        if (Capacitor.isNativePlatform()) {
          try {
            const result = await NativeBiometric.isAvailable();
            supportsBio = result.isAvailable;
          } catch (e) {
            supportsBio = false;
          }
        }
        setIsBiometricSupported(supportsBio);

        const oldEnabled = await getStorage('appLock_enabled');
        const pinValue = await getStorage('appLock_pin');
        const pinEnabledStr = await getStorage('appLock_pin_enabled');
        const bioEnabledStr = await getStorage('appLock_biometric');

        let pinEnabled = pinEnabledStr === 'true';
        let bioEnabled = supportsBio && bioEnabledStr === 'true';

        // Migration from old App Lock toggle
        if (oldEnabled === 'true' && pinEnabledStr === null) {
          pinEnabled = true;
          await setStorage('appLock_pin_enabled', 'true');
        }

        setIsPinEnabled(pinEnabled);
        setIsBiometricEnabled(bioEnabled);
        setStoredPin(pinValue);

        if (pinEnabled || bioEnabled) {
          setIsLocked(true);
        }
      } catch (e) {
        // Init error
      } finally {
        setIsChecking(false);
      }
    };
    init();
  }, []);

  // Listen for app state changes to lock when going to background
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && (isPinEnabled || isBiometricEnabled)) {
        setIsLocked(true);
        setPinInput("");
        setErrorText("");
        setVerifyOnly(null);
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [isPinEnabled, isBiometricEnabled]);

  // Handle Lock Screen Mount
  useEffect(() => {
    if (isLocked) {
      if (isBiometricEnabled && isBiometricSupported) {
        setShowPinPad(false);
        triggerBiometric();
      } else if (isPinEnabled) {
        setShowPinPad(true);
      } else {
        // Fallback if somehow both are false but isLocked is true
        setIsLocked(false);
      }
    }
  }, [isLocked]);

  const triggerBiometric = async () => {
    if (!Capacitor.isNativePlatform() || !isBiometricSupported) return false;
    try {
      await NativeBiometric.verifyIdentity({
        reason: "Unlock Expense Manager",
        title: "Unlock App",
        subtitle: "Use your biometric to unlock",
      });
      handleUnlockSuccess();
      return true;
    } catch (e) {
      console.log("Biometric error", e);
      return false;
    }
  };

  const handleUnlockSuccess = () => {
    if (verifyOnly) {
      verifyOnly.resolve(true);
      setVerifyOnly(null);
    }
    setIsLocked(false);
    setPinInput("");
    setShowPinPad(false);
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setErrorText("");

      if (newPin.length === 4) {
        if (newPin === storedPin) {
          setTimeout(() => {
            handleUnlockSuccess();
          }, 200);
        } else {
          setErrorText("Incorrect PIN");
          setTimeout(() => setPinInput(""), 500);
        }
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorText("");
  };

  const setPinEnabled = async (enabled: boolean, pin?: string) => {
    if (enabled) {
      if (pin && pin !== "KEEP_CURRENT_PIN") {
        await setStorage('appLock_pin', pin);
        setStoredPin(pin);
      }
      await setStorage('appLock_pin_enabled', 'true');
      setIsPinEnabled(true);
    } else {
      await setStorage('appLock_pin_enabled', 'false');
      setIsPinEnabled(false);
    }
    return true;
  };

  const setBiometricEnabled = async (enabled: boolean) => {
    if (Capacitor.isNativePlatform()) {
      await setStorage('appLock_biometric', enabled ? 'true' : 'false');
      setIsBiometricEnabled(enabled);
    }
    return true;
  };

  const changePin = async (oldPin: string, newPin: string) => {
    if (oldPin !== storedPin) return false;
    await setStorage('appLock_pin', newPin);
    setStoredPin(newPin);
    return true;
  };

  const verifyAuth = (): Promise<boolean> => {
    if (!isPinEnabled && !isBiometricEnabled) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      setVerifyOnly({ resolve });
      setIsLocked(true);
      setPinInput("");
      setErrorText("");
    });
  };

  const lockNow = () => {
    if (isPinEnabled || isBiometricEnabled) {
      setIsLocked(true);
      setPinInput("");
      setErrorText("");
      setVerifyOnly(null);
    }
  };

  return (
    <AppLockContext.Provider value={{ 
      isPinEnabled, 
      isBiometricEnabled, 
      isBiometricSupported, 
      setPinEnabled, 
      setBiometricEnabled, 
      changePin, 
      verifyAuth,
      lockNow 
    }}>
      {children}
      
      {isChecking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
          <div className="size-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {isLocked && (
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="flex flex-col items-center w-full max-w-sm px-6 relative">
            {verifyOnly && (
              <button 
                onClick={() => {
                  verifyOnly.resolve(false);
                  setVerifyOnly(null);
                  setIsLocked(false);
                }}
                className="absolute -top-16 left-6 text-muted-foreground hover:text-foreground text-sm font-medium p-2"
              >
                Cancel
              </button>
            )}
            {!showPinPad ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                <Lock className="size-16 text-primary mb-6" />
                <h2 className="text-xl font-semibold mb-2 font-display text-foreground">App Locked</h2>
                <p className="text-muted-foreground mb-12 text-center text-sm">
                  {isPinEnabled ? "Unlock with biometric or PIN" : "Unlock with biometric"}
                </p>
                <button 
                  onClick={triggerBiometric}
                  className="rounded-full w-20 h-20 bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors mb-10"
                >
                  <Fingerprint className="size-10" />
                </button>
                {isPinEnabled && (
                  <button 
                    onClick={() => setShowPinPad(true)}
                    className="text-primary font-medium hover:underline text-sm"
                  >
                    Use App PIN
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 duration-200">
                <h2 className="text-xl font-semibold mb-2 font-display text-foreground">
                  {verifyOnly ? "Verify App PIN" : "Enter App PIN"}
                </h2>
                <p className="text-muted-foreground mb-8 text-center text-sm">
                  Please enter your 4-digit security PIN
                </p>
                
                {/* PIN Dots */}
                <div className="flex gap-4 mb-10">
                  {[0, 1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-3.5 h-3.5 rounded-full transition-all duration-200",
                        i < pinInput.length 
                          ? "bg-foreground border border-foreground scale-110" 
                          : "bg-transparent border-[1.5px] border-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>

                <p className="text-red-500 text-sm h-6 mb-2">{errorText}</p>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full max-w-[280px]">
                  {[
                    { num: "1", sub: "" },
                    { num: "2", sub: "ABC" },
                    { num: "3", sub: "DEF" },
                    { num: "4", sub: "GHI" },
                    { num: "5", sub: "JKL" },
                    { num: "6", sub: "MNO" },
                    { num: "7", sub: "PQRS" },
                    { num: "8", sub: "TUV" },
                    { num: "9", sub: "WXYZ" }
                  ].map(k => (
                    <button
                      key={k.num}
                      onClick={() => handlePinDigit(k.num)}
                      className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center transition-all mx-auto bg-card shadow-sm border border-border dark:border-primary dark:bg-transparent hover:bg-muted dark:hover:bg-primary/10 active:scale-95"
                    >
                      <span className="text-[26px] font-medium text-foreground leading-none">{k.num}</span>
                      {k.sub && <span className="text-[9px] font-semibold text-muted-foreground dark:text-primary tracking-widest mt-1 uppercase">{k.sub}</span>}
                    </button>
                  ))}
                  
                  <button
                    onClick={isBiometricEnabled && isBiometricSupported ? triggerBiometric : undefined}
                    className={cn(
                      "w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center transition-all mx-auto",
                      isBiometricEnabled && isBiometricSupported
                        ? "bg-card shadow-sm border border-border dark:border-primary dark:bg-transparent hover:bg-muted dark:hover:bg-primary/10 active:scale-95 cursor-pointer text-foreground" 
                        : "opacity-0 cursor-default"
                    )}
                    disabled={!isBiometricEnabled || !isBiometricSupported}
                  >
                    <Fingerprint className="size-7" />
                  </button>

                  <button
                    onClick={() => handlePinDigit("0")}
                    className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center transition-all mx-auto bg-card shadow-sm border border-border dark:border-primary dark:bg-transparent hover:bg-muted dark:hover:bg-primary/10 active:scale-95"
                  >
                    <span className="text-[26px] font-medium text-foreground leading-none">0</span>
                    <span className="text-[9px] font-semibold text-muted-foreground dark:text-primary tracking-widest mt-1 uppercase">+</span>
                  </button>

                  <button
                    onClick={handlePinDelete}
                    className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center transition-all mx-auto bg-card shadow-sm border border-border dark:border-primary dark:bg-transparent hover:bg-muted dark:hover:bg-primary/10 active:scale-95 text-foreground"
                  >
                    <Delete className="size-6" />
                  </button>
                </div>
                
                {isBiometricEnabled && isBiometricSupported && (
                   <button 
                     onClick={() => setShowPinPad(false)}
                     className="mt-8 text-primary font-medium hover:underline text-sm"
                   >
                     Use Biometric Unlock
                   </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLockContext.Provider>
  );
}
