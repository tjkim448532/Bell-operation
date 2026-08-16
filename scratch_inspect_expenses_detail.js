const fs = require('fs');
const dotenv = require('dotenv');

// Load .env.local
if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

if (!getApps().length) {
  if (serviceAccount) {
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp({ projectId: 'bell-operation' });
  }
}

const db = getFirestore();

async function inspectExpensesData() {
  console.log('=== Checking Firestore Expenses for 2026-07 ===');
  
  // 1. Query for month == '2026-07'
  const snap = await db.collection('expenses').where('month', '>=', '2026-07').where('month', '<=', '2026-07').get();
  console.log(`Documents count for 2026-07: ${snap.size}`);

  const teamBreakdown = {};
  const itemsList = [];
  snap.forEach(doc => {
    const d = doc.data();
    const t = d.team || '미분류';
    const amt = Number(d.amount) || 0;
    if (!teamBreakdown[t]) teamBreakdown[t] = { total: 0, items: [] };
    teamBreakdown[t].total += amt;
    teamBreakdown[t].items.push({ name: d.facilityName || d.accountName || d.name || '항목', amount: amt, month: d.month });
    itemsList.push(d);
  });

  let grandTotal = 0;
  Object.keys(teamBreakdown).sort().forEach(t => {
    grandTotal += teamBreakdown[t].total;
    console.log(`\n[팀: ${t}] 총액: ${teamBreakdown[t].total.toLocaleString()} 원 (${teamBreakdown[t].items.length}개 항목)`);
    // top 5 items
    teamBreakdown[t].items.sort((a, b) => b.amount - a.amount).slice(0, 5).forEach(item => {
      console.log(`   - ${item.name}: ${item.amount.toLocaleString()} 원`);
    });
  });

  console.log(`\n===> 2026-07 총지출 합계: ${grandTotal.toLocaleString()} 원`);

  // 2. Also check common_expenses
  const commonSnap = await db.collection('common_expenses').where('month', '>=', '2026-07').where('month', '<=', '2026-07').get();
  console.log(`\nCommon Expenses for 2026-07: ${commonSnap.size} docs`);
  commonSnap.forEach(doc => {
    const d = doc.data();
    console.log(` [공통비용] ${d.facilityName || d.name}: ${(Number(d.amount) || 0).toLocaleString()} 원`);
  });
}

inspectExpensesData();
