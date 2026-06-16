import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getMappedTeam, ALLOWED_TEAMS } from '@/lib/parser';

export async function GET() {
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

    // 2. Fetch all unique branch_names from revenues and expenses
    const uniqueTerms = new Set<string>();
    
    const revenuesSnapshot = await db.collection('revenues').get();
    revenuesSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.branch_name && data.branch_name !== '0' && data.branch_name !== '미분류') {
        uniqueTerms.add(data.branch_name.trim());
      }
    });

    const expensesSnapshot = await db.collection('expenses').get();
    expensesSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.assigned_project && data.assigned_project !== '0' && data.assigned_project !== '미분류' && data.assigned_project !== '미분류 프로젝트') {
        uniqueTerms.add(data.assigned_project.trim());
      }
    });

    // 3. Group by team
    const board: Record<string, string[]> = {};
    ALLOWED_TEAMS.forEach(team => {
      board[team] = [];
    });

    uniqueTerms.forEach(term => {
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
