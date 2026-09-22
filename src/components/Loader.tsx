import { Loader2 } from "lucide-react";

export function FullPageLoader({ label = "Getting things ready…" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f8f9fa] bg-opacity-95 backdrop-blur-sm transition-opacity duration-300">
      <div className="flex flex-col items-center justify-center animate-splash">
        <div className="w-24 h-24 sm:w-32 sm:h-32 mb-6 p-4 bg-white rounded-3xl shadow-soft flex items-center justify-center">
          <img 
            src="/logo.png" 
            alt="DreamPocket Logo" 
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">DreamPocket</h1>
        <div className="flex items-center gap-2 text-muted-foreground mt-2">
          <div className="size-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}
