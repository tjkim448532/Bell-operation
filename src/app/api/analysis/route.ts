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
    const excludedExpenseTerms: string[] = [];
    expenseFilterSnapshot.forEach((doc: any) => {
      excludedExpenseTerms.push(doc.data().term);
    });

    // Get revenue filters
    const revenueFilterSnapshot = await db.collection('revenue_filters').get();
    const excludedRevenueTerms: string[] = [];
    revenueFilterSnapshot.forEach((doc: any) => {
      excludedRevenueTerms.push(doc.data().term);
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
        const term1 = String(data.mapped_term || '');
        const term2 = String(data.original_term || '');
        const desc = String(data.description || '');
        const proj = String(data.assigned_project || data.branch_name || '');
        const dept = String(data.dept_name || '');

        const isExcluded = excludedExpenseTerms.some(filter => 
          term1.includes(filter) || term2.includes(filter) || desc.includes(filter) || proj.includes(filter) || dept.includes(filter)
        );
        if (isExcluded) return;
      }

      // Filter out excluded revenues
      if (type === 'revenue') {
        const term = String(data.branch_name || data.assigned_project || '');
        const isExcluded = excludedRevenueTerms.some(filter => term.includes(filter));
        if (isExcluded) return;
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
