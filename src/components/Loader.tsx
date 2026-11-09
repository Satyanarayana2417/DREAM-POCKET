import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// Track session boot state so the logo splash animation happens strictly ONCE on app opening
let initialSplashCompleted = false;

export function markInitialSplashDone() {
  initialSplashCompleted = true;
}

export function hasInitialSplashCompleted() {
  return initialSplashCompleted;
}

export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  const [isInitialBoot, setIsInitialBoot] = useState(!initialSplashCompleted);

  useEffect(() => {
    // When the loader unmounts, mark boot splash as done permanently for this session
    return () => {
      initialSplashCompleted = true;
    };
  }, []);

  // First app open: show the full branded splash screen
  if (isInitialBoot) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-background transition-opacity duration-300">
        <div className="flex flex-col items-center justify-center animate-splash">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mb-5 p-4 bg-card rounded-3xl shadow-soft flex items-center justify-center border border-border/50">
            <img 
              src="/logo.png" 
              alt="Dream Pocket Logo" 
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2 font-display">Dream Pocket</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <div className="size-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs sm:text-sm font-medium">Getting things ready…</p>
          </div>
        </div>
      </div>
    );
  }

  // In-app navigation / section switching: Smooth, minimal, non-intrusive loader without logo animation
  return (
    <div className="fixed inset-0 z-[50] flex flex-col items-center justify-center bg-background/50 backdrop-blur-[2px] transition-opacity duration-150">
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-card/95 border border-border/70 shadow-soft">
        <div className="size-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
    </div>
  );
}
