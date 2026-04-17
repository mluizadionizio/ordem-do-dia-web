import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getAuth, indexedDBLocalPersistence, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// indexedDBLocalPersistence evita o erro "missing initial state" em Safari/iOS
// onde o sessionStorage é bloqueado por storage partitioning
let _auth;
try {
  _auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
} catch {
  _auth = getAuth(app);
}
export const auth = _auth;
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
