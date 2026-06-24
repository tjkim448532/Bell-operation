import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const revSnapshot = await db.collection('revenues').limit(5).get();
    const expSnapshot = await db.collection('expenses').limit(5).get();
    
    const revFilters = await db.collection('revenue_filters').get();
    const expFilters = await db.collection('expense_filters').get();

    const revenues = revSnapshot.docs.map((d: any) => d.data());
    const expenses = expSnapshot.docs.map((d: any) => d.data());
    const rFilters = revFilters.docs.map((d: any) => d.data());
    const eFilters = expFilters.docs.map((d: any) => d.data());

    // Also get counts
    const revCount = (await db.collection('revenues').count().get()).data().count;
    const expCount = (await db.collection('expenses').count().get()).data().count;

    return NextResponse.json({
      counts: { revenues: revCount, expenses: expCount },
      revenues,
      expenses,
      rFilters,
      eFilters
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
