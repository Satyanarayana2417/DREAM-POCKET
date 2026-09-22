import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchExpenses, fetchBudgets } from "@/lib/data";
import {
  budgetStatus,
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
import { Calendar, Wallet, TrendingUp, ReceiptText, ArrowRight, ChevronDown } from "lucide-react";
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

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, profile } = useAuth();
  const name = profile?.username?.split(" ")[0] || "User";
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: !!user,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", user?.uid],
    queryFn: () => fetchBudgets(user!.uid),
    enabled: !!user,
  });

  const monthKey = selectedMonth; // e.g. "2026-09"
  const monthName = monthLabel(monthKey);
  const monthExpenses = expenses.filter((e) => inMonth(e, monthKey));
  
  const mainMonthExpenses = monthExpenses.filter(e => !e.isBudgetExpense);
  const budgetMonthExpenses = monthExpenses.filter(e => e.isBudgetExpense);

  const currentBudget = budgets.find((b) => b.month === monthKey)?.budget || 0;

  const mainSpent = sumAmount(mainMonthExpenses);
  const budgetSpent = sumAmount(budgetMonthExpenses);
  const status = budgetStatus(budgetSpent, currentBudget);

  const recentExpenses = expenses.filter(e => !e.isBudgetExpense).slice(0, 4);
  const catTotals = categoryTotals(mainMonthExpenses);
  const dTotals = dailyTotals(mainMonthExpenses, monthKey);

  // Sorting categories by amount for the legend
  const sortedCategories = [...catTotals].sort((a, b) => b.value - a.value);

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1200px] mx-auto">
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
              <button className="flex items-center gap-2 bg-card border border-border/50 shadow-sm px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors">
                <Calendar className="size-4 text-muted-foreground" />
                {monthName}
                <ChevronDown className="size-4 text-muted-foreground ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
              {monthOptions(12).map((m) => (
                <DropdownMenuItem key={m} onClick={() => setSelectedMonth(m)}>
                  {monthLabel(m)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-50 text-blue-500 p-2.5 rounded-xl">
                  <Calendar className="size-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap truncate">Monthly Budget</span>
              </div>
              <div className="text-2xl font-normal font-display">{formatINR(currentBudget, true)}</div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-emerald-50 text-emerald-500 p-2.5 rounded-xl">
                  <TrendingUp className="size-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap truncate">Total Spent</span>
              </div>
              <div className="text-2xl font-normal font-display">{formatINR(mainSpent, true)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-50 text-orange-500 p-2.5 rounded-xl">
                  <Wallet className="size-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap truncate">Remaining</span>
              </div>
              <div className="text-2xl font-normal font-display">{formatINR(status.remaining, true)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-purple-50 text-purple-500 p-2.5 rounded-xl">
                  <ReceiptText className="size-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap truncate">Expenses</span>
              </div>
              <div className="text-2xl font-normal font-display">{mainMonthExpenses.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Section (Charts) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Budget Progress */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-semibold text-lg font-display">Budget Progress</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  status.state === "exceeded" 
                    ? "bg-red-50 text-red-600" 
                    : status.state === "near" 
                      ? "bg-orange-50 text-orange-600" 
                      : "bg-emerald-50 text-emerald-600"
                }`}>
                  {status.state === "exceeded" ? "Exceeded" : status.state === "near" ? "Nearing Limit" : "On Track"}
                </span>
              </div>
              
              <div className="flex justify-between items-end mb-3">
                <div className="text-2xl font-bold">{status.percent.toFixed(1)}% used</div>
                <div className="text-sm font-medium text-muted-foreground">Budget: {formatINR(currentBudget)}</div>
              </div>

              <div className="w-full bg-muted/50 rounded-full h-4 mb-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    status.state === "exceeded" ? "bg-red-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(status.percent, 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-bold">{formatINR(budgetSpent)}</span>
                  <span className="text-muted-foreground ml-1">Spent</span>
                </div>
                <div>
                  <span className="font-bold">{formatINR(status.remaining)}</span>
                  <span className="text-muted-foreground ml-1">Remaining</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Spending */}
          <Card className="border-0 shadow-sm rounded-2xl">
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
                            border: "none",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
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
                          {(((mainSpent - sortedCategories.slice(0, 4).reduce((acc, curr) => acc + curr.value, 0)) / mainSpent) * 100).toFixed(0)}%
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
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg font-display">Recent Expenses</h3>
                <Link to="/expenses" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
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
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {expense.category}
                            </p>
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
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg font-display mb-6">Monthly Spending</h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dTotals} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) =>
                        Number(value) % 7 === 1 ? `${value} ${monthName.split(" ")[0]!.slice(0,3)}` : ""
                      }
                    />
                    <YAxis 
                      hide={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => value > 0 ? `${value / 1000}k` : '0'}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                      formatter={(value: number) => [formatINR(value), "Spent"]}
                      labelFormatter={(label) => `Day ${label}`}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#3b82f6" 
                      radius={[2, 2, 0, 0]} 
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
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
