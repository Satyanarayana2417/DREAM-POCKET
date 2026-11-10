import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ListOrdered, LogOut, Plus, Target, User, Wallet, PieChart, Users, Menu, Bell, Banknote, Moon, Sun } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { type ReactNode, useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

import { FullPageLoader } from "./Loader";
import { useAuth, useRequireAuth } from "@/lib/auth";

import { setupForegroundMessageListener } from "@/lib/notifications";
import { subscribeToUnreadCount } from "@/lib/notificationHistory";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: ListOrdered },
  { to: "/add-expense", label: "Add Expense", icon: Plus, mobileOnly: true },
  { to: "/budget", label: "Budget", icon: Banknote },
  { to: "/family-budget", label: "Family", icon: Users },
] as const;

export function StyledHamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 6.5h16" />
      <path d="M4 12h10" />
      <path d="M4 17.5h14" />
    </svg>
  );
}

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
  
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, setTheme } = useTheme();
  const isProfilePage = location.pathname.startsWith("/profile");
  const isBudgetPage = location.pathname.startsWith("/budget");
  const isSettingsPage = location.pathname.startsWith("/settings");
  const isEditProfilePage = location.pathname.startsWith("/edit-profile");
  const isReportsPage = location.pathname.startsWith("/reports");
  const isHomePage = location.pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHomePage) {
      setIsScrolled(false);
      return;
    }
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const isHeroTransparent = isHomePage && !isScrolled;

  useEffect(() => {
    if (user) {
      let unsub: () => void = () => {};
      setupForegroundMessageListener(user.uid).then((u) => {
        if (typeof u === 'function') unsub = u;
      });
      
      const unsubCount = subscribeToUnreadCount(user.uid, (c) => {
        setUnreadCount(c);
      });
      
      return () => {
        unsub();
        unsubCount();
      };
    }
  }, [user]);

  const showFAB = location.pathname === "/" || location.pathname === "/expenses";
  const hideBottomNav = isEditProfilePage || isReportsPage;

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
    { to: "/budget", label: "Budget", icon: Banknote },
    { to: "/family-budget", label: "Family Budget", icon: Users },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background md:pl-[260px] overflow-x-hidden">
      {/* Mobile Header (Hidden on budget, settings & reports page) */}
      {!isBudgetPage && !isSettingsPage && !isEditProfilePage && !isReportsPage && (
        <header
          className={cn(
            "flex h-16 items-center justify-between px-4 transition-all duration-300 md:hidden z-40",
            isHomePage
              ? isHeroTransparent
                ? "absolute top-0 left-0 right-0 border-b border-transparent bg-transparent shadow-none"
                : "fixed top-0 left-0 right-0 border-b border-border/40 bg-background/95 backdrop-blur-md shadow-xs"
              : "sticky top-0 border-b border-border/40 bg-background/95 backdrop-blur-md shadow-xs"
          )}
        >
          <div className="flex items-center gap-2.5">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg transition-colors active:scale-95",
                    isHeroTransparent
                      ? "text-white hover:bg-white/15"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <StyledHamburgerIcon className="size-6" />
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
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2 transition-opacity active:opacity-80">
              <img src="/logo.png" alt="Dream Pocket" className="size-9 object-contain shrink-0" />
              <span
                className={cn(
                  "text-[17px] font-bold tracking-tight leading-none transition-colors",
                  isHeroTransparent
                    ? "text-white drop-shadow-sm"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                Dream Pocket
              </span>
            </Link>
          </div>
          
          {isProfilePage ? (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex size-10 items-center justify-center rounded-full text-foreground/80 hover:bg-secondary transition-colors active:scale-95"
              aria-label="Toggle dark/light mode"
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/notifications"
                className={cn(
                  "relative p-2 rounded-full transition-colors",
                  isHeroTransparent
                    ? "text-white hover:bg-white/15"
                    : "text-foreground/80 hover:bg-secondary/60"
                )}
                aria-label="Notifications"
              >
                <Bell className="size-5 stroke-[2]" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-background" />
              </Link>
              <Link
                to="/profile"
                className={cn(
                  "flex items-center justify-center rounded-full transition-transform active:scale-95 ring-2",
                  isHeroTransparent
                    ? "ring-white/40 hover:ring-white/70"
                    : "ring-primary/20 hover:ring-primary/40"
                )}
                aria-label="Profile"
              >
                <Avatar photoURL={profile?.photoURL} name={profile?.username || "User"} size={36} />
              </Link>
            </div>
          )}
        </header>
      )}

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
          
          <Link
            to="/notifications"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary mt-auto"
          >
            <div className="relative">
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-card">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            Notifications
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main
        className={cn(
          "mx-auto w-full max-w-6xl pb-28 sm:px-6 md:pb-12 md:pt-8",
          isHomePage
            ? "px-4 pt-0 md:pt-8"
            : isBudgetPage
            ? "px-4 pt-2 md:pt-6"
            : isReportsPage
            ? "px-0 pt-0 pb-28 md:px-4 md:pt-6"
            : "px-4 pt-6 md:pt-8"
        )}
      >
        {children}
      </main>

      {/* Mobile bottom nav + floating add button */}
      {!hideBottomNav && (
        <div className="fixed bottom-0 left-2 right-2 sm:left-4 sm:right-4 z-50 md:hidden pointer-events-none pb-[env(safe-area-inset-bottom)] pb-2">
        
        {/* Floating Action Button (Original Position - Add Expense) */}
        {showFAB && (
          <Link
            to="/add-expense"
            aria-label="Add expense"
            className="fixed right-4 xs:right-5 bottom-26 sm:bottom-28 z-50 flex size-13 xs:size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg pointer-events-auto transition-transform active:scale-95"
          >
            <Plus className="size-6" />
          </Link>
        )}

        {/* Pill Navbar — 4 icons in a row */}
        <nav className="relative flex items-center w-full h-[62px] xs:h-[64px] pointer-events-auto rounded-[32px] bg-card filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex flex-1 justify-evenly items-center z-10">
            {NAV.filter(n => !("mobileOnly" in n && n.mobileOnly)).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="flex flex-col items-center justify-center gap-1 py-1 px-0.5 xs:px-1 text-[9.5px] xs:text-[10px] font-medium text-muted-foreground transition-colors data-[status=active]:text-emerald-600 w-14 xs:w-16"
              >
                <item.icon className="size-4.5 xs:size-5" />
                <span className="text-center whitespace-nowrap">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
      )}
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
