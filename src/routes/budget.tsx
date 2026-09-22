import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Target, Wallet } from "lucide-react";
import { toast } from "sonner";

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
} from "@/lib/expense-utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddBudgetExpenseDialog } from "@/components/AddBudgetExpenseDialog";
import { ExpenseDetailsDialog } from "@/components/ExpenseDetailsDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/budget")({
  component: BudgetRoute,
});

function BudgetRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  const months = monthOptions(12);

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
  const budgetMonthExpenses = monthExpenses.filter(e => e.isBudgetExpense);
  const spent = sumAmount(budgetMonthExpenses);
  const status = budgetStatus(spent, currentBudget);

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

  const handleEdit = () => {
    setEditAmount(currentBudget ? String(currentBudget) : "");
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
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
      <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Monthly Budget</h1>
        <div className="w-40">
          <Select
            value={selectedMonth}
            onValueChange={(val) => {
              setSelectedMonth(val);
              setIsEditing(false);
            }}
          >
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
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{monthLabel(selectedMonth)}</CardTitle>
              <CardDescription>Manage your budget for this month</CardDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={handleEdit}>
                {currentBudget > 0 ? "Edit Budget" : "Set Budget"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form
              onSubmit={handleSave}
              className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="space-y-2">
                <Label htmlFor="budgetAmount">Monthly Budget Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">₹</span>
                  <Input
                    id="budgetAmount"
                    type="number"
                    autoFocus
                    placeholder="e.g. 30000"
                    className="pl-7"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-gradient-primary"
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save Budget
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : currentBudget > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="size-4" /> Budget
                  </div>
                  <div className="mt-1 text-2xl font-bold">{formatINR(currentBudget, true)}</div>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="size-4" /> Spent
                  </div>
                  <div className="mt-1 text-2xl font-bold">{formatINR(spent, true)}</div>
                </div>
                <div className="col-span-2 rounded-xl border bg-card p-4 md:col-span-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Remaining
                  </div>
                  <div className="mt-1 text-2xl font-bold text-primary">
                    {formatINR(status.remaining, true)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Progress</span>
                  <span className={status.state === "exceeded" ? "text-destructive" : ""}>
                    {status.percent.toFixed(1)}% Used
                  </span>
                </div>
                <Progress
                  value={Math.min(status.percent, 100)}
                  className="h-3"
                  indicatorClassName={
                    status.state === "exceeded"
                      ? "bg-destructive"
                      : status.state === "near"
                        ? "bg-amber-500"
                        : "bg-primary"
                  }
                />
                {status.state === "exceeded" && (
                  <p className="text-sm font-medium text-destructive mt-2">
                    You have exceeded your budget by {formatINR(status.over)}!
                  </p>
                )}
              </div>

              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Budget Expenses</h3>
                  <AddBudgetExpenseDialog selectedMonth={selectedMonth} />
                </div>
                
                {budgetMonthExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {budgetMonthExpenses.map((expense) => (
                      <div 
                        key={expense.id} 
                        className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/30 px-3 -mx-3 rounded-lg transition-colors"
                        onClick={() => setSelectedExpense(expense)}
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-semibold text-sm line-clamp-1">{expense.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {expense.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm text-destructive">{formatINR(expense.amount)}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm bg-muted/20 rounded-xl">
                    No budget expenses added yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Target className="mb-4 size-12 opacity-30" />
              <h3 className="mb-1 font-semibold text-lg text-foreground">No Budget Set</h3>
              <p className="mb-4 text-sm max-w-[250px]">
                You haven't set a budget for {monthLabel(selectedMonth)} yet.
              </p>
              <Button onClick={handleEdit}>Set Monthly Budget</Button>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <ExpenseDetailsDialog 
        expense={selectedExpense} 
        open={!!selectedExpense} 
        onOpenChange={(open) => !open && setSelectedExpense(null)} 
      />
    </AppShell>
  );
}
