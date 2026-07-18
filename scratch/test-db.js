const admin = require('firebase-admin');
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch(e) {
  serviceAccount = require('../firebase-service-account.json');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('expenses').limit(5).get();
  snapshot.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run();
