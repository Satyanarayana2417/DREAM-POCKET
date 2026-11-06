import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchExpenses } from "@/lib/data";
import {
  categoryMeta,
  formatDisplayDate,
  formatINR,
  inMonth,
  monthOptions,
  monthLabel,
  CATEGORY_NAMES,
  pastDaysRange,
  inRange,
  currentMonthKey,
  type Expense,
} from "@/lib/expense-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Filter,
  Wallet,
  HelpCircle,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppShell } from "@/components/AppShell";
import { ExpenseDetailsDialog } from "@/components/ExpenseDetailsDialog";

export const Route = createFileRoute("/expenses")({
  component: ExpensesRoute,
});

function getMonthYearHeader(dateStr?: string): string {
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

function formatShortDate(iso?: string) {
  if (!iso) return "";
  const parts = iso.split("-").map(Number);
  if (parts.length >= 3) {
    const [y, m, d] = parts;
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }
  return iso;
}

const MOCK_HISTORY_EXPENSES: Expense[] = [
  {
    id: "mock-1",
    userId: "mock",
    title: "Subrahmanyam tifens",
    amount: 40,
    category: "Food",
    date: "2026-11-01",
    description: "",
    imageUrl: null,
    createdAt: null,
  },
  {
    id: "mock-2",
    userId: "mock",
    title: "Chodisetti Surya",
    amount: 40,
    category: "Transfer",
    date: "2026-11-01",
    description: "",
    imageUrl: null,
    createdAt: null,
  },
  {
    id: "mock-3",
    userId: "mock",
    title: "Nithin Csm",
    amount: 20,
    category: "Transfer",
    date: "2026-10-30",
    description: "",
    imageUrl: null,
    createdAt: null,
  },
  {
    id: "mock-4",
    userId: "mock",
    title: "APSRTC",
    amount: 35,
    category: "Travel",
    date: "2026-10-29",
    description: "",
    imageUrl: null,
    createdAt: null,
  },
  {
    id: "mock-5",
    userId: "mock",
    title: "Puri",
    amount: 40,
    category: "Food",
    date: "2026-10-04",
    description: "",
    imageUrl: null,
    createdAt: null,
  },
  {
    id: "mock-6",
    userId: "mock",
    title: "Mrng tiffins",
    amount: 130,
    category: "Food",
    date: "2026-10-04",
    description: "",
    imageUrl: null,
    createdAt: null,
  },
  {
    id: "mock-7",
    userId: "mock",
    title: "Night tififns",
    amount: 80,
    category: "Food",
    date: "2026-10-03",
    description: "",
    imageUrl: null,
    createdAt: null,
  },
];

function ExpensesRoute() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const joinDate = (profile as any)?.createdAt
    ? new Date((profile as any).createdAt.seconds * 1000)
    : undefined;

  const { data: expenses = [], isLoading, isError, error } = useQuery({
    queryKey: ["expenses", user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: !!user,
  });

  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const months = monthOptions(joinDate);

  // Use real expenses if any exist; otherwise show mock history items
  const sourceExpenses = useMemo(() => {
    const realNonBudget = expenses.filter((e) => !e.isBudgetExpense);
    return realNonBudget.length > 0 ? realNonBudget : MOCK_HISTORY_EXPENSES;
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let result = [...sourceExpenses];

    // Time filter
    if (timeFilter === "this_month") {
      result = result.filter((e) => inMonth(e, currentMonthKey()));
    } else if (timeFilter === "past_7_days") {
      const { from, to } = pastDaysRange(7);
      result = result.filter((e) => inRange(e, from, to));
    } else if (timeFilter === "select_month") {
      result = result.filter((e) => inMonth(e, selectedMonth));
    } else if (timeFilter === "custom_range") {
      if (customRange.from && customRange.to) {
        result = result.filter((e) => inRange(e, customRange.from, customRange.to));
      } else if (customRange.from) {
        result = result.filter((e) => e.date >= customRange.from);
      } else if (customRange.to) {
        result = result.filter((e) => e.date <= customRange.to);
      }
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }

    // Search filter
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)),
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === "newest") return b.date.localeCompare(a.date);
      if (sortOrder === "oldest") return a.date.localeCompare(b.date);
      if (sortOrder === "highest") return b.amount - a.amount;
      if (sortOrder === "lowest") return a.amount - b.amount;
      return 0;
    });

    return result;
  }, [sourceExpenses, timeFilter, selectedMonth, categoryFilter, search, sortOrder]);

  const FilterOptions = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <label className="text-sm font-medium">Time Period</label>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="past_7_days">Past 7 Days</SelectItem>
            <SelectItem value="select_month">Select Month</SelectItem>
            <SelectItem value="custom_range">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {timeFilter === "select_month" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Month</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {timeFilter === "custom_range" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">From Date</label>
            <Input
              type="date"
              value={customRange.from}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">To Date</label>
            <Input
              type="date"
              value={customRange.to}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_NAMES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Sort By</label>
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="highest">Highest Amount</SelectItem>
            <SelectItem value="lowest">Lowest Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTimeFilter("all");
            setCategoryFilter("all");
            setSortOrder("newest");
            setSearch("");
          }}
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="space-y-4 max-w-3xl mx-auto pb-10">
        {/* Top Header: "History" with Help Icon (Matching Image 2 exactly) */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
            History
          </h1>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full active:scale-95"
            aria-label="Help"
          >
            <HelpCircle className="size-5.5 stroke-[1.8]" />
          </button>
        </div>

        {/* Unified Search & Filter Pill Bar (Matching Image 2 exactly) */}
        <div className="relative flex items-center h-12 w-full rounded-2xl bg-card dark:bg-[#151c19] border border-border/60 shadow-2xs px-3.5 transition-all focus-within:ring-2 focus-within:ring-emerald-600/30">
          <Search className="size-4.5 text-muted-foreground/80 shrink-0 mr-2.5" />
          <input
            type="text"
            placeholder="Search"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="p-1 text-muted-foreground hover:text-foreground text-xs mr-2 transition-colors"
            >
              ✕
            </button>
          )}

          {/* Vertical Divider Line */}
          <div className="h-5 w-px bg-border/60 mx-1 shrink-0" />

          {/* Filter Icon Button */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 active:scale-95"
                aria-label="Filter transactions"
              >
                <SlidersHorizontal className="size-4.5" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Refine your transaction history</SheetDescription>
              </SheetHeader>
              <FilterOptions />
            </SheetContent>
          </Sheet>
        </div>

        {/* Transactions List */}
        <div className="pt-1">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading history...</div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive">
              Failed to load transactions: {error?.message || "Unknown error"}
            </div>
          ) : filteredExpenses.length > 0 ? (
            <div className="divide-y divide-border/20 dark:divide-border/15">
              {filteredExpenses.map((expense, idx) => {
                const isIncome = (expense.category || "").toLowerCase() === "income" || expense.amount < 0;
                const prefix = isIncome ? "Received from" : "Paid to";
                const cleanTitle = expense.title.startsWith("Paid to ") || expense.title.startsWith("Received from ")
                  ? expense.title.replace(/^(Paid to |Received from )/, "")
                  : expense.title;
                const shortDate = formatShortDate(expense.date);
                const currentMonth = getMonthYearHeader(expense.date);
                const prevMonth = idx > 0 ? getMonthYearHeader(filteredExpenses[idx - 1].date) : null;
                const showMonthHeader = idx === 0 || currentMonth !== prevMonth;

                return (
                  <div key={expense.id || idx}>
                    {/* Month Bar: e.g. "October 2026" (Full width strip matching Image 2 in both modes) */}
                    {showMonthHeader && (
                      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 my-1.5 bg-[#ede8dd] dark:bg-[#181f1c] text-[13px] font-semibold text-foreground/80 dark:text-muted-foreground/90 tracking-tight flex items-center border-y border-border/25 dark:border-white/5 select-none">
                        <span>{currentMonth}</span>
                      </div>
                    )}

                    {/* Transaction Row (Matching Image 2 layout exactly) */}
                    <div
                      onClick={() => {
                        sessionStorage.setItem("expense_" + expense.id, JSON.stringify(expense));
                        navigate({ to: "/expense/$id", params: { id: expense.id } });
                      }}
                      className={`py-3.5 transition-colors cursor-pointer hover:bg-muted/30 active:scale-[0.99] rounded-xl px-1 -mx-1`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Left Side: Icon + 3-line Text Stack */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Professional Green Squircle Icon */}
                          <div className="flex size-10.5 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#059669] to-[#047857] text-white shrink-0 shadow-xs">
                            {isIncome ? (
                              <ArrowDownLeft className="size-5 stroke-[2.4]" />
                            ) : (
                              <ArrowUpRight className="size-5 stroke-[2.4]" />
                            )}
                          </div>

                          {/* 3-line Info Stack */}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] text-muted-foreground font-normal leading-tight">
                              {prefix}
                            </span>
                            <span className="text-[15px] sm:text-[16px] font-semibold text-foreground tracking-tight truncate leading-snug mt-0.5">
                              {cleanTitle}
                            </span>
                            <span className="text-[12px] text-muted-foreground/80 font-normal leading-tight mt-0.5">
                              {shortDate}
                            </span>
                          </div>
                        </div>

                        {/* Right Side: Bold Amount */}
                        <div className="flex flex-col items-end shrink-0 ml-3">
                          <span className="text-[16px] sm:text-[17px] font-bold text-foreground font-display tracking-tight leading-none">
                            ₹{Math.abs(expense.amount).toLocaleString("en-IN")}
                          </span>
                          {expense.imageUrl && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                              Receipt
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="mt-4">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Wallet className="mb-4 size-12 text-muted-foreground/30" />
                <h3 className="mb-1 font-semibold text-lg">No transactions found</h3>
                <p className="mb-4 text-sm text-muted-foreground max-w-[260px]">
                  No transactions match your current search or filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setTimeFilter("all");
                    setCategoryFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ExpenseDetailsDialog
        expense={selectedExpense}
        open={!!selectedExpense}
        onOpenChange={(open) => !open && setSelectedExpense(null)}
      />
    </AppShell>
  );
}