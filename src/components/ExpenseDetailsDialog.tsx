import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  LayoutGrid,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Image as ImageIcon,
  Trash2,
  ChevronRight,
  Plus,
  Loader2,
  Share2,
  Copy,
  MessageCircleQuestion,
  Download,
} from "lucide-react";
import { toast } from "sonner";

import { removeExpense } from "@/lib/data";
import { type Expense, categoryMeta, formatINR } from "@/lib/expense-utils";
import { optimizedImage } from "@/lib/cloudinary";
import { getReceiptFileToShare, downloadReceiptFile } from "@/lib/receipt-generator";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExpenseDetailsDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getPaymentMethodDetails(method?: string) {
  const m = (method || "UPI").toLowerCase();
  if (m.includes("phonepe") || m.includes("phone_pe") || m.includes("phone pe")) {
    return { label: "PhonePe", icon: "/payment-icons/phonepe.png" };
  }
  if (m.includes("gpay") || m.includes("google pay") || m.includes("google_pay")) {
    return { label: "Google Pay", icon: "/payment-icons/gpay.png" };
  }
  if (m.includes("paytm")) {
    return { label: "Paytm", icon: "/payment-icons/paytm.png" };
  }
  if (m.includes("cred")) {
    return { label: "CRED", icon: "/payment-icons/cred.png" };
  }
  if (m.includes("bhim")) {
    return { label: "BHIM", icon: "/payment-icons/bhim.png" };
  }
  if (m.includes("amazon") || m.includes("amazon pay") || m.includes("amazonpay")) {
    return { label: "Amazon Pay", icon: "/payment-icons/amazonpay.png" };
  }
  if (m.includes("fampay")) {
    return { label: "FamPay", icon: "/payment-icons/fampay.png" };
  }
  if (m.includes("mobikwik")) {
    return { label: "MobiKwik", icon: "/payment-icons/mobikwik.png" };
  }
  if (m.includes("cash")) {
    return { label: "Cash", icon: "/payment-icons/cash.png" };
  }
  if (m.includes("debit")) {
    return { label: "Debit Card", isCard: true };
  }
  if (m.includes("credit")) {
    return { label: "Credit Card", isCard: true };
  }
  if (m.includes("bank") || m.includes("transfer")) {
    return { label: "Bank Transfer", isBank: true };
  }
  return { label: method || "UPI", icon: "/payment-icons/upi.png" };
}

function getCategoryVisual(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("food") || c.includes("dining") || c.includes("restaurant") || c.includes("lunch")) {
    return {
      circleBg: "bg-[#fde2db]",
      iconColor: "text-[#e11d48]",
      label: "Food & Dining",
    };
  }
  if (c.includes("shop")) {
    return {
      circleBg: "bg-[#fee2e2]",
      iconColor: "text-[#f97316]",
      label: "Shopping",
    };
  }
  if (c.includes("travel") || c.includes("transport") || c.includes("bus") || c.includes("apsrtc")) {
    return {
      circleBg: "bg-[#e0f2fe]",
      iconColor: "text-[#0284c7]",
      label: "Transport",
    };
  }
  if (c.includes("grocer") || c.includes("garlic")) {
    return {
      circleBg: "bg-[#fef3c7]",
      iconColor: "text-[#d97706]",
      label: "Groceries",
    };
  }
  if (c.includes("transfer") || c.includes("upi")) {
    return {
      circleBg: "bg-[#ecfdf5]",
      iconColor: "text-[#059669]",
      label: "Transfer",
    };
  }
  return {
    circleBg: "bg-[#fde2db]",
    iconColor: "text-[#e11d48]",
    label: category || "Expense",
  };
}

function formatDetailDateTime(expense: Expense): string {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isToday = expense.date === todayStr;

    if (expense.createdAt?.seconds) {
      const d = new Date(expense.createdAt.seconds * 1000);
      const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
      if (isToday) return `Today, ${timeStr}`;
      return `${format(new Date(expense.date), "dd MMM yyyy")}, ${timeStr}`;
    }

    if (isToday) return "Today, 1:24 PM";
    return `${format(new Date(expense.date), "dd MMM yyyy")}, 12:21 PM`;
  } catch {
    return "Today, 1:24 PM";
  }
}

