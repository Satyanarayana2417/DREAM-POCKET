import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Target, ArrowDownCircle, Info, Calendar, Plus } from "lucide-react";

import { AppShell, Avatar } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchFamilyById, fetchFamilyMembers, fetchFamilyBudgets, fetchFamilyExpenses, fetchUsersByIds } from "@/lib/data";
import { currentMonthKey, categoryMeta, formatDisplayDate, formatINR, budgetStatus } from "@/lib/expense-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SetFamilyMemberBudgetDialog } from "@/components/SetFamilyMemberBudgetDialog";
import { AddFamilyExpenseDialog } from "@/components/AddFamilyExpenseDialog";
import { FamilyExpenseDetailsDialog } from "@/components/FamilyExpenseDetailsDialog";

export const Route = createFileRoute("/family-budget_/$familyId_/member/$memberId")({
  component: MemberProfileRoute,
});

function MemberProfileRoute() {
  const { familyId, memberId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());

  const { data: family, isLoading: familyLoading } = useQuery({
    queryKey: ["family", familyId],
    queryFn: () => fetchFamilyById(familyId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["familyMembers", familyId],
    queryFn: () => fetchFamilyMembers(familyId),
  });

  const memberInfo = members.find(m => m.userId === memberId);

  const { data: usersInfo = [] } = useQuery({
    queryKey: ["usersInfo", [memberId]],
    queryFn: () => fetchUsersByIds([memberId]),
    enabled: !!memberId,
  });

  const userInfo = usersInfo.find(u => u["uid"] === memberId);

  const { data: allBudgets = [] } = useQuery({
    queryKey: ["familyBudgets", familyId],
    queryFn: () => fetchFamilyBudgets(familyId),
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["familyExpenses", familyId],
    queryFn: () => fetchFamilyExpenses(familyId),
  });

  if (familyLoading) {
    return (
      <AppShell>
        <div className="py-12 text-center text-muted-foreground">Loading member profile...</div>
      </AppShell>
    );
  }

  if (!family || !memberInfo || !userInfo) {
    return (
      <AppShell>
        <div className="py-12 text-center text-destructive">Member not found in this family.</div>
      </AppShell>
    );
  }

  // Filter budgets and expenses for this specific member
  const memberBudgets = allBudgets.filter(b => b.userId === memberId);
  const memberMonthBudgetDoc = memberBudgets.find(b => b.month === selectedMonth);
  const memberBudgetAmount = memberMonthBudgetDoc?.budget || 0;

  const memberExpenses = allExpenses.filter(e => e.addedBy === memberId);
  const monthExpenses = memberExpenses.filter(e => e.date.startsWith(selectedMonth));
  const totalSpent = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const status = budgetStatus(totalSpent, memberBudgetAmount);
  const isMe = user?.uid === memberId;
  
  const statusColor = status.state === "exceeded" ? "text-destructive" : "text-emerald-600";
  const statusBg = status.state === "exceeded" ? "bg-destructive" : status.state === "near" ? "bg-amber-500" : "bg-emerald-500";

  // Build last 6 months for dropdown
  const monthsList = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    monthsList.push({ key, label });
    d.setMonth(d.getMonth() - 1);
  }

  const selectedMonthLabel = monthsList.find(m => m.key === selectedMonth)?.label || selectedMonth;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 -ml-2">
            <Link to="/family-budget/$familyId" params={{ familyId }}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex-1" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] bg-white h-9 shadow-sm border-slate-200">
              <Calendar className="mr-2 size-4 text-slate-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthsList.map(m => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <Avatar name={userInfo["username"] || "User"} photoURL={userInfo["photoURL"]} size={64} />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{userInfo["username"]}</h1>
            <p className="text-sm font-medium text-emerald-600 uppercase tracking-wider">{memberInfo.role}</p>
          </div>
          {isMe && (
            <SetFamilyMemberBudgetDialog familyId={familyId} month={selectedMonth} currentBudget={memberBudgetAmount} />
          )}
        </div>

        <Card className="border-0 shadow-sm overflow-hidden bg-white">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{selectedMonthLabel} Overview</h2>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                  <Target className="size-4" /> My Budget
                </p>
                <p className="text-2xl font-semibold sm:font-bold text-slate-900">{formatINR(memberBudgetAmount)}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                  <ArrowDownCircle className="size-4" /> Total Spent
                </p>
                <p className="text-2xl font-semibold sm:font-bold text-slate-900">{formatINR(totalSpent)}</p>
              </div>
            </div>

            <div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">Remaining</p>
                  <p className={`text-2xl font-semibold sm:font-bold ${statusColor}`}>{formatINR(status.remaining)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold sm:font-bold text-slate-900">{status.percent.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 uppercase font-medium">Used</p>
                </div>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${statusBg} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${Math.min(status.percent, 100)}%` }}
                />
              </div>
              {status.percent >= 100 && (
                <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  <Info className="size-4 mt-0.5 shrink-0" />
                  <p>Budget exceeded by {formatINR(totalSpent - memberBudgetAmount)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3 ml-1">
            <h2 className="text-lg font-semibold text-slate-900">{userInfo["username"]}'s Expenses</h2>
          </div>
          
          {monthExpenses.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-slate-100 shadow-sm">
              <p className="text-muted-foreground">No expenses added by {userInfo["username"]} for this month.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthExpenses.map((exp) => {
                const meta = categoryMeta(exp.category);
                return (
                  <FamilyExpenseDetailsDialog key={exp.id} expense={exp} username={userInfo["username"] || "Member"}>
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100 group-hover:bg-emerald-50">
                          <meta.icon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900">{exp.title}</p>
                          <p className="text-xs font-medium text-slate-500">
                            {exp.category} • {formatDisplayDate(exp.date)}
                          </p>
                          <p className="text-[11px] font-medium text-emerald-600 mt-0.5">
                            Added by {userInfo["username"]}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold sm:font-bold text-slate-900 text-right">{formatINR(exp.amount)}</p>
                    </div>
                  </FamilyExpenseDetailsDialog>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Floating Add Family Expense Button (Mobile) */}
      {isMe && (
        <div className="fixed right-5 bottom-28 z-50 md:hidden pointer-events-auto">
          <AddFamilyExpenseDialog 
            familyId={familyId} 
            customTrigger={
              <button className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform active:scale-95">
                <Plus className="size-6" />
              </button>
            } 
          />
        </div>
      )}
    </AppShell>
  );
}
