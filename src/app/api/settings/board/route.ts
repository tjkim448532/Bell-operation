import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getMappedTeam, ALLOWED_TEAMS } from '@/lib/parser';

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

    const leisureTeams = new Set(['본부팀', '목장', '액티비티', '디지털지원팀', '놀이동산', '미디어아트센터']);

    uniqueTerms.forEach(term => {
      if (isExcluded(term)) return;
      
      let { team } = getMappedTeam(term, term, mappingDict);
      
      const isValidTeam = leisureTeams.has(team) || ['기타', '제외', '미분류'].includes(team);
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
