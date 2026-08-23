import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');
    const startMonth = searchParams.get('startMonth') || monthStr;
    const endMonth = searchParams.get('endMonth') || startMonth;
    const team = searchParams.get('team') || 'all';

    let expQuery: any = db.collection('expenses');
    let commonExpQuery: any = db.collection('common_expenses');

    if (startMonth && endMonth) {
      expQuery = expQuery.where('month', '>=', startMonth).where('month', '<=', endMonth);
      commonExpQuery = commonExpQuery.where('month', '>=', startMonth).where('month', '<=', endMonth);
    }

    const [eSnap, cSnap, expenseFilterSnapshot, macroMappingSnapshot, teamMappingSnapshot] = await Promise.all([
      expQuery.get(),
      commonExpQuery.get(),
      db.collection('expense_filters').get(),
      db.collection('expense_macro_mappings').get(),
      db.collection('team_mappings').get()
    ]);

    const teamMappings: Record<string, string> = {};
    teamMappingSnapshot.forEach((doc: any) => {
      const d = doc.data();
      if (d.columnName && d.teamName) {
        teamMappings[d.columnName] = d.teamName;
      }
    });

    const expDocs: any[] = [];
    eSnap.forEach((doc: any) => expDocs.push(doc));
    cSnap.forEach((doc: any) => expDocs.push(doc));

    const excludedExpenseTerms: string[] = [];
    expenseFilterSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.term) excludedExpenseTerms.push(data.term);
    });

    const macroMappings: Record<string, string> = {};
    macroMappingSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.rawCategory && data.macroCategory) {
        macroMappings[data.rawCategory] = data.macroCategory;
      }
    });

    let records: any[] = [];
    
    expDocs.forEach((doc: any) => {
      const data = doc.data();
      
      const originalTerm = String(data.mapped_term || '');
      const description = String(data.description || '');
      const project = String(data.assigned_project || '');
      const dept = String(data.department || '');

      const isExcluded = excludedExpenseTerms.some(filter => 
        originalTerm.includes(filter) || description.includes(filter) || project.includes(filter) || dept.includes(filter)
      );
      const rawTeam = String(data.team || '').trim();
      let mappedTeam = teamMappings[rawTeam] || teamMappings[project] || teamMappings[originalTerm] || rawTeam || '기타';

      // Filter by team if requested
      if (team === 'all' || mappedTeam === team) {
        records.push({
          id: doc.id,
          ...data,
          team: mappedTeam,
          isExcluded,
          macro_category: macroMappings[originalTerm] || null
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
