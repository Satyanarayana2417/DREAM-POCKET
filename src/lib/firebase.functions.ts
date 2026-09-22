import { createServerFn } from "@tanstack/react-start";

/** Public (publishable) Firebase web config. The API key is a publishable
 * browser key but is kept in project secrets, so it is served at runtime. */
export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    apiKey: process.env["FIREBASE_WEB_API_KEY"] ?? "",
    authDomain: "expensemanager-36736.firebaseapp.com",
    projectId: "expensemanager-36736",
    storageBucket: "expensemanager-36736.firebasestorage.app",
    messagingSenderId: "1060457615492",
    appId: "1:1060457615492:web:2f171aa91a3e86a23c32d1",
    measurementId: process.env["FIREBASE_MEASUREMENT_ID"] ?? "",
  };
});
