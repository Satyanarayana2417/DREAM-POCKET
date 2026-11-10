import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

export type DeviceType = "android" | "ios" | "desktop";
export type InstallStatus = "Installed" | "Installation Available" | "Not Installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Global variable to capture prompt if fired before hook mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Device detection
  const isCapacitor = Capacitor.isNativePlatform();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAndroid = /Android/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isIOS = isIPhone || isIPad;
  const isIOSSafari = isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
  const isIOSOtherBrowser = isIOS && !isIOSSafari;
  const isDesktop = !isAndroid && !isIOS;

  const deviceType: DeviceType = isAndroid ? "android" : isIOS ? "ios" : "desktop";

  // Check standalone mode on mount and display-mode changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkStandalone = () => {
      const matchMediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const navStandalone = (window.navigator as any).standalone === true;
      const standalone = matchMediaStandalone || navStandalone || isCapacitor;
      setIsStandalone(standalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsAppInstalled(true);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handler);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isCapacitor]);

  // Determine current installation status
  const isInstalled = isStandalone || isAppInstalled || isCapacitor;

  let installStatus: InstallStatus = "Not Installed";
  if (isInstalled) {
    installStatus = "Installed";
  } else if (isIOS || deferredPrompt !== null) {
    installStatus = "Installation Available";
  } else {
    installStatus = "Not Installed";
  }

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "guide" | "already-installed" | "unsupported"> => {
    if (isInstalled) {
      return "already-installed";
    }

    // iOS flow: iOS doesn't support beforeinstallprompt; display step-by-step in-app guide
    if (isIOS) {
      setShowIOSGuide(true);
      return "guide";
    }

    // Android & Chromium desktop: trigger native installation prompt
    const promptEvent = deferredPrompt || globalDeferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setIsAppInstalled(true);
          setDeferredPrompt(null);
          globalDeferredPrompt = null;
          return "accepted";
        }
        return "dismissed";
      } catch (err) {
        console.error("Installation prompt error:", err);
      }
    }

    // If on Android/Desktop without deferredPrompt (e.g. already rejected or unsupported browser)
    return "unsupported";
  }, [isInstalled, isIOS, deferredPrompt]);

  return {
    installStatus,
    isInstalled,
    isStandalone,
    deviceType,
    isAndroid,
    isIOS,
    isIPhone,
    isIPad,
    isIOSSafari,
    isIOSOtherBrowser,
    isDesktop,
    showIOSGuide,
    setShowIOSGuide,
    promptInstall,
    hasDeferredPrompt: !!deferredPrompt || !!globalDeferredPrompt,
  };
}

