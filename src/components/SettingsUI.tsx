import { ChevronRight } from "lucide-react";
import React from "react";

export const SettingsGroup = ({ children, className = "", title }: { children: React.ReactNode, className?: string, title?: string }) => (
  <div className={`mb-6 ${className}`}>
    {title && <h4 className="text-[13px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-3">{title}</h4>}
    <div className="bg-card rounded-xl overflow-hidden shadow-sm border border-border">
      {children}
    </div>
  </div>
);

export const SettingsRow = ({ 
  icon: Icon, 
  iconBg, 
  title, 
  titleClass,
  description,
  value, 
  onClick, 
  children 
}: { 
  icon: any, 
  iconBg: string, 
  title: string, 
  titleClass?: string,
  description?: string,
  value?: string | React.ReactNode, 
  onClick?: () => void, 
  children?: React.ReactNode 
}) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-3.5 bg-card border-b border-border last:border-0 ${onClick ? 'cursor-pointer active:bg-muted transition-colors' : ''}`}
  >
    <div className="flex items-center gap-3">
      <div className={`size-7 rounded-lg text-white flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex flex-col">
        <span className={`text-[16px] font-medium leading-tight ${titleClass || 'text-foreground'}`}>{title}</span>
        {description && <span className="text-[12px] text-muted-foreground mt-0.5">{description}</span>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-[15px] text-muted-foreground">{value}</span>}
      {children}
      {onClick && <ChevronRight className="size-4 text-muted-foreground" />}
    </div>
  </div>
);
