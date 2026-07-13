require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function mergeTypo() {
  try {
    const expensesRef = db.collection('expenses');
    
    // Fetch all 엑티비티
    const typoSnapshot = await expensesRef.where('team', '==', '엑티비티').get();
    
    // Fetch all 액티비티
    const correctSnapshot = await expensesRef.where('team', '==', '액티비티').get();
    const correctRecords = correctSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let mergedCount = 0;
    let deletedDuplicateCount = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of typoSnapshot.docs) {
      const data = doc.data();
      
      const isDuplicate = correctRecords.some(correctData => {
        return correctData.amount === data.amount &&
               correctData.date === data.date &&
               correctData.description === data.description &&
               correctData.assigned_project === data.assigned_project;
      });

      if (isDuplicate) {
        batch.delete(doc.ref);
        deletedDuplicateCount++;
      } else {
        batch.update(doc.ref, { team: '액티비티' });
        mergedCount++;
      }
      
      batchCount++;
      
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`Migration completed safely. Merged: ${mergedCount}, Deleted Duplicates: ${deletedDuplicateCount}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

mergeTypo();
