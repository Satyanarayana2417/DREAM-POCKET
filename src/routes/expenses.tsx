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

function formatExpenseTime(expense: Expense): string {
  if (expense.id === "mock-5") return "04 Oct 2026, 12:22 pm";
  if (expense.id === "mock-6") return "04 Oct 2026, 12:20 pm";
  if (expense.id === "mock-7") return "03 Oct 2026, 09:15 pm";
  if (expense.id === "mock-1") return "01 Nov 2026, 12:30 pm";
  if (expense.id === "mock-2") return "01 Nov 2026, 11:15 am";
  if (expense.id === "mock-3") return "30 Oct 2026, 04:15 pm";
  if (expense.id === "mock-4") return "29 Oct 2026, 08:45 am";

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
      <div className="space-y-3.5 max-w-3xl mx-auto pb-10">
        {/* Top Header: Title & Total Count (Clean, no cut-off icon) */}
        <div className="pt-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
            History
          </h1>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? "transaction" : "transactions"}
              {(timeFilter !== "all" || categoryFilter !== "all" || search) ? " found" : " recorded"}
            </p>
            {(timeFilter !== "all" || categoryFilter !== "all" || sortOrder !== "newest" || search) && (
              <button
                type="button"
                onClick={() => {
                  setTimeFilter("all");
                  setCategoryFilter("all");
                  setSortOrder("newest");
                  setSearch("");
                  setCustomRange({ from: "", to: "" });
                }}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Clean Search Input with Embedded Filter Button */}
        <Sheet>
          <div className="relative flex items-center h-11 sm:h-12 w-full rounded-2xl bg-card border border-border/70 shadow-2xs px-3.5 transition-all focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500">
            <Search className="size-4.5 text-muted-foreground/80 shrink-0 mr-2.5" />
            <input
              type="text"
              placeholder="Search by name, category or note..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none min-w-0 pr-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer mr-1 shrink-0"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <div className="h-5 w-px bg-border/70 mx-1.5 shrink-0" />
            <SheetTrigger asChild>
              <button
                type="button"
                className="p-1 text-muted-foreground hover:text-foreground relative transition-colors cursor-pointer shrink-0 rounded-lg hover:bg-muted/60"
                aria-label="Filter transactions"
              >
                <SlidersHorizontal className="size-4.5 stroke-[1.8]" />
                {(timeFilter !== "all" || categoryFilter !== "all" || sortOrder !== "newest") && (
                  <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-card" />
                )}
              </button>
            </SheetTrigger>
          </div>

          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Refine your transaction history</SheetDescription>
            </SheetHeader>
            <FilterOptions />
          </SheetContent>
        </Sheet>

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
                const displayTitle = expense.title.startsWith("Paid to") || expense.title.startsWith("Received from") || expense.title.startsWith("Cashback from")
                  ? expense.title
                  : isIncome ? `Received from ${expense.title}` : `Paid to ${expense.title}`;
                const timeLabel = formatExpenseTime(expense);
                const currentMonth = getMonthYearHeader(expense.date);
                const prevMonth = idx > 0 ? getMonthYearHeader(filteredExpenses[idx - 1].date) : null;
                const showMonthHeader = idx === 0 || currentMonth !== prevMonth;

                return (
                  <div key={expense.id || idx}>
                    {/* Month Bar: e.g. "October 2026" */}
                    {showMonthHeader && (
                      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 my-1.5 bg-[#ede8dd] dark:bg-[#181f1c] text-[13px] font-semibold text-foreground/80 dark:text-muted-foreground/90 tracking-tight flex items-center border-y border-border/25 dark:border-white/5 select-none">
                        <span>{currentMonth}</span>
                      </div>
                    )}

                    {/* Transaction Row (Matching reference image exactly) */}
                    <div
                      onClick={() => {
                        sessionStorage.setItem("expense_" + expense.id, JSON.stringify(expense));
                        navigate({ to: "/expense/$id", params: { id: expense.id } });
                      }}
                      className="py-3.5 transition-colors cursor-pointer hover:bg-muted/30 active:scale-[0.99] rounded-xl px-1 -mx-1"
                    >
                      {/* Top Line: Icon + Title + Amount */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 xs:gap-3.5 min-w-0">
                          {/* Professional Green Squircle Icon */}
                          <div className="flex size-9 xs:size-10 items-center justify-center rounded-[12px] xs:rounded-[14px] bg-gradient-to-br from-[#059669] to-[#047857] text-white shrink-0 shadow-xs">
                            {isIncome ? (
                              <ArrowDownLeft className="size-4.5 xs:size-5 stroke-[2.4]" />
                            ) : (
                              <ArrowUpRight className="size-4.5 xs:size-5 stroke-[2.4]" />
                            )}
                          </div>

                          {/* Title */}
                          <span className="text-[14.5px] xs:text-[16px] font-medium text-foreground tracking-tight truncate">
                            {displayTitle}
                          </span>
                        </div>

                        {/* Amount */}
                        <span className="text-[14.5px] xs:text-[16px] font-medium text-foreground tracking-tight shrink-0 ml-2.5 xs:ml-3">
                          ₹{Math.abs(expense.amount).toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Bottom Line: Timestamp only */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span className="text-[12px] text-muted-foreground/80 font-normal">
                          {timeLabel}
                        </span>
                        {expense.imageUrl && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Receipt
                          </span>
                        )}
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