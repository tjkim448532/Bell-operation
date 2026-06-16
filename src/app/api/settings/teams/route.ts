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
      
      // 방어 로직: 팀 삭제 시 해당 팀에 속했던 모든 규칙 제거 및 전체 데이터 재평가 (Orphan 데이터 방지)
      const mappingSnap = await db.collection('team_mappings').where('teamName', '==', teamName).get();
      
      const mapDeletes: Promise<any>[] = [];
      mappingSnap.forEach(mappingDoc => {
        mapDeletes.push(mappingDoc.ref.delete());
      });
      await Promise.all(mapDeletes);

      // FULL RETROACTIVE UPDATE FOR 100% CONSISTENCY
      const newMapSnap = await db.collection('team_mappings').get();
      const mappingDict: Record<string, string> = {};
      newMapSnap.forEach((d: any) => {
        mappingDict[d.data().columnName] = d.data().teamName;
      });

      const { getMappedTeam } = await import('@/lib/parser');
      const updates: { ref: FirebaseFirestore.DocumentReference, data: any }[] = [];

      const revSnap = await db.collection('revenues').get();
      revSnap.forEach((doc: any) => {
        const data = doc.data();
        const colName = data.branch_name || '';
        const { team } = getMappedTeam(data.assigned_project || '', colName, mappingDict);
        if (team !== data.team) updates.push({ ref: doc.ref, data: { team } });
      });
      
      const expSnap = await db.collection('expenses').get();
      expSnap.forEach((doc: any) => {
        const data = doc.data();
        const originalTerm = data.original_term || '';
        const description = data.description || '';
        const vendor = data.vendor || '';
        const dept = data.dept_name || '';
        const project = data.assigned_project || '';
        
        const teamContext = `${originalTerm} ${project} ${dept} ${description} ${vendor}`;
        const { team } = getMappedTeam(project, teamContext, mappingDict);
        if (team !== data.team) updates.push({ ref: doc.ref, data: { team } });
      });

      // Batch Write (Max 500 per batch)
      const chunks = [];
      for (let i = 0; i < updates.length; i += 500) {
        chunks.push(updates.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach(u => batch.update(u.ref, u.data));
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
