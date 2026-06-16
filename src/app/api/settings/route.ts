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
    
    let docId = '';
    if (!snapshot.empty) {
      docId = snapshot.docs[0].id;
      await db.collection('team_mappings').doc(docId).update({ teamName });
    } else {
      const newRef = db.collection('team_mappings').doc();
      docId = newRef.id;
      await newRef.set({ columnName, teamName });
    }

    // UPDATE EXISTING RECORDS (Retroactive application)
    const batch = db.batch();
    
    // 1. Update revenues
    const revSnapshot = await db.collection('revenues').where('branch_name', '==', columnName).get();
    revSnapshot.forEach(doc => {
      batch.update(doc.ref, { team: teamName });
    });

    // 2. Update expenses (where assigned_project matches)
    const expSnapshot = await db.collection('expenses').where('assigned_project', '==', columnName).get();
    expSnapshot.forEach(doc => {
      batch.update(doc.ref, { team: teamName });
    });

    await batch.commit();

    return NextResponse.json({ id: docId, columnName, teamName });
  } catch (error) {
    console.error(error);
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
