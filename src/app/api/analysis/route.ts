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

    if (startMonth && endMonth) {
      expQuery = expQuery.where('month', '>=', startMonth).where('month', '<=', endMonth);
    }

    const [snapshot, expenseFilterSnapshot, macroMappingSnapshot] = await Promise.all([
      expQuery.get(),
      db.collection('expense_filters').get(),
      db.collection('expense_macro_mappings').get()
    ]);

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
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      
      const originalTerm = String(data.mapped_term || '');
      const description = String(data.description || '');
      const project = String(data.assigned_project || '');
      const dept = String(data.department || '');

      const isExcluded = excludedExpenseTerms.some(filter => 
        originalTerm.includes(filter) || description.includes(filter) || project.includes(filter) || dept.includes(filter)
      );
      if (isExcluded) return;

      let mappedTeam = data.team || '기타';

      // Filter by team if requested
      if (team === 'all' || mappedTeam === team) {
        records.push({
          id: doc.id,
          ...data,
          team: mappedTeam,
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
