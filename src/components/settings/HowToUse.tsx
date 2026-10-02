import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { PlusCircle, Wallet, PieChart, Users, Bell, Lock } from "lucide-react";

export function HowToUse() {
  const sections = [
    { icon: PlusCircle, bg: "bg-blue-500", title: "Adding expenses", desc: "Tap the floating + button anytime to quickly log an expense. Categorize it to track your spending habits." },
    { icon: Wallet, bg: "bg-emerald-500", title: "Managing Monthly Income", desc: "Set your monthly income in the Budget tab to see exactly how much you have left to spend." },
    { icon: PieChart, bg: "bg-indigo-500", title: "Viewing spending", desc: "The Expenses tab shows your recent transactions. You can filter them by category or time." },
    { icon: Users, bg: "bg-amber-500", title: "Using Family Budget", desc: "Create a Family Budget and share the code. All members will see the same unified expenses list." },
    { icon: Bell, bg: "bg-teal-500", title: "Managing notifications", desc: "Enable daily reminders to log expenses, or get alerted when you're close to your budget limit." },
    { icon: Lock, bg: "bg-slate-700", title: "Using App Lock", desc: "Keep your financial data private by requiring a PIN or Biometrics every time you open the app." }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-card p-5 rounded-[24px] border border-border shadow-sm flex gap-4">
            <div className={`flex items-center justify-center size-10 rounded-full text-white shrink-0 shadow-sm ${section.bg}`}>
              <section.icon className="size-5" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-foreground mb-1">{section.title}</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">{section.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
