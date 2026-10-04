import { AppLockSettings } from "@/components/AppLockSettings";
import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function PrivacySettings() {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
      <AppLockSettings />

      <SettingsGroup title="Privacy">
        <SettingsRow
          icon={Shield}
          iconBg="bg-blue-500"
          title="Data & Privacy"
          onClick={() => navigate({ to: '/settings', search: { view: 'privacy', subview: 'data' } })}
        />
      </SettingsGroup>
    </div>
  );
}
