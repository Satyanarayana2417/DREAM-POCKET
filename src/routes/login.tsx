import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  AuthLayout,
  Field,
  GoogleButton,
  inputClass,
  primaryButtonClass,
} from "@/components/AuthLayout";
import { friendlyAuthError, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Log in — DreamPocket" },
      {
        name: "description",
        content: "Log in to DreamPocket to track your home expenses and monthly budgets.",
      },
      { property: "og:title", content: "Log in — DreamPocket" },
      {
        property: "og:description",
        content: "Track home expenses and monthly budgets in one clean dashboard.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { loginWithEmail, loginWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await loginWithEmail(email.trim(), password);
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your home expenses"
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onClick={google} loading={busy} />
    </AuthLayout>
  );
}
