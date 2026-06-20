import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

if (!admin.apps.length) {
  try {
    const filePath = path.join(process.cwd(), 'src/lib/service-account.json');
    if (fs.existsSync(filePath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin Initialized successfully with service account file.');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      });
      console.log('Firebase Admin Initialized with FIREBASE_SERVICE_ACCOUNT env var.');
    } else {
      // Fallback for Firebase Cloud Functions or GCP
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'bell-operation'
      });
      console.log('Firebase Admin Initialized with Application Default Credentials.');
    }
  } catch (error) {
    console.error('Firebase Admin Initialization error:', error);
  }
}

let dbInstance: any;
try {
  dbInstance = admin.firestore();
} catch (error: any) {
  console.error('Failed to get Firestore instance:', error.message, error.stack);
}

export const db = dbInstance;
