import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, ImagePlus, Plus } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { createExpense } from "@/lib/data";
import { todayISO, CATEGORY_NAMES } from "@/lib/expense-utils";
import { uploadToCloudinary } from "@/lib/cloudinary";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(50, "Title is too long"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Please select a category"),
  customCategory: z.string().max(30, "Custom category name is too long").optional(),
  date: z.string().min(1, "Please select a date"),
  description: z.string().max(200, "Description is too long").optional(),
});

interface Props {
  selectedMonth: string;
}

export function AddBudgetExpenseDialog({ selectedMonth }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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
      setImageFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setPreview(null);
  };

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!user) throw new Error("Not logged in");

      let imageUrl = null;
      if (imageFile) {
        try {
          const res = await uploadToCloudinary(imageFile);
          imageUrl = res.url;
        } catch (error) {
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
        isBudgetExpense: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.uid] });
      toast.success("Budget expense added!");
      setOpen(false);
      form.reset();
      clearImage();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Budget Expense</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
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
                control={form.control}
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
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                  control={form.control}
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

              <div className="space-y-3 sm:col-span-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Receipt Image (Optional)
                </label>
                {preview ? (
                  <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-2 w-full max-w-[150px] aspect-[3/4]">
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="h-full w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                    >
                      <X className="size-3" />
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
                    <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                      <div className="mb-3 grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
                        <ImagePlus className="size-5" />
                      </div>
                      <p className="font-medium text-sm">Tap to upload a receipt</p>
                    </div>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional details here..." 
                        className="resize-none h-20" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary mt-6"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Expense
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
