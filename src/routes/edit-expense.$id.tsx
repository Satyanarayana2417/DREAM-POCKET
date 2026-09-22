import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useAuth } from "@/lib/auth";
import { fetchExpense, saveExpense, removeExpense } from "@/lib/data";
import { CATEGORY_NAMES } from "@/lib/expense-utils";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FullPageLoader } from "@/components/Loader";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/edit-expense/$id")({
  component: EditExpenseRoute,
});

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(50, "Title is too long"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Please select a category"),
  customCategory: z.string().max(30, "Custom category name is too long").optional(),
  date: z.string().min(1, "Please select a date"),
  description: z.string().max(200, "Description is too long").optional(),
});

function EditExpenseRoute() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingImageRemoved, setExistingImageRemoved] = useState(false);

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", id],
    queryFn: () => fetchExpense(id),
    enabled: !!id,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "" as unknown as number,
      category: "",
      customCategory: "",
      date: "",
      description: "",
    },
  });

  const selectedCategory = form.watch("category");

  useEffect(() => {
    if (expense) {
      if (expense.userId !== user?.uid) {
        toast.error("You do not have permission to edit this expense");
        navigate({ to: "/expenses" });
        return;
      }
      const isCustom = expense.category && !CATEGORY_NAMES.includes(expense.category) && expense.category !== "Other";
      
      form.reset({
        title: expense.title,
        amount: expense.amount,
        category: isCustom ? "Other" : (expense.category || "Other"),
        customCategory: isCustom ? expense.category : "",
        date: expense.date,
        description: expense.description || "",
      });
      if (expense.imageUrl) {
        setPreview(expense.imageUrl);
      }
    }
  }, [expense, form, user, navigate]);

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
      setExistingImageRemoved(false);
    }
  };

  const clearImage = () => {
    setFile(null);
    setPreview(null);
    if (expense?.imageUrl) {
      setExistingImageRemoved(true);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      let imageUrl = expense?.imageUrl ?? null;

      if (existingImageRemoved) {
        imageUrl = null;
      }

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

      await saveExpense(id, {
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
      queryClient.invalidateQueries({ queryKey: ["expense", id] });
      toast.success("Expense updated successfully!");
      navigate({ to: "/expenses" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update expense");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await removeExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.uid] });
      toast.success("Expense deleted successfully!");
      navigate({ to: "/expenses" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete expense");
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.category === "Other" && !values.customCategory?.trim()) {
      form.setError("customCategory", { type: "manual", message: "Please specify a category" });
      return;
    }
    updateMutation.mutate(values);
  }

  if (isLoading) return <FullPageLoader label="Loading expense..." />;
  if (!expense) return <div className="py-20 text-center">Expense not found</div>;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-2xl">Edit Expense</CardTitle>
            <CardDescription>Update transaction details.</CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your expense and remove
                  it from your budget calculations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Delete Expense"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                        src={file ? preview : optimizedImage(preview, 400)}
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
                        <p className="font-medium">Tap to upload a new receipt</p>
                        <p className="text-xs mt-1">JPEG, PNG up to 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/expenses" })}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary shadow-soft"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {uploadProgress > 0 && uploadProgress < 100
                        ? `Uploading ${uploadProgress}%`
                        : "Saving..."}
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </AppShell>
  );
}
