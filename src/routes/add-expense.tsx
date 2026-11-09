import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Tag,
  Calendar,
  LayoutGrid,
  CreditCard,
  Banknote,
  Landmark,
  Wallet,
  FileText,
  Paperclip,
  UploadCloud,
  Camera,
  Check,
  ChevronRight,
  X,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useAuth } from "@/lib/auth";
import { createExpense } from "@/lib/data";
import { CATEGORIES, todayISO, monthLabel, currentMonthKey } from "@/lib/expense-utils";
import { uploadToCloudinary } from "@/lib/cloudinary";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type AddExpenseSearch = {
  source?: string;
  isBudget?: boolean;
  month?: string;
};

export const Route = createFileRoute("/add-expense")({
  validateSearch: (search: Record<string, unknown>): AddExpenseSearch => {
    return {
      source: (search.source as string) || undefined,
      isBudget:
        search.isBudget !== undefined
          ? search.isBudget === true || search.isBudget === "true" || search.source === "budget"
          : search.source === "budget" ? true : undefined,
      month: (search.month as string) || undefined,
    };
  },
  component: AddExpenseRoute,
});

const formSchema = z.object({
  title: z.string().min(2, "Expense name must be at least 2 characters").max(60, "Name is too long"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Please select a category"),
  customCategory: z.string().max(30, "Custom category name is too long").optional(),
  date: z.string().min(1, "Please select a date"),
  paymentType: z.string(),
  upiApp: z.string(),
  customUpiApp: z.string().max(50, "App name is too long").optional(),
  description: z.string().max(200, "Notes cannot exceed 200 characters").optional(),
  isBudgetExpense: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const PAYMENT_METHODS = [
  { id: "UPI", label: "UPI", image: "/payment-icons/upi.png" },
  { id: "Cash", label: "Cash", image: "/payment-icons/cash.png" },
  { id: "Debit Card", label: "Debit Card", icon: CreditCard },
  { id: "Credit Card", label: "Credit Card", icon: CreditCard },
  { id: "Bank Transfer", label: "Bank Transfer", icon: Landmark },
] as const;

const UPI_APPS = [
  { id: "PhonePe", label: "PhonePe", image: "/payment-icons/phonepe.png" },
  { id: "Google Pay", label: "GPay", image: "/payment-icons/gpay.png" },
  { id: "Paytm", label: "Paytm", image: "/payment-icons/paytm.png" },
  { id: "CRED", label: "CRED", image: "/payment-icons/cred.png" },
  { id: "BHIM", label: "BHIM", image: "/payment-icons/bhim.png" },
  { id: "Amazon Pay", label: "Amazon Pay", image: "/payment-icons/amazonpay.png" },
  { id: "FamPay", label: "FamPay", image: "/payment-icons/fampay.png" },
  { id: "MobiKwik", label: "MobiKwik", image: "/payment-icons/mobikwik.png" },
  { id: "Others", label: "Others", image: "/payment-icons/upi.png" },
] as const;

function AddExpenseRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const isBudgetMode = !!search.isBudget || search.source === "budget";
  const targetMonth = search.month;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const getDefaultDate = () => {
    if (isBudgetMode && targetMonth) {
      if (targetMonth === currentMonthKey()) {
        return todayISO();
      }
      return `${targetMonth}-01`;
    }
    return todayISO();
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "" as unknown as number,
      category: "Food",
      customCategory: "",
      date: getDefaultDate(),
      paymentType: "UPI",
      upiApp: "PhonePe",
      customUpiApp: "",
      description: "",
      isBudgetExpense: isBudgetMode,
    },
  });

  const selectedCategory = form.watch("category");
  const selectedPaymentType = form.watch("paymentType");
  const selectedUpiApp = form.watch("upiApp");
  const notesValue = form.watch("description") || "";

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
    }
  };

  const clearImage = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!user) throw new Error("Not logged in");

      let imageUrl: string | null = null;
      if (file) {
        try {
          const res = await uploadToCloudinary(file, setUploadProgress);
          imageUrl = res.url;
        } catch (err) {
          throw new Error("Failed to upload receipt image. Please try again.");
        }
      }

      const finalCategory =
        values.category === "Other" && values.customCategory?.trim()
          ? values.customCategory.trim()
          : values.category;

      const finalPaymentMethod =
        values.paymentType === "UPI"
          ? (values.upiApp === "Others" && values.customUpiApp?.trim()
              ? values.customUpiApp.trim()
              : values.upiApp || "UPI")
          : values.paymentType;

      await createExpense(user.uid, {
        title: values.title,
        amount: values.amount,
        category: finalCategory,
        date: values.date,
        description: values.description || "",
        imageUrl,
        isBudgetExpense: isBudgetMode,
        paymentType: values.paymentType,
        paymentMethod: finalPaymentMethod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success(isBudgetMode ? "Budget expense added successfully!" : "Expense added successfully!");
      if (isBudgetMode) {
        navigate({ to: "/budget" });
      } else {
        navigate({ to: "/" });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add expense");
    },
  });

  function onSubmit(values: FormValues) {
    if (values.category === "Other" && !values.customCategory?.trim()) {
      form.setError("customCategory", {
        type: "manual",
        message: "Please enter custom category name",
      });
      setShowCategoryDialog(true);
      return;
    }
    createMutation.mutate(values);
  }

  function handleBack() {
    if (isBudgetMode) {
      navigate({ to: "/budget" });
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/" });
    }
  }

  const filteredCategories = CATEGORIES.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f7f9f7] dark:bg-[#0f1412] flex flex-col font-sans select-none">
      {/* ========================================================================= */}
      {/* TOP HERO BANNER: Direct PNG Banner in front with natural curvy border     */}
      {/* ========================================================================= */}
      <div className="relative w-full select-none overflow-hidden">
        {/* PNG Banner Image in front with its transparent curvy bottom */}
        <img
          src="/dream_pocket_green_wave_transparent.png"
          alt="Dream Pocket Banner"
          className="w-full h-[180px] sm:h-[210px] md:h-[240px] object-cover object-[80%_top] sm:object-center block select-none pointer-events-none"
        />

        {/* Foreground Overlay Content: Back button, Logo, Titles */}
        <div className="absolute inset-0 flex flex-col justify-between pt-3 pb-6 pointer-events-none">
          {/* Top Bar: [← Back]  [dp Dream Pocket] */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-1 max-w-md sm:max-w-xl md:max-w-2xl mx-auto w-full pointer-events-auto">
            <button
              type="button"
              onClick={handleBack}
              className="size-10 rounded-full bg-black/15 hover:bg-black/25 active:scale-95 flex items-center justify-center text-white transition-colors cursor-pointer backdrop-blur-xs"
              aria-label="Back"
            >
              <ArrowLeft className="size-5.5 stroke-[2.3]" />
            </button>

            {/* Logo: Logo PNG + Dream Pocket */}
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Dream Pocket"
                className="size-8 object-contain shrink-0 drop-shadow-sm"
              />
              <span className="font-display font-semibold text-[18px] text-white tracking-tight drop-shadow-sm">
                Dream Pocket
              </span>
            </div>

            {/* Spacer for centered alignment */}
            <div className="size-10 pointer-events-none" />
          </div>

          {/* Hero Title & Subtitle */}
          <div className="px-4 sm:px-6 pb-2 max-w-md sm:max-w-xl md:max-w-2xl mx-auto w-full flex items-center justify-between pointer-events-auto">
            <div className="max-w-[75%] sm:max-w-[85%]">
              <h1 className="text-[26px] xs:text-[28px] sm:text-[32px] md:text-[34px] font-extrabold text-white tracking-tight font-display leading-tight drop-shadow-sm">
                Add <span className="text-[#34d399]">{isBudgetMode ? "Budget Expense" : "Expense"}</span>
              </h1>
              <p className="text-[12.5px] sm:text-[13px] text-white/90 font-normal mt-0.5 leading-snug drop-shadow-sm">
                {isBudgetMode
                  ? targetMonth
                    ? `Tracking towards ${monthLabel(targetMonth)} budget`
                    : "Track towards your monthly budget"
                  : "Track your spending in seconds"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORM BODY: Responsive layout across Mobile, Tablet, Desktop               */}
      {/* ========================================================================= */}
      <div className="flex-1 px-4 sm:px-6 pt-2 pb-12 max-w-md sm:max-w-xl md:max-w-2xl mx-auto w-full">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* 1. Expense Name */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="size-9.5 sm:size-11 rounded-2xl bg-[#eaf7f0] dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Tag className="size-4.5 sm:size-5 stroke-[2] -rotate-45" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[13px] font-bold text-foreground tracking-tight flex items-center gap-1 mb-1">
                  Expense Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Lunch at Restaurant"
                  {...form.register("title")}
                  className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200/90 dark:border-border text-[14px] text-foreground placeholder:text-muted-foreground/50 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            {form.formState.errors.title && (
              <p className="text-xs font-medium text-rose-500 ml-12 sm:ml-14">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* 2. Amount & Date (2 Columns with responsive spacing & zero truncation) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {/* Amount */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="size-9.5 sm:size-11 rounded-2xl bg-[#eaf7f0] dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-base sm:text-lg shadow-2xs">
                  ₹
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[12.5px] sm:text-[13px] font-bold text-foreground tracking-tight flex items-center gap-1 mb-1">
                    Amount <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="₹ 0.00"
                    {...form.register("amount")}
                    className="w-full h-11 px-3 sm:px-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200/90 dark:border-border text-[13.5px] sm:text-[14px] font-semibold text-foreground placeholder:text-muted-foreground/50 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              {form.formState.errors.amount && (
                <p className="text-xs font-medium text-rose-500 ml-11 sm:ml-13">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="size-9.5 sm:size-11 rounded-2xl bg-[#eaf7f0] dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="size-4.5 sm:size-5 stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[12.5px] sm:text-[13px] font-bold text-foreground tracking-tight flex items-center gap-1 mb-1">
                    Date <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-11 px-2.5 sm:px-3 rounded-2xl bg-white dark:bg-card border border-slate-200/90 dark:border-border text-[12px] sm:text-[13px] text-foreground font-medium flex items-center justify-between shadow-2xs hover:border-emerald-400 transition-all cursor-pointer min-w-0"
                      >
                        <span className="truncate">
                          {form.watch("date")
                            ? format(new Date(form.watch("date")), "dd MMM yyyy")
                            : "Select date"}
                        </span>
                        <Calendar className="size-3.5 sm:size-4 text-emerald-700 dark:text-emerald-400 shrink-0 ml-1 opacity-70" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        captionLayout="dropdown"
                        startMonth={new Date(2000, 0)}
                        endMonth={new Date(2035, 11)}
                        selected={form.watch("date") ? new Date(form.watch("date")) : undefined}
                        onSelect={(d) => form.setValue("date", d ? format(d, "yyyy-MM-dd") : "")}
                        disabled={(d) => d > new Date("2035-12-31") || d < new Date("1990-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Category */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowCategoryDialog(true)}
            className="w-full rounded-2xl bg-white dark:bg-card border border-emerald-300 dark:border-emerald-800 p-3 flex items-center justify-between shadow-2xs hover:border-emerald-400 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="size-9.5 sm:size-11 rounded-2xl bg-[#eaf7f0] dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <LayoutGrid className="size-4.5 sm:size-5 stroke-[2]" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-foreground tracking-tight flex items-center gap-1">
                  Category <span className="text-rose-500 font-bold">*</span>
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">
                  {selectedCategory === "Other" && form.watch("customCategory")
                    ? form.watch("customCategory")
                    : selectedCategory || "Select category"}
                </div>
              </div>
            </div>
            <ChevronRight className="size-4.5 text-muted-foreground mr-1" />
          </div>

          {/* 4. Payment Type */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-[#eaf7f0] dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <CreditCard className="size-4 stroke-[2]" />
              </div>
              <span className="text-[13px] font-bold text-foreground tracking-tight">
                Payment Type <span className="text-rose-500 font-bold">*</span>
              </span>
            </div>

            {/* 5 Payment Methods Grid: 1 Single Row, Transparent, Circle-shaped Icons */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedPaymentType === method.id;
                const IconComponent = "icon" in method ? method.icon : null;
                const imageSrc = "image" in method ? method.image : null;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      form.setValue("paymentType", method.id);
                    }}
                    className="relative flex flex-col items-center justify-center p-1 bg-transparent border-0 shadow-none cursor-pointer group active:scale-95 transition-transform"
                  >
                    {/* Circle Icon */}
                    <div className="relative">
                      <div
                        className={`size-12 rounded-full overflow-hidden flex items-center justify-center transition-all ${
                          isSelected
                            ? "ring-[2.5px] ring-emerald-500 ring-offset-2 ring-offset-[#f7f9f7] dark:ring-offset-[#0f1412] shadow-sm shadow-emerald-500/25 bg-white dark:bg-card"
                            : "bg-white/90 dark:bg-card/90 border border-slate-200/70 dark:border-border/60 opacity-85 group-hover:opacity-100 group-hover:scale-105"
                        }`}
                      >
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={method.label}
                            className="size-full object-contain p-2 rounded-full"
                          />
                        ) : (
                          IconComponent && (
                            <IconComponent
                              className={`size-5 ${
                                isSelected
                                  ? "text-emerald-700 dark:text-emerald-300 stroke-[2.2]"
                                  : "text-muted-foreground stroke-[1.8]"
                              }`}
                            />
                          )
                        )}
                      </div>

                      {/* Selected Checkmark Badge on the Circle */}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-[10.5px] leading-tight mt-1.5 text-center truncate max-w-full transition-colors ${
                        isSelected
                          ? "font-bold text-emerald-800 dark:text-emerald-300"
                          : "font-medium text-foreground/75"
                      }`}
                    >
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* UPI Sub-Options: Occurs DIRECTLY under the UPI option */}
            {selectedPaymentType === "UPI" && (
              <div className="relative mt-2.5 p-3 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Pointer indicator aligned right under UPI */}
                <div className="absolute -top-1.5 left-[10%] w-3 h-3 bg-emerald-50 dark:bg-[#15231c] border-t border-l border-emerald-200/60 dark:border-emerald-800/50 rotate-45" />

                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-bold text-emerald-900 dark:text-emerald-300 tracking-tight flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Select UPI App:
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    {selectedUpiApp === "Others" && form.watch("customUpiApp")?.trim()
                      ? form.watch("customUpiApp")
                      : selectedUpiApp}
                  </span>
                </div>

                {/* 3x3 Grid of 9 UPI Apps - Circle-shaped, Transparent, No Card Borders */}
                <div className="grid grid-cols-3 gap-y-3.5 gap-x-1.5 pt-1">
                  {UPI_APPS.map((app) => {
                    const isSelected = selectedUpiApp === app.id;
                    const isWhiteBgNeeded =
                      app.id === "Google Pay" ||
                      app.id === "Others" ||
                      app.id === "BHIM" ||
                      app.id === "Amazon Pay";

                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => form.setValue("upiApp", app.id)}
                        className="group relative flex flex-col items-center justify-center p-1 bg-transparent border-0 shadow-none cursor-pointer active:scale-95 transition-transform"
                      >
                        {/* Circle-shaped Icon Container - Transparent, No Border */}
                        <div className="relative">
                          <div
                            className={`size-12 rounded-full overflow-hidden flex items-center justify-center transition-all bg-transparent ${
                              isSelected
                                ? "ring-[2.5px] ring-emerald-500 ring-offset-2 ring-offset-[#f0f9f4] dark:ring-offset-[#0f1412] shadow-sm shadow-emerald-500/25"
                                : "opacity-85 group-hover:opacity-100 group-hover:scale-105"
                            }`}
                          >
                            {isWhiteBgNeeded ? (
                              <div className="size-full rounded-full bg-white dark:bg-card flex items-center justify-center p-2 shadow-2xs">
                                <img
                                  src={app.image}
                                  alt={app.label}
                                  className="size-full object-contain"
                                />
                              </div>
                            ) : (
                              <img
                                src={app.image}
                                alt={app.label}
                                className="size-full object-cover rounded-full"
                              />
                            )}
                          </div>

                          {/* Selected Checkmark Badge on the Circle */}
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="size-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Label */}
                        <span
                          className={`text-[11px] leading-tight mt-1.5 text-center truncate max-w-full transition-colors ${
                            isSelected
                              ? "font-bold text-emerald-800 dark:text-emerald-300"
                              : "font-medium text-foreground/80"
                          }`}
                        >
                          {app.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom UPI Input when "Others" is selected */}
                {selectedUpiApp === "Others" && (
                  <div className="pt-1 space-y-1">
                    <input
                      type="text"
                      placeholder="e.g. UPI ID or custom app"
                      {...form.register("customUpiApp")}
                      className="w-full h-9.5 px-3 rounded-xl bg-white dark:bg-card border border-emerald-200 dark:border-border text-[12.5px] text-foreground placeholder:text-muted-foreground/60 shadow-2xs focus:outline-none focus:ring-1.5 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Notes */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-[#eaf7f0] dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <FileText className="size-4 stroke-[2]" />
              </div>
              <span className="text-[13px] font-bold text-foreground tracking-tight">
                Notes
              </span>
            </div>

            <div className="relative rounded-2xl bg-white dark:bg-card border border-slate-200/90 dark:border-border shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 transition-all">
              <textarea
                placeholder="Add notes..."
                maxLength={200}
                rows={2}
                {...form.register("description")}
                className="w-full p-3.5 pb-7 text-[13.5px] text-foreground placeholder:text-muted-foreground/50 bg-transparent resize-none focus:outline-none"
              />
              <span className="absolute right-3.5 bottom-2 text-[11px] font-medium text-muted-foreground/60">
                {notesValue.length} / 200
              </span>
            </div>
          </div>

          {/* 6. Receipt (Optional) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-[#eaf7f0] dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Paperclip className="size-4 stroke-[2]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[13px] font-bold text-foreground tracking-tight">
                  Receipt
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  (Optional)
                </span>
              </div>
            </div>

            {/* Hidden native input: triggers mobile OS chooser (Gallery, Files, Camera) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={handleImageChange}
            />

            {preview ? (
              /* Attached Preview */
              <div className="relative rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-card p-3 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="size-14 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground truncate max-w-[190px]">
                      {file?.name || "Receipt Image"}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      ✓ Attached successfully
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearImage}
                  className="size-8 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="size-4 stroke-[2.2]" />
                </button>
              </div>
            ) : (
              /* Single Unified Upload Option: tap opens mobile OS chooser (Camera, Gallery, Files) */
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-emerald-300/90 dark:border-emerald-800/80 bg-[#f4faf6] dark:bg-emerald-950/20 py-4 px-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#eef8f2] active:scale-[0.99] transition-all shadow-2xs group"
              >
                <div className="size-10 rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <UploadCloud className="size-5 stroke-[2.2]" />
                </div>
                <span className="text-[13px] font-bold text-emerald-900 dark:text-emerald-200 tracking-tight">
                  Upload Receipt
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Add a bill, invoice or payment screenshot
                </span>
                <span className="mt-2 inline-block px-3 py-0.5 rounded-full bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-medium">
                  JPG, PNG or PDF (Max 5 MB)
                </span>
              </button>
            )}
          </div>

          {/* 7. Bottom Button: Add Expense */}
          <div className="pt-3 pb-8">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full h-13 rounded-full bg-gradient-to-r from-[#064e3b] via-[#046a38] to-[#023e20] hover:from-[#085f48] hover:to-[#034d28] text-white font-bold text-[15px] shadow-lg shadow-emerald-950/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 border-0"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>
                    {uploadProgress > 0 && uploadProgress < 100
                      ? `Uploading Receipt (${uploadProgress}%)...`
                      : "Adding Expense..."}
                  </span>
                </>
              ) : (
                <>
                  <Check className="size-5 stroke-[2.8]" />
                  <span>Add Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* CATEGORY PICKER POPUP DIALOG                                              */}
      {/* ========================================================================= */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="w-[94vw] max-w-lg p-4 sm:p-6 bg-card rounded-3xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-bold">Select Category</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose the category that best describes this expense
            </DialogDescription>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search category..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Categories Grid (Responsive: 3 cols on mobile, 4 cols on tablet/desktop) */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5 max-h-[50vh] overflow-y-auto mt-3 pr-1">
            {filteredCategories.map((c) => {
              const Icon = c.icon;
              const isSelected = selectedCategory === c.name;

              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    form.setValue("category", c.name);
                    if (c.name === "Other") {
                      setShowCustomInput(true);
                    } else {
                      form.setValue("customCategory", "");
                      setShowCustomInput(false);
                      setShowCategoryDialog(false);
                    }
                  }}
                  className={`p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs"
                      : "bg-muted/30 hover:bg-muted/70 border border-border/70 text-foreground"
                  }`}
                >
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center mb-1.5 ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "bg-card text-foreground/80 shadow-2xs"
                    }`}
                  >
                    <Icon className="size-5 stroke-[2]" />
                  </div>
                  <span className="text-[11.5px] sm:text-xs font-semibold tracking-tight leading-tight">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Category Input if "Other" is chosen */}
          {(showCustomInput || selectedCategory === "Other") && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <label className="text-xs font-bold text-foreground">
                Custom Category Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Subscriptions, Pet Care"
                  {...form.register("customCategory")}
                  className="flex-1 h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (form.watch("customCategory")?.trim()) {
                      setShowCategoryDialog(false);
                    } else {
                      toast.error("Please enter a category name");
                    }
                  }}
                  className="px-4 h-10 rounded-xl bg-emerald-600 text-white font-semibold text-xs cursor-pointer hover:bg-emerald-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}