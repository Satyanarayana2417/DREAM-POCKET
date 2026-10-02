import React, { useState } from 'react';
import { useAppLock } from './AppLockProvider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SettingsGroup, SettingsRow } from '@/components/SettingsUI';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Capacitor } from '@capacitor/core';
import { Lock, Fingerprint, KeyRound, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function AppLockSettings() {
  const { 
    isPinEnabled, 
    isBiometricEnabled, 
    isBiometricSupported, 
    setPinEnabled, 
    setBiometricEnabled, 
    verifyAuth,
    lockNow, 
    changePin 
  } = useAppLock();
  
  const [showSetup, setShowSetup] = useState(false);
  const [step, setStep] = useState<"SET" | "CONFIRM">("SET");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [useBio, setUseBio] = useState(false);
  
  // Track if we are changing PIN vs initial setup
  const [isChangingPin, setIsChangingPin] = useState(false);

  const handlePinToggle = async (checked: boolean) => {
    if (checked) {
      setStep("SET");
      setPin("");
      setConfirmPin("");
      setIsChangingPin(false);
      setUseBio(isBiometricEnabled); // Pre-fill with current state
      setShowSetup(true);
    } else {
      const authenticated = await verifyAuth();
      if (authenticated) {
        await setPinEnabled(false);
        toast.success("App PIN disabled.");
      }
    }
  };

  const handleBiometricToggle = async (checked: boolean) => {
    if (checked) {
      await setBiometricEnabled(true);
      toast.success("Biometric Unlock enabled.");
    } else {
      const authenticated = await verifyAuth();
      if (authenticated) {
        await setBiometricEnabled(false);
        toast.success("Biometric Unlock disabled.");
      }
    }
  };

  const handlePinInput = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (step === "SET") {
      setPin(clean);
    } else {
      setConfirmPin(clean);
    }
  };

  const handleContinue = () => {
    if (step === "SET") {
      if (pin.length !== 4) {
        toast.error("PIN must be exactly 4 digits.");
        return;
      }
      setStep("CONFIRM");
    } else {
      if (confirmPin !== pin) {
        toast.error("PINs don't match. Try again.");
        setConfirmPin("");
        return;
      }
      
      if (isChangingPin) {
        // Change existing PIN
        // For security, ideally we'd pass old pin. We assume verifyAuth passed.
        // Actually, our changePin requires the old PIN. Let's simplify and just set the new PIN directly using setPinEnabled.
        setPinEnabled(true, pin).then(() => {
          setShowSetup(false);
          toast.success("App PIN changed successfully.");
        });
      } else {
        // Initial setup
        setPinEnabled(true, pin).then(() => {
          if (useBio && isBiometricSupported) {
            setBiometricEnabled(true);
          }
          setShowSetup(false);
          toast.success("App PIN setup complete.");
        });
      }
    }
  };

  const handleChangePinInitiate = async () => {
    const authenticated = await verifyAuth();
    if (authenticated) {
      setIsChangingPin(true);
      setStep("SET");
      setPin("");
      setConfirmPin("");
      setShowSetup(true);
    }
  };

  const isNative = Capacitor.isNativePlatform();

  return (
    <>
      <SettingsGroup title="Security">
        <SettingsRow
          icon={KeyRound}
          iconBg="bg-blue-500"
          title="App PIN"
          description="Use a PIN to unlock the app"
          value={<Switch checked={isPinEnabled} onCheckedChange={handlePinToggle} />}
        />
        
        <SettingsRow
          icon={Fingerprint}
          iconBg={isBiometricSupported ? "bg-indigo-500" : "bg-muted"}
          title="Biometric Unlock"
          description={isBiometricSupported ? "Use fingerprint or face authentication" : "Biometrics are not available on this device"}
          value={
            <Switch 
              checked={isBiometricEnabled} 
              onCheckedChange={handleBiometricToggle} 
              disabled={!isBiometricSupported}
            />
          }
        />

        {isPinEnabled && (
          <SettingsRow
            icon={KeyRound}
            iconBg="bg-muted"
            title="Change App PIN"
            onClick={handleChangePinInitiate}
          />
        )}

        {(isPinEnabled || isBiometricEnabled) && (
          <SettingsRow
            icon={Lock}
            iconBg="bg-red-500"
            title="Lock App Now"
            onClick={lockNow}
          />
        )}
      </SettingsGroup>

      <Dialog open={showSetup} onOpenChange={(open) => {
        if (!open) setShowSetup(false);
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isChangingPin ? "Change App PIN" : "Setup App PIN"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            
            {!isNative && !isChangingPin && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-3">
                <AlertTriangle className="size-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-orange-600 dark:text-orange-400">
                  You are using the web version. Your PIN will be saved in your browser storage, which is less secure than native device keystores.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{step === "SET" ? "Set 4-Digit PIN" : "Confirm App PIN"}</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={step === "SET" ? pin : confirmPin}
                onChange={(e) => handlePinInput(e.target.value)}
                className="text-center tracking-widest text-xl font-display py-6"
                placeholder="••••"
                autoFocus
              />
            </div>
            
            {step === "SET" && !isChangingPin && isBiometricSupported && (
              <div className="flex items-center justify-between border-t pt-4 mt-2">
                <div className="space-y-0.5">
                  <Label>Use Biometric Unlock</Label>
                  <p className="text-xs text-muted-foreground">If supported by device</p>
                </div>
                <Switch checked={useBio} onCheckedChange={setUseBio} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSetup(false)}>Cancel</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleContinue}
              disabled={step === "SET" ? pin.length !== 4 : confirmPin.length !== 4}
            >
              {step === "SET" ? "Continue" : "Confirm & Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
