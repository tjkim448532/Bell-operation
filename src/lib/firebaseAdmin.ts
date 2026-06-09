// Bypass Next.js bundler to prevent it from hardcoding the firebase-admin symlink path
const { getApps, initializeApp, cert } = eval(`require('firebase-admin/app')`);
const { getFirestore } = eval(`require('firebase-admin/firestore')`);
import path from 'path';
import fs from 'fs';

if (!getApps().length) {
  try {
    const filePath = path.join(process.cwd(), 'src/lib/service-account.json');
    if (fs.existsSync(filePath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin Initialized successfully with service account file.');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      });
      console.log('Firebase Admin Initialized with FIREBASE_SERVICE_ACCOUNT env var.');
    } else {
      // Fallback for Firebase Cloud Functions or GCP, or build time
      initializeApp();
      console.log('Firebase Admin Initialized with Application Default Credentials.');
    }
  } catch (error) {
    console.error('Firebase Admin Initialization error:', error);
  }
}

let dbInstance: any;
try {
  dbInstance = getFirestore();
} catch (error) {
  console.warn('Failed to get Firestore instance. This is expected during build time if credentials are not present.');
}

export const db = dbInstance;
