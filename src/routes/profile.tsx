import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  LogOut,
  User,
  Mail,
  Calendar,
  Shield,
  Edit2,
  Check,
  ChevronRight,
  Settings as SettingsIcon,
  ArrowLeft,
  Camera,
  Loader2,
  BarChart3,
  Layers,
  CreditCard,
  Bell,
  Cloud,
  HelpCircle,
  ArrowUp,
  Target,
  Coins,
  Crown,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { updateUserDoc, fetchExpenses, fetchIncomes } from "@/lib/data";
import {
  currentMonthKey,
  formatINR,
  inMonth,
  sumAmount,
} from "@/lib/expense-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell, Avatar } from "@/components/AppShell";
import { ImageCropperDialog } from "@/components/ImageCropper";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { firebaseStorage } from "@/lib/firebase";

export const Route = createFileRoute("/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate({ to: "/login", replace: true });
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const startEditing = () => {
    setEditName(profile?.username || "");
    setIsEditingName(true);
  };

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user) throw new Error("Not authenticated");
      await updateUserDoc(user.uid, { username: newName });
    },
    onSuccess: () => {
      toast.success("Profile name updated!");
      setIsEditingName(false);
      refreshProfile();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update name");
    },
  });

  const saveName = () => {
    if (!editName.trim()) return;
    if (editName === profile?.username) {
      setIsEditingName(false);
      return;
    }
    updateNameMutation.mutate(editName.trim());
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const uploadProfilePicture = async (blob: Blob) => {
    if (!user) return;
    try {
      setIsUploading(true);
      setSelectedImage(null);
      const storage = firebaseStorage();
      const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: url });
      await updateUserDoc(user.uid, { photoURL: url });

      toast.success("Profile picture updated!");
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload picture");
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch income and expenses for summary
  const monthKey = currentMonthKey();

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: !!user,
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes", user?.uid],
    queryFn: () => fetchIncomes(user!.uid),
    enabled: !!user,
  });

  const monthExpenses = expenses.filter((e) => inMonth(e, monthKey) && !e.isBudgetExpense);
  const currentIncome = incomes.find((i) => i.month === monthKey)?.amount || 0;
  const totalExpenses = sumAmount(monthExpenses);

  const hasData = expenses.length > 0 || incomes.length > 0;
  const incomeAmount = hasData ? currentIncome : 35000;
  const expenseAmount = hasData ? totalExpenses : 12450;
  const savingsAmount = hasData ? currentIncome - totalExpenses : 22550;

  if (!profile) return null;

  const joinDate = (profile as any).createdAt
    ? new Date((profile as any).createdAt.seconds * 1000)
    : new Date();

  // Menu items with professional green theme (no backgrounds)
  const menuItems = [
    {
      icon: BarChart3,
      title: "My Reports",
      subtitle: "View and download your financial reports",
      onClick: () => navigate({ to: "/expenses" }),
      trailing: <ChevronRight className="size-5 text-muted-foreground/50" />,
    },
    {
      icon: Layers,
      title: "Categories",
      subtitle: "Manage income and expense categories",
      onClick: () => navigate({ to: "/settings", search: { view: "appearance" } }),
      trailing: <ChevronRight className="size-5 text-muted-foreground/50" />,
    },
    {
      icon: CreditCard,
      title: "Accounts",
      subtitle: "Manage cash, bank, UPI and card accounts",
      onClick: () => navigate({ to: "/settings", search: { view: "account" } }),
      trailing: <ChevronRight className="size-5 text-muted-foreground/50" />,
    },
    {
      icon: Bell,
      title: "Reminders",
      subtitle: "Expense and bill payment reminders",
      onClick: () => setRemindersEnabled(!remindersEnabled),
      trailing: (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRemindersEnabled(!remindersEnabled);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ${
            remindersEnabled ? "bg-emerald-600" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block size-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              remindersEnabled ? "translate-x-5.5" : "translate-x-1"
            }`}
          />
        </button>
      ),
    },
    {
      icon: Cloud,
      title: "Backup & Sync",
      subtitle: "Keep your data safe and in sync",
      onClick: () => {},
      trailing: (
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
            <Check className="size-3 stroke-[3]" />
            Synced
          </span>
          <ChevronRight className="size-5 text-muted-foreground/50 shrink-0" />
        </div>
      ),
    },
    {
      icon: SettingsIcon,
      title: "App Settings",
      subtitle: "Currency, theme, notifications and more",
      onClick: () => navigate({ to: "/settings" }),
      trailing: <ChevronRight className="size-5 text-muted-foreground/50" />,
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      subtitle: "FAQs and contact support",
      onClick: () => navigate({ to: "/settings", search: { view: "help" } }),
      trailing: <ChevronRight className="size-5 text-muted-foreground/50" />,
    },
  ];

  return (
    <AppShell>
      {/* ============================================================ */}
      {/* MOBILE PROFILE PAGE — matches reference image ditto          */}
      {/* ============================================================ */}
      <div className="-mt-2 space-y-3.5 md:hidden">
        {/* ONE SINGLE COMBINED CARD: Profile (top) + Financial Statistics (bottom) */}
        <div className="overflow-hidden rounded-[26px] bg-card shadow-sm border border-border/40">
          {/* Top: Dark Green Profile Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#043d2e] to-[#022c22] p-5 text-white">
            {/* Glowing neon emerald wavy SVG at bottom */}
            <svg
              className="absolute right-0 bottom-0 w-48 h-20 pointer-events-none opacity-60"
              viewBox="0 0 200 80"
              fill="none"
            >
              <defs>
                <linearGradient id="profileWave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#043d2e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 0 60 Q 60 40 100 55 T 200 20 L 200 80 L 0 80 Z" fill="url(#profileWave)" />
              <path
                d="M 0 60 Q 60 40 100 55 T 200 20"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Avatar with Camera badge on bottom right */}
                <div
                  className="relative shrink-0 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  {isUploading ? (
                    <div className="flex size-[72px] items-center justify-center rounded-full bg-white/20 ring-2 ring-white/60">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  ) : (
                    <>
                      <div className="size-[72px] rounded-full ring-2 ring-white/60 overflow-hidden shadow-md">
                        <Avatar photoURL={profile.photoURL} name={profile.username || "User"} size={72} />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 size-6 rounded-full bg-emerald-600 border-2 border-[#043d2e] text-white flex items-center justify-center shadow-md">
                        <Camera className="size-3.5 stroke-[2.5]" />
                      </div>
                    </>
                  )}
                </div>

                {/* Name / Email / Premium Badge (Single Line) */}
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate leading-tight">
                    {profile.username}
                  </h2>
                  <p className="text-xs text-emerald-100/75 truncate mt-0.5 font-normal">
                    {profile.email}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-xs border border-amber-400/25 whitespace-nowrap shrink-0">
                    <Crown className="size-3 shrink-0 fill-amber-300 stroke-amber-400" />
                    <span className="text-[11px] font-semibold text-amber-300 whitespace-nowrap">
                      Premium User
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Profile Button */}
              <button
                type="button"
                onClick={startEditing}
                className="shrink-0 flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 active:scale-95 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition-all shadow-xs"
              >
                <Edit2 className="size-3.5" />
                <span className="whitespace-nowrap">Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Bottom: Financial Statistics Section (seamlessly merged) */}
          <div className="bg-card px-2 py-3.5">
            <div className="grid grid-cols-3 divide-x divide-border/40 py-1 text-center">
              {/* Total Income */}
              <div className="flex flex-col items-center px-1">
                <div className="flex size-8 items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1.5">
                  <Target className="size-5 stroke-[2.2]" />
                </div>
                <span className="text-base font-bold text-foreground font-display tracking-tight">
                  {formatINR(incomeAmount, true)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Total Income</span>
              </div>

              {/* Total Expenses */}
              <div className="flex flex-col items-center px-1">
                <div className="flex size-8 items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1.5">
                  <ArrowUp className="size-5 stroke-[2.2]" />
                </div>
                <span className="text-base font-bold text-foreground font-display tracking-tight">
                  {formatINR(expenseAmount, true)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Total Expenses</span>
              </div>

              {/* Net Savings */}
              <div className="flex flex-col items-center px-1">
                <div className="flex size-8 items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1.5">
                  <Coins className="size-5 stroke-[2]" />
                </div>
                <span className="text-base font-bold text-foreground font-display tracking-tight">
                  {formatINR(savingsAmount, true)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Net Savings</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Menu List of Individual Rounded Cards */}
        <div className="space-y-2.5 pb-24">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={item.onClick}
                className="flex items-center justify-between rounded-2xl bg-card border border-border/40 p-3.5 shadow-2xs cursor-pointer active:scale-[0.99] transition-transform hover:bg-muted/30"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex size-8 items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                    <Icon className="size-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
                <div className="shrink-0 ml-3">{item.trailing}</div>
              </div>
            );
          })}

          {/* Logout — individual rounded card without icon background */}
          <div
            onClick={handleLogout}
            className="flex items-center justify-between rounded-2xl bg-card border border-border/40 p-3.5 shadow-2xs cursor-pointer active:scale-[0.99] transition-transform hover:bg-muted/30"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex size-8 items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                <LogOut className="size-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-rose-600">Logout</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sign out from your account</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground/50 shrink-0 ml-3" />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP PROFILE PAGE (preserved for md+ screens)             */}
      {/* ============================================================ */}
      <div className="hidden md:block mx-auto max-w-xl min-h-screen pb-20 relative z-10">
        <div className="relative z-10">
          {/* Header */}
          <div className="relative flex items-center justify-center px-4 py-4 pt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="absolute left-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-foreground"
            >
              <ArrowLeft className="size-6" strokeWidth={2.5} />
            </Button>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Profile</h1>
          </div>

          {/* Profile Info Header */}
          <div className="flex flex-col items-center mt-2 mb-6 px-4">
            <div
              className="relative cursor-pointer group mb-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <div className="absolute inset-0 bg-pink-500/50 dark:bg-pink-500/20 blur-[30px] rounded-full transform scale-110"></div>

              {isUploading ? (
                <div className="flex size-[120px] items-center justify-center rounded-full bg-muted shadow-sm border-[4px] border-card relative z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-full shadow-lg border-[4px] border-card relative overflow-hidden group-active:scale-95 transition-transform z-10">
                    <Avatar photoURL={profile.photoURL} name={profile.username || "User"} size={120} />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-card rounded-full p-2 shadow-md border border-border z-20 transition-transform group-active:scale-95">
                    <Camera className="text-foreground size-5" strokeWidth={2} />
                  </div>
                </>
              )}
            </div>

            <h2 className="text-[24px] font-bold text-foreground tracking-tight relative z-10 drop-shadow-sm">
              {profile.username}
            </h2>
            <p className="text-[15px] text-muted-foreground mt-1 relative z-10 font-medium drop-shadow-sm">
              {profile.email}
            </p>
          </div>

          {/* Info Cards */}
          <div className="px-5 space-y-1.5">
            {/* Name Row */}
            <div className="bg-card rounded-[32px] px-4 py-3 flex items-center shadow-xs border border-border/40">
              <div className="flex items-center justify-center size-[52px] rounded-full bg-muted text-foreground shrink-0 mr-4 border border-border/30">
                <User className="size-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground mb-0.5">Name</p>
                {isEditingName ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-6 px-0 border-0 shadow-none text-[15px] text-foreground focus-visible:ring-0 w-full p-0 bg-transparent placeholder:text-muted-foreground/50"
                    placeholder="Enter full name"
                    autoFocus
                    onBlur={saveName}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                  />
                ) : (
                  <p className="text-[15px] font-medium text-muted-foreground truncate">{profile.username}</p>
                )}
              </div>
              {!isEditingName ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={startEditing}
                  className="size-10 text-foreground/70 hover:bg-muted rounded-full shrink-0 -mr-2"
                >
                  <Edit2 className="size-5" strokeWidth={2} />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={saveName}
                  className="size-10 text-emerald-600 hover:bg-muted rounded-full shrink-0 -mr-2"
                >
                  <Check className="size-6" strokeWidth={2.5} />
                </Button>
              )}
            </div>

            {/* Email Row */}
            <div className="bg-card rounded-[32px] px-4 py-3 flex items-center shadow-xs border border-border/40">
              <div className="flex items-center justify-center size-[52px] rounded-full bg-muted text-foreground shrink-0 mr-4 border border-border/30">
                <Mail className="size-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground mb-0.5">Email</p>
                <p className="text-[15px] font-medium text-muted-foreground truncate">{profile.email}</p>
              </div>
              <ChevronRight className="size-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            </div>

            {/* Member Since Row */}
            <div className="bg-card rounded-[32px] px-4 py-3 flex items-center shadow-xs border border-border/40">
              <div className="flex items-center justify-center size-[52px] rounded-full bg-muted text-foreground shrink-0 mr-4 border border-border/30">
                <Calendar className="size-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground mb-0.5">Member Since</p>
                <p className="text-[15px] font-medium text-muted-foreground truncate">
                  {format(joinDate, "MMMM yyyy")}
                </p>
              </div>
              <ChevronRight className="size-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            </div>

            {/* Account Provider Row */}
            <div className="bg-card rounded-[32px] px-4 py-3 flex items-center shadow-xs border border-border/40">
              <div className="flex items-center justify-center size-[52px] rounded-full bg-muted shrink-0 mr-4 border border-border/30">
                {profile.provider === "google.com" || profile.provider === "google" ? (
                  <GoogleLogo />
                ) : (
                  <Shield className="size-6 text-foreground" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground mb-0.5">Account Provider</p>
                <p className="text-[15px] font-medium text-muted-foreground truncate">
                  {profile.provider === "google.com" || profile.provider === "google" ? "Google" : "Email"}
                </p>
              </div>
              <ChevronRight className="size-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            </div>

            {/* Settings Row */}
            <div
              className="bg-card rounded-[32px] px-4 py-3 flex items-center shadow-xs border border-border/40 mb-6 cursor-pointer active:scale-[0.98] transition-transform mt-6"
              onClick={() => navigate({ to: "/settings" })}
            >
              <div className="flex items-center justify-center size-[52px] rounded-full bg-muted text-foreground shrink-0 mr-4 border border-border/30">
                <SettingsIcon className="size-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground">Settings</p>
              </div>
              <ChevronRight className="size-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            </div>

            <div className="pb-8"></div>
          </div>
        </div>
      </div>

      {/* Edit name dialog for mobile */}
      {isEditingName && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-xl border border-border/40">
            <h3 className="text-lg font-bold text-foreground mb-4">Edit Name</h3>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-base mb-4"
              placeholder="Enter full name"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveName()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditingName(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveName}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={updateNameMutation.isPending}
              >
                {updateNameMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <ImageCropperDialog
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageSrc={selectedImage}
          onCropComplete={uploadProfilePicture}
        />
      )}
    </AppShell>
  );
}

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);
