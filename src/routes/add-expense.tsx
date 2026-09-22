import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useAuth } from "@/lib/auth";
import { createExpense } from "@/lib/data";
import { CATEGORY_NAMES, todayISO } from "@/lib/expense-utils";
import { uploadToCloudinary, optimizedImage } from "@/lib/cloudinary";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/add-expense")({
  component: AddExpenseRoute,
});

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(50, "Title is too long"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Please select a category"),
  customCategory: z.string().max(30, "Custom category name is too long").optional(),
  date: z.string().min(1, "Please select a date"),
  description: z.string().max(200, "Description is too long").optional(),
});

function AddExpenseRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "" as unknown as number,
      category: "Other",
      customCategory: "",
      date: todayISO(),
      description: "",
    },
  });

  const selectedCategory = form.watch("category");

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
  };

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!user) throw new Error("Not logged in");

      let imageUrl = null;
      if (file) {
        try {
          const res = await uploadToCloudinary(file, setUploadProgress);
          imageUrl = res.url;
        } catch (err) {
          throw new Error("Failed to upload image. Please try again.");
        }
      }

      const finalCategory = values.category === "Other" && values.customCategory?.trim()
        ? values.customCategory.trim()
        : values.category;

      await createExpense(user.uid, {
        title: values.title,
        amount: values.amount,
        category: finalCategory,
        date: values.date,
        description: values.description || "",
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.uid] });
      toast.success("Expense added successfully!");
      navigate({ to: "/expenses" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add expense");
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.category === "Other" && !values.customCategory?.trim()) {
      form.setError("customCategory", { type: "manual", message: "Please specify a category" });
      return;
    }
    createMutation.mutate(values);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Add Expense</CardTitle>
          <CardDescription>Track a new transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control as any}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Expense Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Grocery Shopping" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">₹</span>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            className="pl-7" 
                            {...field} 
                            value={field.value ?? ""}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col mt-2">
                      <FormLabel className="mb-1">Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                            }
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_NAMES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCategory === "Other" && (
                  <FormField
                    control={form.control as any}
                    name="customCategory"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Custom Category Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Subscriptions, Pet Care" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control as any}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional details here..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 sm:col-span-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Receipt Image (Optional)
                  </label>
                  {preview ? (
                    <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-2 w-full max-w-[200px] aspect-[3/4]">
                      <img
                        src={preview}
                        alt="Receipt preview"
                        className="h-full w-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 transition-colors hover:bg-muted/30">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 z-10 w-full h-full cursor-pointer opacity-0"
                        onChange={handleImageChange}
                      />
                      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <div className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground">
                          <ImagePlus className="size-6" />
                        </div>
                        <p className="font-medium">Tap to upload a receipt</p>
                        <p className="text-xs mt-1">JPEG, PNG up to 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary shadow-soft"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {uploadProgress > 0 && uploadProgress < 100
                      ? `Uploading Receipt ${uploadProgress}%`
                      : "Saving..."}
                  </>
                ) : (
                  "Save Expense"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </AppShell>
  );
}
