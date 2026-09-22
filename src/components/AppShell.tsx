import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ListOrdered, LogOut, Plus, Target, User, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { FullPageLoader } from "./Loader";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { greeting } from "@/lib/expense-utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: ListOrdered },
  { to: "/budget", label: "Budget", icon: Target },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  showGreeting = false,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showGreeting?: boolean;
}) {
  const { loading, user } = useRequireAuth();
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (loading || !user) return <FullPageLoader label="Getting things ready…" />;

  const name = profile?.username?.split(" ")[0] || "there";

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-gradient-primary grid size-9 place-items-center rounded-xl text-primary-foreground">
              <Wallet className="size-4.5" />
            </span>
            <span className="font-display hidden text-base font-bold sm:block">HomeSpend</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground data-[status=active]:bg-secondary data-[status=active]:text-secondary-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/add-expense"
              className="bg-gradient-primary hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90 sm:flex"
            >
              <Plus className="size-4" /> Add Expense
            </Link>
            <Link to="/profile" aria-label="Profile">
              <Avatar photoURL={profile?.photoURL} name={name} />
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 md:pb-10">
        {(title || showGreeting) && (
          <div className="mb-5">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {showGreeting ? `${greeting()}, ${name}` : title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      {/* Mobile bottom nav + floating add button */}
      <Link
        to="/add-expense"
        aria-label="Add expense"
        className="bg-gradient-primary fixed right-5 bottom-20 z-40 grid size-14 place-items-center rounded-2xl text-primary-foreground shadow-soft md:hidden"
      >
        <Plus className="size-6" />
      </Link>
      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-border bg-card/95 pt-1.5 backdrop-blur md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Avatar({
  photoURL,
  name,
  size = 36,
}: {
  photoURL?: string | null | undefined;
  name: string;
  size?: number;
}) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        width={size}
        height={size}
        className="rounded-xl border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-xl bg-secondary font-semibold text-secondary-foreground"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
