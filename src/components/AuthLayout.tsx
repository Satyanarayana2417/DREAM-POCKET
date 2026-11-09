import { Wallet } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="bg-hero flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="DreamPocket Logo" className="size-10 object-contain" />
            <img src="/logo-text.png" alt="DreamPocket" className="h-6 object-contain" />
          </div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="surface-card p-5 sm:p-6">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

export function GoogleButton({
  onClick,
  loading,
  label = "Continue with Google",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60 cursor-pointer shadow-2xs"
    >
      <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24Z"
        />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}

export function AppleButton({
  onClick,
  loading,
  label = "Continue with Apple",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border border-black/10 px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
    >
      <svg viewBox="0 0 170 170" className="size-4 shrink-0 fill-current" aria-hidden>
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.86-11.96-14.45-5.99-9.24-10.49-19.8-13.5-31.7-3.01-11.9-4.52-23.23-4.52-33.99 0-14.02 3.65-25.59 10.96-34.71 7.31-9.12 16.38-13.78 27.21-13.98 5.43 0 11.2 1.48 17.3 4.43 6.1 2.96 10.02 4.49 11.75 4.59 1.41 0 5.45-1.57 12.12-4.71 6.67-3.14 12.63-4.46 17.89-3.96 13.68.74 24.31 5.75 31.89 15.03-12.01 7.28-17.89 17.27-17.65 29.98.24 9.94 4.08 18.23 11.51 24.87 7.43 6.64 16.27 10.36 26.51 11.16-2.19 6.84-4.87 13.74-8.05 20.71zM119.22 33.74c0-7.72 2.76-14.88 8.28-21.49 5.53-6.61 12.39-10.74 20.6-12.4 1.09 7.42-.51 14.54-4.8 21.36-4.29 6.82-10.45 11.08-18.49 12.78-1.59-.14-3.46-.22-5.59-.25z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-input bg-card px-3.5 py-3 text-base outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40";

export const primaryButtonClass =
  "bg-gradient-primary w-full rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:opacity-60";
