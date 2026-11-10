import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Share,
  PlusSquare,
  Search,
  User,
  Bell,
  Eye,
  Lock,
  Headphones,
  HelpCircle,
  ChevronRight,
  Smartphone,
  CheckCircle2,
  Info,
  ExternalLink,
  Sparkles,
  Compass,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { NotificationSettings } from "@/components/NotificationSettings";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

import { AccountSettings } from "@/components/settings/AccountSettings";
import { ChangePassword } from "@/components/settings/ChangePassword";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { DataPrivacy } from "@/components/settings/DataPrivacy";
import { HelpSettings } from "@/components/settings/HelpSettings";
import { FAQ } from "@/components/settings/FAQ";
import { HowToUse } from "@/components/settings/HowToUse";
import { ContactSupport, ReportProblem, SendFeedback } from "@/components/settings/HelpForms";
import { AboutSettings } from "@/components/settings/AboutSettings";
import { WhatsNew, PrivacyPolicy, TermsOfService, OpenSourceLicenses } from "@/components/settings/AboutSubpages";

type SettingsSearch = {
  view?: string;
  subview?: string;
};

export const Route = createFileRoute("/settings")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    return {
      view: search.view as string | undefined,
      subview: search.subview as string | undefined,
    };
  },
  component: SettingsRoute,
});

function getTitle(view?: string, subview?: string): string {
  if (subview) {
    const titles: Record<string, string> = {
      'change-password': 'Change Password',
      'data': 'Data & Privacy',
      'faq': 'FAQ',
      'how-to-use': 'How to Use',
      'contact': 'Contact Support',
      'report': 'Report a Problem',
      'feedback': 'Send Feedback',
      'whats-new': "What's New",
      'privacy-policy': 'Privacy Policy',
      'terms': 'Terms of Service',
      'licenses': 'Open Source Licenses'
    };
    return titles[subview] || 'Settings';
  }
  
  if (view) {
    const titles: Record<string, string> = {
      'account': 'Account',
      'notifications': 'Notifications',
      'appearance': 'Appearance',
      'privacy': 'Privacy & Security',
      'help': 'Help and Support',
      'about': 'About'
    };
    return titles[view] || 'Settings';
  }
  
  return 'Settings';
}

function SettingsRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { view, subview } = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAndroidManualModal, setShowAndroidManualModal] = useState(false);

  const {
    installStatus,
    isInstalled,
    isIOS,
    isIOSSafari,
    isIOSOtherBrowser,
    showIOSGuide,
    setShowIOSGuide,
    promptInstall,
  } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstalled) {
      toast.info("Dream Pocket is already installed and running on your device.");
      return;
    }

    const result = await promptInstall();
    if (result === "accepted") {
      toast.success("Dream Pocket installed successfully!");
    } else if (result === "dismissed") {
      toast("Installation was cancelled");
    } else if (result === "already-installed") {
      toast.info("Dream Pocket is already installed on your device.");
    } else if (result === "unsupported") {
      setShowAndroidManualModal(true);
    }
  };

  const menuItems = [
    { id: 'account', icon: User, label: 'Account' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'appearance', icon: Eye, label: 'Appearance' },
    { id: 'privacy', icon: Lock, label: 'Privacy & Security' },
    { id: 'help', icon: Headphones, label: 'Help and Support' },
    { id: 'about', icon: HelpCircle, label: 'About' },
  ];

  const filteredMenuItems = menuItems.filter(m =>
    m.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const renderContent = () => {
    if (!view) {
      return (
        <>
          {/* Search */}
          <div className="px-5 mb-3 mt-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" strokeWidth={2} />
              <Input 
                placeholder="Search for a setting..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted border-0 focus-visible:ring-0 pl-11 h-[46px] rounded-xl text-base text-foreground placeholder:text-muted-foreground font-medium"
              />
            </div>
          </div>

          {/* Menu List */}
          <div className="px-5 flex flex-col mt-1 mb-5">
            {filteredMenuItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between py-4 border-b border-border last:border-0 cursor-pointer active:bg-muted transition-colors"
                onClick={() => navigate({ search: { view: item.id } })}
              >
                <div className="flex items-center gap-4">
                  <item.icon className="size-[22px] text-foreground" strokeWidth={2} />
                  <span className="text-[17px] font-medium text-muted-foreground">{item.label}</span>
                </div>
                <ChevronRight className="size-6 text-foreground" strokeWidth={2.5} />
              </div>
            ))}
          </div>

          {/* ========================================================================= */}
          {/* INSTALL DREAM POCKET CARD (Moved to bottom of settings)                   */}
          {/* ========================================================================= */}
          <div className="px-5 mb-6">
            <div
              onClick={handleInstallClick}
              className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 cursor-pointer transition-all duration-200 hover:border-emerald-500/40 hover:shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-[#059669] to-[#047857] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    {isInstalled ? (
                      <CheckCircle2 className="size-6 stroke-[2.2]" />
                    ) : (
                      <Download className="size-6 stroke-[2.2] animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[16px] text-foreground font-display tracking-tight leading-tight">
                        Install Dream Pocket
                      </h3>
                      {/* Status indicator badge */}
                      {installStatus === "Installed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="size-3 stroke-[2.5]" />
                          Installed
                        </span>
                      ) : installStatus === "Installation Available" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <Sparkles className="size-3" />
                          Installation Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Not Installed
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">
                      Install Dream Pocket on your device for a faster, app-like experience.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
          
          {/* ========================================================================= */}
          {/* iOS IN-APP INSTALLATION GUIDE DIALOG                                      */}
          {/* ========================================================================= */}
          <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
            <DialogContent className="sm:max-w-md bg-background rounded-3xl p-6 border border-border/80 shadow-xl">
              <DialogHeader className="text-left space-y-1.5 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-[#059669] to-[#047857] text-white flex items-center justify-center shrink-0">
                    <Smartphone className="size-5.5 stroke-[2.2]" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold font-display">Install Dream Pocket</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Follow these steps to add Dream Pocket to your iPhone or iPad Home Screen.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Warning notice if opened in third-party browser on iOS */}
              {isIOSOtherBrowser && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-3.5 flex items-start gap-2.5">
                  <Info className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong>Safari Recommended:</strong> You are currently using a third-party browser. For the best installation experience, please open <span className="font-semibold underline">dreampocket.app</span> directly in Apple Safari.
                  </div>
                </div>
              )}

              {/* Step by step cards */}
              <div className="flex flex-col gap-3 py-2">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5 bg-muted/60 dark:bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                  <div className="flex items-center justify-center size-7 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-sm text-foreground leading-snug">
                    <span>Open Dream Pocket in <strong>Safari</strong> and tap the </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md align-middle mx-0.5">
                      <Share className="size-3.5" /> Share
                    </span>
                    <span> button on the bottom bar.</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5 bg-muted/60 dark:bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                  <div className="flex items-center justify-center size-7 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-sm text-foreground leading-snug">
                    <span>Scroll down the menu list and tap </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md align-middle mx-0.5">
                      <PlusSquare className="size-3.5" /> Add to Home Screen
                    </span>
                    <span>.</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5 bg-muted/60 dark:bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                  <div className="flex items-center justify-center size-7 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-sm text-foreground leading-snug">
                    <span>Confirm by tapping <strong>Add</strong> in the top right corner. Dream Pocket is now installed on your Home Screen!</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5"
                >
                  Got It
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ========================================================================= */}
          {/* ANDROID / CHROME MANUAL INSTALLATION MODAL (Fallback when prompt omitted) */}
          {/* ========================================================================= */}
          <Dialog open={showAndroidManualModal} onOpenChange={setShowAndroidManualModal}>
            <DialogContent className="sm:max-w-md bg-background rounded-3xl p-6 border border-border/80 shadow-xl">
              <DialogHeader className="text-left space-y-1.5 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-[#059669] to-[#047857] text-white flex items-center justify-center shrink-0">
                    <Download className="size-5.5 stroke-[2.2]" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold font-display">Install Dream Pocket</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Install directly from your browser menu
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-start gap-3.5 bg-muted/60 dark:bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                  <div className="flex items-center justify-center size-7 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-sm text-foreground leading-snug">
                    Tap the <strong>three dots menu (⋮)</strong> in the top right or bottom corner of your browser.
                  </p>
                </div>

                <div className="flex items-start gap-3.5 bg-muted/60 dark:bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                  <div className="flex items-center justify-center size-7 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-sm text-foreground leading-snug">
                    Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-3.5 bg-muted/60 dark:bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                  <div className="flex items-center justify-center size-7 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-sm text-foreground leading-snug">
                    Confirm <strong>Install</strong> to add Dream Pocket to your phone's app drawer.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={() => setShowAndroidManualModal(false)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5"
                >
                  Understood
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    if (view === 'account') {
      if (subview === 'change-password') return <div className="px-4"><ChangePassword /></div>;
      return <div className="px-4"><AccountSettings /></div>;
    }
    if (view === 'notifications') {
      return <div className="px-4"><NotificationSettings /></div>;
    }
    if (view === 'appearance') {
      return <div className="px-4"><AppearanceSettings /></div>;
    }
    if (view === 'privacy') {
      if (subview === 'data') return <div className="px-4"><DataPrivacy /></div>;
      return <div className="px-4"><PrivacySettings /></div>;
    }
    if (view === 'help') {
      if (subview === 'faq') return <div className="px-4"><FAQ /></div>;
      if (subview === 'how-to-use') return <div className="px-4"><HowToUse /></div>;
      if (subview === 'contact') return <div className="px-4"><ContactSupport /></div>;
      if (subview === 'report') return <div className="px-4"><ReportProblem /></div>;
      if (subview === 'feedback') return <div className="px-4"><SendFeedback /></div>;
      return <div className="px-4"><HelpSettings /></div>;
    }
    if (view === 'about') {
      if (subview === 'whats-new') return <div className="px-4"><WhatsNew /></div>;
      if (subview === 'privacy-policy') return <div className="px-4"><PrivacyPolicy /></div>;
      if (subview === 'terms') return <div className="px-4"><TermsOfService /></div>;
      if (subview === 'licenses') return <div className="px-4"><OpenSourceLicenses /></div>;
      return <div className="px-4"><AboutSettings /></div>;
    }

    return null;
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-xl bg-background min-h-screen pb-12">
        {/* Header */}
        <div className="relative flex items-center justify-center px-4 py-4 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.back()} 
            className="absolute left-2 hover:bg-muted rounded-full"
          >
            <ArrowLeft className="size-6 text-foreground" strokeWidth={2.5} />
          </Button>
          <h1 className="text-[19px] font-semibold text-foreground tracking-tight">
            {getTitle(view, subview)}
          </h1>
        </div>
        
        {renderContent()}
      </div>
    </AppShell>
  );
}
