import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const snapshot = await db.collection('expense_filters').get();
    const exclusions: any[] = [];
    snapshot.forEach((doc: any) => {
      exclusions.push({ id: doc.id, ...doc.data() });
    });
    return NextResponse.json(exclusions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expense filters' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { term } = body;

    if (!term) {
      return NextResponse.json({ error: 'Missing term parameter' }, { status: 400 });
    }

    // Check if exists
    const snapshot = await db.collection('expense_filters').where('term', '==', term).get();
    
    if (snapshot.empty) {
      const newRef = db.collection('expense_filters').doc();
      await newRef.set({ term });
      return NextResponse.json({ id: newRef.id, term });
    } else {
      return NextResponse.json({ id: snapshot.docs[0].id, term });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save expense filter' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    await db.collection('expense_filters').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete expense filter' }, { status: 500 });
  }
}
