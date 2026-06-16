import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

// Server-side copy of the project-to-team logic for real-time recalculation
function getMappedTeamForUpdate(assignedProject: string, context: string, mappingDict: Record<string, string>): { team: string, rule: string } {
  // 1. User mapping override
  if (mappingDict[context]) return { team: mappingDict[context], rule: '사용자 지정 규칙 (정확히 일치)' };

  const sortedKeys = Object.keys(mappingDict).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (context.includes(key)) {
      return { team: mappingDict[key], rule: `사용자 지정 규칙 포함 ("${key}")` };
    }
  }

  // 3. Fallbacks
  const proj = assignedProject;
  if (proj.includes('목장') || proj.includes('얼룩말카페') || proj.includes('미니포렛') || proj.includes('펫포레') || proj.includes('체험목장') || proj.includes('디노시네마')) {
    return { team: '목장', rule: `프로젝트명 기반 팀 배정 (${proj} -> 목장)` };
  } else if (proj.includes('미디어아트') || proj.includes('기프트샵') || proj.includes('뮤지엄카페') || proj.includes('벨포레홀') || proj.includes('시네마')) {
    return { team: '미디어아트센터', rule: `프로젝트명 기반 팀 배정 (${proj} -> 미디어아트센터)` };
  } else if (proj.includes('카트') || proj.includes('썰매') || proj.includes('그네') || proj.includes('루지') || proj.includes('놀이동산') || proj.includes('골프') || proj.includes('게임존') || proj.includes('마리나') || proj.includes('썸머랜드') || proj.includes('원더풀') || proj.includes('콘도') || proj.includes('투어버스')) {
    return { team: '엑티비티', rule: `프로젝트명 기반 팀 배정 (${proj} -> 엑티비티)` };
  } else if (proj.includes('디지털지원') || proj.includes('디지탈지원')) {
    return { team: '디지털지원', rule: `프로젝트명 기반 팀 배정 (${proj} -> 디지털지원)` };
  } else if (proj.includes('레져본부') || proj.includes('레저본부') || proj.includes('레저사업본부') || proj.includes('레져사업본부')) {
    return { team: '레져본부', rule: `프로젝트명 기반 팀 배정 (${proj} -> 레져본부)` };
  } else {
    return { team: '기타', rule: `프로젝트명(${proj})에 해당하는 팀 없음` };
  }
}

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

    const { team, rule } = getMappedTeamForUpdate(assigned_project, teamContext, mappingDict);
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
