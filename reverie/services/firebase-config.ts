/**
 * Firebase Configuration for Reverie
 * Uses the Firebase JS SDK (compatible with Expo Go)
 *
 * Set your credentials in the .env file at the project root.
 * Variables must be prefixed with EXPO_PUBLIC_ to be available at runtime.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  type CollectionReference,
  type DocumentData,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent duplicate init on hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with memory cache (React Native has no IndexedDB)
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} catch {
  // Already initialized (hot reload), just get the existing instance
  db = getFirestore(app);
}

export { db };

/**
 * Returns the Firestore collection reference for messages.
 * Path: /chats/main/messages
 */
export function getMessagesCollection(): CollectionReference<DocumentData> {
  return collection(db, 'chats', 'main', 'messages');
}
