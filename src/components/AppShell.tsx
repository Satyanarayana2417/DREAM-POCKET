import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ListOrdered, LogOut, Plus, Target, User, Wallet, PieChart, Users, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { type ReactNode, useState } from "react";

import { FullPageLoader } from "./Loader";
import { useAuth, useRequireAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: ListOrdered },
  { to: "/add-expense", label: "Add Expense", icon: Plus, mobileOnly: true },
  { to: "/budget", label: "Budget", icon: Target },
  { to: "/family-budget", label: "Family", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const { loading, user } = useRequireAuth();
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();

  const showFAB = location.pathname === "/" || location.pathname === "/expenses";

  if (loading || !user) return <FullPageLoader label="Getting things ready…" />;

  const name = profile?.username?.split(" ")[0] || "there";

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate({ to: "/login", replace: true });
  }

  const desktopNav = [
    { to: "/", label: "Home", icon: LayoutDashboard },
    { to: "/expenses", label: "Expenses", icon: ListOrdered },
    { to: "/add-expense", label: "Add Expense", icon: Plus },
    { to: "/budget", label: "Budget", icon: Target },
    { to: "/family-budget", label: "Family Budget", icon: Users },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] md:pl-[260px] overflow-x-hidden">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/50 bg-card px-4 shadow-sm md:hidden">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary">
                <Menu className="size-6" />
                <span className="sr-only">Toggle Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex flex-col h-full bg-card px-6 py-8">
                <Link to="/" className="flex items-center gap-3 mb-10">
                  <img src="/logo.png" alt="DreamPocket Logo" className="size-10 object-contain" />
                  <div className="flex items-center">
                    <img src="/logo-text.png" alt="DreamPocket" className="h-5 object-contain" />
                  </div>
                </Link>
                
                <div className="mb-6 px-1">
                  <p className="text-sm font-semibold text-foreground">Track Today</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Build a Better Tomorrow</p>
                </div>

                <nav className="flex flex-1 flex-col gap-1.5">
                  {desktopNav.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeOptions={{ exact: item.to === "/" }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
                    >
                      <item.icon className="size-5" />
                      {item.label}
                    </Link>
                  ))}
                  
                  <button
                    onClick={handleLogout}
                    className="mt-auto flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="size-5" />
                    Logout
                  </button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt="DreamPocket Logo" className="size-11 object-contain" />
          </Link>
        </div>
        <Link to="/" className="flex items-center shrink-0">
          <img src="/logo-text.png" alt="DreamPocket" className="h-6 object-contain mr-2" />
        </Link>
      </header>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[260px] flex-col border-r border-border/50 bg-card px-6 py-8 md:flex shadow-sm">
        <Link to="/" className="flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="DreamPocket Logo" className="size-10 object-contain" />
          <div className="flex items-center">
            <img src="/logo-text.png" alt="DreamPocket" className="h-5 object-contain" />
          </div>
        </Link>
        
        <div className="mb-6 px-1">
          <p className="text-sm font-semibold text-foreground">Track Today</p>
          <p className="text-xs text-muted-foreground mt-0.5">Build a Better Tomorrow</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {desktopNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
          
          <button
            onClick={handleLogout}
            className="mt-auto flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-5" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 md:pb-12 md:pt-8">
        {children}
      </main>

      {/* Mobile bottom nav + floating add button */}
      <div className="fixed bottom-0 left-4 right-4 z-50 md:hidden pointer-events-none pb-[env(safe-area-inset-bottom)] pb-2">
        
        {/* Floating Action Button (Original Position - Add Expense) */}
        {showFAB && (
          <Link
            to="/add-expense"
            aria-label="Add expense"
            className="fixed right-5 bottom-28 z-50 flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg pointer-events-auto transition-transform active:scale-95"
          >
            <Plus className="size-6" />
          </Link>
        )}

        {/* Pill Navbar with Cutout Budget Button */}
        <nav className="relative flex items-center w-full h-[68px] pointer-events-auto filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          
          {/* Dynamic SVG Background Layer */}
          <div className="absolute inset-0 flex pointer-events-none">
            <div className="flex-1 bg-white rounded-l-[34px]"></div>
            <svg width="84" height="68" viewBox="0 0 84 68" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <path d="M 0 0 C 5 0, 5 10, 12 20 A 36 36 0 0 0 72 20 C 79 10, 79 0, 84 0 L 84 68 L 0 68 Z" fill="white" />
            </svg>
            <div className="flex-1 bg-white rounded-r-[34px]"></div>
          </div>

          {/* Central Cutout Floating Button (Budget) */}
          <Link
            to="/budget"
            aria-label="Budget"
            className="absolute left-1/2 top-[-28px] -translate-x-1/2 z-50 flex size-[56px] items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_4px_12px_rgba(5,150,105,0.4)] transition-transform active:scale-95"
          >
            <Target className="size-6" />
          </Link>

          {/* Left Items (Home, Expenses) */}
          <div className="flex flex-1 justify-evenly items-center z-10">
            {NAV.filter(n => !("mobileOnly" in n && n.mobileOnly)).slice(0, 2).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-medium text-slate-400 transition-colors data-[status=active]:text-emerald-600 w-12"
              >
                <item.icon className="size-5" />
                <span className="truncate w-full text-center">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Spacer for Center Cutout */}
          <div className="w-[60px] shrink-0" />

          {/* Right Items (Family, Profile) */}
          <div className="flex flex-1 justify-evenly items-center z-10">
            {NAV.filter(n => !("mobileOnly" in n && n.mobileOnly)).slice(3).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[10px] font-medium text-slate-400 transition-colors data-[status=active]:text-emerald-600 w-12"
              >
                <item.icon className="size-5" />
                <span className="truncate w-full text-center">{item.label}</span>
              </Link>
            ))}
          </div>

        </nav>
      </div>
    </div>
  );
}

export function Avatar({
  photoURL,
  name,
  size = 40,
}: {
  photoURL?: string | null | undefined;
  name: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);

  if (photoURL && !imgError) {
    return (
      <img
        src={photoURL}
        alt={name}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
        className="rounded-full border-2 border-background object-cover shadow-sm"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-primary/10 font-bold text-primary border-2 border-background shadow-sm"
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
