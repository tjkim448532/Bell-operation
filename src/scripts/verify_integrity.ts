import * as fs from 'fs';
import * as xlsx from 'xlsx';
import * as admin from 'firebase-admin';

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('c:/Users/tj_ki/Desktop/레져본부/leisure-app/src/lib/service-account.json'))
  });
}
const db = admin.firestore();

import { parseExpenseBuffer, parseRevenueBuffer } from '../lib/parser';

async function verify() {
  console.log("=== VERIFICATION START ===");
  
  // 1. Check Expenses
  console.log("\n--- EXPENSE VERIFICATION ---");
  const expPath = 'C:\\Users\\tj_ki\\Desktop\\레져본부\\업로드\\26.05_지출 내역 (1).xlsx';
  const expBuffer = fs.readFileSync(expPath);
  
  const mappingsSnapshot = await db.collection('team_mappings').get();
  const mappingDict: Record<string, string> = {};
  mappingsSnapshot.forEach(doc => mappingDict[doc.data().columnName] = doc.data().teamName);
  
  const expFiltersSnapshot = await db.collection('expense_filters').get();
  const expenseFilters: string[] = [];
  expFiltersSnapshot.forEach(doc => expenseFilters.push(doc.data().term));

  const expRecords = await parseExpenseBuffer(expBuffer, '26.05_지출 내역 (1).xlsx', mappingDict, expenseFilters);
  const expParsedSum = expRecords.reduce((sum, r) => sum + r.amount, 0);
  
  console.log(`Parsed Expense Records: ${expRecords.length}`);
  console.log(`Parsed Expense Sum: ${expParsedSum.toLocaleString()}`);

  // 2. Check Revenues
  console.log("\n--- REVENUE VERIFICATION ---");
  const revPath = 'C:\\Users\\tj_ki\\Desktop\\레져본부\\업로드\\5월.xlsx';
  const revBuffer = fs.readFileSync(revPath);

  const revFiltersSnapshot = await db.collection('revenue_filters').get();
  const revenueFilters: string[] = [];
  revFiltersSnapshot.forEach(doc => revenueFilters.push(doc.data().term));

  const revRecords = await parseRevenueBuffer(revBuffer, '5월.xlsx', mappingDict, revenueFilters);
  const revParsedSum = revRecords.reduce((sum, r) => sum + r.amount, 0);
  
  console.log(`Parsed Revenue Records: ${revRecords.length}`);
  console.log(`Parsed Revenue Sum: ${revParsedSum.toLocaleString()}`);

  // 3. Database Integrity Check
  console.log("\n--- DB INTEGRITY CHECK ---");
  const dbExpSnapshot = await db.collection('expenses').get();
  const dbRevSnapshot = await db.collection('revenues').get();
  
  const dbExpSum = dbExpSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
  const dbRevSum = dbRevSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
  
  console.log(`DB Expense Records: ${dbExpSnapshot.size}`);
  console.log(`DB Expense Sum: ${dbExpSum.toLocaleString()}`);
  console.log(`DB Revenue Records: ${dbRevSnapshot.size}`);
  console.log(`DB Revenue Sum: ${dbRevSum.toLocaleString()}`);

  if (dbExpSnapshot.size === 0 && dbRevSnapshot.size === 0) {
      console.log("DB is empty. You need to upload the files via the web UI first to test duplicates.");
  }
}

verify().catch(console.error);
