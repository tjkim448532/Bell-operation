import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const snapshot = await db.collection('expenses').get();
    const uniqueTerms = new Set<string>();
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.original_term) {
        uniqueTerms.add(data.original_term);
      }
    });

    const termsArray = Array.from(uniqueTerms).sort();
    return NextResponse.json(termsArray);
  } catch (error) {
    console.error('Failed to fetch expense terms:', error);
    return NextResponse.json({ error: 'Failed to fetch expense terms' }, { status: 500 });
  }
}
