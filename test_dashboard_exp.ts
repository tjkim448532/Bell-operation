import { db } from './src/lib/firebaseAdmin';

async function test() {
  const startDateStr = "2026-06";
  const endDateStr = "2026-06";

  let expQuery: any = db.collection('expenses');
  const start = new Date(startDateStr);
  let end = new Date(endDateStr);
  if (endDateStr.length === 7) {
    end.setUTCMonth(end.getUTCMonth() + 1);
    end = new Date(end.getTime() - 1);
  }
  expQuery = expQuery.where('date', '>=', start).where('date', '<=', end);

  const expSnapshot = await expQuery.get();
  console.log('Expenses count:', expSnapshot.size);

  let totalExpense = 0;
  expSnapshot.forEach(doc => {
    totalExpense += doc.data().amount || 0;
  });
  console.log('Total Expense:', totalExpense);
}

test().catch(console.error);
