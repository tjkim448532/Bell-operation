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
      if (data.assigned_project && data.assigned_project !== '0' && data.assigned_project !== '미분류' && data.assigned_project !== '미분류 프로젝트') {
        uniqueTerms.add(data.assigned_project.trim());
      }
    });

    // Revenues are now strictly grouped by the backend's facilityLevelMapping,
    // so we no longer load revenue facilities into the Kanban board for frontend mapping.

    // 3. Group by team
    const board: Record<string, string[]> = {};
    ALLOWED_TEAMS.forEach(team => {
      board[team] = [];
    });

    const isExcluded = (term: string) => {
      if (!term) return true;
      // [규칙 3 적용] 문자열 기반 지레짐작 필터링 삭제
      return false;
    };

    uniqueTerms.forEach(term => {
      if (isExcluded(term)) return;
      
      // Simulate mapping
      const { team } = getMappedTeam(term, term, mappingDict);
      if (board[team]) {
        board[team].push(term);
      } else {
        board['기타'].push(term);
      }
    });

    // 4. Also add any explicit mappings that might not be in the database yet
    Object.keys(mappingDict).forEach(term => {
      if (isExcluded(term)) return;
      
      const team = mappingDict[term];
      if (board[team] && !board[team].includes(term)) {
        board[team].push(term);
      }
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error('Failed to fetch board data:', error);
    return NextResponse.json({ error: 'Failed to fetch board data' }, { status: 500 });
  }
}
