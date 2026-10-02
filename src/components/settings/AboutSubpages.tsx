export function WhatsNew() {
  const updates = [
    { version: "1.0.0", date: "October 2026", features: ["Initial release of Expense Manager", "Add and track daily expenses", "Set monthly budgets", "Family Budget sharing", "Dark mode support", "App Lock security"] }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
      {updates.map((update, idx) => (
        <div key={idx} className="bg-card p-5 rounded-[24px] border border-border shadow-sm">
          <div className="flex justify-between items-baseline mb-4">
            <h3 className="text-[17px] font-bold text-foreground">Version {update.version}</h3>
            <span className="text-[13px] font-medium text-muted-foreground">{update.date}</span>
          </div>
          <ul className="space-y-2">
            {update.features.map((feat, fidx) => (
              <li key={fidx} className="flex items-start gap-2 text-[14px] text-muted-foreground">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-card p-5 rounded-[24px] border border-border shadow-sm prose prose-sm max-w-none prose-slate">
        <h3 className="text-lg font-bold text-foreground mb-4">Privacy Policy</h3>
        <p className="text-muted-foreground">
          Your privacy is important to us. This privacy statement explains the personal data we process, how we process it, and for what purposes.
        </p>
        <h4 className="font-bold text-foreground mt-4 mb-2">1. Data we collect</h4>
        <p className="text-muted-foreground">We collect data to operate effectively and provide you the best experiences. You provide some of this data directly, such as when you create an account.</p>
        <h4 className="font-bold text-foreground mt-4 mb-2">2. How we use your data</h4>
        <p className="text-muted-foreground">We use the data we collect to operate our business and provide the products we offer, which includes using data to improve our products and personalize your experiences.</p>
        <h4 className="font-bold text-foreground mt-4 mb-2">3. Data security</h4>
        <p className="text-muted-foreground">We use a variety of security technologies and procedures to help protect your personal data from unauthorized access, use, or disclosure.</p>
      </div>
    </div>
  );
}

export function TermsOfService() {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-card p-5 rounded-[24px] border border-border shadow-sm prose prose-sm max-w-none prose-slate">
        <h3 className="text-lg font-bold text-foreground mb-4">Terms of Service</h3>
        <p className="text-muted-foreground">
          By accessing or using Expense Manager, you agree to be bound by these terms. If you disagree with any part of the terms then you may not access the service.
        </p>
        <h4 className="font-bold text-foreground mt-4 mb-2">1. Accounts</h4>
        <p className="text-muted-foreground">When you create an account with us, you must provide us information that is accurate, complete, and current at all times.</p>
        <h4 className="font-bold text-foreground mt-4 mb-2">2. Termination</h4>
        <p className="text-muted-foreground">We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever.</p>
      </div>
    </div>
  );
}

export function OpenSourceLicenses() {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-card p-5 rounded-[24px] border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4">Open Source Licenses</h3>
        <p className="text-[14px] text-muted-foreground mb-4">
          Expense Manager is made possible by open source software. Below is a list of some of the key open source libraries we use:
        </p>
        <div className="space-y-4">
          <div className="border-t border-border pt-4">
            <h4 className="font-bold text-foreground">React</h4>
            <p className="text-xs text-muted-foreground mt-1">MIT License</p>
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="font-bold text-foreground">Vite</h4>
            <p className="text-xs text-muted-foreground mt-1">MIT License</p>
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="font-bold text-foreground">Tailwind CSS</h4>
            <p className="text-xs text-muted-foreground mt-1">MIT License</p>
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="font-bold text-foreground">Lucide React</h4>
            <p className="text-xs text-muted-foreground mt-1">ISC License</p>
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="font-bold text-foreground">Firebase</h4>
            <p className="text-xs text-muted-foreground mt-1">Apache License 2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
