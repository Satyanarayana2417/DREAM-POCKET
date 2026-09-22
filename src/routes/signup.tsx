import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthLayout, Field, GoogleButton, inputClass, primaryButtonClass } from "@/components/AuthLayout";
import { friendlyAuthError, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create account — HomeSpend Expense Manager" },
      { name: "description", content: "Create a free HomeSpend account to track household spending and budgets." },
      { property: "og:title", content: "Create account — HomeSpend Expense Manager" },
      { property: "og:description", content: "Start tracking household spending and monthly budgets today." },
    ],
  }),
  component: SignupPage,
});

type Errors = Partial<Record<"username" | "email" | "password" | "confirm", string>>;

function SignupPage() {
  const { signUpWithEmail, loginWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const next: Errors = {};
    if (!form.username.trim()) next.username = "Username is required.";
    else if (form.username.trim().length < 3) next.username = "Use at least 3 characters.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
      next.email = "Enter a valid email address.";
    if (!form.password) next.password = "Password is required.";
    else if (form.password.length < 6) next.password = "Use at least 6 characters.";
    if (form.confirm !== form.password) next.confirm = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await signUpWithEmail(form.username.trim(), form.email.trim(), form.password);
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
      title="Create your account"
      subtitle="Track every rupee your home spends"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username" error={errors.username}>
          <input
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            placeholder="Satya"
            autoComplete="name"
            className={inputClass}
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <input
            type="email"
            inputMode="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputClass}
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <input
            type="password"
            value={form.confirm}
            onChange={(e) => update("confirm", e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onClick={google} loading={busy} label="Sign up with Google" />
    </AuthLayout>
  );
}
