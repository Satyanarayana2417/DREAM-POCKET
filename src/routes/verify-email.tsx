import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { Mail, CheckCircle2, RefreshCw, LogOut, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { friendlyAuthError, isUserEmailVerificationRequired, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verify Your Email — Dream Pocket" },
      {
        name: "description",
        content: "Verify your email address to access Dream Pocket personal finance dashboard.",
      },
    ],
  }),
  component: VerifyEmailPage,
});

const COOLDOWN_KEY = "dp_verify_email_cooldown_until";

function getRemainingCooldown(): number {
  try {
    const raw = sessionStorage.getItem(COOLDOWN_KEY);
    if (!raw) return 0;
    const until = parseInt(raw, 10);
    const diff = Math.ceil((until - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
}

function setCooldown(seconds: number) {
  try {
    const until = Date.now() + seconds * 1000;
    sessionStorage.setItem(COOLDOWN_KEY, until.toString());
  } catch {
    // Non-blocking
  }
}

function VerifyEmailPage() {
  const { user, loading, checkVerification, sendVerification, logout } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldownSeconds] = useState<number>(() => getRemainingCooldown());
  const checkingRef = useRef(false);

  // Redirect logic:
  // If no user -> /login
  // If user is already verified or OAuth user -> /
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/login", replace: true });
      } else if (!isUserEmailVerificationRequired(user)) {
        navigate({ to: "/", replace: true });
      }
    }
  }, [loading, user, navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      const remaining = getRemainingCooldown();
      setCooldownSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handler: check if user verified email
  const handleCheckVerified = useCallback(
    async (isBackgroundCheck = false) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      if (!isBackgroundCheck) setChecking(true);

      try {
        const verified = await checkVerification();
        if (verified) {
          toast.success("Email verified successfully! Welcome to Dream Pocket.");
          navigate({ to: "/", replace: true });
        } else if (!isBackgroundCheck) {
          toast.error("Email not verified yet. Please click the link in your inbox and try again.");
        }
      } catch (err) {
        if (!isBackgroundCheck) {
          toast.error(friendlyAuthError(err));
        }
      } finally {
        checkingRef.current = false;
        if (!isBackgroundCheck) setChecking(false);
      }
    },
    [checkVerification, navigate],
  );

  // Auto-detect verification when user returns to this browser tab from their email client
  useEffect(() => {
    const onFocus = () => {
      if (user && isUserEmailVerificationRequired(user)) {
        handleCheckVerified(true);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, handleCheckVerified]);

  // Handler: resend verification email with 60s cooldown
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await sendVerification();
      setCooldown(60);
      setCooldownSeconds(60);
      toast.success("Verification email resent! Please check your inbox and spam folder.");
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate({ to: "/login", replace: true });
    } catch (err) {
      toast.error(friendlyAuthError(err));
    }
  };

  if (loading) {
    return (
      <div className="bg-hero flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  const userEmail = user?.email || "your registered email";

  return (
    <div className="bg-hero min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Dream Pocket Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-2.5 mb-3">
            <img src="/logo.png" alt="Dream Pocket Logo" className="size-11 object-contain drop-shadow-xs" />
            <img src="/logo-text.png" alt="Dream Pocket" className="h-7 object-contain" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck className="size-3.5" />
            Step 2 of 2: Security Verification
          </span>
        </div>

        {/* Verification Card */}
        <div className="surface-card p-6 sm:p-8 rounded-3xl border border-border/80 shadow-soft backdrop-blur-sm">
          {/* Email Icon with Emerald Accent */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="size-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-emerald-100 to-emerald-50 dark:from-emerald-950/80 dark:via-emerald-900/40 dark:to-emerald-800/20 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                <Mail className="size-10 text-emerald-600 dark:text-emerald-400 stroke-[1.8]" />
              </div>
              <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white ring-4 ring-card shadow-xs">
                <Sparkles className="size-3.5 fill-current" />
              </div>
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
              Verify Your Email
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a verification link to your email address. Please click the link to confirm your account and get started.
            </p>

            {/* Dynamic Registered Email Highlight */}
            <div className="mt-3 inline-flex items-center justify-center max-w-full px-4 py-2 rounded-2xl bg-muted/70 border border-border/70 text-xs sm:text-sm font-semibold text-foreground break-all">
              <span className="truncate">{userEmail}</span>
            </div>
          </div>

          {/* Primary Action: I've Verified My Email */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleCheckVerified(false)}
              disabled={checking}
              className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-soft hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {checking ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Checking status...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4.5" />
                  <span>I've Verified My Email</span>
                </>
              )}
            </button>

            {/* Secondary Action: Resend Verification Email */}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="w-full h-11 rounded-xl border border-border/80 bg-card hover:bg-muted/60 text-foreground font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              {resending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin text-emerald-600" />
                  <span>Sending email...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Resend verification email in {cooldown}s</span>
              ) : (
                <>
                  <RefreshCw className="size-3.5 text-muted-foreground" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>
          </div>

          {/* Helpful Information Box */}
          <div className="mt-6 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/15 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-emerald-900 dark:text-emerald-300">
              💡 Didn't receive an email?
            </p>
            <p>
              Check your Spam, Junk, or Promotions folder. It typically takes less than a minute to arrive.
            </p>
          </div>

          {/* Sign Out Option */}
          <div className="mt-6 pt-5 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Wrong email address?</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 font-semibold text-destructive hover:underline cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground mt-5">
          Dream Pocket keeps your household expenses secure and private.
        </p>
      </div>
    </div>
  );
}

