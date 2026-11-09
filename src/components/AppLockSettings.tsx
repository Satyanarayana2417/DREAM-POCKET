import { useAppLock } from './AppLockProvider';
import { Switch } from '@/components/ui/switch';
import { SettingsGroup, SettingsRow } from '@/components/SettingsUI';
import { Fingerprint, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function AppLockSettings() {
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
            : "Biometric/passkey sensor not detected on this device"
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
            description="Immediately lock Dream Pocket to verify biometric access"
            onClick={lockNow}
          />
        </>
      )}

      {!isBiometricSupported && (
        <div className="mx-4 my-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p>
            Your current browser or device hardware does not expose a supported platform biometric authenticator (such as Windows Hello, Touch ID, Face ID, or Android Biometrics).
          </p>
        </div>
      )}
    </SettingsGroup>
  );
}
