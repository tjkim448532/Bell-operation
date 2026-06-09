// Bypass Next.js bundler to prevent it from hardcoding the firebase-admin symlink path
const { getApps, initializeApp, cert } = eval(`require('firebase-admin/app')`);
const { getFirestore } = eval(`require('firebase-admin/firestore')`);
import path from 'path';

if (!getApps().length) {
  try {
    const serviceAccount = require('./service-account.json');

    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin Initialization error:', error);
  }
}

export const db = getFirestore();
