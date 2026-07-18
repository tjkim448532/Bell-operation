import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const expSnapshot = await db.collection('expenses').limit(5).get();
    const expenses = expSnapshot.docs.map(d => d.data());
    return NextResponse.json({ expenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
