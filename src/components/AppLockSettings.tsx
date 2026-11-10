import { useAppLock } from './AppLockProvider';
import { Switch } from '@/components/ui/switch';
import { SettingsGroup, SettingsRow } from '@/components/SettingsUI';
import { Fingerprint, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';
import { toast } from 'sonner';

export function AppLockSettings() {
  const isNative = Capacitor.isNativePlatform();

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

  // If on desktop / laptop: Biometrics are not used, show informational row
  if (!isNative) {
    return (
      <SettingsGroup title="Security & App Lock">
        <SettingsRow
          icon={Smartphone}
          iconBg="bg-emerald-500/10 text-emerald-600"
          title="Mobile Biometric Lock"
          description="Biometric App Lock (Fingerprint & Face ID) is designed exclusively for your mobile device. On laptops & desktop browsers, your account is secured by your Dream Pocket login."
        />
      </SettingsGroup>
    );
  }

  // On Mobile Native Application
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
