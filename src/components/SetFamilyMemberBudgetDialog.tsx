import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Edit2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { saveFamilyMemberBudget } from "@/lib/data";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SetFamilyMemberBudgetDialog({
  familyId,
  month,
  currentBudget,
}: {
  familyId: string;
  month: string;
  currentBudget?: number;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(currentBudget ? currentBudget.toString() : "");

  const mutation = useMutation({
    mutationFn: async (val: number) => {
      if (!user) throw new Error("Not authenticated");
      await saveFamilyMemberBudget(familyId, user.uid, month, val);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyBudgets", familyId] });
      toast.success("Budget updated!");
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update budget");
    },
  });

  const handleSave = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    mutation.mutate(val);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Edit2 className="mr-2 size-3" />
          {currentBudget ? "Edit My Budget" : "Set My Budget"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Monthly Budget</DialogTitle>
          <DialogDescription>
            This is your personal monthly contribution to the family's total budget.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Budget Amount (₹)</label>
            <Input
              type="number"
              placeholder="e.g. 15000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Budget"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
