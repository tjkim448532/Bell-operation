require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin using the same logic as the app
if (!admin.apps.length) {
  const serviceAccount = require('./src/lib/service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'bell-operation'
  });
}

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('expenses').get();
  let count0 = 0;
  let countTotal = 0;
  let samples0 = [];
  let samplesNon0 = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    countTotal++;
    const amt = data.amount;
    if (amt === 0 || amt === '0' || !amt) {
      count0++;
      if (samples0.length < 5) samples0.push(data);
    } else {
      if (samplesNon0.length < 5) samplesNon0.push(data);
    }
  });

  console.log(`Total expenses: ${countTotal}`);
  console.log(`Expenses with amount 0: ${count0}`);
  console.log(`\nSamples of 0 amount:`);
  console.log(JSON.stringify(samples0, null, 2));
  console.log(`\nSamples of non-0 amount:`);
  console.log(JSON.stringify(samplesNon0, null, 2));

  const boardDoc = await db.collection('settings').doc('board').get();
  console.log(`\nBoard settings:`);
  console.log(JSON.stringify(boardDoc.data(), null, 2));
}

run().catch(console.error);
