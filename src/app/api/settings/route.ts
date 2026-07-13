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

    // FULL RETROACTIVE UPDATE FOR 100% CONSISTENCY
    // Instead of fetching all expenses (which causes Vercel timeouts), 
    // query only those that might match this columnName.
    const updates: { ref: FirebaseFirestore.DocumentReference, data: any }[] = [];

    // Note: Since 'columnName' could be a branch_name, assigned_project, original_term, etc.
    // We will do parallel queries for the specific fields.
    const [revSnap, expProjSnap, expTermSnap, expDescSnap] = await Promise.all([
      db.collection('revenues').where('branch_name', '==', columnName).get(),
      db.collection('expenses').where('assigned_project', '==', columnName).get(),
      db.collection('expenses').where('original_term', '==', columnName).get(),
      db.collection('expenses').where('description', '==', columnName).get()
    ]);

    revSnap.forEach((doc: any) => {
      updates.push({ ref: doc.ref, data: { team: teamName } });
    });

    const expDocs = new Map<string, any>();
    [expProjSnap, expTermSnap, expDescSnap].forEach(snap => {
      snap.forEach((doc: any) => {
        expDocs.set(doc.id, doc);
      });
    });

    expDocs.forEach((doc) => {
      updates.push({ ref: doc.ref, data: { team: teamName } });
    });

    // Batch commit in chunks of 500
    const chunks = [];
    for (let i = 0; i < updates.length; i += 500) {
      chunks.push(updates.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(u => batch.update(u.ref, u.data));
      await batch.commit();
    }

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
