import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');
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

    if (monthStr) {
      expQuery = expQuery.where('month', '==', monthStr);
    }

    const snapshot = await expQuery.get();
    let records: any[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      
      // Check SSOT mapping first to correct any typos or outdated team names stored in DB
      let mappedTeam = data.team || '기타';
      
      // Explicit typo correction
      if (mappedTeam === '엑티비티') {
        mappedTeam = '액티비티';
      } else if (mappedTeam === '놀이동산(2025)') {
        mappedTeam = '놀이동산';
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
