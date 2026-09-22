import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createFamilyExpense } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { CATEGORY_NAMES, todayISO } from "@/lib/expense-utils";
import { uploadToCloudinary } from "@/lib/cloudinary";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Please select a category"),
  customCategory: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

export function AddFamilyExpenseDialog({ familyId, customTrigger }: { familyId: string, customTrigger?: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  const categoryValue = form.watch("category");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
  }

  function clearImage() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadProgress(0);
  }

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!user) throw new Error("Not authenticated");

      let imageUrl = null;
      if (file) {
        try {
          const res = await uploadToCloudinary(file, setUploadProgress);
          imageUrl = res.url;
        } catch (err) {
          throw new Error("Failed to upload image.");
        }
      }

      const finalCategory = values.category === "Other" && values.customCategory?.trim()
        ? values.customCategory.trim()
        : values.category;

      await createFamilyExpense(familyId, user.uid, {
        title: values.title,
        amount: values.amount,
        category: finalCategory,
        date: values.date,
        description: values.description || "",
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyExpenses", familyId] });
      toast.success("Family expense added!");
      setOpen(false);
      form.reset();
      clearImage();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add family expense");
      setUploadProgress(0);
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
        {customTrigger ? customTrigger : (
          <Button className="w-full sm:w-auto bg-gradient-primary shadow-soft">
            <Plus className="mr-2 size-4" /> Add Family Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Family Expense</DialogTitle>
          <DialogDescription>
            This expense will be deducted from the family budget and visible to all family members.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Weekly Groceries" {...field} />
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
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                        <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} value={field.value ?? ""} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_NAMES.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            </div>

            {categoryValue === "Other" && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter custom category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
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

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Receipt Image (Optional)
              </label>
              {previewUrl ? (
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="h-32 w-auto rounded-lg border object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 size-6 rounded-full"
                    onClick={clearImage}
                    disabled={createMutation.isPending}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={createMutation.isPending}
                />
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary shadow-soft"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? uploadProgress > 0
                  ? `Uploading Image ${uploadProgress}%...`
                  : "Saving Expense..."
                : "Add Family Expense"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
