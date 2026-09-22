import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Tag, FileText, Image as ImageIcon, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { removeExpense } from "@/lib/data";
import { type Expense, categoryMeta, formatINR } from "@/lib/expense-utils";
import { optimizedImage } from "@/lib/cloudinary";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth";

interface ExpenseDetailsDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDetailsDialog({ expense, open, onOpenChange }: ExpenseDetailsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await removeExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.uid] });
      toast.success("Expense deleted successfully!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete expense");
    },
  });

  if (!expense) return null;

  const meta = categoryMeta(expense.category);
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-0 overflow-hidden">
        <div 
          className="h-24 w-full flex items-center justify-center relative"
          style={{ backgroundColor: `${meta.color}15` }}
        >
          <div 
            className="size-14 rounded-full flex items-center justify-center bg-background shadow-sm"
            style={{ color: meta.color }}
          >
            <Icon className="size-7" />
          </div>
        </div>

        <DialogHeader className="px-6 pt-4 pb-2 text-center">
          <DialogTitle className="text-2xl font-bold truncate">{expense.title}</DialogTitle>
          <div className="text-3xl font-bold text-foreground mt-2">
            {formatINR(expense.amount)}
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl text-sm">
            <div>
              <p className="text-muted-foreground flex items-center gap-1.5 mb-1">
                <Tag className="size-3.5" /> Category
              </p>
              <p className="font-semibold">{expense.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1.5 mb-1">
                <Calendar className="size-3.5" /> Date
              </p>
              <p className="font-semibold">
                {format(new Date(expense.date), "dd MMM yyyy")}
              </p>
            </div>
          </div>

          {expense.description && (
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                <FileText className="size-3.5" /> Description
              </p>
              <p className="text-sm bg-muted/20 p-3 rounded-lg border border-border/50">
                {expense.description}
              </p>
            </div>
          )}

          {expense.imageUrl && (
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                <ImageIcon className="size-3.5" /> Receipt
              </p>
              {showFullImage ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img 
                    src={expense.imageUrl} 
                    alt="Receipt" 
                    className="w-full h-auto max-h-[300px] object-contain cursor-zoom-out bg-black/5"
                    onClick={() => setShowFullImage(false)}
                  />
                </div>
              ) : (
                <div 
                  className="w-24 h-24 rounded-lg overflow-hidden border cursor-zoom-in group relative"
                  onClick={() => setShowFullImage(true)}
                >
                  <img 
                    src={optimizedImage(expense.imageUrl, 200)} 
                    alt="Receipt thumbnail" 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Created on {expense.createdAt?.seconds 
              ? format(new Date(expense.createdAt.seconds * 1000), "dd MMM yyyy, h:mm a") 
              : "Unknown"}
          </div>

          <div className="flex gap-3 pt-2">
            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="size-4 mr-2" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove "{expense.title}" ({formatINR(expense.amount)}). This action cannot be undone.
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
            
            <Button 
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/edit-expense/$id", params: { id: expense.id } });
              }}
            >
              <Edit className="size-4 mr-2" /> Edit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
