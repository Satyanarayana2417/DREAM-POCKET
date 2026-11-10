import { todayISO, daysInMonth, type Expense } from "./expense-utils";

export interface ReportDateRange {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "November 2026"
  startDate: string; // YYYY-MM-DD (e.g. "2026-11-01")
  endDate: string; // YYYY-MM-DD (e.g. "2026-11-10" for current month, or "2026-10-31" for past)
  isCurrentMonth: boolean;
  statusLabel: string; // "Current Month – Partial Report" | "Completed Month"
  cutoffDay: number;
  totalDaysInMonth: number;
}

// 1. Identify user's first successfully saved expense transaction date
export function getFirstExpenseDate(expenses: Expense[]): string | null {
  if (!expenses || expenses.length === 0) return null;

  const dates: string[] = [];

  expenses.forEach((e) => {
    if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      dates.push(e.date);
    } else if (e.createdAt?.seconds) {
      const d = new Date(e.createdAt.seconds * 1000);
      const iso = d.toISOString().slice(0, 10);
      dates.push(iso);
    }
  });

  if (dates.length === 0) return null;

  dates.sort((a, b) => a.localeCompare(b));
  return dates[0];
}

// 2. Generate eligible calendar months dynamically from first expense month to current real calendar month
export function getEligibleReportMonths(firstExpenseDate: string | null): string[] {
  const currentKey = todayISO().slice(0, 7); // e.g. "2026-11"

  if (!firstExpenseDate) {
    return []; // No expense history -> empty state
  }

  const startMonthKey = firstExpenseDate.slice(0, 7);

  const [startYear, startMonth] = startMonthKey.split("-").map(Number);
  const [curYear, curMonth] = currentKey.split("-").map(Number);

  // If earliest date is somehow in the future, only permit current month
  if (startYear > curYear || (startYear === curYear && startMonth > curMonth)) {
    return [currentKey];
  }

  const months: string[] = [];
  let y = curYear;
  let m = curMonth;

  // Generate backwards from current real month to first expense month
  while (y > startYear || (y === startYear && m >= startMonth)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }

  return months;
}

// 3. Calculate exact reporting boundaries for selected month
export function getReportDateRange(monthKey: string): ReportDateRange {
  const today = todayISO();
  const currentKey = today.slice(0, 7);
  const isCurrentMonth = monthKey === currentKey;
  const numDays = daysInMonth(monthKey);

  const startDate = `${monthKey}-01`;
  const endDate = isCurrentMonth
    ? today // For current month, report ends on today's real calendar date
    : `${monthKey}-${String(numDays).padStart(2, "0")}`; // For past month, full month

  const cutoffDay = isCurrentMonth ? parseInt(today.slice(8, 10), 10) : numDays;

  const [y, m] = monthKey.split("-").map(Number);
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return {
    monthKey,
    monthLabel: monthName,
    startDate,
    endDate,
    isCurrentMonth,
    statusLabel: isCurrentMonth ? "Current Month – Partial Report" : "Completed Month",
    cutoffDay,
    totalDaysInMonth: numDays,
  };
}

