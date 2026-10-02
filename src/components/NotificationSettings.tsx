import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellRing, Activity, Target, PieChart, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { requestNotificationPermissionAndSaveToken, disableNotifications, defaultPreferences, type NotificationPreferences } from "@/lib/notifications";
import { doc, onSnapshot } from "firebase/firestore";
import { firebaseDb, firebaseMessaging } from "@/lib/firebase";
import { toast } from "sonner";
import { getToken } from "firebase/messaging";

export function NotificationSettings() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    if (!user) return;

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
        const token = await getToken(messaging, { 
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          // Listen to the specific token document in Firestore to get preferences and status
          const unsub = onSnapshot(doc(firebaseDb(), `users/${user.uid}/fcmTokens`, token), (doc) => {
            if (doc.exists()) {
              setIsEnabled(true);
              if (doc.data().preferences) {
                setPreferences(doc.data().preferences as NotificationPreferences);
              }
            } else {
              setIsEnabled(false);
            }
            setLoading(false);
          });
          return () => unsub();
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
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    if (!user) return;
    
    setLoading(true);
    if (checked) {
      const success = await requestNotificationPermissionAndSaveToken(user.uid, preferences);
      if (success) {
        setIsEnabled(true);
        toast.success("Push notifications enabled!");
      } else {
        setIsEnabled(false);
      }
    } else {
      await disableNotifications(user.uid);
      setIsEnabled(false);
      toast.success("Push notifications disabled.");
    }
    setLoading(false);
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
    <Card className="border-border/50 shadow-sm overflow-hidden mt-6">
      <CardHeader className="bg-slate-50/50 border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bell className="size-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Push Notifications</CardTitle>
            <CardDescription>Stay updated on your expenses and family budget.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive alerts for important activities.
            </p>
          </div>
          <Switch 
            checked={isEnabled} 
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {isEnabled && (
          <div className="mt-6 space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium text-slate-900 mb-2">Notification Preferences</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="size-4 text-slate-500" />
                <Label className="text-sm font-medium">Expense Reminders</Label>
              </div>
              <Switch 
                checked={preferences.expenseReminders} 
                onCheckedChange={(c) => updatePreference('expenseReminders', c)} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="size-4 text-slate-500" />
                <Label className="text-sm font-medium">Income Reminders</Label>
              </div>
              <Switch 
                checked={preferences.incomeReminders} 
                onCheckedChange={(c) => updatePreference('incomeReminders', c)} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="size-4 text-slate-500" />
                <Label className="text-sm font-medium">Family Activity</Label>
              </div>
              <Switch 
                checked={preferences.familyActivity} 
                onCheckedChange={(c) => updatePreference('familyActivity', c)} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PieChart className="size-4 text-slate-500" />
                <Label className="text-sm font-medium">Monthly Summary</Label>
              </div>
              <Switch 
                checked={preferences.monthlySummary} 
                onCheckedChange={(c) => updatePreference('monthlySummary', c)} 
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