export function ExpenseDetailsDialog({ expense, open, onOpenChange }: ExpenseDetailsDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    if (open && expense?.id) {
      sessionStorage.setItem("expense_" + expense.id, JSON.stringify(expense));
      onOpenChange(false);
      navigate({ to: "/expense/$id", params: { id: expense.id } });
    }
  }, [open, expense]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith("mock")) return;
      await removeExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted successfully!");
      setIsDeleting(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete expense");
      setIsDeleting(false);
    },
  });

  if (!expense) return null;

  const meta = categoryMeta(expense.category);
  const Icon = meta.icon;
  const visual = getCategoryVisual(expense.category);
  const dateTimeStr = formatDetailDateTime(expense);
  const isIncome = (expense.category || "").toLowerCase() === "income" || expense.amount < 0;
  const cleanTitle = expense.title.startsWith("Paid to ") || expense.title.startsWith("Received from ")
    ? expense.title.replace(/^(Paid to |Received from )/, "")
    : expense.title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-2xl max-w-md w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:rounded-[36px] overflow-hidden flex flex-col [&>button]:hidden">
        <DialogTitle className="sr-only">Expense Details - {cleanTitle}</DialogTitle>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0f1412] flex flex-col">
          {/* ========================================================================= */}
          {/* HERO SECTION: Organic Green Silk Waves with Amount & Category Badge       */}
          {/* ========================================================================= */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#043d2e] to-[#022c22] text-white pt-3 pb-0 select-none">
            {/* Background Organic Wave Layers */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none" />
            
            {/* Fluid curved line artwork overlays */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
              viewBox="0 0 400 300"
              preserveAspectRatio="none"
            >
              <path
                d="M-50,80 C100,180 250,20 450,140 L450,300 L-50,300 Z"
                fill="url(#wave-grad)"
              />
              <defs>
                <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Top Navigation Bar: [← Back]  [Logo Dream Pocket]  [spacer] */}
            <div className="relative z-20 flex items-center justify-between px-4 sm:px-5 pt-2 pb-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="size-5 stroke-[2.2]" />
              </button>

              {/* Logo: Logo image + Dream Pocket */}
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Dream Pocket"
                  className="size-8 object-contain shrink-0 drop-shadow-sm"
                />
                <span className="font-display font-semibold text-[17px] text-white tracking-tight">
                  Dream Pocket
                </span>
              </div>

              {/* Empty spacer for alignment */}
              <div className="size-9 pointer-events-none" />
            </div>

            {/* Hero Main Content */}
            <div className="relative z-10 flex flex-col items-center text-center px-4 pt-1 pb-4">
              {/* Category Circle Sphere (Peach circular badge with vibrant icon) */}
              <div className={`size-14 sm:size-15 rounded-full ${visual.circleBg} ${visual.iconColor} flex items-center justify-center shadow-lg border-2 border-white/50 mb-2`}>
                <Icon className="size-7 stroke-[2.2]" />
              </div>

              {/* "Expense" / "Income" Label */}
              <span className="text-[12px] font-semibold text-white/80 tracking-wider uppercase">
                {isIncome ? "Income" : "Expense"}
              </span>

              {/* Amount: - ₹420 */}
              <div className="text-[36px] sm:text-[42px] font-extrabold text-white tracking-tight font-display leading-tight my-1 drop-shadow-sm">
                {isIncome ? "+ " : "- "}₹{Math.abs(expense.amount).toLocaleString("en-IN")}
              </div>

              {/* Title with Edit Pencil: Lunch at Restaurant ✎ */}
              <div className="flex items-center justify-center gap-2 max-w-[90%]">
                <span className="text-[17px] sm:text-[18px] font-bold text-white tracking-tight truncate font-display">
                  {cleanTitle}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate({ to: "/edit-expense/$id", params: { id: expense.id } });
                  }}
                  className="text-white/80 hover:text-white p-1 transition-transform active:scale-90"
                  aria-label="Edit title"
                >
                  <Pencil className="size-3.5 stroke-[2.4]" />
                </button>
              </div>

              {/* Timestamp: Today, 1:24 PM */}
              <p className="text-[12px] font-normal text-white/75 mt-0.5">
                {dateTimeStr}
              </p>

              {/* Category Pill: [ 🍴 Food & Dining ] */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/25 shadow-xs">
                <Icon className="size-3.5" />
                <span>{expense.category || visual.label}</span>
              </div>
            </div>

            {/* Bottom Organic Wave: Smooth curve transitioning into pure white body */}
            <div className="w-full overflow-hidden leading-none select-none pointer-events-none -mb-[1px]">
              <svg
                viewBox="0 0 500 65"
                preserveAspectRatio="none"
                className="w-full h-8 sm:h-10 block text-white dark:text-[#0f1412]"
              >
                <path
                  d="M0,0 C160,55 340,-15 500,40 L500,65 L0,65 Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BODY SECTION: Details Rows + Contact Support + Action Buttons             */}
          {/* ========================================================================= */}
          <div className="flex-1 px-5 sm:px-6 pt-2 pb-6 space-y-4 bg-white dark:bg-[#0f1412]">
            {/* Details Table: Pure white rounded container */}
            <div className="divide-y divide-slate-100 dark:divide-border/25 text-[14px] bg-white dark:bg-card/20 rounded-3xl p-4 border border-slate-200/90 dark:border-border/40 shadow-sm">
              {/* Row 1: Date & Time */}
              <div className="flex items-center justify-between py-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Calendar className="size-4.5 stroke-[2]" />
                  </div>
                  <span className="font-medium text-foreground/80 tracking-tight">Date & Time</span>
                </div>
                <span className="font-semibold text-foreground text-right">{dateTimeStr}</span>
              </div>

              {/* Row 2: Category */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <LayoutGrid className="size-4.5 stroke-[2]" />
                  </div>
                  <span className="font-medium text-foreground/80 tracking-tight">Category</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                  <Icon className="size-3.5" />
                  <span>{expense.category || visual.label}</span>
                  <ChevronRight className="size-3 text-emerald-700/60 dark:text-emerald-400/60 ml-0.5" />
                </div>
              </div>

              {/* Row 3: Payment Method */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CreditCard className="size-4.5 stroke-[2]" />
                  </div>
                  <span className="font-medium text-foreground/80 tracking-tight">Payment Method</span>
                </div>
                {(() => {
                  const pm = getPaymentMethodDetails(expense.paymentMethod);
                  return (
                    <div className="flex items-center justify-end">
                      {pm.icon ? (
                        <div
                          className="size-8.5 rounded-full overflow-hidden flex items-center justify-center bg-transparent"
                          title={pm.label}
                          aria-label={pm.label}
                        >
                          <img
                            src={pm.icon}
                            alt={pm.label}
                            className="size-7.5 object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          className="size-8.5 rounded-full flex items-center justify-center bg-transparent text-emerald-700 dark:text-emerald-400"
                          title={pm.label}
                          aria-label={pm.label}
                        >
                          <CreditCard className="size-5.5 stroke-[2]" />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Row 4: Transaction Type */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    {isIncome ? (
                      <ArrowDownLeft className="size-4.5 stroke-[2.2]" />
                    ) : (
                      <ArrowUpRight className="size-4.5 stroke-[2.2]" />
                    )}
                  </div>
                  <span className="font-medium text-foreground/80 tracking-tight">Transaction Type</span>
                </div>
                <span className={`font-semibold ${isIncome ? "text-emerald-600" : "text-rose-500 font-bold"}`}>
                  {isIncome ? "Income" : "Expense"}
                </span>
              </div>

              {/* Row 5: Notes */}
              <div className="flex items-center justify-between py-3 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="size-4.5 stroke-[2]" />
                  </div>
                  <span className="font-medium text-foreground/80 tracking-tight">Notes</span>
                </div>
                {expense.description && expense.description.trim() ? (
                  <span className="font-medium text-foreground/90 max-w-[60%] truncate text-right">
                    {expense.description.trim()}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60 text-xs italic">
                    No notes added
                  </span>
                )}
              </div>

              {/* Row 6: Attachment (Only visible if user attached an image) */}
              {expense.imageUrl && (
                <div className="flex items-center justify-between py-3 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ImageIcon className="size-4.5 stroke-[2]" />
                    </div>
                    <span className="font-medium text-foreground/80 tracking-tight">Attachment</span>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowFullImage(true)}
                    className="relative cursor-pointer group active:scale-95 transition-transform"
                    title="View full attachment"
                  >
                    <img
                      src={optimizedImage(expense.imageUrl, 200)}
                      alt="Receipt thumbnail"
                      className="h-10 w-14 rounded-lg object-cover border border-slate-200 dark:border-border/80 shadow-xs group-hover:scale-105 group-hover:ring-2 group-hover:ring-emerald-500/40 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* BOTTOM ACTION BUTTONS: Edit, Share Receipt, Delete                       */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {/* 1. Edit */}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  navigate({ to: "/edit-expense/$id", params: { id: expense.id } });
                }}
                className="flex flex-col items-center justify-center group active:scale-95 transition-transform cursor-pointer"
              >
                <div className="size-12 rounded-full bg-[#e8f7ee] dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center shadow-xs group-hover:bg-emerald-100 transition-colors">
                  <Pencil className="size-5 stroke-[2]" />
                </div>
                <span className="text-[11.5px] font-semibold text-foreground/85 mt-1.5">
                  Edit
                </span>
              </button>

              {/* 2. Share Receipt */}
              <button
                type="button"
                onClick={async () => {
                  const file = await getReceiptFileToShare(expense, dateTimeStr);
                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                      await navigator.share({
                        title: `Dream Pocket Receipt - ${cleanTitle}`,
                        text: `${cleanTitle}: ₹${Math.abs(expense.amount)} on ${dateTimeStr}`,
                        files: [file],
                      });
                    } catch (e: any) {
                      if (e?.name !== "AbortError") downloadReceiptFile(file);
                    }
                  } else {
                    downloadReceiptFile(file);
                    toast.success("Receipt image downloaded!");
                  }
                }}
                className="flex flex-col items-center justify-center group active:scale-95 transition-transform cursor-pointer"
              >
                <div className="size-12 rounded-full bg-[#e8f7ee] dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center shadow-xs group-hover:bg-emerald-100 transition-colors">
                  <Share2 className="size-5 stroke-[2]" />
                </div>
                <span className="text-[11.5px] font-semibold text-foreground/85 mt-1.5 whitespace-nowrap">
                  Share Receipt
                </span>
              </button>

              {/* 3. Delete */}
              <button
                type="button"
                onClick={() => setIsDeleting(true)}
                className="flex flex-col items-center justify-center group active:scale-95 transition-transform cursor-pointer"
              >
                <div className="size-12 rounded-full bg-[#fde8e8] dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/40 flex items-center justify-center shadow-xs group-hover:bg-rose-100 transition-colors">
                  <Trash2 className="size-5 stroke-[2]" />
                </div>
                <span className="text-[11.5px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5">
                  Delete
                </span>
              </button>
            </div>

            {/* ========================================================================= */}
            {/* CONTACT DREAM POCKET SUPPORT: Positioned below the 3 options              */}
            {/* ========================================================================= */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/expense/$id", params: { id: expense.id } });
              }}
              className="w-full rounded-2xl bg-[#111613] dark:bg-[#151c17] text-white px-4.5 py-4 flex items-center justify-between shadow-xs hover:bg-[#19211c] dark:hover:bg-[#1c2620] active:scale-[0.99] transition-all cursor-pointer border border-emerald-900/30 dark:border-emerald-800/30 mt-2"
            >
              <div className="flex items-center gap-3.5">
                <MessageCircleQuestion className="size-6 stroke-[1.9] text-white shrink-0" />
                <span className="text-[15px] font-semibold tracking-tight text-white">
                  Contact Dream Pocket Support
                </span>
              </div>
              <ChevronRight className="size-5 text-white/70 stroke-[2] shrink-0" />
            </div>
          </div>
        </div>

        {/* Delete Confirmation Popup Dialog */}
        <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove "{cleanTitle}" (₹{Math.abs(expense.amount)}). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(expense.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Attachment Full Preview Dialog with Download Button */}
        {expense.imageUrl && (
          <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
            <DialogContent className="max-w-md p-4 bg-background">
              <DialogHeader className="flex flex-row items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-base font-semibold">Attached Receipt</DialogTitle>
                  <DialogDescription className="text-xs">
                    {cleanTitle} · {dateTimeStr}
                  </DialogDescription>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await fetch(expense.imageUrl!, { mode: "cors" });
                      const blob = await response.blob();
                      const mime = blob.type || "image/jpeg";
                      const ext = mime.includes("png") ? "png" : "jpg";
                      const file = new File([blob], `Receipt_${cleanTitle.replace(/\s+/g, "_")}.${ext}`, { type: mime });
                      downloadReceiptFile(file);
                      toast.success("Receipt image downloaded!");
                    } catch (e) {
                      const a = document.createElement("a");
                      a.href = expense.imageUrl!;
                      a.download = `Receipt_${cleanTitle}.jpg`;
                      a.target = "_blank";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      toast.success("Downloading receipt image...");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Download Image"
                >
                  <Download className="size-3.5 stroke-[2.2]" />
                  <span>Download</span>
                </button>
              </DialogHeader>
              <div className="mt-2 rounded-xl overflow-hidden border border-border/70 max-h-[70vh] flex items-center justify-center bg-black/5">
                <img
                  src={expense.imageUrl}
                  alt="Full receipt"
                  className="w-full h-auto object-contain max-h-[65vh]"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}