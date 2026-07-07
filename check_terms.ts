import { db } from './src/lib/firebaseAdmin';

async function checkTerms() {
  const terms = ['임원실', '모토아레나 공사중'];
  console.log('--- Expenses ---');
  for (const term of terms) {
    const snapshot = await db.collection('expenses').where('assigned_project', '==', term).limit(1).get();
    console.log(`Found ${snapshot.size > 0 ? 'some' : '0'} expenses for "${term}"`);
    if (!snapshot.empty) {
      snapshot.docs.forEach(doc => {
        console.log('Example Expense:', doc.data());
      });
    }
  }

  console.log('--- Revenues ---');
  for (const term of terms) {
    const snapshot = await db.collection('revenues').where('branch_name', '==', term).limit(1).get();
    console.log(`Found ${snapshot.size > 0 ? 'some' : '0'} revenues for "${term}"`);
    if (!snapshot.empty) {
      snapshot.docs.forEach(doc => {
        console.log('Example Revenue:', doc.data());
      });
    }
  }
}

checkTerms().catch(console.error);
