import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const snapshot = await db.collection('expenses').where('team', '==', '기타').get();
    const items: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      items.push({ 
        id: doc.id, 
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date 
      });
    });

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
