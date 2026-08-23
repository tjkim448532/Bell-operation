const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function inspectSettings() {
  const selDoc = await db.collection('settings').doc('leisureSelection').get();
  console.log('leisureSelection exists:', selDoc.exists);
  if (selDoc.exists) {
    console.log('leisureSelection data:', selDoc.data());
  }

  const customDoc = await db.collection('settings').doc('customTeams').get();
  console.log('customTeams exists:', customDoc.exists);
  if (customDoc.exists) {
    console.log('customTeams data:', customDoc.data());
  }
}

inspectSettings();
