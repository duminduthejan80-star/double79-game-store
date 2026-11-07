// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Firestore Database එක සඳහා

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7231I-RSbzQy92627ePxIv288Ttwow54",
  authDomain: "double79-game-store-db-1.firebaseapp.com",
  projectId: "double79-game-store-db-1",
  storageBucket: "double79-game-store-db-1.firebasestorage.app",
  messagingSenderId: "404065480958",
  appId: "1:404065480958:web:7fc82ef41a5a3700f975af",
  measurementId: "G-W2Y7F966ZH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export db so you can use it in other components to save/fetch data
export const db = getFirestore(app);
