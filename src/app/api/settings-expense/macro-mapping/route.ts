import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const snapshot = await db.collection('expense_macro_mappings').get();
    const mappings: any[] = [];
    snapshot.forEach((doc: any) => {
      mappings.push({ id: doc.id, ...doc.data() });
    });
    return NextResponse.json(mappings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch macro mappings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawCategory, macroCategory } = body;

    if (!rawCategory || !macroCategory) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const snapshot = await db.collection('expense_macro_mappings').where('rawCategory', '==', rawCategory).get();
    
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await db.collection('expense_macro_mappings').doc(docId).update({ macroCategory });
      return NextResponse.json({ success: true, message: 'Macro mapping updated', id: docId });
    } else {
      const newRef = await db.collection('expense_macro_mappings').add({
        rawCategory,
        macroCategory,
        createdAt: new Date()
      });
      return NextResponse.json({ success: true, message: 'Macro mapping added', id: newRef.id });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save macro mapping' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing mapping id' }, { status: 400 });
    }

    await db.collection('expense_macro_mappings').doc(id).delete();
    return NextResponse.json({ success: true, message: 'Macro mapping deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete macro mapping' }, { status: 500 });
  }
}
