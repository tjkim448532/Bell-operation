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

    // 2.5 Fetch from V3 API to get new revenue facilities
    const year = new Date().getFullYear();
    const startDateStr = `${year}-01-01`;
    const endDateStr = `${year}-12-31`;
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
    try {
      const revUrl = `${BACKEND_URL}/api/v3/dashboard/revenue-summary?startDate=${startDateStr}&endDate=${endDateStr}`;
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
      const res = await fetch(revUrl, {
        headers: { 
          'Cookie': cookieHeader,
          'Authorization': `Bearer ${m2mToken}`
        }
      });
      if (res.ok) {
        const externalData = await res.json();
        const breakdown = externalData.dailyReportBreakdown || externalData.data?.dailyReportBreakdown || [];
        breakdown.forEach((item: any) => {
          const facility = String(item.facility_name || item.category_name || '').trim();
          if (facility && facility !== '0' && facility !== '미분류') {
            uniqueTerms.add(facility);
          }
        });
      }
    } catch (e) {
      console.error('Failed to fetch v3 API for board:', e);
    }

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
