import React, { createContext, useContext, useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Fingerprint, Delete } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';

interface AppLockContextType {
  isLockEnabled: boolean;
  isBiometricEnabled: boolean;
  enableLock: (pin: string, useBiometric: boolean) => Promise<void>;
  disableLock: (currentPin: string) => Promise<boolean>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
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
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(null);

  // Overlay state
  const [pinInput, setPinInput] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isChecking, setIsChecking] = useState(true);

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
        const enabledValue = await getStorage('appLock_enabled');
        const enabled = enabledValue === 'true';
        setIsLockEnabled(enabled);

        if (enabled) {
          const pinValue = await getStorage('appLock_pin');
          setStoredPin(pinValue);
          
          if (Capacitor.isNativePlatform()) {
            const bioValue = await getStorage('appLock_biometric');
            setIsBiometricEnabled(bioValue === 'true');
          } else {
            setIsBiometricEnabled(false);
          }
          
          setIsLocked(true);
        }
      } catch (e) {
        // Not configured
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
      if (!isActive && isLockEnabled) {
        setIsLocked(true);
        setPinInput("");
        setErrorText("");
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [isLockEnabled]);

  // Attempt biometric on mount if locked
  useEffect(() => {
    if (isLocked && isBiometricEnabled && storedPin && Capacitor.isNativePlatform()) {
      triggerBiometric();
    }
  }, [isLocked, isBiometricEnabled, storedPin]);

  const triggerBiometric = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await NativeBiometric.verifyIdentity({
        reason: "Unlock Expense Manager",
        title: "Unlock App",
        subtitle: "Use your fingerprint or face to unlock",
      });
      setIsLocked(false);
      setPinInput("");
    } catch (e) {
      console.log("Biometric error", e);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setErrorText("");

      if (newPin.length === 4) {
        if (newPin === storedPin) {
          setTimeout(() => {
            setIsLocked(false);
            setPinInput("");
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

  const enableLock = async (pin: string, useBiometric: boolean) => {
    await setStorage('appLock_enabled', 'true');
    
    if (pin !== "KEEP_CURRENT_PIN") {
      await setStorage('appLock_pin', pin);
      setStoredPin(pin);
    }
    
    if (Capacitor.isNativePlatform()) {
      await setStorage('appLock_biometric', useBiometric ? 'true' : 'false');
      setIsBiometricEnabled(useBiometric);
    }
    setIsLockEnabled(true);
  };

  const disableLock = async (currentPin: string) => {
    if (currentPin !== storedPin) return false;
    await removeStorage('appLock_enabled');
    await removeStorage('appLock_pin');
    await removeStorage('appLock_biometric');
    
    setIsLockEnabled(false);
    setStoredPin(null);
    setIsBiometricEnabled(false);
    return true;
  };

  const changePin = async (oldPin: string, newPin: string) => {
    if (oldPin !== storedPin) return false;
    await setStorage('appLock_pin', newPin);
    setStoredPin(newPin);
    return true;
  };

  const lockNow = () => {
    if (isLockEnabled) {
      setIsLocked(true);
      setPinInput("");
      setErrorText("");
    }
  };

  return (
    <AppLockContext.Provider value={{ isLockEnabled, isBiometricEnabled, enableLock, disableLock, changePin, lockNow }}>
      {children}
      
      {isChecking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
          <div className="size-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {isLocked && (
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="flex flex-col items-center w-full max-w-sm px-6">
            <h2 className="text-2xl font-semibold mb-2 font-display">Enter App PIN</h2>
            <p className="text-muted-foreground mb-8 text-center text-sm">
              Please enter your 4-digit PIN to unlock
            </p>
            
            {/* PIN Dots */}
            <div className="flex gap-4 mb-12">
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={cn(
                    "w-4 h-4 rounded-full transition-all duration-200",
                    i < pinInput.length ? "bg-primary scale-110" : "bg-muted"
                  )}
                />
              ))}
            </div>

            <p className="text-red-500 text-sm h-6 mb-4">{errorText}</p>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handlePinDigit(num.toString())}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium mx-auto hover:bg-muted/50 active:bg-muted transition-colors font-display"
                >
                  {num}
                </button>
              ))}
              
              <button
                onClick={isBiometricEnabled ? triggerBiometric : undefined}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-primary mx-auto transition-colors",
                  isBiometricEnabled ? "hover:bg-muted/50 active:bg-muted cursor-pointer" : "opacity-0 cursor-default"
                )}
                disabled={!isBiometricEnabled}
              >
                <Fingerprint className="size-8" />
              </button>

              <button
                onClick={() => handlePinDigit("0")}
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium mx-auto hover:bg-muted/50 active:bg-muted transition-colors font-display"
              >
                0
              </button>

              <button
                onClick={handlePinDelete}
                className="w-16 h-16 rounded-full flex items-center justify-center text-muted-foreground mx-auto hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <Delete className="size-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLockContext.Provider>
  );
}
