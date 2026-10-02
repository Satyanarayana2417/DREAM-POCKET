import { ChevronRight } from "lucide-react";
import React from "react";

export const SettingsGroup = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 mb-6 ${className}`}>
    {children}
  </div>
);

export const SettingsRow = ({ 
  icon: Icon, 
  iconBg, 
  title, 
  value, 
  onClick, 
  children 
}: { 
  icon: any, 
  iconBg: string, 
  title: string, 
  value?: string | React.ReactNode, 
  onClick?: () => void, 
  children?: React.ReactNode 
}) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-3.5 bg-white border-b border-slate-100 last:border-0 ${onClick ? 'cursor-pointer active:bg-slate-50 transition-colors' : ''}`}
  >
    <div className="flex items-center gap-3">
      <div className={`size-7 rounded-lg text-white flex items-center justify-center ${iconBg}`}>
        <Icon className="size-4" />
      </div>
      <span className="text-[16px] font-medium text-slate-900">{title}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-[15px] text-slate-500">{value}</span>}
      {children}
      {onClick && <ChevronRight className="size-4 text-slate-300" />}
    </div>
  </div>
);
