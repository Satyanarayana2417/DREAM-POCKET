import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Target, Calendar, Search, Filter, Users, Home, Sprout, Wallet, TrendingUp, PieChart as PieChartIcon, Heart, Leaf, AlertCircle, ChevronRight, Plus } from "lucide-react";

import { AppShell, Avatar } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchFamilyById, fetchFamilyMembers, fetchFamilyBudgets, fetchFamilyExpenses, fetchUsersByIds } from "@/lib/data";
import { firebaseDb } from "@/lib/firebase";
import { onSnapshot, collection, doc } from "firebase/firestore";
import { currentMonthKey, categoryMeta, formatDisplayDate, formatINR, budgetStatus, type FamilyMember } from "@/lib/expense-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { AddFamilyMemberDialog } from "@/components/AddFamilyMemberDialog";
import { AddFamilyExpenseDialog } from "@/components/AddFamilyExpenseDialog";
import { FamilyExpenseDetailsDialog } from "@/components/FamilyExpenseDetailsDialog";
import { BackButton } from "@/components/BackButton";

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

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!familyId) return;
    
    // Subscribe to family details (for pendingMemberIds)
    const unsubFamily = onSnapshot(doc(firebaseDb(), "families", familyId), (snap) => {
      if (snap.exists()) {
        queryClient.setQueryData(["family", familyId], { id: snap.id, ...snap.data() });
      }
    });

    // Subscribe to family members
    const unsubMembers = onSnapshot(collection(firebaseDb(), `families/${familyId}/members`), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FamilyMember, "id">) }));
      queryClient.setQueryData(["familyMembers", familyId], data);
    });
    
    return () => {
      unsubFamily();
      unsubMembers();
    };
  }, [familyId, queryClient]);

  const activeMembers = members.filter(m => m.status === "active");
  const activeMemberIds = activeMembers.map(m => m.userId);
  const pendingIds = (family?.pendingMemberIds as string[]) || [];
  const allUserIds = [...new Set([...activeMemberIds, ...pendingIds])];

  const { data: usersInfo = [] } = useQuery({
    queryKey: ["usersInfo", allUserIds],
    queryFn: () => fetchUsersByIds(allUserIds),
    enabled: allUserIds.length > 0,
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
            <BackButton fallback="/family-budget" className="h-8 w-8 -ml-2 sm:hidden" />
            <div className="bg-emerald-100 text-emerald-600 p-2 sm:p-2.5 rounded-2xl flex-shrink-0">
              <Users className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <BackButton fallback="/family-budget" className="h-6 w-6 -ml-2 hidden sm:inline-flex" iconClassName="size-4" />
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Family Budget</h1>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Together for a better tomorrow</p>
            </div>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] bg-card h-10 shadow-sm border-border rounded-xl">
              <Calendar className="mr-2 size-4 text-muted-foreground" />
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
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-0.5">{family.familyName}</h2>
                  <p className="text-sm font-medium text-muted-foreground">{activeMembers.length} Members • {status.state === "exceeded" ? "Exceeded" : "On Track"}</p>
                </div>
              </div>
              <div className="hidden sm:block text-right transform -rotate-6 mr-2 mt-2 opacity-80">
                <p className="font-serif italic text-xl text-emerald-800 leading-tight">Better<br/>Together <Heart className="inline size-4 ml-0.5 fill-emerald-800" /></p>
              </div>
            </div>

            {/* White inner panel containing stats and progress */}
            <div className="bg-card/80 sm:bg-card/90 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-sm border border-white/60">
              <div className="grid grid-cols-3 divide-x divide-slate-200/80 mb-5">
                
                <div className="py-1 pr-2 sm:pr-6">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-muted-foreground mb-1">Total Budget</p>
                  <p className="text-[15px] sm:text-2xl font-bold text-foreground leading-none tracking-tight">{formatINR(totalFamilyBudget)}</p>
                </div>
                
                <div className="py-1 px-3 sm:px-6">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-muted-foreground mb-1">Total Expenses</p>
                  <p className="text-[15px] sm:text-2xl font-bold text-foreground leading-none tracking-tight">{formatINR(totalFamilySpent)}</p>
                </div>

                <div className="py-1 pl-3 sm:pl-6">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-muted-foreground mb-1">Remaining</p>
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
                  <span className="text-foreground">{status.percent.toFixed(1)}% Used</span>
                  {status.percent < 100 ? (
                    <span className="text-emerald-700 flex items-center gap-1"><Leaf className="size-3 fill-emerald-700" /> On Track</span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1"><AlertCircle className="size-3" /> Exceeded!</span>
                  )}
                </div>
              </div>
            </div>
            
            {pieData.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm font-semibold text-foreground mb-4 text-center">Expense Contributions</p>
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
                    <div key={index} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border">
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
            <h2 className="text-xl font-bold text-foreground">Family Members</h2>
            <Button variant="ghost" className="text-muted-foreground font-medium p-0 h-auto hover:bg-transparent">See All <ChevronRight className="ml-1 size-4" /></Button>
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
                  <p className="font-bold text-foreground text-[15px]">{u?.["username"] || "Member"}</p>
                  <div className={`px-3 py-[2px] rounded-full text-[11px] font-medium ${isOwnerRole ? 'bg-[#d1fae5] text-emerald-700' : 'bg-[#eff3ff] text-[#4f649a]'}`}>
                    {member.role === "owner" ? "Owner" : "Member"}
                  </div>
                </Link>
              );
            })}

            {(family.pendingMemberIds as string[] || []).map(userId => {
              const u = usersInfo.find(ui => ui["uid"] === userId);
              return (
                <div key={userId} className="flex flex-col items-center flex-shrink-0 gap-1.5 opacity-60 grayscale-[0.5]">
                  <div className="rounded-full p-[3px] border-2 border-dashed border-muted-foreground/30">
                    <Avatar name={u?.["username"] || "User"} photoURL={u?.["photoURL"]} size={68} />
                  </div>
                  <p className="font-bold text-muted-foreground text-[15px]">{u?.["username"] || "Member"}</p>
                  <div className="px-3 py-[2px] rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                    Pending
                  </div>
                </div>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Family Expenses</h2>
              <div className="md:hidden">
                {/* Mobile spacing adjustment if needed */}
              </div>
              <div className="hidden md:block">
                <AddFamilyExpenseDialog 
                  familyId={familyId} 
                  customTrigger={
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white ml-4">
                      <Plus className="mr-1.5 size-4" /> Add Expense
                    </Button>
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-card border-border">
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
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-8 h-9 bg-card border-border" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-xl border border-border shadow-sm">
                <p className="text-muted-foreground">No expenses found.</p>
              </div>
            ) : (
              filteredExpenses.map((exp) => {
                const meta = categoryMeta(exp.category);
                const u = usersInfo.find(ui => ui["uid"] === exp.addedBy);
                return (
                  <FamilyExpenseDetailsDialog key={exp.id} expense={exp} username={u?.["username"] || "Member"}>
                    <div className="flex items-center justify-between p-4 bg-card rounded-xl shadow-sm border border-border hover:border-emerald-200 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted border border-border group-hover:bg-emerald-50">
                          <meta.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{exp.title}</p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {exp.category} • {formatDisplayDate(exp.date)}
                          </p>
                          <p className="text-[11px] font-medium text-emerald-600 mt-0.5">
                            Added by {u?.["username"] || "Member"}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold sm:font-bold text-foreground text-right">{formatINR(exp.amount)}</p>
                    </div>
                  </FamilyExpenseDetailsDialog>
                );
              })
            )}
          </div>
        </div>

      </div>
      
      {/* Floating Add Family Expense Button (Mobile) */}
      <div className="fixed right-5 bottom-28 z-50 md:hidden pointer-events-auto">
        <AddFamilyExpenseDialog 
          familyId={familyId} 
          customTrigger={
            <button className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform active:scale-95 hover:bg-emerald-700">
              <Plus className="size-6" />
            </button>
          } 
        />
      </div>
      
      {/* Desktop Add Family Expense Button (Added to header) */}
    </AppShell>
  );
}
