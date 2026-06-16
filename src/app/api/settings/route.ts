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
    // 1. Fetch complete mapping dictionary
    const mapSnap = await db.collection('team_mappings').get();
    const mappingDict: Record<string, string> = {};
    mapSnap.forEach((d: any) => {
      mappingDict[d.data().columnName] = d.data().teamName;
    });

    const { getMappedTeam } = await import('@/lib/parser');

    const updates: { ref: FirebaseFirestore.DocumentReference, data: any }[] = [];

    // 2. Re-evaluate all revenues
    const revSnapshot = await db.collection('revenues').get();
    revSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const colName = data.branch_name || '';
      const { team } = getMappedTeam(data.assigned_project || '', colName, mappingDict);
      if (team !== data.team) {
        updates.push({ ref: doc.ref, data: { team } });
      }
    });

    // 3. Re-evaluate all expenses
    const expSnapshot = await db.collection('expenses').get();
    expSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const originalTerm = data.original_term || '';
      const description = data.description || '';
      const vendor = data.vendor || '';
      const dept = data.dept_name || '';
      const project = data.assigned_project || '';
      
      const teamContext = `${originalTerm} ${project} ${data.branch_name || ''} ${dept} ${description} ${vendor}`;
      const { team } = getMappedTeam(project, teamContext, mappingDict);
      if (team !== data.team) {
        updates.push({ ref: doc.ref, data: { team } });
      }
    });

    // 4. Batch commit in chunks of 500
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
