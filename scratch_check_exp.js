const https = require('https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'bell-operation' });
}

const db = admin.firestore();

async function run() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';
  
  // 1. fetch v5 mappings
  let v5Rows = [];
  await new Promise((resolve) => {
    https.get(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { v5Rows = JSON.parse(data).data || []; } catch(e){}
        resolve();
      });
    });
  });

  const leisureTeams = new Set();
  v5Rows.forEach(row => {
    const teamName = String(row.teamName || row.team_name || '').trim();
    const partName = String(row.partName || row.part_name || '').trim();
    if (teamName !== '미분류' || partName !== '미분류') {
      if (partName && partName !== '미분류') leisureTeams.add(partName);
      else if (teamName && teamName !== '미분류') leisureTeams.add(teamName);
    }
  });

  const customDoc = await db.collection('settings').doc('customTeams').get();
  if (customDoc.exists) {
    (customDoc.data().teams || []).forEach(t => leisureTeams.add(t));
  }

  let explicitLeisureTeams = [];
  const selDoc = await db.collection('settings').doc('leisureSelection').get();
  if (selDoc.exists) {
    explicitLeisureTeams = selDoc.data().selectedTeams || [];
    explicitLeisureTeams = explicitLeisureTeams.map(t => t === '외주' ? '외주_놀이공원' : t);
  }

  const startDate = new Date('2026-06-01T00:00:00Z');
  const endDate = new Date('2026-06-30T23:59:59Z');

  const expSnapshot = await db.collection('expenses')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .get();

  let totalExpense = 0;
  let excludedExpense = 0;
  const expenseData = {};

  expSnapshot.forEach(doc => {
    const data = doc.data();
    const amount = data.amount || 0;
    totalExpense += amount;
    
    let team = data.team || '기타';
    if (!leisureTeams.has(team) && !['기타', '제외'].includes(team)) {
      team = '기타';
    }

    if (!explicitLeisureTeams.includes(team)) {
      excludedExpense += amount;
    }

    if (!expenseData[team]) expenseData[team] = 0;
    expenseData[team] += amount;
  });

  console.log('explicitLeisureTeams:', explicitLeisureTeams);
  console.log('leisureTeams allowed:', Array.from(leisureTeams));
  console.log('totalExpense (raw):', totalExpense);
  console.log('excludedExpense:', excludedExpense);
  console.log('displayTotalExpense:', totalExpense - excludedExpense);
  console.log('expense grouping:', expenseData);
}

run().catch(console.error);
