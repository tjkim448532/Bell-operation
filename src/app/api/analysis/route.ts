import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');
    const team = searchParams.get('team') || 'all';



    let expQuery: any = db.collection('expenses');

    if (monthStr) {
      expQuery = expQuery.where('month', '==', monthStr);
    }

    const snapshot = await expQuery.get();
    let records: any[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      
      let mappedTeam = data.team || '기타';

      
      // Filter by team if requested
      if (team === 'all' || mappedTeam === team) {
        records.push({
          id: doc.id,
          ...data,
          team: mappedTeam
        });
      }
    });

    // Sort by date descending
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return NextResponse.json(records);
    
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expense data' }, { status: 500 });
  }
}
