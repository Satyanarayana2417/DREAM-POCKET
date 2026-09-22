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
import { Search, Plus, Filter, Wallet } from "lucide-react";
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

function ExpensesRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: expenses = [], isLoading, isError, error } = useQuery({
    queryKey: ["expenses", user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: !!user,
  });

  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("this_month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const months = monthOptions(12);

  const filteredExpenses = useMemo(() => {
    let result = expenses.filter(e => !e.isBudgetExpense);

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
  }, [expenses, timeFilter, selectedMonth, categoryFilter, search, sortOrder]);

  const FilterOptions = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Time Period</label>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="past_7_days">Past 7 Days</SelectItem>
            <SelectItem value="select_month">Select Month</SelectItem>
            <SelectItem value="custom_range">Custom Range</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
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
    </div>
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">Expenses</h1>
          <Button
            asChild
            className="hidden sm:flex bg-gradient-primary text-primary-foreground shadow-soft"
          >
            <Link to="/add-expense">
              <Plus className="mr-2 size-4" /> Add Expense
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              className="pl-9 bg-card shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Mobile Filter Sheet */}
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="bg-card shadow-sm">
                  <Filter className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>Refine your expense list</SheetDescription>
                </SheetHeader>
                <FilterOptions />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {/* Desktop Sidebar Filters */}
          <div className="hidden md:block">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <h3 className="mb-4 font-semibold flex items-center gap-2">
                  <Filter className="size-4" /> Filters
                </h3>
                <FilterOptions />
              </CardContent>
            </Card>
          </div>

          {/* Expense List */}
          <div className="md:col-span-3 space-y-3">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading expenses...</div>
            ) : isError ? (
              <div className="py-10 text-center text-destructive">
                Failed to load expenses: {error?.message || "Unknown error"}
              </div>
            ) : filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => {
                const meta = categoryMeta(expense.category);
                const Icon = meta.icon;
                return (
                  <Card
                    key={expense.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div
                        className="grid size-12 shrink-0 place-items-center rounded-2xl"
                        style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                      >
                        <Icon className="size-6" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold truncate">{expense.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {expense.category}
                          </span>
                          <span>•</span>
                          <span>{formatDisplayDate(expense.date)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg">{formatINR(expense.amount)}</p>
                        {expense.imageUrl && (
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">
                            Receipt attached
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Wallet className="mb-4 size-12 text-muted-foreground/30" />
                  <h3 className="mb-1 font-semibold text-lg">No expenses found</h3>
                  <p className="mb-4 text-sm text-muted-foreground max-w-[250px]">
                    {expenses.length === 0
                      ? "You haven't added any expenses yet."
                      : "No expenses match your current filters."}
                  </p>
                  {expenses.length === 0 ? (
                    <Button asChild>
                      <Link to="/add-expense">Add Your First Expense</Link>
                    </Button>
                  ) : (
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
                  )}
                </CardContent>
              </Card>
            )}
          </div>
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
