import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { FileText, Database, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function DataPrivacy() {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
      <div className="text-center px-4 pt-4 pb-2">
        <p className="text-[15px] text-muted-foreground font-medium">Your financial information is private to your account.</p>
      </div>

      <SettingsGroup title="Personal Data">
        <SettingsRow
          icon={FileText}
          iconBg="bg-blue-500"
          title="Privacy Policy"
          onClick={() => navigate({ search: { view: 'about', subview: 'privacy-policy' } })}
        />
        <SettingsRow
          icon={Database}
          iconBg="bg-indigo-500"
          title="Data Usage"
          onClick={() => {}}
        />
      </SettingsGroup>
    </div>
  );
}
