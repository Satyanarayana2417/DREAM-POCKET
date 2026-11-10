// Client-side high-resolution chart generators for jsPDF statements

const PALETTE = [
  "#059669", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#64748b", // Slate
];

function formatNumberShort(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString("en-IN");
}

export function generateCategoryDoughnutChart(
  categories: { name: string; amount: number }[],
  total: number
): string | null {
  if (typeof document === "undefined" || total <= 0 || categories.length === 0) return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, 600, 600);

    const centerX = 300;
    const centerY = 300;
    const outerRadius = 240;
    const innerRadius = 150;

    let currentAngle = -Math.PI / 2;

    categories.forEach((cat, idx) => {
      const sliceAngle = (cat.amount / total) * (2 * Math.PI);
      const endAngle = currentAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, currentAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, currentAngle, true);
      ctx.closePath();

      ctx.fillStyle = PALETTE[idx % PALETTE.length];
      ctx.fill();

      // Border between slices
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      currentAngle = endAngle;
    });

    // Center Text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica";
    ctx.fillStyle = "#64748b";
    ctx.fillText("TOTAL EXPENSES", centerX, centerY - 24);

    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(`INR ${total.toLocaleString("en-IN")}`, centerX, centerY + 18);

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Doughnut chart generation failed", err);
    return null;
  }
}

export function generateIncomeVsExpensesBarChart(
  income: number,
  expenses: number,
  savings: number
): string | null {
  if (typeof document === "undefined") return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, 800, 360);

    const maxVal = Math.max(income, expenses, Math.abs(savings), 1000);
    const chartHeight = 220;
    const baselineY = 270;

    const data = [
      { label: "Total Income", value: income, color: "#059669" },
      { label: "Total Outflow", value: expenses, color: "#e11d48" },
      {
        label: savings >= 0 ? "Net Surplus" : "Net Deficit",
        value: Math.abs(savings),
        color: savings >= 0 ? "#2563eb" : "#dc2626",
      },
    ];

    // Gridlines
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = baselineY - (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(70, y);
      ctx.lineTo(750, y);
      ctx.stroke();

      // Axis labels
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "right";
      const val = Math.round((maxVal / 4) * i);
      ctx.fillText(formatNumberShort(val), 60, y + 4);
    }

    // Baseline
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, baselineY);
    ctx.lineTo(750, baselineY);
    ctx.stroke();

    // Bars
    const barWidth = 90;
    const spacing = 220;
    const startX = 140;

    data.forEach((item, idx) => {
      const x = startX + idx * spacing;
      const height = (item.value / maxVal) * chartHeight;
      const y = baselineY - height;

      // Bar with rounded top
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, height, [8, 8, 0, 0]);
      ctx.fill();

      // Value label on top of bar
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = item.color;
      ctx.textAlign = "center";
      ctx.fillText(`INR ${formatNumberShort(item.value)}`, x + barWidth / 2, y - 10);

      // Category label below axis
      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText(item.label, x + barWidth / 2, baselineY + 28);
    });

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Income vs Expenses chart generation failed", err);
    return null;
  }
}

export function generateDailySpendingChart(
  dailyMap: Record<number, number>,
  cutoffDay: number,
  daysInMonth: number
): string | null {
  if (typeof document === "undefined") return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, 900, 320);

    const values = [];
    for (let d = 1; d <= cutoffDay; d++) {
      values.push(dailyMap[d] || 0);
    }

    const maxVal = Math.max(...values, 500);
    const chartHeight = 180;
    const baselineY = 250;
    const startX = 60;
    const chartWidth = 800;
    const step = chartWidth / (cutoffDay > 1 ? cutoffDay - 1 : 1);

    // Gridlines
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = baselineY - (chartHeight / 3) * i;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + chartWidth, y);
      ctx.stroke();

      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "right";
      const val = Math.round((maxVal / 3) * i);
      ctx.fillText(formatNumberShort(val), startX - 10, y + 4);
    }

    // Baseline
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startX, baselineY);
    ctx.lineTo(startX + chartWidth, baselineY);
    ctx.stroke();

    if (cutoffDay === 1) {
      // Single day bar
      const barH = (values[0] / maxVal) * chartHeight;
      ctx.fillStyle = "#059669";
      ctx.fillRect(startX + chartWidth / 2 - 20, baselineY - barH, 40, barH);
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Day 1", startX + chartWidth / 2, baselineY + 24);
      return canvas.toDataURL("image/png");
    }

    // Area fill
    ctx.beginPath();
    ctx.moveTo(startX, baselineY);
    for (let i = 0; i < cutoffDay; i++) {
      const x = startX + i * step;
      const y = baselineY - (values[i] / maxVal) * chartHeight;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(startX + (cutoffDay - 1) * step, baselineY);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baselineY - chartHeight, 0, baselineY);
    grad.addColorStop(0, "rgba(5, 150, 105, 0.35)");
    grad.addColorStop(1, "rgba(5, 150, 105, 0.02)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    for (let i = 0; i < cutoffDay; i++) {
      const x = startX + i * step;
      const y = baselineY - (values[i] / maxVal) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Data points & X labels
    for (let i = 0; i < cutoffDay; i++) {
      const dayNum = i + 1;
      const x = startX + i * step;
      const y = baselineY - (values[i] / maxVal) * chartHeight;

      if (values[i] > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Show dates periodically so labels don't collide
      const interval = cutoffDay > 20 ? 4 : cutoffDay > 10 ? 2 : 1;
      if (i % interval === 0 || i === cutoffDay - 1) {
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.fillText(`Day ${dayNum}`, x, baselineY + 22);
      }
    }

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Daily spending chart generation failed", err);
    return null;
  }
}

export function generateBudgetProgressChart(
  allocated: number,
  spent: number,
  remaining: number
): string | null {
  if (typeof document === "undefined" || allocated <= 0) return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 140;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, 800, 140);

    const barX = 40;
    const barY = 30;
    const barW = 720;
    const barH = 34;

    const percent = Math.min((spent / allocated) * 100, 100);
    const isExceeded = spent > allocated;

    // Track
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();

    // Spent progress
    if (percent > 0) {
      const fillW = (barW * percent) / 100;
      ctx.fillStyle = isExceeded ? "#e11d48" : percent > 85 ? "#f59e0b" : "#059669";
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 8);
      ctx.fill();
    }

    // Labels
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#334155";
    ctx.textAlign = "left";
    ctx.fillText(`Allocated: INR ${allocated.toLocaleString("en-IN")}`, barX, barY + barH + 32);

    ctx.textAlign = "center";
    ctx.fillStyle = isExceeded ? "#e11d48" : "#059669";
    ctx.fillText(
      `Spent: INR ${spent.toLocaleString("en-IN")} (${((spent / allocated) * 100).toFixed(1)}%)`,
      barX + barW / 2,
      barY + barH + 32
    );

    ctx.textAlign = "right";
    ctx.fillStyle = isExceeded ? "#e11d48" : "#059669";
    ctx.fillText(
      isExceeded
        ? `Exceeded by INR ${(spent - allocated).toLocaleString("en-IN")}`
        : `Remaining: INR ${remaining.toLocaleString("en-IN")}`,
      barX + barW,
      barY + barH + 32
    );

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Budget chart generation failed", err);
    return null;
  }
}

