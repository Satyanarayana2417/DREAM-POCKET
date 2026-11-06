import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchExpenses, fetchIncomes, saveIncome } from "@/lib/data";
import {
  incomeStatus,
  categoryTotals,
  currentMonthKey,
  dailyTotals,
  formatDisplayDate,
  formatINR,
  inMonth,
  sumAmount,
  categoryMeta,
  greeting,
  monthOptions,
  monthLabel,
  type Expense,
} from "@/lib/expense-utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Wallet,
  TrendingUp,
  ReceiptText,
  ArrowRight,
  ChevronDown,
  Edit2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Plus,
  Target,
  Trophy,
  PiggyBank,
  Coins,
  Utensils,
  Car,
  Fuel,
  ShoppingBag,
  Home,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { ExpenseDetailsDialog } from "@/components/ExpenseDetailsDialog";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

function formatExpenseTime(expense: Expense): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = expense.date === todayStr;

  if (expense.createdAt?.seconds) {
    const d = new Date(expense.createdAt.seconds * 1000);
    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    if (isToday) return `Today, ${timeStr}`;
    return `${formatDisplayDate(expense.date)}, ${timeStr}`;
  }

  if (isToday) return "Today";
  return formatDisplayDate(expense.date);
}

function getMonthYearLabel(dateStr?: string): string {
  if (!dateStr) return "October 2026";
  try {
    const parts = dateStr.split("-");
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const d = new Date(year, month, 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  } catch {}
  return "October 2026";
}

function getCategoryIconAndStyle(category: string, title?: string) {
  const c = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (
    c.includes("food") ||
    c.includes("dining") ||
    c.includes("grocer") ||
    c.includes("restaurant") ||
    t.includes("lunch") ||
    t.includes("dinner") ||
    t.includes("food") ||
    t.includes("meal")
  ) {
    return {
      icon: Utensils,
      bg: "bg-[#ffebe8] dark:bg-rose-950/40",
      text: "text-[#f43f5e] dark:text-rose-400",
      color: "#10b981",
    };
  }
  if (
    c.includes("transport") ||
    c.includes("fuel") ||
    c.includes("travel") ||
    c.includes("commute") ||
    t.includes("fuel") ||
    t.includes("petrol") ||
    t.includes("diesel") ||
    t.includes("gas") ||
    t.includes("cab") ||
    t.includes("uber") ||
    t.includes("auto")
  ) {
    return {
      icon: Fuel,
      bg: "bg-[#e8f1ff] dark:bg-blue-950/40",
      text: "text-[#3b82f6] dark:text-blue-400",
      color: "#3b82f6",
    };
  }
  if (
    c.includes("shop") ||
    c.includes("cloth") ||
    c.includes("mall") ||
    t.includes("cloth") ||
    t.includes("shoes") ||
    t.includes("amazon")
  ) {
    return {
      icon: ShoppingBag,
      bg: "bg-[#fff3e5] dark:bg-orange-950/40",
      text: "text-[#f97316] dark:text-orange-400",
      color: "#f97316",
    };
  }
  if (
    c.includes("house") ||
    c.includes("rent") ||
    c.includes("home") ||
    c.includes("bill") ||
    c.includes("utility")
  ) {
    return {
      icon: Home,
      bg: "bg-[#f5eeff] dark:bg-purple-950/40",
      text: "text-[#8b5cf6] dark:text-purple-400",
      color: "#8b5cf6",
    };
  }
  return {
    icon: MoreHorizontal,
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    color: "#94a3b8",
  };
}

const MOCKUP_CATEGORIES = [
  { name: "Food & Dining", percent: 37, color: "#10b981", icon: Utensils },
  { name: "Transport", percent: 18, color: "#3b82f6", icon: Car },
  { name: "Shopping", percent: 15, color: "#f97316", icon: ShoppingBag },
  { name: "Housing", percent: 12, color: "#8b5cf6", icon: Home },
  { name: "Others", percent: 18, color: "#94a3b8", icon: MoreHorizontal },
];

function Index() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const name = profile?.username?.split(" ")[0] || "User";
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const userGreetingName = profile?.username?.split(" ")[0] || "Satya";
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeInput, setIncomeInput] = useState("");

  const joinDate = (profile as any)?.createdAt
    ? new Date((profile as any).createdAt.seconds * 1000)
    : undefined;

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

  const incomeMutation = useMutation({
    mutationFn: async (amount: number) => {
      await saveIncome(user!.uid, monthKey, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      setIsIncomeModalOpen(false);
      toast.success("Income updated successfully");
    },
    onError: () => {
      toast.error("Failed to update income");
    },
  });

  const handleSaveIncome = () => {
    const amount = Number(incomeInput);
    if (!isNaN(amount) && amount >= 0) {
      incomeMutation.mutate(amount);
    } else {
      toast.error("Please enter a valid amount");
    }
  };

  const monthKey = selectedMonth; // e.g. "2026-10"
  const monthName = monthLabel(monthKey);
  const shortMonthName = monthName.replace(
    /January|February|March|April|May|June|July|August|September|October|November|December/,
    (m) => m.slice(0, 3)
  );

  const monthExpenses = expenses.filter((e) => inMonth(e, monthKey));
  const mainMonthExpenses = monthExpenses.filter((e) => !e.isBudgetExpense);

  const currentIncome = incomes.find((i) => i.month === monthKey)?.amount || 0;
  const mainSpent = sumAmount(mainMonthExpenses);
  const status = incomeStatus(mainSpent, currentIncome);

  const recentExpenses = [...expenses]
    .filter((e) => !e.isBudgetExpense)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 15);
  const catTotals = categoryTotals(mainMonthExpenses);
  const dTotals = dailyTotals(mainMonthExpenses, monthKey);

  // Sorting categories by amount
  const sortedCategories = [...catTotals].sort((a, b) => b.value - a.value);

  // Dynamic vs Mockup amounts
  const hasData = expenses.length > 0 || incomes.length > 0;
  const balanceAmount = hasData
    ? currentIncome > 0
      ? currentIncome - mainSpent
      : -mainSpent
    : 45800;
  const incomeAmount = hasData ? currentIncome : 35000;
  const expenseAmount = hasData ? mainSpent : 12450;
  const savingsAmount = hasData ? Math.max(0, currentIncome - mainSpent) : 22550;

  // Overview categories computation
  const overviewCategories =
    mainSpent > 0 && sortedCategories.length > 0
      ? sortedCategories.slice(0, 4).map((cat) => {
          const percent = Math.round((cat.value / mainSpent) * 100);
          const { icon } = getCategoryIconAndStyle(cat.name);
          return {
            name: cat.name,
            percent,
            color: cat.color,
            icon,
          };
        })
      : MOCKUP_CATEGORIES;

  if (mainSpent > 0 && sortedCategories.length > 4) {
    const top4Percent = overviewCategories.reduce((sum, c) => sum + c.percent, 0);
    overviewCategories.push({
      name: "Others",
      percent: Math.max(0, 100 - top4Percent),
      color: "#94a3b8",
      icon: MoreHorizontal,
    });
  }

  const chartData = overviewCategories.map((c) => ({
    name: c.name,
    value: c.percent > 0 ? c.percent : 1,
    color: c.color,
  }));

  // Display transactions: live if available, else mockup items matching PhonePe reference
  const displayRecentExpenses =
    recentExpenses.length > 0
      ? recentExpenses.map((e) => {
          const isIncome = (e.category || "").toLowerCase() === "income" || e.amount < 0;
          const displayTitle = e.title.startsWith("Paid to") || e.title.startsWith("Received from") || e.title.startsWith("Cashback from")
            ? e.title
            : isIncome ? `Received from ${e.title}` : `Paid to ${e.title}`;
          return {
            id: e.id,
            title: displayTitle,
            category: e.category,
            amount: Math.abs(e.amount),
            amountDisplay: Math.abs(e.amount).toLocaleString("en-IN"),
            timeLabel: formatExpenseTime(e),
            date: e.date,
            iconType: isIncome ? "received-up" : "paid",
            isReal: true,
            rawExpense: e,
          };
        })
      : [
          {
            id: "mock-1",
            title: "Paid to Subrahmanyam tifens",
            category: "Food",
            amount: 40,
            amountDisplay: "40",
            timeLabel: "01 Nov, 12:30 pm",
            date: "2026-11-01",
            iconType: "paid",
            isReal: false,
            rawExpense: null,
          },
          {
            id: "mock-2",
            title: "Paid to Chodisetti Surya",
            category: "Transfer",
            amount: 40,
            amountDisplay: "40",
            timeLabel: "01 Nov, 11:15 am",
            date: "2026-11-01",
            iconType: "paid",
            isReal: false,
            rawExpense: null,
          },
          {
            id: "mock-3",
            title: "Paid to Nithin Csm",
            category: "Transfer",
            amount: 20,
            amountDisplay: "20",
            timeLabel: "30 Oct, 04:15 pm",
            date: "2026-10-30",
            iconType: "paid",
            isReal: false,
            rawExpense: null,
          },
          {
            id: "mock-4",
            title: "Paid to APSRTC",
            category: "Travel",
            amount: 35,
            amountDisplay: "35",
            timeLabel: "29 Oct, 08:45 am",
            date: "2026-10-29",
            iconType: "paid",
            isReal: false,
            rawExpense: null,
          },
          {
            id: "mock-5",
            title: "Paid to Puri",
            category: "Food",
            amount: 40,
            amountDisplay: "40",
            timeLabel: "04 Oct, 12:22 pm",
            date: "2026-10-04",
            iconType: "paid",
            isReal: false,
            rawExpense: null,
          },
        ];

  return (
    <AppShell>
      {/* ========================================================================= */}
      {/* MOBILE VERSION HOME PAGE (Ditto styling and UI matching reference image) */}
      {/* ========================================================================= */}
      <div className="md:hidden -mx-4 bg-[#f8f5ee] dark:bg-background relative min-h-screen">
        {/* Top Section: Cinematic Sunrise Landscape Banner (Restored to top hero header) */}
        <div className="absolute top-0 left-0 right-0 h-[210px] overflow-hidden pointer-events-none select-none">
          {/* Sunrise Background Image */}
          <img
            src="/hero-sunrise-22.png"
            alt="Misty Teal Mountain Sunrise"
            className="w-full h-full object-cover object-top pointer-events-none select-none"
          />
          {/* Atmospheric gradient overlay softly blending into cream background at bottom of banner */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#f8f5ee] dark:to-background pointer-events-none" />
        </div>

        {/* Foreground content over sunrise & cream page */}
        <div className="relative z-10 px-4 pt-16 space-y-3.5 pb-8">
          {/* 1. Greeting Section */}
          <div className="mb-2 px-1">
            <h2 className="text-[19px] font-semibold text-white tracking-tight flex items-center gap-1.5 drop-shadow-sm font-display">
              {timeGreeting}, {userGreetingName} <span className="inline-block text-lg">👋</span>
            </h2>
            <p className="text-[12px] font-medium text-white/85 tracking-wide mt-0.5 drop-shadow-xs">
              Track · Manage · Save · Grow
            </p>
          </div>

          {/* 2. Main Balance Card – Positioned lower down below the sun and greeting */}
          <div className="mt-8 rounded-[24px] overflow-hidden shadow-2xl shadow-emerald-950/25 border border-white/30 backdrop-blur-md bg-card">
            {/* Top Section: Dark Teal Glassmorphism Balance Card */}
            <div className="relative overflow-hidden p-4 sm:p-5 text-white min-h-[114px] bg-[#07362f]/85">
              {/* Background Artwork: Green Wallet, Cards, Leaves and Coins */}
              <img
                src="/green-wallet-card-bg.png"
                alt="Balance Card Background"
                className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none"
              />

              {/* Glassmorphism specular light reflection & sheen overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.14] via-transparent to-black/[0.12] pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-white/10 via-white/45 to-white/10 pointer-events-none" />
              <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between min-h-[96px]">
                {/* Left Side: Balance Information */}
                <div className="flex flex-col justify-between max-w-[58%] z-10">
                  {/* Label + Eye */}
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-emerald-100/95 tracking-tight drop-shadow-xs">Total Balance</span>
                    <button
                      type="button"
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-emerald-200/80 hover:text-white transition-colors p-0.5 active:scale-90"
                      aria-label="Toggle balance visibility"
                    >
                      {showBalance ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                  </div>

                  {/* Amount */}
                  <div className="my-1.5">
                    <span className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-white font-display leading-none drop-shadow-sm">
                      {showBalance ? formatINR(balanceAmount) : "••••••••"}
                    </span>
                  </div>

                  {/* Growth Pill */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#10b981]/25 px-2 py-0.5 text-[11px] font-semibold text-[#34d399] border border-[#34d399]/40 backdrop-blur-xs leading-none shadow-xs">
                      <ArrowUp className="size-3 stroke-[3]" />
                      <span>+12.4%</span>
                    </span>
                    <span className="text-[11px] font-medium text-emerald-200/80 whitespace-nowrap leading-none drop-shadow-xs">
                      vs last month
                    </span>
                  </div>
                </div>

                {/* Right Side: Spacer so text does not overlap the wallet graphic in background */}
                <div className="w-[42%] pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            {/* Bottom Section: Income & Expenses (Exact 2-column layout matching reference image, Net Savings removed) */}
            <div className="bg-white/95 dark:bg-card/95 backdrop-blur-sm py-3.5 px-3 sm:px-6 grid grid-cols-2 divide-x divide-border/50 border-t border-black/5 dark:border-white/5">
              {/* Column 1: Income */}
              <div className="flex items-center justify-center gap-3 pr-2 sm:pr-4">
                {/* Green Sphere Icon with Down Arrow */}
                <div className="size-8 sm:size-9 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowDown className="size-4 stroke-[2.8]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[16px] sm:text-[17px] font-bold text-foreground font-display tracking-tight leading-none">
                    {showBalance ? formatINR(incomeAmount) : "••••••"}
                  </span>
                  <span className="text-[12px] font-medium text-[#0d5244] dark:text-emerald-400 mt-1.5 leading-none">
                    Income
                  </span>
                </div>
              </div>

              {/* Column 2: Expenses */}
              <div className="flex items-center justify-center gap-3 pl-2 sm:pl-4">
                {/* Red/Coral Sphere Icon with Up Arrow */}
                <div className="size-8 sm:size-9 rounded-full bg-gradient-to-br from-[#f43f5e] to-[#e11d48] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowUp className="size-4 stroke-[2.8]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[16px] sm:text-[17px] font-bold text-foreground font-display tracking-tight leading-none">
                    {showBalance ? formatINR(expenseAmount) : "••••••"}
                  </span>
                  <span className="text-[12px] font-medium text-[#0d5244] dark:text-emerald-400 mt-1.5 leading-none">
                    Expenses
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Cards – Row of 4 */}
          <div className="grid grid-cols-4 gap-2">
            {/* 1. Add Expense */}
            <Link
              to="/add-expense"
              className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-card p-2 text-center shadow-xs border border-border/40 transition-transform active:scale-95"
            >
              <div className="mb-1.5 flex size-10 items-center justify-center rounded-full bg-[#054d3b] text-white shadow-xs">
                <Plus className="size-5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-semibold text-foreground tracking-tight leading-tight line-clamp-1">
                Add Expense
              </span>
            </Link>

            {/* 2. Add Income */}
            <button
              type="button"
              onClick={() => {
                setIncomeInput(currentIncome > 0 ? String(currentIncome) : "");
                setIsIncomeModalOpen(true);
              }}
              className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-card p-2 text-center shadow-xs border border-border/40 transition-transform active:scale-95"
            >
              <div className="mb-1.5 flex size-10 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a]">
                <ArrowDown className="size-5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-semibold text-foreground tracking-tight leading-tight line-clamp-1">
                Add Income
              </span>
            </button>

            {/* 3. Set Budget */}
            <Link
              to="/budget"
              className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-card p-2 text-center shadow-xs border border-border/40 transition-transform active:scale-95"
            >
              <div className="mb-1.5 flex size-10 items-center justify-center rounded-full bg-[#ffedd5] text-[#ea580c]">
                <Target className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-foreground tracking-tight leading-tight line-clamp-1">
                Set Budget
              </span>
            </Link>

            {/* 4. Savings Goal */}
            <Link
              to="/family-budget"
              className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-card p-2 text-center shadow-xs border border-border/40 transition-transform active:scale-95"
            >
              <div className="mb-1.5 flex size-10 items-center justify-center rounded-full bg-[#f3e8ff] text-[#9333ea]">
                <PiggyBank className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-foreground tracking-tight leading-tight line-clamp-1">
                Savings Goal
              </span>
            </Link>
          </div>

        {/* Card 3: "This Month Overview" */}
        <div className="rounded-[24px] bg-card p-5 shadow-xs border border-border/40">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-foreground font-display">This Month Overview</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 rounded-lg bg-muted/40 hover:bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors">
                  <span>{shortMonthName}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[280px] overflow-y-auto">
                {monthOptions(joinDate).map((m) => (
                  <DropdownMenuItem key={m} onClick={() => setSelectedMonth(m)}>
                    {monthLabel(m)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content: Donut on Left + Category Breakdown on Right */}
          <div className="flex items-center">
            {/* Donut Chart with Centered Spent Amount */}
            <div className="relative size-[130px] shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={62}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`mobile-donut-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-sm font-extrabold text-foreground tracking-tight">
                  {formatINR(expenseAmount, true)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">Spent</span>
              </div>
            </div>

            {/* Category Breakdown List */}
            <div className="flex-1 pl-3 flex flex-col justify-between py-1 space-y-2">
              {overviewCategories.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="size-3.5 shrink-0" style={{ color: cat.color }} />
                      <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-semibold text-foreground truncate">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-foreground ml-2 shrink-0">{cat.percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 4: "Recent Transactions" (Ditto PhonePe UPI Style) */}
        <div className="rounded-[24px] bg-white dark:bg-card p-4 sm:p-5 shadow-xs border border-border/40">
          {/* Top Filter Pills Row (Exact match to reference) */}
          <div className="flex items-center justify-between gap-2 pb-3.5 mb-1 border-b border-border/20">
            <div className="flex items-center gap-2">
              {/* Month Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded-full border border-border/70 bg-card hover:bg-muted/50 px-3.5 py-1 text-xs font-medium text-foreground transition-colors shadow-2xs">
                    <span>Month</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-[280px] overflow-y-auto">
                  {monthOptions(joinDate).map((m) => (
                    <DropdownMenuItem key={m} onClick={() => setSelectedMonth(m)}>
                      {monthLabel(m)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Categories Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded-full border border-border/70 bg-card hover:bg-muted/50 px-3.5 py-1 text-xs font-medium text-foreground transition-colors shadow-2xs">
                    <span>Categories</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {MOCKUP_CATEGORIES.map((c) => (
                    <DropdownMenuItem key={c.name}>
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filters Pill */}
            <Link
              to="/expenses"
              className="flex items-center gap-1 rounded-full border border-border/70 bg-card hover:bg-muted/50 px-3.5 py-1 text-xs font-medium text-foreground transition-colors shadow-2xs"
            >
              <span>Filters</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Link>
          </div>

          {/* Transactions List Grouped by Month */}
          <div>
            {displayRecentExpenses.map((item, idx) => {
              const currentMonth = getMonthYearLabel(item.date);
              const prevMonth = idx > 0 ? getMonthYearLabel(displayRecentExpenses[idx - 1].date) : null;
              const showMonthHeader = idx === 0 || currentMonth !== prevMonth;

              return (
                <div key={item.id || idx}>
                  {/* Month Bar: e.g. "October 2026" (Full width strip matching reference image) */}
                  {showMonthHeader && (
                    <div className="-mx-4 sm:-mx-5 px-4 sm:px-5 py-2 my-2 bg-[#eae5d8]/90 dark:bg-[#1a2320] text-[13px] font-semibold text-foreground/80 dark:text-emerald-100/90 tracking-tight flex items-center border-y border-border/20 select-none">
                      <span>{currentMonth}</span>
                    </div>
                  )}

                  {/* Transaction Row */}
                  <div
                    onClick={() => {
                      const exp = item.rawExpense || {
                        id: item.id,
                        userId: "user",
                        title: item.title,
                        amount: item.amount,
                        category: item.category || "Food & Dining",
                        date: item.date || "2026-10-04",
                        description: "Lunch with team",
                        imageUrl: null,
                        createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 },
                      };
                      sessionStorage.setItem("expense_" + exp.id, JSON.stringify(exp));
                      navigate({ to: "/expense/$id", params: { id: exp.id } });
                    }}
                    className={`py-3.5 transition-colors cursor-pointer hover:bg-muted/30 active:scale-[0.99] rounded-xl px-1 -mx-1 ${
                      !showMonthHeader && idx > 0 ? "border-t border-border/20" : ""
                    }`}
                  >
                    {/* Top Line: Icon + Title + Amount */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Professional Green Squircle Icon */}
                        <div className="flex size-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#059669] to-[#047857] text-white shrink-0 shadow-xs">
                          {item.iconType === "cashback" ? (
                            <span className="font-bold text-[17px] leading-none font-sans select-none">पे</span>
                          ) : item.iconType === "received-down" ? (
                            <ArrowDownLeft className="size-5 stroke-[2.4]" />
                          ) : (
                            <ArrowUpRight className="size-5 stroke-[2.4]" />
                          )}
                        </div>

                        {/* Title */}
                        <span className="text-[16px] font-medium text-foreground tracking-tight truncate">
                          {item.title}
                        </span>
                      </div>

                      {/* Amount */}
                      <span className="text-[16px] font-medium text-foreground tracking-tight shrink-0 ml-3">
                        ₹{item.amountDisplay}
                      </span>
                    </div>

                    {/* Bottom Line: Timestamp only (Yellow bank icon completely removed) */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span className="text-[12px] text-muted-foreground/80 font-normal">
                        {item.timeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

      {/* ========================================================================= */}
      {/* DESKTOP VERSION HOME PAGE (Preserved for md screens and larger)             */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-6 max-w-[1200px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {greeting()}, {name} <span className="text-2xl inline-block ml-1">👋</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your home expenses easily.</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-card border border-border/50 shadow-xs px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors">
                <Calendar className="size-4 text-muted-foreground" />
                {monthName}
                <ChevronDown className="size-4 text-muted-foreground ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
              {monthOptions(joinDate).map((m) => (
                <DropdownMenuItem key={m} onClick={() => setSelectedMonth(m)}>
                  {monthLabel(m)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className="border-0 shadow-xs rounded-2xl cursor-pointer hover:bg-muted transition-colors"
            onClick={() => {
              setIncomeInput(currentIncome > 0 ? String(currentIncome) : "");
              setIsIncomeModalOpen(true);
            }}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col items-center sm:items-start justify-center">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2 sm:mb-3 w-full justify-center sm:justify-start">
                <div className="bg-blue-500/10 text-blue-500 p-2.5 rounded-xl">
                  <Calendar className="size-5" />
                </div>
                <span className="hidden sm:inline-flex items-center text-sm font-medium text-muted-foreground whitespace-nowrap truncate w-full">
                  Monthly Income
                  <Edit2 className="size-3 text-muted-foreground/50 ml-auto" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-normal font-display mb-1 sm:mb-0 text-center sm:left">
                {formatINR(currentIncome, true)}
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-0 shadow-xs rounded-2xl cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate({ to: "/expenses" })}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col items-center sm:items-start justify-center">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2 sm:mb-3 w-full justify-center sm:justify-start">
                <div className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 p-2.5 rounded-xl">
                  <TrendingUp className="size-5" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-muted-foreground whitespace-nowrap truncate">
                  Total Spent
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-normal font-display mb-1 sm:mb-0 text-center sm:left">
                {formatINR(mainSpent, true)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xs rounded-2xl">
            <CardContent className="p-4 sm:p-5 flex flex-col items-center sm:items-start justify-center">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2 sm:mb-3 w-full justify-center sm:justify-start">
                <div className="bg-orange-500/10 text-orange-500 dark:text-orange-400 p-2.5 rounded-xl">
                  <Wallet className="size-5" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-muted-foreground whitespace-nowrap truncate">
                  Remaining
                </span>
              </div>
              <div
                className={`text-xl sm:text-2xl font-normal font-display mb-1 sm:mb-0 text-center sm:left ${
                  status.remaining < 0 ? "text-red-600 text-lg sm:text-xl" : ""
                }`}
              >
                {status.remaining < 0
                  ? `${formatINR(Math.abs(status.remaining), true)} over income`
                  : formatINR(status.remaining, true)}
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-0 shadow-xs rounded-2xl cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate({ to: "/expenses" })}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col items-center sm:items-start justify-center">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2 sm:mb-3 w-full justify-center sm:justify-start">
                <div className="bg-purple-500/10 text-purple-500 dark:text-purple-400 p-2.5 rounded-xl">
                  <ReceiptText className="size-5" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-muted-foreground whitespace-nowrap truncate">
                  Expenses
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-normal font-display mb-1 sm:mb-0 text-center sm:left">
                {mainMonthExpenses.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Section (Charts) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Income Overview */}
          <Card className="border-0 shadow-xs rounded-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-semibold text-lg font-display">Income Overview</h3>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    status.state === "exceeded"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : status.state === "near"
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {status.state === "exceeded"
                    ? "Exceeded"
                    : status.state === "near"
                    ? "Nearing Limit"
                    : "On Track"}
                </span>
              </div>

              <div className="flex justify-between items-end mb-3">
                <div className={currentIncome > 0 ? "text-2xl font-bold" : "text-base font-normal text-muted-foreground"}>
                  {currentIncome > 0 ? `${status.percent.toFixed(1)}% spent` : "No income added"}
                </div>
                <div className="text-sm font-medium text-muted-foreground">Income: {formatINR(currentIncome)}</div>
              </div>

              <div className="w-full bg-muted/50 rounded-full h-4 mb-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    status.state === "exceeded" ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(status.percent, 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-bold">{formatINR(mainSpent)}</span>
                  <span className="text-muted-foreground ml-1">Spent</span>
                </div>
                <div>
                  <span className="font-bold">
                    {status.remaining < 0
                      ? `${formatINR(Math.abs(status.remaining))} over`
                      : formatINR(status.remaining)}
                  </span>
                  <span className="text-muted-foreground ml-1">Remaining</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Spending */}
          <Card className="border-0 shadow-xs rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg font-display mb-6">Spending by Category</h3>

              {catTotals.length > 0 ? (
                <div className="flex items-center">
                  <div className="w-1/2 h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={catTotals}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {catTotals.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => formatINR(value)}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid var(--color-border)",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                            backgroundColor: "var(--color-card)",
                            color: "var(--color-foreground)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-1/2 pl-6 flex flex-col gap-3">
                    {sortedCategories.slice(0, 4).map((cat) => {
                      const percentage = mainSpent > 0 ? ((cat.value / mainSpent) * 100).toFixed(0) : 0;
                      return (
                        <div key={cat.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="font-medium text-foreground">{cat.name}</span>
                          </div>
                          <span className="text-muted-foreground font-medium">{percentage}%</span>
                        </div>
                      );
                    })}
                    {sortedCategories.length > 4 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full bg-slate-300" />
                          <span className="font-medium text-foreground">Others</span>
                        </div>
                        <span className="text-muted-foreground font-medium">
                          {(
                            ((mainSpent -
                              sortedCategories.slice(0, 4).reduce((acc, curr) => acc + curr.value, 0)) /
                              mainSpent) *
                            100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-xl">
                  No spending data this month
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Expenses */}
          <Card className="border-0 shadow-xs rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg font-display">Recent Expenses</h3>
                <Link
                  to="/expenses"
                  className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  View All <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {recentExpenses.length > 0 ? (
                <div className="space-y-1">
                  {recentExpenses.map((expense) => {
                    const meta = categoryMeta(expense.category);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/30 px-2 -mx-2 rounded-lg transition-colors"
                        onClick={() => setSelectedExpense(expense)}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                          >
                            <Icon className="size-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm line-clamp-1">{expense.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{expense.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm text-emerald-600">{formatINR(expense.amount)}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDisplayDate(expense.date).replace(/20\d\d/, (y) => y.slice(2))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-[180px] flex-col items-center justify-center text-center">
                  <Wallet className="mb-3 size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Spending */}
          <Card className="border-0 shadow-xs rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg font-display mb-6">Monthly Spending</h3>
              {mainMonthExpenses.length > 0 ? (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dTotals} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) =>
                          Number(value) % 7 === 1 ? `${value} ${monthName.split(" ")[0]!.slice(0, 3)}` : ""
                        }
                      />
                      <YAxis
                        hide={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => (value > 0 ? `${value / 1000}k` : "0")}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "var(--color-muted)" }}
                        formatter={(value: number) => [formatINR(value), "Spent"]}
                        labelFormatter={(label) => `Day ${label}`}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid var(--color-border)",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                          backgroundColor: "var(--color-card)",
                          color: "var(--color-foreground)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-xl">
                  No expenses added
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ExpenseDetailsDialog
        expense={selectedExpense}
        open={!!selectedExpense}
        onOpenChange={(open) => !open && setSelectedExpense(null)}
      />

      <Dialog open={isIncomeModalOpen} onOpenChange={setIsIncomeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentIncome > 0 ? "Edit" : "Add"} Monthly Income</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-normal">Month</Label>
              <div className="font-semibold text-lg">{monthName}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="income" className="font-semibold">
                Monthly Income
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                <Input
                  id="income"
                  type="number"
                  placeholder="0"
                  className="pl-7 text-lg font-display"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsIncomeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveIncome}
              disabled={incomeMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {incomeMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
