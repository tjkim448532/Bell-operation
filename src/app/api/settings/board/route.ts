import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Fetch current mappings
    const mappingsSnapshot = await db.collection('team_mappings').get();
    const mappingDict: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.columnName && data.teamName) {
        mappingDict[data.columnName] = data.teamName;
      }
    });

    // 2. Fetch all unique assigned_projects from expenses and common_expenses
    const uniqueTerms = new Set<string>();
    
    const [expensesSnapshot, commonExpSnapshot] = await Promise.all([
      db.collection('expenses').get(),
      db.collection('common_expenses').get()
    ]);

    expensesSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const name = data.assigned_project || data.branch_name || data.mapped_term || data.description || '기타 지출';
      if (name && name !== '0') {
        uniqueTerms.add(name.trim());
      }
    });

    commonExpSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const name = data.assigned_project || data.branch_name || data.mapped_term || data.description || '공통 지출';
      if (name && name !== '0') {
        uniqueTerms.add(name.trim());
      }
    });

    // 3. Group by team
    const board: Record<string, string[]> = {};
    
    // Always initialize auxiliary columns
    ['기타', '제외'].forEach(t => {
      board[t] = [];
    });

    const isExcluded = (term: string) => {
      if (!term) return true;
      return false;
    };

    let BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
    if (BACKEND_URL.includes('api.belleforet.com')) BACKEND_URL = 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    const leisureTeams = new Set<string>(['기타', '제외']);
    
    // V6 통합매핑 (SSOT): V6 레저본부 그룹 및 배정된 파트명 추출
    try {
      const v6Res = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      });
      if (v6Res.ok) {
        const v6Json = await v6Res.json();
        const isLeisure = (v: any) => {
          const t = String(v.teamName || '').trim();
          const c = String(v.categoryCode || '').trim();
          return t === '레저본부' || c === 'TICKET';
        };
        (v6Json.data?.venues || []).filter(isLeisure).forEach((v: any) => {
          const part = String(v.partName || '').trim();
          if (part && part !== '미분류') leisureTeams.add(part);
        });
      }
    } catch (e) {
      console.error('Board V6 groups fetch error:', e);
    }

    // Merge Firestore customTeams
    if (db) {
      try {
        const customDoc = await db.collection('settings').doc('customTeams').get();
        if (customDoc.exists) {
          (customDoc.data()?.teams || []).forEach((t: string) => {
            if (t && t !== '미분류') leisureTeams.add(t);
          });
        }
      } catch (e) {
        console.error('customTeams fetch error in board:', e);
      }
    }

    // Explicit mappings saved by the user should always be recognized as valid target teams
    Object.values(mappingDict).forEach(t => {
      if (t && t !== '미분류') leisureTeams.add(t);
    });

    // Fallback if V6 is empty
    if (leisureTeams.size <= 2) {
      ['액티비티', '목장', '미디어아트', '놀이동산', '모토아레나'].forEach(t => leisureTeams.add(t));
    }

    uniqueTerms.forEach(term => {
      if (isExcluded(term)) return;
      
      let team = mappingDict[term] || '기타';
      
      // '미분류'는 칸반보드에서 '기타' 기둥으로 배정
      if (team === '미분류') team = '기타';
      
      const isValidTeam = leisureTeams.has(team);
      if (!isValidTeam) team = '기타';

      if (!board[team]) {
        board[team] = [];
      }
      board[team].push(term);
    });

    // 4. Also add any explicit mappings that are valid
    Object.keys(mappingDict).forEach(term => {
      if (isExcluded(term)) return;
      
      let team = mappingDict[term];
      const isValidTeam = leisureTeams.has(team);
      if (!isValidTeam) team = '기타';

      if (!board[team]) board[team] = [];
      if (!board[team].includes(term)) {
        board[team].push(term);
      }
    });

    return NextResponse.json(board);
  } catch (error: any) {
    console.error('Failed to fetch board data:', error);
    return NextResponse.json({ error: 'Failed to fetch board data', details: error.message, stack: error.stack }, { status: 500 });
  }
}
