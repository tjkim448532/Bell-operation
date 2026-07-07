const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase (Assuming standard initialization works here)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function checkTerms() {
  const terms = ['임원실', '모토아레나 공사중'];
  console.log('--- Expenses ---');
  for (const term of terms) {
    const snapshot = await db.collection('expenses').where('assigned_project', '==', term).get();
    console.log(`Found ${snapshot.size} expenses for "${term}"`);
    if (!snapshot.empty) {
      snapshot.docs.slice(0, 1).forEach(doc => {
        console.log('Example:', doc.data());
      });
    }
  }

  console.log('--- Revenues ---');
  for (const term of terms) {
    const snapshot = await db.collection('revenues').where('branch_name', '==', term).get();
    console.log(`Found ${snapshot.size} revenues for "${term}"`);
    if (!snapshot.empty) {
      snapshot.docs.slice(0, 1).forEach(doc => {
        console.log('Example:', doc.data());
      });
    }
  }
}

checkTerms().catch(console.error);
