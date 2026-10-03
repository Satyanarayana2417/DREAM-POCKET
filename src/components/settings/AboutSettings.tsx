import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { Star, ChevronRight, FileText, Sparkles, Scale, Info, ExternalLink } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function AboutSettings() {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
      
      <div className="flex flex-col items-center justify-center pt-2 pb-2">
        <div className="size-20 rounded-3xl flex items-center justify-center mb-2">
          <img src="/logo.png" alt="Dream Pocket" className="size-full object-contain drop-shadow-sm bg-white rounded-full p-2" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Dream Pocket</h2>
        <p className="text-[14px] text-muted-foreground text-center max-w-[260px] mt-1">
          Manage your personal expenses, income and family finances in one place.
        </p>
        <div className="mt-4 px-3 py-1 bg-muted rounded-full text-xs font-semibold text-muted-foreground tracking-wider">
          VERSION 1.0.0
        </div>
      </div>

      <SettingsGroup>
        <SettingsRow
          icon={Sparkles}
          iconBg="bg-amber-500"
          title="What's New"
          onClick={() => navigate({ search: { view: 'about', subview: 'whats-new' } })}
        />
        <SettingsRow
          icon={FileText}
          iconBg="bg-blue-500"
          title="Privacy Policy"
          onClick={() => navigate({ search: { view: 'about', subview: 'privacy-policy' } })}
        />
        <SettingsRow
          icon={Scale}
          iconBg="bg-indigo-500"
          title="Terms of Service"
          onClick={() => navigate({ search: { view: 'about', subview: 'terms' } })}
        />
        <SettingsRow
          icon={Info}
          iconBg="bg-muted0"
          title="Open Source Licenses"
          onClick={() => navigate({ search: { view: 'about', subview: 'licenses' } })}
        />
        <SettingsRow
          icon={Star}
          iconBg="bg-pink-500"
          title="Rate the App"
          onClick={() => {}}
        >
          <ExternalLink className="size-4 text-muted-foreground ml-1" />
        </SettingsRow>
      </SettingsGroup>

      <div className="text-center pt-4 pb-8">
        <p className="text-xs font-medium text-muted-foreground">Made with care</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">© 2026 Dream Pocket</p>
      </div>
    </div>
  );
}
