import {
  Apple,
  Banknote,
  BookOpen,
  Bus,
  Clapperboard,
  CreditCard,
  Home,
  Lightbulb,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type Expense = {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description?: string;
  imageUrl?: string | null;
  isBudgetExpense?: boolean;
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
};

export type Budget = {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  budget: number;
};

export type Family = {
  id: string;
  familyName: string;
  ownerId: string;
  memberIds: string[]; // For easy querying
  pendingMemberIds?: string[];
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
};

export type FamilyMember = {
  id: string; // Same as userId
  userId: string;
  role: "owner" | "member";
  status: "active" | "pending" | "rejected";
  joinedAt?: { seconds: number } | null;
};

export type FamilyBudget = {
  id: string;
  familyId: string;
  userId: string;
  month: string;
  budget: number;
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
};

export type FamilyInvitation = {
  id: string;
  familyId: string;
  familyName: string;
  invitedUserId: string;
  invitedBy: string;
  status: "pending" | "accepted" | "declined";
  createdAt?: { seconds: number } | null;
};

export type FamilyExpense = {
  id: string;
  familyId: string;
  addedBy: string; // userId of creator
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  imageUrl?: string | null;
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
};

export const CATEGORIES = [
  { name: "Food", icon: Apple, color: "var(--chart-1)" },
  { name: "Groceries", icon: ShoppingCart, color: "var(--chart-2)" },
  { name: "Travel", icon: Bus, color: "var(--chart-3)" },
  { name: "Shopping", icon: ShoppingBag, color: "var(--chart-4)" },
  { name: "Bills", icon: Banknote, color: "var(--chart-5)" },
  { name: "Healthcare", icon: Stethoscope, color: "var(--chart-6)" },
  { name: "Education", icon: BookOpen, color: "var(--chart-2)" },
  { name: "Entertainment", icon: Clapperboard, color: "var(--chart-4)" },
  { name: "Home", icon: Home, color: "var(--chart-1)" },
  { name: "EMI", icon: CreditCard, color: "var(--chart-5)" },
  { name: "Utilities", icon: Lightbulb, color: "var(--chart-3)" },
  { name: "Other", icon: Wallet, color: "var(--chart-6)" },
] as const;

export const CATEGORY_NAMES = [
  "Other",
  ...CATEGORIES.map((c) => c.name).filter((name) => name !== "Other"),
];

export function categoryMeta(name: string): { icon: LucideIcon; color: string } {
  const found = CATEGORIES.find((c) => c.name === name);
  return { icon: found?.icon ?? Wallet, color: found?.color ?? "var(--chart-6)" };
}

export function formatINR(value: number, compact = false) {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: compact && Math.abs(safe) >= 1000 ? 1 : 0,
    notation: compact && Math.abs(safe) >= 100000 ? "compact" : "standard",
  }).format(safe);
}

export function todayISO() {
  const now = new Date();
  return toISODate(now);
}

export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

export function monthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysInMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y!, m!, 0).getDate();
}

export function pastDaysRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { from: toISODate(start), to: toISODate(end) };
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function sumAmount(expenses: Expense[]) {
  return expenses.reduce((total, e) => total + (Number(e.amount) || 0), 0);
}

export function inMonth(expense: Expense, monthKey: string) {
  return expense.date?.slice(0, 7) === monthKey;
}

export function inRange(expense: Expense, from: string, to: string) {
  return expense.date >= from && expense.date <= to;
}

export function categoryTotals(expenses: Expense[]) {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) ?? 0) + (Number(e.amount) || 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value, color: categoryMeta(name).color }))
    .sort((a, b) => b.value - a.value);
}

export function dailyTotals(expenses: Expense[], monthKey: string) {
  const total = daysInMonth(monthKey);
  const buckets = Array.from({ length: total }, (_, i) => ({
    day: String(i + 1),
    amount: 0,
  }));
  for (const e of expenses) {
    const day = Number(e.date.slice(8, 10));
    if (day >= 1 && day <= total) buckets[day - 1]!.amount += Number(e.amount) || 0;
  }
  return buckets;
}

export function budgetStatus(spent: number, budget: number) {
  if (!budget || budget <= 0) {
    return { percent: 0, remaining: 0, over: 0, state: "unset" as const };
  }
  const percent = (spent / budget) * 100;
  const remaining = Math.max(budget - spent, 0);
  const over = Math.max(spent - budget, 0);
  const state =
    over > 0 ? ("exceeded" as const) : percent >= 80 ? ("near" as const) : ("normal" as const);
  return { percent, remaining, over, state };
}

export function monthOptions(count = 24) {
  const out: string[] = [];
  const now = new Date();
  
  // Include 3 future months so users can plan their budgets ahead
  for (let i = -3; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    
    // Stop generating if the date is before September 2026
    if (d.getFullYear() < 2026 || (d.getFullYear() === 2026 && d.getMonth() < 8)) {
      continue; // or break, but continue is safer if count is large
    }
    
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
