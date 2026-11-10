import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { type Expense } from "./expense-utils";
import {
  generateCategoryDoughnutChart,
  generateIncomeVsExpensesBarChart,
  generateDailySpendingChart,
  generateBudgetProgressChart,
} from "./pdf-charts";

export interface MonthlyReportData {
  userName: string;
  userEmail: string;
  monthKey: string; // e.g. "2026-11"
  monthLabel: string; // e.g. "November 2026"
  startDate: string; // e.g. "2026-11-01"
  endDate: string; // e.g. "2026-11-10"
  statusLabel: string; // e.g. "Current Month – Partial Report" | "Completed Month"
  cutoffDay: number;
  totalDaysInMonth: number;
  income: number;
  budget: number;
  budgetSpent: number; // Authoritative budget spending matching the Budget page
  spent: number; // Total monthly outgoings
  expenses: Expense[];
  previousMonthData?: {
    monthKey: string;
    monthLabel: string;
    income: number;
    spent: number;
  } | null;
  familyData?: {
    familyName: string;
    familyBudget: number;
    familySpent: number;
    userContribution: number;
  } | null;
}

function formatPDFINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const isNegative = safe < 0;
  const abs = Math.abs(safe);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${isNegative ? "-" : ""}INR ${formatted}`;
}

function formatCompactPDFINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const isNegative = safe < 0;
  const abs = Math.abs(safe);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return `${isNegative ? "-" : ""}INR ${formatted}`;
}

function formatDateDisplay(isoDate?: string): string {
  if (!isoDate) return "—";
  const parts = isoDate.split("-").map(Number);
  if (parts.length >= 3) {
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return isoDate;
}

function getLogoDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/logo.png";
  });
}

export async function generateMonthlyPDFReport(data: MonthlyReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Refined Fintech Brand Palette
  const deepEmerald: [number, number, number] = [6, 78, 59]; // #064e3b
  const accentMint: [number, number, number] = [16, 185, 129]; // #10b981
  const textDark: [number, number, number] = [15, 23, 42]; // #0f172a
  const textMuted: [number, number, number] = [100, 116, 139]; // #64748b
  const borderSubtle: [number, number, number] = [226, 232, 240]; // #e2e8f0
  const roseAccent: [number, number, number] = [225, 29, 72]; // #e11d48

  // Safe unique reference number
  const reportRef = `DP-REP-${data.monthKey}-${Date.now().toString().slice(-4)}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Financial Calculations strictly for reporting period
  const netSavings = data.income - data.spent;
  const isSurplus = netSavings >= 0;
  const savingsRate = data.income > 0 ? ((netSavings / data.income) * 100).toFixed(1) : "0.0";
  const budgetConfigured = data.budget > 0;
  const budgetRemaining = budgetConfigured ? Math.max(0, data.budget - data.budgetSpent) : 0;
  const budgetUtilization = budgetConfigured ? ((data.budgetSpent / data.budget) * 100).toFixed(1) : "0.0";
  const isBudgetExceeded = budgetConfigured && data.budgetSpent > data.budget;

  // Daily average over active reporting days
  const activeDays = Math.max(data.cutoffDay, 1);
  const dailyAverage = data.spent > 0 ? (data.spent / activeDays).toFixed(2) : "0.00";
  const totalExpenseCount = data.expenses.length;
  const avgTransaction = totalExpenseCount > 0 ? (data.spent / totalExpenseCount).toFixed(2) : "0.00";

  // Category breakdown
  const categoryMap: Record<string, { total: number; count: number }> = {};
  data.expenses.forEach((e) => {
    const cat = e.category || "Other";
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += Math.abs(e.amount);
    categoryMap[cat].count += 1;
  });
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total);
  const highestCategory = categoryEntries.length > 0 ? categoryEntries[0] : null;

  // Highest single expense
  const sortedExpenses = [...data.expenses].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const highestExpense = sortedExpenses.length > 0 ? sortedExpenses[0] : null;

  // Daily map for trend chart
  const dailyMap: Record<number, number> = {};
  data.expenses.forEach((e) => {
    if (e.date && e.date.length >= 10) {
      const dayNum = parseInt(e.date.slice(8, 10), 10);
      dailyMap[dayNum] = (dailyMap[dayNum] || 0) + Math.abs(e.amount);
    }
  });

  // Payment channels
  const paymentMethodMap: Record<string, { total: number; count: number }> = {};
  data.expenses.forEach((e) => {
    const method = e.paymentMethod || e.paymentType || "UPI";
    if (!paymentMethodMap[method]) paymentMethodMap[method] = { total: 0, count: 0 };
    paymentMethodMap[method].total += Math.abs(e.amount);
    paymentMethodMap[method].count += 1;
  });
  const paymentMethodEntries = Object.entries(paymentMethodMap).sort((a, b) => b[1].total - a[1].total);

  // =========================================================================
  // PAGE 1: COVER & EXECUTIVE FINANCIAL SUMMARY
  // =========================================================================

  // Top Accent Header Bar
  doc.setFillColor(...deepEmerald);
  doc.rect(0, 0, pageWidth, 5, "F");

  // Logo & Company Brand
  const logoData = await getLogoDataUrl();
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin, 12, 18, 18);
    } catch {}
  }

  const brandTextX = logoData ? margin + 22 : margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...deepEmerald);
  doc.text("Dream Pocket", brandTextX, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text("Personal Wealth & Financial Management", brandTextX, 25);

  // Document Title (Right Aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...textDark);
  doc.text("MONTHLY FINANCIAL STATEMENT", pageWidth - margin, 19, { align: "right" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentMint);
  doc.text(data.statusLabel.toUpperCase(), pageWidth - margin, 25, { align: "right" });

  // Thin Divider Rule
  doc.setDrawColor(...borderSubtle);
  doc.setLineWidth(0.4);
  doc.line(margin, 34, pageWidth - margin, 34);

  // -------------------------------------------------------------------------
  // 1. Account & Statement Information (Spacious Two-Column Grid - Zero Overlap)
  // -------------------------------------------------------------------------
  let y = 40;
  const halfColWidth = (contentWidth - 10) / 2;

  // Box Container
  doc.setFillColor(250, 252, 251);
  doc.setDrawColor(...borderSubtle);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, "FD");

  // Left Column: Account Details
  const col1X = margin + 6;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textMuted);
  doc.text("ACCOUNT HOLDER DETAILS", col1X, y + 6.5);

  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text(data.userName || "Dream Pocket User", col1X, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(`Email: ${data.userEmail || "—"}`, col1X, y + 19);
  doc.text("Currency: INR (₹) • Base Accounting Currency", col1X, y + 25);
  doc.text("Verification: Verified Application Record", col1X, y + 30);

  // Vertical Divider inside Info Box
  doc.setDrawColor(...borderSubtle);
  doc.line(margin + halfColWidth + 2, y + 4, margin + halfColWidth + 2, y + 30);

  // Right Column: Statement Period & Metadata
  const col2X = margin + halfColWidth + 8;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textMuted);
  doc.text("STATEMENT AUDIT SPECIFICATIONS", col2X, y + 6.5);

  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text(
    `Period: ${formatDateDisplay(data.startDate)} – ${formatDateDisplay(data.endDate)}`,
    col2X,
    y + 13
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(`Statement Cycle: ${data.monthLabel}`, col2X, y + 19);
  doc.text(`Reference ID: ${reportRef}`, col2X, y + 25);
  doc.text(`Generated At: ${genTimestamp}`, col2X, y + 30);

  // -------------------------------------------------------------------------
  // 2. Executive Financial Summary (Structured Banking Table)
  // -------------------------------------------------------------------------
  y += 42;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("1. Executive Financial Summary", margin, y);

  y += 4;
  const execTableData = [
    [
      "Total Monthly Inflow (Income)",
      formatPDFINR(data.income),
      data.income > 0 ? "Credited for period" : "No credit recorded",
    ],
    [
      "Total Monthly Outflow (Expenses)",
      formatPDFINR(data.spent),
      `${totalExpenseCount} verified transaction(s)`,
    ],
    [
      isSurplus ? "Net Financial Surplus (Savings)" : "Net Financial Deficit",
      formatPDFINR(netSavings),
      `Savings Rate: ${savingsRate}% of inflow`,
    ],
    [
      "Monthly Budget Utilization",
      budgetConfigured ? `${budgetUtilization}%` : "Not Configured",
      budgetConfigured
        ? isBudgetExceeded
          ? `Exceeded by ${formatPDFINR(data.budgetSpent - data.budget)}`
          : `${formatPDFINR(budgetRemaining)} remaining`
        : "No spending ceiling set",
    ],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["FINANCIAL METRIC", "RECORDED VALUE", "PERIOD RECONCILIATION"]],
    body: execTableData,
    theme: "plain",
    headStyles: {
      fillColor: deepEmerald,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textDark,
      cellPadding: 2.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: "bold" },
      1: { cellWidth: 50, fontStyle: "bold" },
      2: { cellWidth: 60, textColor: textMuted },
    },
  });

  let afterExecY = (doc as any).lastAutoTable.finalY + 8;

  // -------------------------------------------------------------------------
  // 3. Inflow vs Outflow Visual Chart
  // -------------------------------------------------------------------------
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("Cashflow Comparison: Inflow vs Outflow vs Net Position", margin, afterExecY);

  afterExecY += 4;
  const barChartImg = generateIncomeVsExpensesBarChart(data.income, data.spent, netSavings);
  if (barChartImg) {
    try {
      doc.addImage(barChartImg, "PNG", margin, afterExecY, contentWidth, 54);
    } catch {}
  }

  // =========================================================================
  // PAGE 2: EXPENSE ANALYSIS & CHARTS
  // =========================================================================
  doc.addPage();

  let p2Y = 22;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("2. Detailed Expense & Category Distribution", margin, p2Y);

  p2Y += 5;

  // Doughnut Chart & Category Table Side by Side (or Stacked)
  const doughnutImg = generateCategoryDoughnutChart(
    categoryEntries.map(([name, stats]) => ({ name, amount: stats.total })),
    data.spent
  );

  if (doughnutImg && data.spent > 0) {
    try {
      doc.addImage(doughnutImg, "PNG", margin + 10, p2Y, 65, 65);
    } catch {}
  }

  // Category breakdown table positioned beside/below chart
  const categoryTableData = categoryEntries.map(([catName, stats], idx) => {
    const share = data.spent > 0 ? ((stats.total / data.spent) * 100).toFixed(1) : "0.0";
    return [
      (idx + 1).toString(),
      catName,
      stats.count.toString(),
      formatPDFINR(stats.total),
      `${share}%`,
    ];
  });

  if (categoryTableData.length === 0) {
    categoryTableData.push(["—", "No categorized expenses recorded", "0", "INR 0.00", "0.0%"]);
  }

  const tableStartY = doughnutImg && data.spent > 0 ? p2Y : p2Y;
  const tableMarginLeft = doughnutImg && data.spent > 0 ? margin + 82 : margin;
  const tableWidth = doughnutImg && data.spent > 0 ? contentWidth - 82 : contentWidth;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: tableMarginLeft, right: margin },
    head: [["#", "CATEGORY", "TXNS", "AMOUNT", "% SHARE"]],
    body: categoryTableData.slice(0, 7),
    theme: "striped",
    headStyles: {
      fillColor: deepEmerald,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textDark,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 32, fontStyle: "bold" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 18, halign: "right" },
    },
  });

  let p2AfterCatY = Math.max((doc as any).lastAutoTable.finalY, p2Y + 68) + 8;

  // Daily Spending Trend Chart
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text(
    `Daily Spending Pattern (Days 1 through ${data.cutoffDay} of ${data.monthLabel})`,
    margin,
    p2AfterCatY
  );

  p2AfterCatY += 4;
  const dailyChartImg = generateDailySpendingChart(dailyMap, data.cutoffDay, data.totalDaysInMonth);
  if (dailyChartImg) {
    try {
      doc.addImage(dailyChartImg, "PNG", margin, p2AfterCatY, contentWidth, 50);
    } catch {}
  }

  p2AfterCatY += 56;

  // Payment Channels Breakdown Table
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("Payment Channels & Disbursement Channels", margin, p2AfterCatY);

  p2AfterCatY += 4;
  const payRows = paymentMethodEntries.map(([method, stats], idx) => {
    const share = data.spent > 0 ? ((stats.total / data.spent) * 100).toFixed(1) : "0.0";
    return [
      (idx + 1).toString(),
      method.toUpperCase(),
      stats.count.toString(),
      formatPDFINR(stats.total),
      `${share}%`,
    ];
  });

  if (payRows.length === 0) {
    payRows.push(["—", "No payment methods recorded", "0", "INR 0.00", "0.0%"]);
  }

  autoTable(doc, {
    startY: p2AfterCatY,
    margin: { left: margin, right: margin },
    head: [["#", "PAYMENT METHOD", "TRANSACTION COUNT", "TOTAL AMOUNT", "% OF OUTFLOW"]],
    body: payRows,
    theme: "striped",
    headStyles: {
      fillColor: deepEmerald,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textDark,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 60, fontStyle: "bold" },
      2: { cellWidth: 35, halign: "center" },
      3: { cellWidth: 45, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 30, halign: "right" },
    },
  });

  // =========================================================================
  // PAGE 3: BUDGET PERFORMANCE & FAMILY ACTIVITY
  // =========================================================================
  doc.addPage();

  let p3Y = 22;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("3. Monthly Budget Performance & Ceiling Analysis", margin, p3Y);

  p3Y += 5;

  if (budgetConfigured) {
    const budgetTableRows = [
      ["Configured Monthly Budget Allocation", formatPDFINR(data.budget), "Authoritative Monthly Target"],
      ["Actual Spending Tracked Against Budget", formatPDFINR(data.budgetSpent), `${budgetUtilization}% Allocation Utilised`],
      [
        isBudgetExceeded ? "Budget Overspend (Excess Debit)" : "Remaining Unspent Budget",
        formatPDFINR(isBudgetExceeded ? data.budgetSpent - data.budget : budgetRemaining),
        isBudgetExceeded ? "Warning: Target Exceeded" : "Healthy: Within Target Limits",
      ],
    ];

    autoTable(doc, {
      startY: p3Y,
      margin: { left: margin, right: margin },
      head: [["BUDGET METRIC", "FINANCIAL FIGURE", "AUDIT STATUS"]],
      body: budgetTableRows,
      theme: "plain",
      headStyles: {
        fillColor: deepEmerald,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: textDark,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: "bold" },
        1: { cellWidth: 45, fontStyle: "bold" },
        2: { cellWidth: 55, textColor: textMuted },
      },
    });

    let afterBudgetY = (doc as any).lastAutoTable.finalY + 6;

    // Visual Budget Bar Chart
    const budgetChartImg = generateBudgetProgressChart(data.budget, data.budgetSpent, budgetRemaining);
    if (budgetChartImg) {
      try {
        doc.addImage(budgetChartImg, "PNG", margin, afterBudgetY, contentWidth, 32);
      } catch {}
    }

    p3Y = afterBudgetY + 38;
  } else {
    // Unconfigured Budget Notice
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...borderSubtle);
    doc.roundedRect(margin, p3Y, contentWidth, 18, 2, 2, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text("No monthly budget configured for this period.", margin + 6, p3Y + 7);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(
      "To track expenditure thresholds and receive real-time utilisation analytics, configure a monthly budget target in the Budget section.",
      margin + 6,
      p3Y + 13
    );

    p3Y += 26;
  }

  // Family Financial Activity Section
  p3Y += 6;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("4. Family Financial Activity", margin, p3Y);

  p3Y += 5;

  const hasActiveFamily =
    data.familyData &&
    data.familyData.familyName &&
    (data.familyData.familySpent > 0 ||
      data.familyData.userContribution > 0 ||
      data.familyData.familyBudget > 0);

  if (hasActiveFamily && data.familyData) {
    const fData = data.familyData;
    const userPartPct =
      fData.familySpent > 0 ? ((fData.userContribution / fData.familySpent) * 100).toFixed(1) : "0.0";

    const familyTableRows = [
      ["Registered Family Household", fData.familyName || "Dream Pocket Family"],
      ["Combined Household Budget Allocation", formatPDFINR(fData.familyBudget)],
      ["Total Combined Household Outflow", formatPDFINR(fData.familySpent)],
      ["Your Recorded Contribution", `${formatPDFINR(fData.userContribution)} (${userPartPct}% of total)`],
    ];

    autoTable(doc, {
      startY: p3Y,
      margin: { left: margin, right: margin },
      head: [["HOUSEHOLD PARAMETER", "VERIFIED METRIC"]],
      body: familyTableRows,
      theme: "plain",
      headStyles: {
        fillColor: deepEmerald,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: textDark,
        cellPadding: 2.8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 90, fontStyle: "bold" },
        1: { cellWidth: 90 },
      },
    });

    p3Y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    // Professional fallback message (NO "undefined")
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...borderSubtle);
    doc.roundedRect(margin, p3Y, contentWidth, 18, 2, 2, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text("Family financial tracking is not enabled for this account.", margin + 6, p3Y + 7);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(
      "This account operates in personal mode. Shared household budgets, shared expense tracking and member contributions are available in Family Budget.",
      margin + 6,
      p3Y + 13
    );

    p3Y += 26;
  }

  // -------------------------------------------------------------------------
  // Objective Data-Driven Financial Insights
  // -------------------------------------------------------------------------
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("5. Data-Driven Financial Observations", margin, p3Y);

  p3Y += 5;
  const insights: string[] = [];

  if (data.previousMonthData && data.previousMonthData.spent > 0) {
    const diff = (((data.spent - data.previousMonthData.spent) / data.previousMonthData.spent) * 100).toFixed(1);
    const isUp = Number(diff) > 0;
    insights.push(
      `Expenditure ${isUp ? "increased" : "decreased"} by ${Math.abs(Number(diff))}% compared with ${data.previousMonthData.monthLabel} (${formatPDFINR(data.spent)} vs ${formatPDFINR(data.previousMonthData.spent)}).`
    );
  } else {
    insights.push(`Baseline observation: Initial activity registered for this financial cycle.`);
  }

  if (highestCategory && data.spent > 0) {
    const share = ((highestCategory[1].total / data.spent) * 100).toFixed(1);
    insights.push(
      `Primary spending was concentrated in '${highestCategory[0]}', representing ${share}% of all monthly debits (${formatPDFINR(highestCategory[1].total)}).`
    );
  }

  if (data.spent > 0) {
    insights.push(
      `Average daily expenditure was INR ${dailyAverage}/day across the ${activeDays} elapsed reporting days.`
    );
  }

  if (highestExpense) {
    insights.push(
      `Peak individual transaction was '${highestExpense.title}' for ${formatPDFINR(highestExpense.amount)} on ${formatDateDisplay(highestExpense.date)}.`
    );
  }

  if (budgetConfigured) {
    insights.push(
      isBudgetExceeded
        ? `Monthly spending limit of ${formatPDFINR(data.budget)} was exceeded by ${formatPDFINR(data.budgetSpent - data.budget)} (${budgetUtilization}% utilisation rate).`
        : `Spending remained within planned limits with ${formatPDFINR(budgetRemaining)} remaining unspent (${budgetUtilization}% utilisation rate).`
    );
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderSubtle);
  const cardHeight = Math.max(26, insights.length * 6.5 + 6);
  doc.roundedRect(margin, p3Y, contentWidth, cardHeight, 2, 2, "FD");

  let inY = p3Y + 5.5;
  insights.forEach((item) => {
    doc.setFillColor(...deepEmerald);
    doc.circle(margin + 5, inY - 1, 0.9, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textDark);
    const splitText = doc.splitTextToSize(item, contentWidth - 14);
    doc.text(splitText, margin + 9, inY);
    inY += splitText.length * 4 + 2;
  });

  // =========================================================================
  // PAGE 4+: ITEMIZED TRANSACTION HISTORY APPENDIX
  // =========================================================================
  doc.addPage();

  let ledgerY = 22;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("6. Itemized Transaction History Appendix", margin, ledgerY);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text(
    `Chronological record of transactions registered between ${formatDateDisplay(data.startDate)} and ${formatDateDisplay(data.endDate)} (${totalExpenseCount} total entries).`,
    margin,
    ledgerY + 5
  );

  ledgerY += 9;

  // Filter and sort transactions strictly within reporting date bounds
  const ledgerExpenses = [...data.expenses]
    .filter((e) => e.date >= data.startDate && e.date <= data.endDate)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const ledgerTableRows = ledgerExpenses.map((exp, idx) => {
    const titleText = exp.title.length > 28 ? exp.title.slice(0, 26) + "…" : exp.title;
    const notesText = exp.description
      ? exp.description.length > 30
        ? exp.description.slice(0, 28) + "…"
        : exp.description
      : "—";
    const hasReceipt = exp.imageUrl ? "Yes" : "—";

    return [
      (idx + 1).toString(),
      formatDateDisplay(exp.date),
      titleText,
      exp.category || "Other",
      exp.paymentMethod || exp.paymentType || "UPI",
      hasReceipt,
      notesText,
      formatPDFINR(exp.amount),
    ];
  });

  if (ledgerTableRows.length === 0) {
    ledgerTableRows.push(["—", "—", "No transactions recorded for this period", "—", "—", "—", "—", "INR 0.00"]);
  }

  autoTable(doc, {
    startY: ledgerY,
    margin: { left: margin, right: margin, bottom: 25 },
    head: [["#", "DATE", "DESCRIPTION", "CATEGORY", "METHOD", "RECEIPT", "NOTES", "AMOUNT"]],
    body: ledgerTableRows,
    showHead: "everyPage",
    theme: "striped",
    headStyles: {
      fillColor: deepEmerald,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: textDark,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 42, fontStyle: "bold" },
      3: { cellWidth: 26 },
      4: { cellWidth: 22 },
      5: { cellWidth: 14, halign: "center" },
      6: { cellWidth: 24 },
      7: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
  });

  // =========================================================================
  // SECOND PASS: RUNNING HEADERS, FOOTERS & MANDATORY DISCLAIMER
  // =========================================================================
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    if (p === 1) {
      // Cover footer
      doc.setFontSize(7.5);
      doc.setTextColor(...textMuted);
      doc.text(
        `Dream Pocket Personal Finance Engine • Confidential Personal Record • Page 1 of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    } else {
      // Running Top Header
      doc.setFillColor(250, 252, 251);
      doc.rect(0, 0, pageWidth, 11, "F");
      doc.setDrawColor(...borderSubtle);
      doc.setLineWidth(0.3);
      doc.line(0, 11, pageWidth, 11);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...deepEmerald);
      doc.text("Dream Pocket", margin, 7.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textMuted);
      doc.text(`Monthly Financial Statement • ${data.monthLabel}`, margin + 25, 7.5);
      doc.text(reportRef, pageWidth - margin, 7.5, { align: "right" });

      // Running Bottom Footer
      doc.setFontSize(7);
      doc.setTextColor(...textMuted);
      doc.text("Dream Pocket • Personal Financial Statement & Record", margin, pageHeight - 8);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  }

  // Verbatim Legal Disclaimer on Final Page
  doc.setPage(totalPages);

  const disclaimerY = pageHeight - 24;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderSubtle);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, disclaimerY - 4, contentWidth, 14, 1.5, 1.5, "FD");

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...deepEmerald);
  doc.text("LEGAL DISCLAIMER & COMPLIANCE NOTICE", margin + 3, disclaimerY - 1);

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  const verbatimDisclaimer =
    "This report is automatically generated from the financial information recorded in Dream Pocket for the selected reporting period. Figures are based on the transactions and budget information available at the time of generation. The report is intended for personal financial reference and record-keeping. It is not an audited financial statement, bank statement, tax certificate, or professional financial advice.";
  const splitDisclaimer = doc.splitTextToSize(verbatimDisclaimer, contentWidth - 6);
  doc.text(splitDisclaimer, margin + 3, disclaimerY + 2.5);

  // Save the PDF
  doc.save(`DreamPocket_${data.monthKey}_Statement.pdf`);
}
