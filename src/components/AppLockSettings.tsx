import React, { useState } from 'react';
import { useAppLock } from './AppLockProvider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SettingsGroup, SettingsRow } from '@/components/SettingsUI';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Capacitor } from '@capacitor/core';
import { Lock, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

export function AppLockSettings() {
  const { isLockEnabled, isBiometricEnabled, enableLock, disableLock } = useAppLock();
  
  const [showSetup, setShowSetup] = useState(false);
  const [pin, setPin] = useState("");
  const [useBio, setUseBio] = useState(true);

  // When user clicks toggle
  const handleToggle = async (checked: boolean) => {
    if (!Capacitor.isNativePlatform()) {
      toast.error("App Lock is only available in the native mobile app.");
      return;
    }
    
    if (checked) {
      setShowSetup(true);
      setPin("");
    } else {
      // Need current PIN to disable
      const entered = window.prompt("Enter your current PIN to disable App Lock:");
      if (entered) {
        const success = await disableLock(entered);
        if (success) {
          toast.success("App Lock disabled successfully.");
        } else {
          toast.error("Incorrect PIN.");
        }
      }
    }
  };

  const handleSave = async () => {
    if (pin.length !== 4) {
      toast.error("PIN must be exactly 4 digits.");
      return;
    }
    
    await enableLock(pin, useBio);
    setShowSetup(false);
    toast.success("App Lock enabled successfully.");
  };

  if (!Capacitor.isNativePlatform()) {
    return null; // Only show on native apps
  }

  return (
    <>
      <SettingsGroup>
        <SettingsRow
          icon={Lock}
          iconBg="bg-blue-500"
          title="App Lock Security"
          description="Require authentication when opening the app"
          value={<Switch checked={isLockEnabled} onCheckedChange={handleToggle} />}
        />
        {isLockEnabled && (
          <SettingsRow
            icon={Fingerprint}
            iconBg="bg-indigo-500"
            title="Biometric Authentication"
            value={isBiometricEnabled ? "Enabled" : "Disabled"}
          />
        )}
        {isLockEnabled && (
          <SettingsRow
            icon={Lock}
            iconBg="bg-slate-400"
            title="Change Security Settings"
            onClick={() => {
              setShowSetup(true);
              setPin("");
            }}
          />
        )}
      </SettingsGroup>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Setup App Lock</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Set 4-Digit PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="text-center tracking-widest text-lg font-display"
                placeholder="••••"
              />
            </div>
            
            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label>Use Face ID / Touch ID</Label>
                <p className="text-xs text-muted-foreground">If supported by device</p>
              </div>
              <Switch checked={useBio} onCheckedChange={setUseBio} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSetup(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
