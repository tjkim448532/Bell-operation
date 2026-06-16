import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

import { getMappedTeam } from '@/lib/parser';

export async function POST(request: Request) {
  try {
    const { id, assigned_project } = await request.json();

    if (!id || !assigned_project) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const docRef = db.collection('expenses').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const data = doc.data()!;
    const teamContext = `${data.original_term || ''} ${data.branch_name || ''} ${data.dept_name || ''} ${data.description || ''} ${data.vendor || ''}`;
    
    // Fetch user mapping dict
    const mappingDoc = await db.collection('settings').doc('teamMapping').get();
    const mappingDict = mappingDoc.exists ? mappingDoc.data() || {} : {};

    const { team, rule } = getMappedTeam(assigned_project, teamContext, mappingDict);
    const fullRule = `[사용자 수동 교정] 프로젝트명 -> [팀 분류] ${rule}`;

    // 수동 교정 영구 기억 장치(Overrides)에 백업
    if (data.row_signature) {
      await db.collection('projectOverrides').doc(data.row_signature).set({
        override_project: assigned_project,
        updated_at: new Date().toISOString()
      }, { merge: true });
    }

    await docRef.update({
      assigned_project,
      team,
      mapped_rule: fullRule,
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        id, 
        assigned_project, 
        team, 
        mapped_rule: fullRule 
      } 
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 });
  }
}
