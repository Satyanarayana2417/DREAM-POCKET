import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Activity, Target, PieChart, Users } from "lucide-react";
import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { useAuth } from "@/lib/auth";
import { requestNotificationPermissionAndSaveToken, disableNotifications, defaultPreferences, type NotificationPreferences } from "@/lib/notifications";
import { doc, onSnapshot } from "firebase/firestore";
import { firebaseDb, firebaseMessaging } from "@/lib/firebase";
import { toast } from "sonner";
import { getToken } from "firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { useIsMobile } from "@/hooks/use-mobile";

export function NotificationSettings() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isMobilePrefsOpen, setIsMobilePrefsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | undefined;

    const checkStatus = async () => {
      try {
        const messaging = await firebaseMessaging();
        if (!messaging) {
          setLoading(false);
          return;
        }

        if (Notification.permission !== "granted") {
          setIsEnabled(false);
          setLoading(false);
          return;
        }

        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          setIsEnabled(false);
          setLoading(false);
          return;
        }
        const token = await getToken(messaging, { 
          vapidKey: import.meta.env['VITE_FIREBASE_VAPID_KEY'],
          serviceWorkerRegistration: registration,
        });

        if (token) {
          // Listen to the specific token document in Firestore to get preferences and status
          unsubscribe = onSnapshot(doc(firebaseDb(), `users/${user.uid}/fcmTokens`, token), (doc) => {
            if (doc.exists()) {
              setIsEnabled(true);
              const data = doc.data();
              if (data && data['preferences']) {
                setPreferences(data['preferences'] as NotificationPreferences);
              }
            } else {
              setIsEnabled(false);
            }
            setLoading(false);
          });
        } else {
          setIsEnabled(false);
          setLoading(false);
        }
      } catch (err) {
        setIsEnabled(false);
        setLoading(false);
      }
    };

    checkStatus();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    if (!user) return;
    
    if (Capacitor.isNativePlatform()) {
      toast.error("Web push is not supported in the native app yet. Please use the website.");
      return;
    }

    // Optimistic UI update for immediate tactile feedback
    const previousState = isEnabled;
    setIsEnabled(checked);
    setLoading(true);

    try {
      if (checked) {
        const success = await requestNotificationPermissionAndSaveToken(user.uid, preferences);
        if (success) {
          toast.success("Push notifications enabled!");
        } else {
          // Revert if failed
          setIsEnabled(previousState);
          toast.error("Could not enable notifications. Please check your browser permissions.");
        }
      } else {
        await disableNotifications(user.uid);
        toast.success("Push notifications disabled.");
      }
    } catch (err) {
      setIsEnabled(previousState);
      toast.error("An error occurred while changing settings.");
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, checked: boolean) => {
    if (!user || !isEnabled) return;
    
    const newPrefs = { ...preferences, [key]: checked };
    setPreferences(newPrefs);
    
    // Save to Firestore by basically re-saving the token with new prefs
    const success = await requestNotificationPermissionAndSaveToken(user.uid, newPrefs);
    if (success) {
      toast.success("Notification preferences updated.");
    }
  };

  if (!("Notification" in window)) {
    return null;
  }

  return (
    <>
      <SettingsGroup>
        <SettingsRow
          icon={Bell}
          iconBg="bg-red-500"
          title="Push Notifications"
          description="Receive alerts for important activities"
          onClick={isMobile ? () => setIsMobilePrefsOpen(!isMobilePrefsOpen) : () => {}}
          value={
            <div onClick={(e) => e.stopPropagation()}>
              <Switch 
                checked={isEnabled} 
                onCheckedChange={handleToggle}
                disabled={loading}
              />
            </div>
          }
        />
      </SettingsGroup>

      <div className={`md:block ${isMobilePrefsOpen ? 'block' : 'hidden'}`}>
        <SettingsGroup title="Notification Preferences">
        <SettingsRow
          icon={Target}
          iconBg="bg-orange-500"
          title="Expense Reminders"
          value={
            <Switch 
              checked={preferences.expenseReminders} 
              onCheckedChange={(c) => updatePreference('expenseReminders', c)} 
              disabled={!isEnabled || loading}
            />
          }
        />
        <SettingsRow
          icon={Activity}
          iconBg="bg-green-500"
          title="Income Reminders"
          value={
            <Switch 
              checked={preferences.incomeReminders} 
              onCheckedChange={(c) => updatePreference('incomeReminders', c)} 
              disabled={!isEnabled || loading}
            />
          }
        />
        <SettingsRow
          icon={Users}
          iconBg="bg-blue-500"
          title="Family Activity"
          value={
            <Switch 
              checked={preferences.familyActivity} 
              onCheckedChange={(c) => updatePreference('familyActivity', c)} 
              disabled={!isEnabled || loading}
            />
          }
        />
        <SettingsRow
          icon={PieChart}
          iconBg="bg-purple-500"
          title="Monthly Summary"
          value={
            <Switch 
              checked={preferences.monthlySummary} 
              onCheckedChange={(c) => updatePreference('monthlySummary', c)} 
              disabled={!isEnabled || loading}
            />
          }
        />
      </SettingsGroup>
      </div>
    </>
  );
}
