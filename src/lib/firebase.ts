import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// These credentials match the provisioned Firebase project for the applet
const firebaseConfig = {
  apiKey: "AIzaSyAHIAYNuHQc7mGHoueXhzNlA7BzspA7JCw",
  authDomain: "cool-intelligence-hpxzt.firebaseapp.com",
  projectId: "cool-intelligence-hpxzt",
  storageBucket: "cool-intelligence-hpxzt.firebasestorage.app",
  messagingSenderId: "92627368025",
  appId: "1:92627368025:web:2ce9ffde6da7075ab51948"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-84a13026-0689-4e15-ba4d-474bc60b3eb9");
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInAnonymously, signOut };
