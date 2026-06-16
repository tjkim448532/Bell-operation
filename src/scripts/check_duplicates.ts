import * as admin from 'firebase-admin';

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../../firebase-key.json'))
  });
}

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('revenues').where('team', '==', '엑티비티').get();
  
  let total = 0;
  const countByMonth: Record<string, number> = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    total += data.amount || 0;
    const month = data.month || 'unknown';
    countByMonth[month] = (countByMonth[month] || 0) + 1;
  });

  console.log(`Total 엑티비티 Revenue: ${total}`);
  console.log(`Record counts by month:`, countByMonth);
}

check().catch(console.error);
