import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Target, Calendar, Search, Filter, Users, Home, Sprout, Wallet, TrendingUp, PieChart as PieChartIcon, Heart, Leaf, AlertCircle, ChevronRight, Plus } from "lucide-react";

import { AppShell, Avatar } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchFamilyById, fetchFamilyMembers, fetchFamilyBudgets, fetchFamilyExpenses, fetchUsersByIds } from "@/lib/data";
import { currentMonthKey, categoryMeta, formatDisplayDate, formatINR, budgetStatus } from "@/lib/expense-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { AddFamilyMemberDialog } from "@/components/AddFamilyMemberDialog";
import { FamilyExpenseDetailsDialog } from "@/components/FamilyExpenseDetailsDialog";

export const Route = createFileRoute("/family-budget/$familyId")({
  component: FamilyDetailsRoute,
});

function FamilyDetailsRoute() {
  const { familyId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [searchQuery, setSearchQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  // Queries
  const { data: family, isLoading: familyLoading } = useQuery({
    queryKey: ["family", familyId],
    queryFn: () => fetchFamilyById(familyId),
    enabled: !!familyId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["familyMembers", familyId],
    queryFn: () => fetchFamilyMembers(familyId),
    enabled: !!familyId,
  });

  const activeMembers = members.filter(m => m.status === "active");
  const memberIds = activeMembers.map(m => m.userId);

  const { data: usersInfo = [] } = useQuery({
    queryKey: ["usersInfo", memberIds],
    queryFn: () => fetchUsersByIds(memberIds),
    enabled: memberIds.length > 0,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["familyBudgets", familyId],
    queryFn: () => fetchFamilyBudgets(familyId),
    enabled: !!familyId,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["familyExpenses", familyId],
    queryFn: () => fetchFamilyExpenses(familyId),
    enabled: !!familyId,
  });

  // Derived State
  const monthBudgets = budgets.filter(b => b.month === selectedMonth);
  // Total Family Budget = SUM of all active members' budgets for the month
  const totalFamilyBudget = activeMembers.reduce((sum, member) => {
    const b = monthBudgets.find(bud => bud.userId === member.userId);
    return sum + (b?.budget || 0);
  }, 0);
  
  const monthExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
  const totalFamilySpent = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const status = budgetStatus(totalFamilySpent, totalFamilyBudget);
  const isOwner = family?.ownerId === user?.uid;
  
  const statusColor = status.state === "exceeded" ? "text-destructive" : "text-emerald-600";
  const statusBg = status.state === "exceeded" ? "bg-destructive" : status.state === "near" ? "bg-amber-500" : "bg-emerald-500";

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444"];
  const pieData = activeMembers.map((member, i) => {
    const memExps = monthExpenses.filter(e => e.addedBy === member.userId);
    const spent = memExps.reduce((sum, e) => sum + Number(e.amount), 0);
    const u = usersInfo.find(ui => ui["uid"] === member.userId);
    return {
      name: u?.["username"] || "Member",
      value: spent,
      color: COLORS[i % COLORS.length]
    };
  }).filter(d => d.value > 0);

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

  let filteredExpenses = monthExpenses;
  if (searchQuery.trim()) {
    const lowerQ = searchQuery.toLowerCase();
    filteredExpenses = filteredExpenses.filter(e => e.title.toLowerCase().includes(lowerQ) || e.category.toLowerCase().includes(lowerQ));
  }
  if (memberFilter !== "all") {
    filteredExpenses = filteredExpenses.filter(e => e.addedBy === memberFilter);
  }

  if (familyLoading) {
    return (
      <AppShell>
        <div className="py-12 text-center text-muted-foreground">Loading family details...</div>
      </AppShell>
    );
  }

  if (!family) {
    return (
      <AppShell>
        <div className="py-12 text-center text-destructive">Family not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-20">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 -ml-2 text-slate-700 sm:hidden">
              <Link to="/family-budget">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="bg-emerald-100 text-emerald-600 p-2 sm:p-2.5 rounded-2xl flex-shrink-0">
              <Users className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild className="h-6 w-6 -ml-2 text-slate-700 hidden sm:inline-flex">
                  <Link to="/family-budget">
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Family Budget</h1>
              </div>
              <p className="text-sm font-medium text-slate-500">Together for a better tomorrow</p>
            </div>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] bg-white h-10 shadow-sm border-slate-200 rounded-xl">
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

        {/* COMMON FAMILY SUMMARY */}
        <Card className="border-0 shadow-sm overflow-hidden bg-gradient-to-br from-[#e0fcf0] to-[#c7f4de] relative">
          {/* Decorative background shapes */}
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none overflow-hidden h-full w-full">
             <Leaf className="absolute -top-10 -right-10 size-64 text-emerald-600 rotate-12" strokeWidth={0.5} />
             <Leaf className="absolute top-20 right-20 size-32 text-emerald-600 -rotate-45" strokeWidth={0.5} />
          </div>
          
          <CardContent className="p-4 sm:p-6 relative z-10">
            {/* Top row of card */}
            <div className="flex items-start justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-[#b5f0d4] p-3 rounded-2xl sm:rounded-3xl shadow-sm">
                  <Home className="size-6 sm:size-8 text-emerald-800" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-0.5">{family.familyName}</h2>
                  <p className="text-sm font-medium text-slate-600">{activeMembers.length} Members • {status.state === "exceeded" ? "Exceeded" : "On Track"}</p>
                </div>
              </div>
              <div className="hidden sm:block text-right transform -rotate-6 mr-2 mt-2 opacity-80">
                <p className="font-serif italic text-xl text-emerald-800 leading-tight">Better<br/>Together <Heart className="inline size-4 ml-0.5 fill-emerald-800" /></p>
              </div>
            </div>

            {/* White inner panel containing stats and progress */}
            <div className="bg-white/80 sm:bg-white/90 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-sm border border-white/60">
              <div className="grid grid-cols-3 divide-x divide-slate-200/80 mb-5">
                
                <div className="py-1 pr-2 sm:pr-6">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-slate-500 mb-1">Total Budget</p>
                  <p className="text-[15px] sm:text-2xl font-bold text-slate-900 leading-none tracking-tight">{formatINR(totalFamilyBudget)}</p>
                </div>
                
                <div className="py-1 px-3 sm:px-6">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-slate-500 mb-1">Total Expenses</p>
                  <p className="text-[15px] sm:text-2xl font-bold text-slate-900 leading-none tracking-tight">{formatINR(totalFamilySpent)}</p>
                </div>

                <div className="py-1 pl-3 sm:pl-6">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-slate-500 mb-1">Remaining</p>
                  <p className={`text-[15px] sm:text-2xl font-bold leading-none tracking-tight ${statusColor}`}>{formatINR(status.remaining)}</p>
                </div>
              </div>

              {/* Progress Bar inside white panel */}
              <div className="px-0.5 sm:px-1 pt-1">
                <div className="h-3 w-full bg-[#e2f5ec] rounded-full overflow-hidden mb-2.5">
                  <div
                    className={`h-full ${status.state === 'exceeded' ? 'bg-destructive' : 'bg-emerald-600'} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${Math.min(status.percent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] sm:text-[13px] font-semibold mt-1">
                  <span className="text-slate-700">{status.percent.toFixed(1)}% Used</span>
                  {status.percent < 100 ? (
                    <span className="text-emerald-700 flex items-center gap-1"><Leaf className="size-3 fill-emerald-700" /> On Track</span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1"><AlertCircle className="size-3" /> Exceeded!</span>
                  )}
                </div>
              </div>
            </div>
            
            {pieData.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-900 mb-4 text-center">Expense Contributions</p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatINR(value)}
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      <div className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.name} ({(entry.value / totalFamilySpent * 100).toFixed(0)}%)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FAMILY MEMBERS */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-bold text-slate-900">Family Members</h2>
            <Button variant="ghost" className="text-slate-500 font-medium p-0 h-auto hover:bg-transparent">See All <ChevronRight className="ml-1 size-4" /></Button>
          </div>
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 px-1 scrollbar-hide">
            {activeMembers.map(member => {
              const u = usersInfo.find(ui => ui["uid"] === member.userId);
              const isOwnerRole = member.role === "owner";
              return (
                <Link 
                  key={member.userId} 
                  to="/family-budget/$familyId/member/$memberId"
                  params={{ familyId, memberId: member.userId }}
                  className="flex flex-col items-center flex-shrink-0 gap-1.5"
                >
                  <div className={`rounded-full p-[3px] border-2 ${isOwnerRole ? 'border-emerald-500' : 'border-[#e1e7fa]'}`}>
                    <Avatar name={u?.["username"] || "User"} photoURL={u?.["photoURL"]} size={68} />
                  </div>
                  <p className="font-bold text-slate-900 text-[15px]">{u?.["username"] || "Member"}</p>
                  <div className={`px-3 py-[2px] rounded-full text-[11px] font-medium ${isOwnerRole ? 'bg-[#d1fae5] text-emerald-700' : 'bg-[#eff3ff] text-[#4f649a]'}`}>
                    {member.role === "owner" ? "Owner" : "Member"}
                  </div>
                </Link>
              );
            })}
            
            {/* Add Member Button (dashed circle) */}
            {isOwner && (
              <div className="flex flex-col items-center flex-shrink-0 gap-1.5 justify-start">
                <AddFamilyMemberDialog familyId={familyId} customTrigger={
                  <button className="rounded-full h-[78px] w-[78px] border-2 border-dashed border-[#e1e7fa] flex items-center justify-center bg-transparent mt-0.5">
                    <div className="h-12 w-12 rounded-full bg-[#eff3ff] flex items-center justify-center">
                      <Plus className="size-6 text-[#4f649a]" strokeWidth={2.5} />
                    </div>
                  </button>
                } />
                <p className="font-semibold text-[#4f649a] text-[15px] mt-0.5">Add</p>
              </div>
            )}
          </div>
        </div>

        {/* FAMILY EXPENSES */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Family Expenses</h2>
            <div className="flex items-center gap-2">
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-slate-200">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {activeMembers.map(m => {
                    const u = usersInfo.find(ui => ui["uid"] === m.userId);
                    return <SelectItem key={m.userId} value={m.userId}>{u?.["username"] || "Member"}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input 
                  placeholder="Search..." 
                  className="pl-8 h-9 bg-white border-slate-200" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-slate-100 shadow-sm">
                <p className="text-muted-foreground">No expenses found.</p>
              </div>
            ) : (
              filteredExpenses.map((exp) => {
                const meta = categoryMeta(exp.category);
                const u = usersInfo.find(ui => ui["uid"] === exp.addedBy);
                return (
                  <FamilyExpenseDetailsDialog key={exp.id} expense={exp} username={u?.["username"] || "Member"}>
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
                            Added by {u?.["username"] || "Member"}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold sm:font-bold text-slate-900 text-right">{formatINR(exp.amount)}</p>
                    </div>
                  </FamilyExpenseDetailsDialog>
                );
              })
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
