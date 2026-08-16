import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';

    // 1. Fetch current mappings
    const mappingsSnapshot = await db.collection('team_mappings').get();
    const mappingDict: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.columnName && data.teamName) {
        mappingDict[data.columnName] = data.teamName;
      }
    });

    // 2. Fetch all unique assigned_projects from expenses
    const uniqueTerms = new Set<string>();
    
    const expensesSnapshot = await db.collection('expenses').get();
    expensesSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const name = data.assigned_project || data.branch_name || data.mapped_term || data.description || '기타 지출';
      if (name && name !== '0') {
        uniqueTerms.add(name.trim());
      }
    });


    // 3. Group by team
    const board: Record<string, string[]> = {};
    
    // Always initialize at least the basic expense and default columns
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
    
    // Fetch V6 dynamic leisure groups
    try {
      const v6Res = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=LEISURE`, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      });
      if (v6Res.ok) {
        const v6Json = await v6Res.json();
        (v6Json.data?.venues || []).forEach((v: any) => {
          const part = String(v.partName || '').trim();
          if (part && part !== '미분류') leisureTeams.add(part);
        });
      }
    } catch (e) {
      console.error('Board V6 groups fetch error:', e);
    }

    try {
      const customDoc = await db.collection('settings').doc('customTeams').get();
      if (customDoc.exists) {
        (customDoc.data()?.teams || []).forEach((t: string) => leisureTeams.add(t));
      }
    } catch (e) {
      console.error('Board customTeams fetch error:', e);
    }

    uniqueTerms.forEach(term => {
      if (isExcluded(term)) return;
      
      let team = mappingDict[term] || '기타';
      
      // '미분류' 기둥은 칸반보드에 존재하지 않으므로 모두 '기타'로 강제 배정합니다.
      if (team === '미분류') team = '기타';
      
      const isValidTeam = leisureTeams.has(team) || ['기타', '제외'].includes(team);
      if (!isValidTeam) team = '기타';

      if (!board[team]) {
        board[team] = []; // Dynamically support any new team from API or mapping!
      }
      board[team].push(term);
    });

    // 4. Also add any explicit mappings that might not be in the database yet
    Object.keys(mappingDict).forEach(term => {
      if (isExcluded(term)) return;
      
      let team = mappingDict[term];
      const isValidTeam = leisureTeams.has(team) || ['기타', '제외', '미분류'].includes(team);
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
