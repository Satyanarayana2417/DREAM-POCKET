import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Download,
  Loader2,
  BarChart3,
  FileText,
  PlusCircle,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import {
  fetchExpenses,
  fetchIncomes,
  fetchBudgets,
  fetchFamilies,
  fetchFamilyExpenses,
  fetchFamilyBudgets,
} from "@/lib/data";
import {
  todayISO,
  inMonth,
  monthLabel,
  sumAmount,
  type Expense,
} from "@/lib/expense-utils";
import { AppShell } from "@/components/AppShell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateMonthlyPDFReport, type MonthlyReportData } from "@/lib/pdf-report-generator";
import {
  getFirstExpenseDate,
  getEligibleReportMonths,
  getReportDateRange,
} from "@/lib/report-dates";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function getPreviousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  const prevY = d.getFullYear();
  const prevM = String(d.getMonth() + 1).padStart(2, "0");
  return `${prevY}-${prevM}`;
}

function formatINRSpaced(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const isNegative = safe < 0;
  const abs = Math.abs(safe);
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(abs);
  return `${isNegative ? "- " : ""}₹ ${formatted}`;
}

function formatShortMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// 3D Emerald Wallet Emblem
function WalletEmblem3D({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="walletFront" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop stopColor="#047857" />
          <stop stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id="walletFlap" x1="6" y1="12" x2="42" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="4" y="10" width="40" height="28" rx="8" fill="url(#walletFront)" />
      <path d="M4 18C4 13.5817 7.58172 10 12 10H36C40.4183 10 44 13.5817 44 18V21H4V18Z" fill="url(#walletFlap)" />
      <rect x="28" y="18" width="16" height="12" rx="4" fill="#065F46" />
      <circle cx="35" cy="24" r="2.5" fill="#6EE7B7" />
    </svg>
  );
}

// Circular Donut Progress Ring for Budget Utilisation
function BudgetDonutRing({ percent }: { percent: number }) {
  const cleanPercent = Math.min(Math.max(percent, 0), 100);
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (cleanPercent / 100) * circumference;

  return (
    <div className="relative size-13 flex items-center justify-center shrink-0">
      <svg className="size-full -rotate-90 transform" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="currentColor"
          strokeWidth="4.5"
          className="text-emerald-100 dark:text-emerald-950/60"
          fill="none"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="#059669"
          strokeWidth="4.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          fill="none"
        />
      </svg>
      <span className="absolute text-[11px] font-black font-display text-foreground">
        {cleanPercent}%
      </span>
    </div>
  );
}

function ReportsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Queries
  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["expenses", user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: !!user,
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes", user?.uid],
    queryFn: () => fetchIncomes(user!.uid),
    enabled: !!user,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", user?.uid],
    queryFn: () => fetchBudgets(user!.uid),
    enabled: !!user,
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families", user?.uid],
    queryFn: () => fetchFamilies(user!.uid),
    enabled: !!user,
  });

  const primaryFamily = families[0] || null;
  const { data: familyExpenses = [] } = useQuery({
    queryKey: ["familyExpenses", primaryFamily?.id],
    queryFn: () => fetchFamilyExpenses(primaryFamily!.id),
    enabled: !!primaryFamily,
  });

  const { data: familyBudgets = [] } = useQuery({
    queryKey: ["familyBudgets", primaryFamily?.id],
    queryFn: () => fetchFamilyBudgets(primaryFamily!.id),
    enabled: !!primaryFamily,
  });

  // 1. Identify user's first expense date strictly from Firestore expense records
  const firstExpenseDate = useMemo(() => {
    return getFirstExpenseDate(expenses);
  }, [expenses]);

  // 2. Generate eligible calendar months dynamically from first expense month up to current real calendar month
  const eligibleMonths = useMemo(() => {
    return getEligibleReportMonths(firstExpenseDate);
  }, [firstExpenseDate]);

  // Current real calendar month
  const realCurrentMonth = todayISO().slice(0, 7);

  // Selected month state (defaults to real current month, or the latest available eligible month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return realCurrentMonth;
  });

  // Sync selectedMonth if it falls outside eligible range
  useEffect(() => {
    if (eligibleMonths.length > 0 && !eligibleMonths.includes(selectedMonth)) {
      setSelectedMonth(eligibleMonths[0]);
    }
  }, [eligibleMonths, selectedMonth]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Active Month reporting boundaries (cutoff date = today for current month)
  const activeDateRange = useMemo(() => {
    return getReportDateRange(selectedMonth);
  }, [selectedMonth]);

  const activeShortLabel = formatShortMonthLabel(selectedMonth);

  // Filter expenses strictly within the reporting period
  // (Includes all valid expenses - both regular and budget expenses!)
  const monthExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date >= activeDateRange.startDate && e.date <= activeDateRange.endDate)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [expenses, activeDateRange]);

  const spent = sumAmount(monthExpenses);
  const income = incomes.find((i) => i.month === selectedMonth)?.amount || 0;
  const budgetObj = budgets.find((b) => b.month === selectedMonth);
  const budget = budgetObj?.budget || 0;
  const netSavings = income - spent;

  // Authoritative Budget Spending:
  // Check if user has expenses flagged as isBudgetExpense for this month (from Budget page)
  const budgetTrackedExpenses = useMemo(() => {
    return monthExpenses.filter((e) => e.isBudgetExpense);
  }, [monthExpenses]);

  // If user recorded expenses on Budget page, use those; otherwise if budget is set, all month expenses count
  const budgetSpent = useMemo(() => {
    if (budgetTrackedExpenses.length > 0) {
      return sumAmount(budgetTrackedExpenses);
    }
    return spent;
  }, [budgetTrackedExpenses, spent]);

  const budgetPercent = budget > 0 ? Math.min(Math.round((budgetSpent / budget) * 100), 100) : 0;

  // Family summary for selected month
  const familySummary = useMemo(() => {
    if (!primaryFamily || !primaryFamily.familyName) return null;
    const thisMonthFamilyExpenses = familyExpenses.filter(
      (e: any) => e.date >= activeDateRange.startDate && e.date <= activeDateRange.endDate
    );
    const totalFamilySpent = thisMonthFamilyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const userContribution = thisMonthFamilyExpenses
      .filter((e) => e.userId === user?.uid)
      .reduce((sum, e) => sum + e.amount, 0);

    const fBudgetObj = familyBudgets.find((b) => b.month === selectedMonth && b.userId === user?.uid);
    const totalFamilyBudget = fBudgetObj?.budget || 0;

    if (totalFamilySpent === 0 && userContribution === 0 && totalFamilyBudget === 0) {
      return null;
    }

    return {
      familyName: primaryFamily.familyName,
      familyBudget: totalFamilyBudget,
      familySpent: totalFamilySpent,
      userContribution,
    };
  }, [primaryFamily, familyExpenses, familyBudgets, activeDateRange, selectedMonth, user]);

  const visibleMonths = showAllMonths ? eligibleMonths : eligibleMonths.slice(0, 4);

  // PDF Download Trigger
  const handleDownloadReport = async (targetMonth: string = selectedMonth) => {
    try {
      setIsGeneratingPDF(true);

      const range = getReportDateRange(targetMonth);

      // Filter all expenses strictly within the calculated date range
      const targetExpenses = expenses
        .filter((e) => e.date >= range.startDate && e.date <= range.endDate)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      const targetSpent = sumAmount(targetExpenses);
      const targetIncome = incomes.find((i) => i.month === targetMonth)?.amount || 0;
      const targetBudgetObj = budgets.find((b) => b.month === targetMonth);
      const targetBudget = targetBudgetObj?.budget || 0;

      // Authoritative budget spent calculation matching the Budget page
      const targetBudgetExpenses = targetExpenses.filter((e) => e.isBudgetExpense);
      const targetBudgetSpent =
        targetBudgetExpenses.length > 0 ? sumAmount(targetBudgetExpenses) : targetSpent;

      // Preceding Month Baseline
      const pMonthKey = getPreviousMonthKey(targetMonth);
      const pRange = getReportDateRange(pMonthKey);
      const pExpenses = expenses.filter((e) => e.date >= pRange.startDate && e.date <= pRange.endDate);
      const pSpent = sumAmount(pExpenses);
      const pIncome = incomes.find((i) => i.month === pMonthKey)?.amount || 0;

      let targetFamilyData: MonthlyReportData["familyData"] = null;
      if (primaryFamily && primaryFamily.familyName) {
        const tfExpenses = familyExpenses.filter(
          (e: any) => e.date >= range.startDate && e.date <= range.endDate
        );
        const tfSpent = tfExpenses.reduce((sum, e) => sum + e.amount, 0);
        const tfUserContrib = tfExpenses
          .filter((e) => e.userId === user?.uid)
          .reduce((sum, e) => sum + e.amount, 0);
        const tfBudgetObj = familyBudgets.find((b) => b.month === targetMonth && b.userId === user?.uid);

        if (tfSpent > 0 || tfUserContrib > 0 || (tfBudgetObj?.budget || 0) > 0) {
          targetFamilyData = {
            familyName: primaryFamily.familyName,
            familyBudget: tfBudgetObj?.budget || 0,
            familySpent: tfSpent,
            userContribution: tfUserContrib,
          };
        }
      }

      await generateMonthlyPDFReport({
        userName: profile?.username || user?.displayName || "Dream Pocket User",
        userEmail: profile?.email || user?.email || "",
        monthKey: targetMonth,
        monthLabel: range.monthLabel,
        startDate: range.startDate,
        endDate: range.endDate,
        statusLabel: range.statusLabel,
        cutoffDay: range.cutoffDay,
        totalDaysInMonth: range.totalDaysInMonth,
        income: targetIncome,
        budget: targetBudget,
        budgetSpent: targetBudgetSpent,
        spent: targetSpent,
        expenses: targetExpenses,
        previousMonthData: {
          monthKey: pMonthKey,
          monthLabel: pRange.monthLabel,
          income: pIncome,
          spent: pSpent,
        },
        familyData: targetFamilyData,
      });

      toast.success(`${range.monthLabel} statement downloaded successfully!`);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF statement. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <AppShell>
      <div className="relative min-h-screen bg-[#f7faf8] dark:bg-background pb-32">
        {/* Top Curved Emerald Header */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#023326] via-[#044a37] to-[#075f46] px-5 pt-4 pb-14 rounded-b-[28px] sm:rounded-b-[36px] shadow-sm">
          <div className="pointer-events-none absolute -right-6 -top-10 size-48 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="pointer-events-none absolute right-4 bottom-2 opacity-15">
            <div className="flex items-end gap-1.5 h-16">
              <div className="w-2.5 h-6 bg-white rounded-t-sm" />
              <div className="w-2.5 h-10 bg-white rounded-t-sm" />
              <div className="w-2.5 h-14 bg-white rounded-t-sm" />
            </div>
          </div>

          {/* Top Bar: Back & Calendar Dropdown */}
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/profile" });
                }
              }}
              className="text-white p-1 -ml-1 active:scale-95 transition-transform cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-6 stroke-[2.4]" />
            </button>

            {eligibleMonths.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white backdrop-blur-xs transition-colors cursor-pointer active:scale-95 shadow-2xs"
                    aria-label="Select Statement Month"
                  >
                    <Calendar className="size-5 stroke-[2]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[280px] overflow-y-auto">
                  {eligibleMonths.map((m) => {
                    const range = getReportDateRange(m);
                    return (
                      <DropdownMenuItem
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className={selectedMonth === m ? "bg-emerald-500/10 font-bold text-emerald-600" : ""}
                      >
                        {range.monthLabel} {range.isCurrentMonth ? "(Current)" : ""}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Header Title */}
          <div className="relative mt-3.5">
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
              Reports
            </h1>
            <p className="text-xs text-emerald-100/80 font-medium mt-0.5">
              Your Financial Insights
            </p>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Floating Dream Pocket Branded Card */}
          <div className="-mt-8 rounded-2xl bg-white dark:bg-card p-4 shadow-sm border border-border/40 flex items-center relative z-10 transition-all">
            <div className="flex items-center gap-2.5 shrink-0">
              <WalletEmblem3D className="size-10" />
              <div className="leading-[1.15]">
                <p className="text-sm font-black font-display text-foreground tracking-tight">Dream</p>
                <p className="text-sm font-black font-display text-foreground tracking-tight">Pocket</p>
              </div>
            </div>

            <div className="h-10 w-px bg-border/60 mx-3.5 shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <BarChart3 className="size-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                <span className="text-xs sm:text-sm font-bold font-display text-foreground truncate">
                  Monthly Financial Report
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                Detailed insights of your income, expenses, budget and family spending.
              </p>
            </div>
          </div>

          {/* Check: If User Has No Expense History, Show Empty State */}
          {eligibleMonths.length === 0 ? (
            <div className="mt-8 rounded-3xl bg-white dark:bg-card p-8 border border-border/60 shadow-xs text-center space-y-4">
              <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Receipt className="size-8 stroke-[1.8]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold font-display text-foreground">
                  No Expense Records Found
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Monthly financial statements and reports are generated from your actual expense activity.
                  Record your first expense to unlock automated monthly reports.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/add-expense" })}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle className="size-4" />
                <span>Record First Expense</span>
              </button>
            </div>
          ) : (
            <>
              {/* Section: This Month at a Glance */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold font-display text-foreground">
                    This Month at a Glance
                  </h2>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 rounded-full border border-border/80 bg-white dark:bg-card hover:bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground transition-colors shadow-2xs cursor-pointer">
                        <span>{activeShortLabel}</span>
                        <ChevronDown className="size-3.5 text-muted-foreground stroke-[2]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-[280px] overflow-y-auto">
                      {eligibleMonths.map((m) => {
                        const range = getReportDateRange(m);
                        return (
                          <DropdownMenuItem
                            key={m}
                            onClick={() => setSelectedMonth(m)}
                            className={selectedMonth === m ? "bg-emerald-500/10 font-bold text-emerald-600" : ""}
                          >
                            {range.monthLabel} {range.isCurrentMonth ? "(Current)" : ""}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Glance Card Container */}
                <div className="rounded-2xl bg-white dark:bg-card p-4 border border-border/50 shadow-xs space-y-4">
                  {/* Row 1: 3 Financial Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">Total Income</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm sm:text-base font-black font-display text-foreground truncate">
                          {formatINRSpaced(income)}
                        </span>
                        <span className="size-4.5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                          <ArrowUp className="size-2.5 stroke-[3]" />
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">Total Expenses</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm sm:text-base font-black font-display text-foreground truncate">
                          {formatINRSpaced(spent)}
                        </span>
                        <span className="size-4.5 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
                          <ArrowDown className="size-2.5 stroke-[3]" />
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">Net Savings</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm sm:text-base font-black font-display text-emerald-700 dark:text-emerald-400 truncate">
                          {formatINRSpaced(netSavings)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Divider */}
                  <div className="h-px bg-border/40 w-full" />

                  {/* Row 2: Budget Utilisation */}
                  <div
                    onClick={() => navigate({ to: "/budget" })}
                    className="flex items-center justify-between cursor-pointer group active:opacity-85 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <BudgetDonutRing percent={budgetPercent} />
                      <div>
                        <p className="text-sm font-bold text-foreground font-display">
                          Budget Utilisation
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatINRSpaced(budgetSpent)} of {formatINRSpaced(budget > 0 ? budget : 10000)}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="size-4.5 text-muted-foreground stroke-[2] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Section: Monthly Reports List */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold font-display text-foreground">
                    Monthly Reports
                  </h2>

                  {eligibleMonths.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setShowAllMonths(!showAllMonths)}
                      className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-0.5 cursor-pointer hover:underline"
                    >
                      <span>{showAllMonths ? "Show Less" : "View All"}</span>
                      <ChevronRight className="size-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* List of Eligible Months */}
                <div className="space-y-2.5">
                  {visibleMonths.map((m) => {
                    const isSelected = selectedMonth === m;
                    const range = getReportDateRange(m);

                    return (
                      <div
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className={`rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-2xs ${
                          isSelected
                            ? "bg-[#eaf5ed] dark:bg-emerald-950/25 border border-emerald-500/25 ring-1 ring-emerald-500/15"
                            : "bg-white dark:bg-card border border-border/50 hover:border-emerald-500/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                                : "bg-muted/60 text-muted-foreground"
                            }`}
                          >
                            <FileText className="size-5.5 stroke-[2]" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground font-display truncate">
                              {range.monthLabel}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              Income • Expense • Budget • Family
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            Ready
                          </span>
                          <ChevronRight
                            className={`size-4 stroke-[2.2] ${
                              isSelected ? "text-emerald-800 dark:text-emerald-300" : "text-muted-foreground"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Pinned Action Button */}
        {eligibleMonths.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[#f7faf8] via-[#f7faf8]/95 to-transparent dark:from-background dark:via-background/95 z-40">
            <div className="max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => handleDownloadReport(selectedMonth)}
                disabled={isGeneratingPDF}
                className="w-full rounded-2xl bg-gradient-to-r from-[#023326] via-[#044a37] to-[#023326] hover:from-[#033f30] hover:to-[#033f30] text-white font-bold text-sm py-4 shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    <span>Generating Report…</span>
                  </>
                ) : (
                  <>
                    <Download className="size-5 stroke-[2.4]" />
                    <span>Generate & Download Report (PDF)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
