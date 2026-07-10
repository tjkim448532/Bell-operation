const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./vercel.json').env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}') : require('./serviceAccountKey.json'))
  });
}
const db = admin.firestore();

async function check() {
  const snap = await db.collection('team_mappings').get();
  console.log('Docs count:', snap.size);
  if (snap.size > 0) {
    console.log('Sample doc:', snap.docs[0].id, snap.docs[0].data());
  }
}
check();
