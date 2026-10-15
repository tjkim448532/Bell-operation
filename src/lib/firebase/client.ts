import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'bell-operation.firebaseapp.com',
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'bell-operation',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'bell-operation.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '593133920835',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    '1:593133920835:web:61f25b39170b2f62ce6af6',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const firestoreDb = getFirestore(app);

export { app, firestoreDb };
