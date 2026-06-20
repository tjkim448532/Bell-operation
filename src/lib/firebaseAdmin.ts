import fs from 'fs';
import path from 'path';

let admin: any;

if (typeof window === 'undefined') {
  // Bypass Next.js bundler to prevent it from hardcoding or obfuscating the firebase-admin path
  admin = eval(`require('firebase-admin')`);

  if (!admin.apps.length) {
    try {
      const filePath = path.join(process.cwd(), 'src/lib/service-account.json');
      if (fs.existsSync(filePath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'bell-operation'
        });
        console.log('Firebase Admin Initialized with local service-account.json.');
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'bell-operation'
        });
        console.log('Firebase Admin Initialized with FIREBASE_SERVICE_ACCOUNT env var.');
      } else {
        // Fallback for Firebase Cloud Functions or GCP
        // In Cloud Functions, initializeApp() with no arguments automatically uses ambient credentials
        admin.initializeApp({
          projectId: 'bell-operation'
        });
        console.log('Firebase Admin Initialized with Application Default Credentials.');
      }
    } catch (error) {
      console.error('Firebase Admin Initialization error:', error);
    }
  }
}

let dbInstance: any;
if (admin) {
  try {
    // IMPORTANT: Firebase Web Frameworks automatically initializes an app named 'firebase-frameworks'.
    // If we just call admin.firestore(), it looks for the '[DEFAULT]' app and throws an error.
    // Therefore, we must explicitly pass the available app instance to firestore().
    const app = admin.apps.length > 0 ? admin.apps[0] : admin.app();
    dbInstance = admin.firestore(app);
  } catch (error: any) {
    console.error('Failed to get Firestore instance:', error.message, error.stack);
  }
}

export const db = dbInstance;
export { admin };
