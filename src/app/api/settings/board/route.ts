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

    // 2.5 Fetch Revenue facilities from V5 API for hybrid mapping
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr1 = yesterday.toISOString().split('T')[0];

      const lastMonth = new Date(yesterday.getFullYear(), yesterday.getMonth(), 0);
      const dateStr2 = lastMonth.toISOString().split('T')[0];

      const fetchRevTerms = async (dateStr: string) => {
        try {
          const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${dateStr}`;
          const res = await fetch(revUrl, {
            headers: { 'Cookie': cookieHeader, 'Authorization': `Bearer ${m2mToken}` },
            cache: 'no-store'
          });
          if (res.ok) {
            const json = await res.json();
            const apiData = json.data || json;
            const daysData = Array.isArray(apiData) ? apiData.map((d: any) => d.data || d) : [apiData];
            if (daysData.length > 0) {
              const day = daysData[daysData.length - 1];
              const salesByFacility = day.salesByFacility || day.sales_by_facility || [];
              salesByFacility.forEach((item: any) => {
                if (!item) return;
                const term = String(item.sub_group_name || item.facility_name || item.shop_name || item.category_name || item.category_code || '').trim();
                if (term && term !== '미분류(기타)') {
                  uniqueTerms.add(term);
                }
              });
            }
          }
        } catch(e) {}
      };

      await Promise.all([fetchRevTerms(dateStr1), fetchRevTerms(dateStr2)]);
    } catch (err) {
      console.error('Failed to fetch V5 revenues for Kanban board:', err);
    }

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
