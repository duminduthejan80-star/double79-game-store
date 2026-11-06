// Firebase web configuration is public. Never substitute a private Google API key.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_WEB_API_KEY || undefined,
  authDomain: "double79-game-store-db-1.firebaseapp.com",
  projectId: "double79-game-store-db-1",
  storageBucket: "double79-game-store-db-1.firebasestorage.app",
  messagingSenderId: "404065480958",
  appId: "1:404065480958:web:7fc82ef41a5a3700f975af",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || undefined,
};
