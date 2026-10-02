import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Share, PlusSquare, Search, User, Bell, Eye, Lock, Headphones, HelpCircle, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { NotificationSettings } from "@/components/NotificationSettings";

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

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
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

  const renderContent = () => {
    if (!view) {
      return (
        <>
          {/* Search */}
          <div className="px-5 mb-2 mt-1">
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
          <div className="px-5 flex flex-col mt-2">
            {menuItems.map((item) => (
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
          
          <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
            <DialogContent className="sm:max-w-md bg-background">
              <DialogHeader>
                <DialogTitle>Install Home Expense Manager</DialogTitle>
                <DialogDescription>
                  Install this application on your home screen for quick and easy access when you're on the go.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex items-center gap-4 bg-muted p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-center size-8 rounded-full bg-secondary text-secondary-foreground font-semibold shrink-0">1</div>
                  <p className="text-sm text-foreground">Tap the <Share className="inline size-5 mx-1 mb-1" /> <strong>Share</strong> button at the bottom of Safari.</p>
                </div>
                <div className="flex items-center gap-4 bg-muted p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-center size-8 rounded-full bg-secondary text-secondary-foreground font-semibold shrink-0">2</div>
                  <p className="text-sm text-foreground">Scroll down and tap <PlusSquare className="inline size-5 mx-1 mb-1" /> <strong>Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-center gap-4 bg-muted p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-center size-8 rounded-full bg-secondary text-secondary-foreground font-semibold shrink-0">3</div>
                  <p className="text-sm text-foreground">Tap <strong>Add</strong> in the top right corner.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowIOSInstructions(false)}>Got it</Button>
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
