import { collection, doc, query, orderBy, onSnapshot, writeBatch, deleteDoc, setDoc, getDocs, updateDoc, where } from "firebase/firestore";
import { firebaseDb } from "./firebase";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "expense" | "income" | "family" | "system";
  createdAt: string;
  read: boolean;
  route?: string;
  data?: any;
}

// Add a notification to history
export async function addNotificationHistory(uid: string, notification: Omit<AppNotification, "id">) {
  if (!uid) return;
  const docRef = doc(collection(firebaseDb(), `users/${uid}/notifications`));
  await setDoc(docRef, {
    ...notification,
    id: docRef.id,
    createdAt: new Date().toISOString()
  });
}

// Subscribe to unread count
export function subscribeToUnreadCount(uid: string, callback: (count: number) => void) {
  if (!uid) {
    callback(0);
    return () => {};
  }
  const q = query(
    collection(firebaseDb(), `users/${uid}/notifications`),
    where("read", "==", false)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

// Subscribe to all notifications
export function subscribeToNotifications(uid: string, callback: (notifications: AppNotification[]) => void) {
  if (!uid) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(firebaseDb(), `users/${uid}/notifications`),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const notifications: AppNotification[] = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as AppNotification);
    });
    callback(notifications);
  });
}

export async function markNotificationAsRead(uid: string, notificationId: string) {
  if (!uid || !notificationId) return;
  const docRef = doc(firebaseDb(), `users/${uid}/notifications`, notificationId);
  await updateDoc(docRef, { read: true });
}

export async function markAllNotificationsAsRead(uid: string) {
  if (!uid) return;
  const q = query(
    collection(firebaseDb(), `users/${uid}/notifications`),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  
  const batch = writeBatch(firebaseDb());
  snapshot.forEach((d) => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
}

export async function deleteNotification(uid: string, notificationId: string) {
  if (!uid || !notificationId) return;
  await deleteDoc(doc(firebaseDb(), `users/${uid}/notifications`, notificationId));
}

export async function deleteSelectedNotifications(uid: string, notificationIds: string[]) {
  if (!uid || !notificationIds.length) return;
  const batch = writeBatch(firebaseDb());
  notificationIds.forEach(id => {
    const docRef = doc(firebaseDb(), `users/${uid}/notifications`, id);
    batch.delete(docRef);
  });
  await batch.commit();
}

export async function deleteAllNotifications(uid: string) {
  if (!uid) return;
  const q = query(collection(firebaseDb(), `users/${uid}/notifications`));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  
  const batch = writeBatch(firebaseDb());
  snapshot.forEach(d => {
    batch.delete(d.ref);
  });
  await batch.commit();
}
