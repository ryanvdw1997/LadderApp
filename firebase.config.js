// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA8mpyz-7b6p74qwTv_yOEnjCQnnNjUG-4",
  authDomain: "ladder-battle-app.firebaseapp.com",
  projectId: "ladder-battle-app",
  storageBucket: "ladder-battle-app.firebasestorage.app",
  messagingSenderId: "537009397754",
  appId: "1:537009397754:web:1f9c39660e04e16735ce43",
  measurementId: "G-GK1X9TRXN1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (web only)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set persistence to session-based (session clears when browser closes)
// IMPORTANT: Firebase Auth shares state across all tabs/windows in the same browser
// To test with multiple accounts simultaneously:
//   1. Use different browsers (Chrome, Firefox, Edge, etc.)
//   2. Use incognito/private browsing for one account
//   3. Use different browser profiles (Chrome profiles, Firefox containers)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });
}

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;