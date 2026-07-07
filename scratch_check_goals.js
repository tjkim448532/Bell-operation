const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./src/lib/service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'bell-operation'
});

const db = admin.firestore();

async function checkGoals() {
  try {
    const doc = await db.collection('goals').doc('2026').get();
    if (!doc.exists) {
      console.log('No goals found in 2026 document.');
    } else {
      const data = doc.data();
      console.log('Goals data preview:');
      console.log('Visitors Keys:', Object.keys(data.visitors || {}));
      console.log('Visitors Target keys:', Object.keys(data.visitors?.target || {}));
      console.log('Visitors Target [레저본부 방문객]:', data.visitors?.target?.['레저본부 방문객']);
      console.log('Utilization Keys:', Object.keys(data.utilization || {}));
      console.log('Utilization Target keys:', Object.keys(data.utilization?.target || {}));
    }
  } catch (error) {
    console.error('Error fetching goals:', error);
  }
}

checkGoals();
