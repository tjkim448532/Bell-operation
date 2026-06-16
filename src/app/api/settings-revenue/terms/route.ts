import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const snapshot = await db.collection('revenues').get();
    const uniqueTerms = new Set<string>();
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.branch_name) {
        uniqueTerms.add(data.branch_name);
      }
    });

    const termsArray = Array.from(uniqueTerms).sort();
    return NextResponse.json(termsArray);
  } catch (error) {
    console.error('Failed to fetch revenue terms:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue terms' }, { status: 500 });
  }
}
