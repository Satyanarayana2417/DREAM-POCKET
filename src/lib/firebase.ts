import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function initFirebase(config: FirebaseOptions) {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(config);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  }
  return { auth: authInstance!, db: dbInstance! };
}

export function firebaseAuth(): Auth {
  if (!authInstance) throw new Error("Firebase is still starting up. Please try again.");
  return authInstance;
}

export function firebaseDb(): Firestore {
  if (!dbInstance) throw new Error("Firebase is still starting up. Please try again.");
  return dbInstance;
}

export function isFirebaseReady() {
  return Boolean(authInstance && dbInstance);
}
