import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const revSnap = await db.collection('revenues').get();
    const updates = [];
    
    // Fetch mapping dict just in case
    const mappingsSnapshot = await db.collection('team_mappings').get();
    const mappingDict: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      mappingDict[doc.data().columnName] = doc.data().teamName;
    });

    revSnap.forEach(doc => {
      const data = doc.data();
      const colName = data.branch_name || '';
      
      let restoredTeam = '기타';
      const projectKeywords = [
        '목장', '얼룩말카페', '미니포렛', '펫포레', '체험목장', '디노시네마',
        '미디어아트', '기프트샵', '뮤지엄카페', '벨포레홀', '시네마',
        '카트', '썰매', '그네', '루지', '놀이동산', '골프', '게임존', '마리나', '썸머랜드', '원더풀', '콘도', '투어버스',
        '디지털지원', '디지탈지원', '본부팀', '본부', '레저본부', '레저사업본부', '레져사업본부'
      ];
      
      let inferredProject = data.assigned_project;
      if (!inferredProject || inferredProject === '미분류 프로젝트' || inferredProject === '0') {
          for (const keyword of projectKeywords) {
            if (colName.includes(keyword)) {
              inferredProject = keyword;
              break;
            }
          }
      }
      
      const typoDictionary: Record<string, string> = {
        '엑티비티': '액티비티', '미디어': '미디어아트센터', '레저': '본부팀',
        '본부': '본부팀', '디지탈': '디지털지원팀', '디지털지원': '디지털지원팀',
        'FNB': 'F&B', '콘도': '객실', '숙소': '객실'
      };
      
      let teamContext = colName;
      if (teamContext.includes('객실')) restoredTeam = '객실본부';
      else if (teamContext.includes('식음') || teamContext.includes('F&B')) restoredTeam = '식음본부';
      else if (teamContext.includes('골프')) restoredTeam = '골프본부';
      else restoredTeam = '미분류'; 

      if (inferredProject && mappingDict[inferredProject]) {
          restoredTeam = mappingDict[inferredProject];
      }
      
      if (typoDictionary[restoredTeam]) restoredTeam = typoDictionary[restoredTeam];
      
      if (data.team !== restoredTeam) {
        updates.push({ ref: doc.ref, team: restoredTeam, assigned_project: inferredProject });
      }
    });
    
    const chunks = [];
    for (let i = 0; i < updates.length; i += 500) {
      chunks.push(updates.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(u => batch.update(u.ref, { team: u.team, assigned_project: u.assigned_project }));
      await batch.commit();
    }
    
    return NextResponse.json({ success: true, message: `Restored ${updates.length} revenues.` });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
