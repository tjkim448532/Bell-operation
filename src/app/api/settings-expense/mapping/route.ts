import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const snapshot = await db.collection('expense_mappings').get();
    const mappings: any[] = [];
    snapshot.forEach((doc: any) => {
      mappings.push({ id: doc.id, ...doc.data() });
    });
    return NextResponse.json(mappings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expense mappings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, targetTeam } = body;

    if (!rawText || !targetTeam) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const snapshot = await db.collection('expense_mappings').where('rawText', '==', rawText).get();
    
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await db.collection('expense_mappings').doc(docId).update({ targetTeam });
      return NextResponse.json({ success: true, message: 'Mapping updated', id: docId });
    } else {
      const newRef = await db.collection('expense_mappings').add({
        rawText,
        targetTeam,
        createdAt: new Date()
      });
      return NextResponse.json({ success: true, message: 'Mapping added', id: newRef.id });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save mapping' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing mapping id' }, { status: 400 });
    }

    await db.collection('expense_mappings').doc(id).delete();
    return NextResponse.json({ success: true, message: 'Mapping deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 });
  }
}
