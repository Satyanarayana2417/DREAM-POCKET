export const getFirebaseConfig = async () => {
  return {
    apiKey: import.meta.env["VITE_FIREBASE_WEB_API_KEY"] ?? "",
    authDomain: "expensemanager-36736.firebaseapp.com",
    projectId: "expensemanager-36736",
    storageBucket: "expensemanager-36736.firebasestorage.app",
    messagingSenderId: "1060457615492",
    appId: "1:1060457615492:web:2f171aa91a3e86a23c32d1",
    measurementId: import.meta.env["VITE_FIREBASE_MEASUREMENT_ID"] ?? "",
  };
};
