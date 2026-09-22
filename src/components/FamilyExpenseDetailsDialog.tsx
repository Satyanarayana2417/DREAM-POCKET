import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDisplayDate, formatINR, categoryMeta } from "@/lib/expense-utils";
import { Download, Receipt } from "lucide-react";
import type { FamilyExpense } from "@/lib/expense-utils";

interface FamilyExpenseDetailsDialogProps {
  expense: FamilyExpense;
  username: string;
  children: React.ReactNode;
}

export function FamilyExpenseDetailsDialog({ expense, username, children }: FamilyExpenseDetailsDialogProps) {
  const meta = categoryMeta(expense.category);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (expense.imageUrl) {
      window.open(expense.imageUrl, "_blank");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer transition-transform active:scale-[0.98]">
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-white rounded-[2rem] sm:rounded-[2.5rem]">
        {/* Header styling */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 pb-8 relative">
          <DialogHeader>
            <DialogTitle className="text-center text-emerald-900 font-bold text-xl mb-4">Expense Details</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-emerald-100">
              <meta.icon className="size-8 text-emerald-600" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-slate-900 text-2xl text-center mb-1">{expense.title}</h3>
            <p className="font-semibold text-emerald-700 text-3xl mb-4">{formatINR(expense.amount)}</p>
            
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 bg-emerald-200/50 px-3 py-1 rounded-full">
              <span>{expense.category}</span>
              <span className="w-1 h-1 bg-emerald-500 rounded-full" />
              <span>{formatDisplayDate(expense.date)}</span>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 bg-white space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-500">Added By</span>
              <span className="text-sm font-bold text-slate-900">{username}</span>
            </div>
            {expense.description && (
              <div className="py-2 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-500 block mb-1.5">Notes</span>
                <p className="text-sm font-medium text-slate-800">{expense.description}</p>
              </div>
            )}
          </div>

          {/* Receipt Section */}
          {expense.imageUrl ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Receipt className="size-4" /> Attached Receipt
              </p>
              <div className="relative group rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">
                <img 
                  src={expense.imageUrl} 
                  alt="Receipt" 
                  className="w-full h-full object-contain"
                />
                <button 
                  onClick={handleDownload}
                  className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-emerald-700 hover:bg-emerald-50 p-2.5 rounded-full shadow-sm transition-colors border border-white"
                  title="Download / View Receipt"
                >
                  <Download className="size-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center rounded-2xl bg-slate-50 border border-slate-100 border-dashed">
              <Receipt className="size-5 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-400">No receipt attached</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
