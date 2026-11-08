import { type Expense, formatINR } from "./expense-utils";

/**
 * Generates or retrieves a receipt image File for sharing via Web Share API
 */
export async function getReceiptFileToShare(
  expense: Expense,
  dateTimeStr: string
): Promise<File> {
  // Case 1: Transaction has an uploaded receipt attachment
  if (expense.imageUrl) {
    try {
      const response = await fetch(expense.imageUrl, { mode: "cors" });
      if (response.ok) {
        const blob = await response.blob();
        const mimeType = blob.type || "image/jpeg";
        const ext = mimeType.includes("png") ? "png" : "jpg";
        return new File([blob], `DreamPocket_Receipt_${expense.id}.${ext}`, {
          type: mimeType,
        });
      }
    } catch (err) {
      console.warn("Failed to fetch original receipt blob, falling back to generated receipt", err);
    }
  }

  // Case 2: Transaction has no uploaded receipt attachment -> generate branded receipt
  return generateBrandedReceiptFile(expense, dateTimeStr);
}

/**
 * Creates a high-resolution, beautifully branded Dream Pocket receipt image
 */
export function generateBrandedReceiptFile(
  expense: Expense,
  dateTimeStr: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const width = 760;
      const height = 1060;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return reject(new Error("Unable to create canvas context"));
      }

      // Background paper
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Top Hero Emerald Gradient Banner
      const heroGrad = ctx.createLinearGradient(0, 0, width, 240);
      heroGrad.addColorStop(0, "#064e3b");
      heroGrad.addColorStop(0.6, "#043d2e");
      heroGrad.addColorStop(1, "#022c22");
      ctx.fillStyle = heroGrad;
      ctx.fillRect(0, 0, width, 240);

      // Curved bottom wave for hero
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, 215);
      ctx.bezierCurveTo(200, 255, 550, 195, width, 235);
      ctx.lineTo(width, 241);
      ctx.lineTo(0, 241);
      ctx.closePath();
      ctx.fill();

      // Dream Pocket Logo Circle & App Name
      // "dp" Circle
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(60, 55, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px 'Poppins', -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("dp", 60, 56);

      // App Title
      ctx.textAlign = "left";
      ctx.font = "bold 24px 'Poppins', -apple-system, sans-serif";
      ctx.fillText("Dream Pocket", 95, 56);

      // Tagline
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "14px 'Poppins', -apple-system, sans-serif";
      ctx.fillText("Official Transaction Receipt", 95, 82);

      // Status Pill on top right
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.roundRect(width - 170, 42, 120, 32, 16);
      ctx.fill();
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 13px 'Poppins', -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VERIFIED ✓", width - 110, 59);

      // Large Transaction Amount in Header
      const isIncome =
        (expense.category || "").toLowerCase() === "income" || expense.amount < 0;
      const amountSign = isIncome ? "+" : "-";
      const cleanTitle =
        expense.title.replace(/^(Paid to |Received from )/, "");

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "13px 'Poppins', -apple-system, sans-serif";
      ctx.fillText(isIncome ? "INCOME RECEIVED" : "EXPENSE PAYMENT", width / 2, 128);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px 'Poppins', -apple-system, sans-serif";
      ctx.fillText(
        `${amountSign} ₹${Math.abs(expense.amount).toLocaleString("en-IN")}`,
        width / 2,
        174
      );

      // Receipt Card Container
      ctx.fillStyle = "#fcfbf7";
      ctx.beginPath();
      ctx.roundRect(40, 270, width - 80, 640, 24);
      ctx.fill();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Receipt Title
      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 22px 'Poppins', -apple-system, sans-serif";
      ctx.fillText(cleanTitle, 70, 320);

      ctx.fillStyle = "#64748b";
      ctx.font = "14px 'Poppins', -apple-system, sans-serif";
      ctx.fillText("Transaction Details", 70, 345);

      // Divider line
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(70, 370);
      ctx.lineTo(width - 70, 370);
      ctx.stroke();

      // Details Rows
      const rows: [string, string][] = [
        ["Transaction ID", `DP-${(expense.id || "0000").slice(0, 10).toUpperCase()}`],
        ["Date & Time", dateTimeStr || "Today"],
        ["Category", expense.category || "General"],
        ["Payment Method", expense.paymentMethod || "UPI"],
        ["Transaction Type", isIncome ? "Income" : "Expense"],
        ["Notes", expense.description && expense.description.trim() ? expense.description.trim() : "No notes added"],
      ];

      let startY = 415;
      const rowGap = 52;

      rows.forEach(([label, value]) => {
        // Label
        ctx.fillStyle = "#64748b";
        ctx.font = "500 16px 'Poppins', -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(label, 70, startY);

        // Value
        ctx.fillStyle = "#0f172a";
        ctx.font = "600 16px 'Poppins', -apple-system, sans-serif";
        ctx.textAlign = "right";
        
        // Truncate long value if needed
        let printVal = value;
        if (ctx.measureText(printVal).width > 340) {
          while (ctx.measureText(printVal + "...").width > 340 && printVal.length > 5) {
            printVal = printVal.slice(0, -1);
          }
          printVal += "...";
        }
        ctx.fillText(printVal, width - 70, startY);

        // Subtle divider
        ctx.strokeStyle = "#f1f5f9";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(70, startY + 22);
        ctx.lineTo(width - 70, startY + 22);
        ctx.stroke();

        startY += rowGap;
      });

      // Total Amount Row at bottom of card
      ctx.fillStyle = "#eaf7f0";
      ctx.beginPath();
      ctx.roundRect(65, 760, width - 130, 70, 16);
      ctx.fill();

      ctx.textAlign = "left";
      ctx.fillStyle = "#064e3b";
      ctx.font = "bold 18px 'Poppins', -apple-system, sans-serif";
      ctx.fillText("Total Amount Paid", 90, 802);

      ctx.textAlign = "right";
      ctx.font = "bold 22px 'Poppins', -apple-system, sans-serif";
      ctx.fillText(`₹${Math.abs(expense.amount).toLocaleString("en-IN")}`, width - 90, 803);

      // Receipt Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#059669";
      ctx.font = "600 14px 'Poppins', -apple-system, sans-serif";
      ctx.fillText("Track · Manage · Save · Grow", width / 2, 955);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px 'Poppins', -apple-system, sans-serif";
      ctx.fillText("Generated by Dream Pocket App", width / 2, 980);

      // Convert to Blob and File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Failed to export receipt canvas to blob"));
          }
          const file = new File(
            [blob],
            `DreamPocket_Receipt_${cleanTitle.replace(/\s+/g, "_")}.png`,
            { type: "image/png" }
          );
          resolve(file);
        },
        "image/png",
        0.95
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Downloads a File object to the user's device
 */
export function downloadReceiptFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

