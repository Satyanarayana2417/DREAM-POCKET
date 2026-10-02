import { Moon } from "lucide-react";
import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { useTheme } from "../theme-provider";
import { Switch } from "@/components/ui/switch";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <SettingsGroup title="Theme">
        <SettingsRow
          icon={Moon}
          iconBg="bg-slate-800"
          title="Dark Mode"
          value={<Switch checked={isDark} onCheckedChange={toggleTheme} />}
        />
      </SettingsGroup>
      
      <p className="px-4 mt-4 text-[13px] text-muted-foreground text-center font-medium">
        Use a dark appearance throughout the application.
      </p>
    </div>
  );
}
