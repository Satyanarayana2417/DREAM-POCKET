import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { HelpCircle, BookOpen, Mail, AlertTriangle, MessageSquare, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function HelpSettings() {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <SettingsGroup title="Need Help?">
        <SettingsRow
          icon={HelpCircle}
          iconBg="bg-blue-500"
          title="Frequently Asked Questions"
          onClick={() => navigate({ to: '/settings', search: { view: 'help', subview: 'faq' } })}
        />
        <SettingsRow
          icon={BookOpen}
          iconBg="bg-indigo-500"
          title="How to Use Expense Manager"
          onClick={() => navigate({ to: '/settings', search: { view: 'help', subview: 'how-to-use' } })}
        />
        <SettingsRow
          icon={Mail}
          iconBg="bg-teal-500"
          title="Contact Support"
          onClick={() => navigate({ to: '/settings', search: { view: 'help', subview: 'contact' } })}
        />
        <SettingsRow
          icon={AlertTriangle}
          iconBg="bg-amber-500"
          title="Report a Problem"
          onClick={() => navigate({ to: '/settings', search: { view: 'help', subview: 'report' } })}
        />
        <SettingsRow
          icon={MessageSquare}
          iconBg="bg-emerald-500"
          title="Send Feedback"
          onClick={() => navigate({ to: '/settings', search: { view: 'help', subview: 'feedback' } })}
        />
      </SettingsGroup>
    </div>
  );
}
