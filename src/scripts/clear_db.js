const admin = require('firebase-admin');
const serviceAccount = require('../lib/service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function clearDB() {
  console.log("Fetching all revenues and expenses to delete...");
  const revSnapshot = await db.collection('revenues').get();
  const expSnapshot = await db.collection('expenses').get();
  
  let totalRev = 0;
  revSnapshot.forEach(doc => {
      totalRev += doc.data().amount || 0;
  });
  console.log(`Current Total Revenue in DB: ${totalRev.toLocaleString()}`);

  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  for (const doc of revSnapshot.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Deleted ${count} revenues...`);
    }
  }
  
  for (const doc of expSnapshot.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Deleted ${count} docs total...`);
    }
  }
  
  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`Finished deleting ${count} total documents!`);
}

clearDB().catch(console.error);
