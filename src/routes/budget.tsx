import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Edit3,
  Banknote,
  PieChart as PieChartIcon,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

import { useAuth } from "@/lib/auth";
import { fetchBudgets, fetchExpenses, saveBudget } from "@/lib/data";
import {
  budgetStatus,
  currentMonthKey,
  formatINR,
  inMonth,
  monthLabel,
  monthOptions,
  sumAmount,
  categoryMeta,
  type Expense,
} from "@/lib/expense-utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";
import { ExpenseDetailsDialog } from "@/components/ExpenseDetailsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/budget")({
  component: BudgetRoute,
});

function stepMonth(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10) + delta;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function formatExpenseTime(expense: Expense): string {
  if (expense.createdAt?.seconds) {
    const d = new Date(expense.createdAt.seconds * 1000);
    const dateFormatted = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    return `${dateFormatted}, ${timeStr}`;
  }

  if (expense.date) {
    const parts = expense.date.split("-").map(Number);
    if (parts.length >= 3) {
      const [y, m, d] = parts;
      const dateFormatted = new Date(y, m - 1, d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return `${dateFormatted}, 12:00 pm`;
    }
  }

  return expense.date || "Today";
}

function BudgetRoute() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());

  const joinDate = (profile as any)?.createdAt
    ? new Date((profile as any).createdAt.seconds * 1000)
    : undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const months = monthOptions(joinDate);

  const { data: budgets = [], isLoading: isLoadingBudgets } = useQuery({
    queryKey: ["budgets", user?.uid],
    queryFn: () => fetchBudgets(user!.uid),
    enabled: !!user,
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["expenses", user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: !!user,
  });

  const currentBudgetObj = budgets.find((b) => b.month === selectedMonth);
  const currentBudget = currentBudgetObj?.budget || 0;

  const monthExpenses = expenses.filter((e) => inMonth(e, selectedMonth));
  const budgetMonthExpenses = monthExpenses.filter((e) => e.isBudgetExpense);
  const spent = sumAmount(budgetMonthExpenses);
  const status = budgetStatus(spent, currentBudget);
  const remainingBudget = Math.max(0, currentBudget - spent);
  const spentPercentage = currentBudget > 0 ? Math.min(Math.round((spent / currentBudget) * 100), 100) : 0;

  // Donut circumference for r=50 is ~314.16
  const circumference = 314.16;
  const strokeDashoffset = circumference * (1 - Math.min(status.percent, 100) / 100);

  // Category breakdown for budget expenses
  const categoryTotals = budgetMonthExpenses.reduce<Record<string, number>>((acc, exp) => {
    const cat = exp.category || "Other";
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {});

  const PALETTE = [
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#f97316", // Orange
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#eab308", // Yellow
    "#64748b", // Slate
  ];

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const categoryChartData = categoryEntries.map(([name, value], idx) => {
    const meta = categoryMeta(name);
    return {
      name,
      value,
      color: PALETTE[idx % PALETTE.length],
      icon: meta.icon,
      percentOfBudget: currentBudget > 0 ? (value / currentBudget) * 100 : 0,
    };
  });

  const pieChartData =
    categoryChartData.length > 0
      ? [
        ...categoryChartData.map((c) => ({
          name: c.name,
          value: c.value,
          color: c.color,
        })),
        ...(remainingBudget > 0 && currentBudget > 0
          ? [
            {
              name: "Remaining",
              value: remainingBudget,
              color: "#e2e8f0",
            },
          ]
          : []),
      ]
      : currentBudget > 0
        ? [
          {
            name: "Remaining",
            value: currentBudget,
            color: "#d1fae5",
          },
        ]
        : [];

  const saveMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error("Not logged in");
      await saveBudget(user.uid, selectedMonth, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", user?.uid] });
      toast.success("Budget saved successfully!");
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save budget");
    },
  });

  const handleOpenEdit = () => {
    setEditAmount(currentBudget > 0 ? String(currentBudget) : "");
    setIsEditing(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    saveMutation.mutate(amount);
  };

  if (isLoadingBudgets || isLoadingExpenses) {
    return (
      <AppShell>
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center h-[50vh]">
          <Loader2 className="size-8 animate-spin text-primary mb-4" />
          <p>Loading budget details...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md sm:max-w-xl space-y-5 pb-16 select-none font-sans">
        {/* ========================================================================= */}
        {/* 1. TOP BAR: [← Back]   Monthly Budget   [⋮ Menu]                          */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/" });
              }
            }}
            className="size-10 rounded-full flex items-center justify-center text-[#064e3b] dark:text-[#34d399] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-6 stroke-[2.4]" />
          </button>

          <h1 className="text-[20px] font-bold text-[#064e3b] dark:text-[#ecfdf5] tracking-tight font-display text-center">
            Monthly Budget
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="size-10 rounded-full flex items-center justify-center text-[#064e3b] dark:text-[#34d399] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 transition-all cursor-pointer"
                aria-label="More options"
              >
                <MoreVertical className="size-5.5 stroke-[2.2]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
              <DropdownMenuItem onClick={handleOpenEdit} className="gap-2 cursor-pointer font-medium">
                <Edit3 className="size-4 text-emerald-600" />
                {currentBudget > 0 ? "Edit Budget Amount" : "Set Budget Amount"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate({
                    to: "/add-expense",
                    search: { source: "budget", isBudget: true, month: selectedMonth },
                  });
                }}
                className="gap-2 cursor-pointer font-medium"
              >
                <Plus className="size-4 text-emerald-600" />
                Add Budget Expense
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ========================================================================= */}
        {/* 2. MONTH SELECTOR: <  [📅 Oct 2026 ⌄]  >                                 */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-center gap-3 pt-0 pb-1">
          {/* Left Arrow */}
          <button
            type="button"
            onClick={() => setSelectedMonth((curr) => stepMonth(curr, -1))}
            className="size-9 rounded-full bg-white dark:bg-[#1a231f] shadow-xs border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4.5 stroke-[2.4]" />
          </button>

          {/* Center Month Pill */}
          <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f0faf4] dark:bg-[#063321] border border-[#bbf0d2] dark:border-[#0e5c3c] text-[#064e3b] dark:text-[#6ee7b7] font-semibold text-[14px] shadow-2xs hover:bg-[#e4f6eb] active:scale-95 transition-all cursor-pointer"
              >
                <CalendarIcon className="size-4 text-[#059669] dark:text-[#34d399] stroke-[2.2]" />
                <span>{monthLabel(selectedMonth)}</span>
                <ChevronDown className="size-3.5 text-[#059669] dark:text-[#34d399] stroke-[2.5]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 rounded-2xl shadow-xl max-h-64 overflow-y-auto" align="center">
              <div className="space-y-1">
                {months.map((m) => {
                  const isSelected = m === selectedMonth;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(m);
                        setIsMonthPickerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${isSelected
                          ? "bg-emerald-600 text-white"
                          : "hover:bg-muted text-foreground"
                        }`}
                    >
                      <span>{monthLabel(m)}</span>
                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={() => setSelectedMonth((curr) => stepMonth(curr, 1))}
            className="size-9 rounded-full bg-white dark:bg-[#1a231f] shadow-xs border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="size-4.5 stroke-[2.4]" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 3. HERO BUDGET SECTION (Borderless, clean, natural flow)                  */}
        {/* ========================================================================= */}
        <div className="relative pt-1 pb-1 px-1 sm:px-2 select-none">
          {/* Top Half: Donut Ring (Left) + Big Amounts (Right) */}
          <div className="flex items-center justify-between gap-4 pt-1 pb-4">
            {/* Donut Progress Ring with Center Label */}
            <div className="relative size-[132px] sm:size-[140px] shrink-0 flex items-center justify-center">
              <svg className="size-full -rotate-90" viewBox="0 0 120 120">
                {/* Background Track */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="#e6eae6"
                  strokeWidth="13"
                  className="dark:stroke-[#202e26]"
                />
                {/* Vibrant Emerald Progress Arc */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="url(#budgetGreenGradient)"
                  strokeWidth="13"
                  strokeDasharray="301.6"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="budgetGreenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inside Donut Center: 68% Used */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[28px] sm:text-[32px] font-black text-[#0f2a1e] dark:text-white leading-none font-display tracking-tight">
                  {currentBudget > 0 ? `${Math.round(status.percent)}%` : "0%"}
                </span>
                <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 mt-1">
                  Used
                </span>
              </div>
            </div>

            {/* Vertical Divider Line */}
            <div className="h-20 sm:h-24 w-[1px] bg-gray-200/70 dark:bg-gray-800 self-center shrink-0" />

            {/* Right: Big Spent + of Total Budget + Green Swoosh */}
            <div className="flex-1 pl-2 sm:pl-3 flex flex-col justify-center min-w-0">
              <div className="text-[30px] sm:text-[38px] font-black text-[#073826] dark:text-[#ecfdf5] tracking-tight leading-none font-display truncate">
                ₹{spent.toLocaleString("en-IN")}
              </div>
              <div className="text-[15px] sm:text-[18px] font-semibold text-[#1f3d2f]/75 dark:text-gray-300 mt-1.5 truncate">
                of ₹{currentBudget.toLocaleString("en-IN")}
              </div>

              {/* Green Curved Accent Swoosh Line */}
              <svg viewBox="0 0 160 12" className="w-32 sm:w-40 h-2.5 mt-2.5 text-[#10b981] dark:text-[#34d399] overflow-visible">
                <path
                  d="M2,8 C40,2 110,2 158,8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Bottom Half: 3 Column Metric Stats */}
          <div className="grid grid-cols-3 pt-4 pb-2 mt-2 border-t border-gray-200/50 dark:border-gray-800/80 relative z-10">
            {/* 1. Total Budget */}
            <div
              className="text-center px-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleOpenEdit}
            >
              <div className="text-[15px] sm:text-[17px] font-extrabold text-[#0f172a] dark:text-white tracking-tight font-display">
                ₹{currentBudget.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Total Budget
              </div>
            </div>

            {/* 2. Total Spent */}
            <div className="text-center px-1 border-x border-gray-200/60 dark:border-gray-800">
              <div className="text-[15px] sm:text-[17px] font-extrabold text-[#0f172a] dark:text-white tracking-tight font-display">
                ₹{spent.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Total Spent
              </div>
            </div>

            {/* 3. Remaining */}
            <div className="text-center px-1">
              <div className="text-[15px] sm:text-[17px] font-extrabold text-[#16a34a] dark:text-[#4ade80] tracking-tight font-display">
                ₹{Math.max(0, currentBudget - spent).toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Remaining
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. FLOWING GREEN WAVE DIVIDER IMAGE (Middle of page above expenses)       */}
        {/* ========================================================================= */}
        <div className="w-full overflow-hidden -my-2 select-none pointer-events-none flex items-center justify-center">
          <img
            src="/flowing-green-wave-divider.png"
            alt="Flowing Green Wave Divider"
            className="w-full h-11 sm:h-13 object-cover object-center"
          />
        </div>

        {/* If no budget set yet, show quick banner to set it */}
        {currentBudget === 0 && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#064e3b] dark:text-[#34d399]">No budget set for {monthLabel(selectedMonth)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Set a target to monitor monthly spending.</p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenEdit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-3.5"
            >
              Set Budget
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. BUDGET EXPENSES LIST                                                   */}
        {/* ========================================================================= */}
        <div className="pt-1">
          <div className="mb-3 px-1">
            <h3 className="font-bold text-[18px] text-foreground font-display">Budget Expenses</h3>
            <p className="text-[12px] text-muted-foreground">
              {budgetMonthExpenses.length} {budgetMonthExpenses.length === 1 ? "expense" : "expenses"} tracked
            </p>
          </div>

          {budgetMonthExpenses.length > 0 ? (
            <div className="divide-y divide-border/20 bg-white dark:bg-[#121c17] rounded-3xl p-3 sm:p-4 shadow-2xs border border-gray-100 dark:border-gray-800">
              {budgetMonthExpenses.map((expense) => {
                const isIncome = (expense.category || "").toLowerCase() === "income" || expense.amount < 0;
                const displayTitle =
                  expense.title.startsWith("Paid to") ||
                    expense.title.startsWith("Received from") ||
                    expense.title.startsWith("Cashback from")
                    ? expense.title
                    : isIncome
                      ? `Received from ${expense.title}`
                      : `Paid to ${expense.title}`;
                const timeLabel = formatExpenseTime(expense);

                return (
                  <div
                    key={expense.id}
                    className="py-3 px-2 transition-colors cursor-pointer hover:bg-muted/30 active:scale-[0.99] rounded-2xl"
                    onClick={() => {
                      sessionStorage.setItem("expense_" + expense.id, JSON.stringify(expense));
                      navigate({ to: "/expense/$id", params: { id: expense.id } });
                    }}
                  >
                    {/* Top Line: PhonePe style green squircle + Title + Amount */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Green Squircle Icon */}
                        <div className="flex size-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#059669] to-[#047857] text-white shrink-0 shadow-xs">
                          {isIncome ? (
                            <ArrowDownLeft className="size-5 stroke-[2.4]" />
                          ) : (
                            <ArrowUpRight className="size-5 stroke-[2.4]" />
                          )}
                        </div>

                        {/* Title */}
                        <span className="text-[15px] sm:text-[16px] font-medium text-foreground tracking-tight truncate">
                          {displayTitle}
                        </span>
                      </div>

                      {/* Amount */}
                      <span className="text-[15px] sm:text-[16px] font-semibold text-foreground tracking-tight shrink-0 ml-3">
                        ₹{Math.abs(expense.amount).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Bottom Line: Timestamp */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 pl-[52px]">
                      <span className="text-[11.5px] text-muted-foreground/80 font-normal">
                        {timeLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4 text-muted-foreground text-sm bg-white dark:bg-[#121c17] rounded-3xl border border-dashed border-border/60 flex flex-col items-center justify-center shadow-2xs">
              <div className="size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Wallet className="size-6 stroke-[2]" />
              </div>
              <p className="font-semibold text-foreground text-base mb-1">No budget expenses yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mb-4">
                Track your expenses against this month's budget by clicking the + button below.
              </p>
              <Button
                onClick={() => {
                  navigate({
                    to: "/add-expense",
                    search: { source: "budget", isBudget: true, month: selectedMonth },
                  });
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 py-2 cursor-pointer"
              >
                <Plus className="size-4" /> Add First Expense
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. FLOATING ACTION BUTTON (+) FOR BUDGET PAGE                             */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={() => {
          navigate({
            to: "/add-expense",
            search: { source: "budget", isBudget: true, month: selectedMonth },
          });
        }}
        aria-label="Add budget expense"
        className="fixed right-5 bottom-28 z-50 flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#064e3b] via-[#047857] to-[#10b981] text-white shadow-[0_8px_25px_rgba(5,150,105,0.45)] hover:shadow-[0_10px_30px_rgba(5,150,105,0.55)] active:scale-95 transition-all cursor-pointer pointer-events-auto"
      >
        <Plus className="size-7 stroke-[2.5]" />
      </button>

      {/* Expense Details Dialog */}
      <ExpenseDetailsDialog
        expense={selectedExpense}
        open={!!selectedExpense}
        onOpenChange={(open) => !open && setSelectedExpense(null)}
      />

      {/* Edit / Set Budget Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {currentBudget > 0 ? "Edit Monthly Budget" : "Set Monthly Budget"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="budgetInput" className="text-xs font-semibold text-muted-foreground">
                Budget Target for {monthLabel(selectedMonth)}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-base">
                  ₹
                </span>
                <Input
                  id="budgetInput"
                  type="number"
                  autoFocus
                  placeholder="e.g. 15000"
                  className="pl-8 text-lg font-bold"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {saveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Target
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
