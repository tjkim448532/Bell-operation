import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'expense';
    const team = searchParams.get('team') || 'all';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    const collectionName = type === 'expense' ? 'expenses' : 'revenues';
    let query: any = db.collection(collectionName);
    
    // We will filter by team in memory to avoid needing a Firestore composite index.
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      let end = new Date(endDateStr);
      
      if (endDateStr.length === 7) {
        end.setUTCMonth(end.getUTCMonth() + 1);
        end = new Date(end.getTime() - 1);
      } else {
        end.setUTCHours(23, 59, 59, 999);
      }
      query = query.where('date', '>=', start).where('date', '<=', end);
    }
    
    // Get expense filters
    const expenseFilterSnapshot = await db.collection('expense_filters').get();
    const excludedExpenseTerms = new Set<string>();
    expenseFilterSnapshot.forEach((doc: any) => {
      excludedExpenseTerms.add(doc.data().term);
    });

    // Get revenue filters
    const revenueFilterSnapshot = await db.collection('revenue_filters').get();
    const excludedRevenueTerms = new Set<string>();
    revenueFilterSnapshot.forEach((doc: any) => {
      excludedRevenueTerms.add(doc.data().term);
    });

    const snapshot = await query.get();
    
    let records: any[] = [];
    snapshot.forEach((doc: any) => {
      const data = doc.data();

      // Manual team filter
      if (team !== 'all' && data.team !== team) {
        return;
      }

      // Filter out excluded expenses
      if (type === 'expense') {
        const term = data.mapped_term || data.original_term;
        if (excludedExpenseTerms.has(term) || excludedExpenseTerms.has(data.original_term)) {
          return;
        }
      }

      // Filter out excluded revenues
      if (type === 'revenue') {
        const term = data.branch_name || data.assigned_project;
        if (excludedRevenueTerms.has(term) || excludedRevenueTerms.has(data.branch_name)) {
          return;
        }
      }

      if (data.date && typeof data.date.toDate === 'function') {
        data.date = data.date.toDate().toISOString();
      }
      records.push({ id: doc.id, ...data });
    });
    
    // Sort by date desc in memory since we don't have an index yet
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Send all records for the period to allow client-side aggregation
    return NextResponse.json(records);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
