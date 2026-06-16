import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const docRef = db.collection('settings').doc('customTeams');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({ success: true, teams: [] });
    }
    
    const data = doc.data() || {};
    const teams = data.teams || [];
    
    return NextResponse.json({ success: true, teams });
  } catch (error) {
    console.error('Failed to get custom teams:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, teamName } = await request.json();
    
    if (!teamName || typeof teamName !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid team name' }, { status: 400 });
    }

    const docRef = db.collection('settings').doc('customTeams');
    const doc = await docRef.get();
    let teams: string[] = [];
    
    if (doc.exists) {
      teams = doc.data()?.teams || [];
    }

    if (action === 'add') {
      if (!teams.includes(teamName)) {
        teams.push(teamName);
      }
    } else if (action === 'remove') {
      teams = teams.filter(t => t !== teamName);
      
      // 방어 로직: 팀 삭제 시 해당 팀에 속했던 모든 규칙과 데이터를 '기타'로 강제 이동 (Orphan 데이터 방지 트랜잭션)
      const mappingSnap = await db.collection('team_mappings').where('teamName', '==', teamName).get();
      const docsToUpdate: FirebaseFirestore.DocumentReference[] = [];
      const columnNamesAffected: string[] = [];
      
      mappingSnap.forEach(mappingDoc => {
        docsToUpdate.push(mappingDoc.ref);
        columnNamesAffected.push(mappingDoc.data().columnName);
      });

      // Find all revenues and expenses that belonged to this team OR its column names
      const revSnap = await db.collection('revenues').where('team', '==', teamName).get();
      revSnap.forEach(d => docsToUpdate.push(d.ref));
      
      const expSnap = await db.collection('expenses').where('team', '==', teamName).get();
      expSnap.forEach(d => docsToUpdate.push(d.ref));

      // Batch Write (Max 500 operations per batch)
      const uniqueDocs = Array.from(new Set(docsToUpdate)); // Deduplicate
      const chunks = [];
      for (let i = 0; i < uniqueDocs.length; i += 500) {
        chunks.push(uniqueDocs.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach(ref => {
          batch.update(ref, { teamName: '기타', team: '기타' }); // teamName for mappings, team for rev/exp
        });
        await batch.commit();
      }

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    await docRef.set({ teams }, { merge: true });

    return NextResponse.json({ success: true, teams });
  } catch (error) {
    console.error('Failed to update custom teams:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
