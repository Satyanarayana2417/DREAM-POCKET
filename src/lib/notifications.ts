import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { firebaseMessaging, firebaseDb } from "./firebase";
import { toast } from "sonner";
import { router } from "@/main";

// Define the preferences interface
export interface NotificationPreferences {
  expenseReminders: boolean;
  incomeReminders: boolean;
  familyActivity: boolean;
  monthlySummary: boolean;
}

export const defaultPreferences: NotificationPreferences = {
  expenseReminders: true,
  incomeReminders: true,
  familyActivity: true,
  monthlySummary: true,
};

export async function requestNotificationPermissionAndSaveToken(uid: string, preferences: NotificationPreferences = defaultPreferences) {
  try {
    let permission = Notification.permission;
    if (permission !== "granted") {
      try {
        permission = await new Promise<NotificationPermission>((resolve, reject) => {
          const promise = Notification.requestPermission((result) => {
            resolve(result);
          });
          if (promise) {
            promise.then(resolve).catch(reject);
          }
        });
      } catch (err) {
        console.error("Permission request error:", err);
      }
    }

    if (permission !== "granted") {
      toast.error("Notification permission denied by browser");
      return false;
    }

    const messaging = await firebaseMessaging();
    if (!messaging) {
      toast.error("Firebase Messaging is not supported on this browser.");
      return false;
    }

    // Get the service worker registration explicitly to pass to getToken
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn("No default service worker registration found. Attempting to find any registration...");
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        registration = registrations[0];
      } else {
        // Fallback to registering it manually if somehow missing
        try {
          registration = await navigator.serviceWorker.register('/sw.js');
        } catch (e) {
          console.error("Manual SW registration failed:", e);
        }
      }
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error("Missing VITE_FIREBASE_VAPID_KEY in .env");
      toast.error("Missing VAPID key configuration.");
      return false;
    }

    const token = await getToken(messaging, { 
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    
    if (token) {
      // Save token securely under the user's uid in Firestore
      const tokenDocRef = doc(firebaseDb(), `users/${uid}/fcmTokens`, token);
      await setDoc(tokenDocRef, {
        token,
        devicePlatform: navigator.platform,
        userAgent: navigator.userAgent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences,
      });
      return true;
    } else {
      toast.error("Failed to generate notification token.");
      return false;
    }
  } catch (error: any) {
    console.error("Error getting notification permission or token", error);
    // Extract a more helpful error message from Firebase if available
    const errorMessage = error?.message || "Unknown error";
    toast.error(`Failed to enable notifications: ${errorMessage}`);
    return false;
  }
}

export async function disableNotifications(uid: string) {
  try {
    const messaging = await firebaseMessaging();
    if (!messaging) return;
    
    const registration = await navigator.serviceWorker.getRegistration();
    const token = await getToken(messaging, { 
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      // Delete the token from Firestore
      const tokenDocRef = doc(firebaseDb(), `users/${uid}/fcmTokens`, token);
      await deleteDoc(tokenDocRef);
    }
  } catch (error) {
    console.error("Error disabling notifications", error);
  }
}

export async function setupForegroundMessageListener(uid?: string) {
  const messaging = await firebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, async (payload) => {
    console.log("Received foreground message:", payload);
    const title = payload.notification?.title || "New Notification";
    const body = payload.notification?.body || "";
    const url = payload.data?.url || "";
    
    toast(title, {
      description: body,
      action: url ? {
        label: "View",
        onClick: () => {
          router.navigate({ to: url });
        }
      } : undefined
    });

    if (uid) {
      const { addNotificationHistory } = await import("./notificationHistory");
      await addNotificationHistory(uid, {
        title,
        body,
        type: "system",
        read: false,
        route: url || undefined,
        data: payload.data
      });
    }
  });
}
