const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'bell-operation' });
}

const db = admin.firestore();

async function check() {
  const selDoc = await db.collection('settings').doc('leisureSelection').get();
  console.log('leisureSelection:', selDoc.data());

  const teamMappings = await db.collection('team_mappings').get();
  const mappingDict = {};
  teamMappings.forEach(doc => {
    const data = doc.data();
    if (data.columnName && data.teamName) mappingDict[data.columnName] = data.teamName;
  });
  console.log('teamMappings count:', Object.keys(mappingDict).length);

  const expSnapshot = await db.collection('expenses').where('month', '==', '2026-06').get();
  let total = 0;
  const groups = {};
  expSnapshot.forEach(doc => {
    const d = doc.data();
    total += d.amount || 0;
    const t = d.team || 'NONE';
    groups[t] = (groups[t] || 0) + (d.amount || 0);
  });
  console.log('2026-06 total:', total);
  console.log('2026-06 groups:', groups);
}

check().catch(console.error);
