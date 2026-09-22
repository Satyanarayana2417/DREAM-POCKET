import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

export function initFirebase(config: FirebaseOptions) {
  if (!config.apiKey) {
    throw new Error("Missing Firebase API Key. Please create a .env file with VITE_FIREBASE_WEB_API_KEY.");
  }
  
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(config);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
  }
  return { auth: authInstance!, db: dbInstance!, storage: storageInstance! };
}

export function firebaseAuth(): Auth {
  if (!authInstance) throw new Error("Firebase is still starting up. Please try again.");
  return authInstance;
}

export function firebaseDb(): Firestore {
  if (!dbInstance) throw new Error("Firebase is still starting up. Please try again.");
  return dbInstance;
}

export function firebaseStorage(): FirebaseStorage {
  if (!storageInstance) throw new Error("Firebase is still starting up. Please try again.");
  return storageInstance;
}

export function isFirebaseReady() {
  return Boolean(authInstance && dbInstance);
}
