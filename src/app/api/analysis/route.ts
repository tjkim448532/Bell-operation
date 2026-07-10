import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const team = searchParams.get('team') || 'all';

    // Fetch team mappings from Firebase (SSOT for Kanban board)
    const mappingsSnapshot = await db.collection('team_mappings').get();
    const mappingDict: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.columnName && data.teamName) {
        mappingDict[data.columnName] = data.teamName;
      }
    });

    let expQuery: any = db.collection('expenses');

    if (startDateStr && endDateStr) {
      // 엑셀 업로드 데이터는 월 단위로 관리되므로, 일(Day) 단위로 자르면 월말 데이터가 누락될 수 있음.
      // 100% 안전하게 해당 기간이 포함된 '월(YYYY-MM)' 문자열로 필터링.
      const startMonthStr = startDateStr.substring(0, 7);
      let endMonthStr = endDateStr.substring(0, 7);
      
      if (startMonthStr === endMonthStr) {
        expQuery = expQuery.where('month', '==', startMonthStr);
      } else {
        expQuery = expQuery
          .where('month', '>=', startMonthStr)
          .where('month', '<=', endMonthStr);
      }
    }

    const snapshot = await expQuery.get();
    let records: any[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      
      // Check SSOT mapping first to correct any typos or outdated team names stored in DB
      let mappedTeam = data.team || '기타';
      
      // Explicit typo correction
      if (mappedTeam === '엑티비티' || mappedTeam === '놀이동산' || mappedTeam === '놀이동산(2025)') {
        mappedTeam = '액티비티';
      }

      const assignedProject = data.assigned_project ? data.assigned_project.trim() : null;
      
      if (assignedProject && mappingDict[assignedProject]) {
        mappedTeam = mappingDict[assignedProject];
      } else if (mappingDict[mappedTeam]) {
        mappedTeam = mappingDict[mappedTeam];
      }
      
      // Filter by team if requested
      if (team === 'all' || mappedTeam === team) {
        records.push({
          id: doc.id,
          ...data,
          team: mappedTeam
        });
      }
    });

    // Sort by date descending
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return NextResponse.json(records);
    
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expense data' }, { status: 500 });
  }
}
