import { useAppLock } from './AppLockProvider';
import { Switch } from '@/components/ui/switch';
import { SettingsGroup, SettingsRow } from '@/components/SettingsUI';
import { Fingerprint, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { isMobileOrTablet } from './AppLockProvider';
import { useState } from 'react';
import { toast } from 'sonner';

export function AppLockSettings() {
  const isMobile = isMobileOrTablet();

  const {
    isBiometricEnabled,
    isBiometricSupported,
    authenticatorLabel,
    setBiometricEnabled,
    lockNow,
  } = useAppLock();

  const [busy, setBusy] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await setBiometricEnabled(checked);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update biometric settings.");
    } finally {
      setBusy(false);
    }
  };

  // If on desktop / laptop: Biometrics are disabled, show informational card
  if (!isMobile) {
    return (
      <SettingsGroup title="Security & App Lock">
        <SettingsRow
          icon={Smartphone}
          iconBg="bg-emerald-500/10 text-emerald-600"
          title="Mobile Biometric Lock"
          description="Biometric App Lock (Fingerprint & Face ID) is active on your mobile devices. On laptops & desktop browsers, your account is secured by your Dream Pocket password and login."
        />
      </SettingsGroup>
    );
  }

  // On Mobile Devices (Android, iPhone, iPad, Capacitor Native & Mobile PWA)
  return (
    <SettingsGroup title="Security & App Lock">
      <SettingsRow
        icon={Fingerprint}
        iconBg={isBiometricEnabled ? "bg-emerald-500" : isBiometricSupported ? "bg-indigo-500" : "bg-muted"}
        title="Biometric App Lock"
        description={
          isBiometricSupported
            ? isBiometricEnabled
              ? `Protected by ${authenticatorLabel}`
              : `Use ${authenticatorLabel} to lock and protect Dream Pocket`
            : "Biometric sensor not available on this mobile device"
        }
        value={
          <Switch
            checked={isBiometricEnabled}
            onCheckedChange={handleToggle}
            disabled={!isBiometricSupported || busy}
          />
        }
      />

      {isBiometricEnabled && (
        <>
          <SettingsRow
            icon={ShieldCheck}
            iconBg="bg-emerald-500"
            title="Registered Authenticator"
            description={`${authenticatorLabel} Active & Enrolled`}
          />

          <SettingsRow
            icon={Lock}
            iconBg="bg-rose-500"
            title="Lock App Now"
            description="Immediately lock Dream Pocket to test biometric access"
            onClick={lockNow}
          />
        </>
      )}
    </SettingsGroup>
  );
}
