import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { firebaseMessaging, firebaseDb } from "./firebase";
import { toast } from "sonner";

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
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast.error("Notification permission denied");
      return false;
    }

    const messaging = await firebaseMessaging();
    if (!messaging) {
      toast.error("Firebase Messaging is not supported on this browser.");
      return false;
    }

    // Get the service worker registration explicitly to pass to getToken
    const registration = await navigator.serviceWorker.getRegistration();

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
  } catch (error) {
    console.error("Error getting notification permission or token", error);
    toast.error("Failed to enable notifications.");
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

export async function setupForegroundMessageListener() {
  const messaging = await firebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("Received foreground message:", payload);
    const title = payload.notification?.title || "New Notification";
    const body = payload.notification?.body || "";
    
    toast(title, {
      description: body,
      action: payload.data?.url ? {
        label: "View",
        onClick: () => {
          window.location.href = payload.data!.url;
        }
      } : undefined
    });
  });
}
