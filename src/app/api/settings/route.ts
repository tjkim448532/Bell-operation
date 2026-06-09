import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const snapshot = await db.collection('team_mappings').get();
    const mappings: any[] = [];
    snapshot.forEach((doc: any) => {
      mappings.push({ id: doc.id, ...doc.data() });
    });
    return NextResponse.json(mappings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { columnName, teamName } = body;

    if (!columnName || !teamName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Upsert equivalent: search for existing columnName
    const snapshot = await db.collection('team_mappings').where('columnName', '==', columnName).get();
    
    if (!snapshot.empty) {
      // Update existing
      const docId = snapshot.docs[0].id;
      await db.collection('team_mappings').doc(docId).update({ teamName });
      return NextResponse.json({ id: docId, columnName, teamName });
    } else {
      // Create new
      const newRef = db.collection('team_mappings').doc();
      await newRef.set({ columnName, teamName });
      return NextResponse.json({ id: newRef.id, columnName, teamName });
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
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    await db.collection('team_mappings').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 });
  }
}
