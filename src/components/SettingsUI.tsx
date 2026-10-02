import { ChevronRight } from "lucide-react";
import React from "react";

export const SettingsGroup = ({ children, className = "", title }: { children: React.ReactNode, className?: string, title?: string }) => (
  <div className={`mb-6 ${className}`}>
    {title && <h4 className="text-[13px] uppercase tracking-wider text-slate-500 font-medium mb-2 px-3">{title}</h4>}
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
      {children}
    </div>
  </div>
);

export const SettingsRow = ({ 
  icon: Icon, 
  iconBg, 
  title, 
  description,
  value, 
  onClick, 
  children 
}: { 
  icon: any, 
  iconBg: string, 
  title: string, 
  description?: string,
  value?: string | React.ReactNode, 
  onClick?: () => void, 
  children?: React.ReactNode 
}) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-3.5 bg-white border-b border-slate-100 last:border-0 ${onClick ? 'cursor-pointer active:bg-slate-50 transition-colors' : ''}`}
  >
    <div className="flex items-center gap-3">
      <div className={`size-7 rounded-lg text-white flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-[16px] font-medium text-slate-900 leading-tight">{title}</span>
        {description && <span className="text-[12px] text-slate-500 mt-0.5">{description}</span>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-[15px] text-slate-500">{value}</span>}
      {children}
      {onClick && <ChevronRight className="size-4 text-slate-300" />}
    </div>
  </div>
);
