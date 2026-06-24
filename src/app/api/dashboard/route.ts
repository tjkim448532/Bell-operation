import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    let revQuery: any = db.collection('revenues');
    let expQuery: any = db.collection('expenses');

    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      let end = new Date(endDateStr);
      
      if (endDateStr.length === 7) {
        end.setUTCMonth(end.getUTCMonth() + 1);
        end = new Date(end.getTime() - 1);
      } else {
        end.setUTCHours(23, 59, 59, 999);
      }
      
      revQuery = revQuery.where('date', '>=', start).where('date', '<=', end);
      expQuery = expQuery.where('date', '>=', start).where('date', '<=', end);
    }

    const revSnapshot = await revQuery.get();
    const expSnapshot = await expQuery.get();
    const expenseFilterSnapshot = await db.collection('expense_filters').get();
    const excludedExpenseTerms: string[] = [];
    expenseFilterSnapshot.forEach((doc: any) => {
      excludedExpenseTerms.push(doc.data().term);
    });

    const revenueFilterSnapshot = await db.collection('revenue_filters').get();
    const excludedRevenueTerms: string[] = [];
    revenueFilterSnapshot.forEach((doc: any) => {
      excludedRevenueTerms.push(doc.data().term);
    });

    let totalRevenue = 0;
    let totalExpense = 0;
    
    const teamRev: Record<string, number> = {};
    const teamExp: Record<string, number> = {};
    const monthlyTeamRev: Record<number, Record<string, number>> = {};
    const monthlyTeamExp: Record<number, Record<string, number>> = {};

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const updateMinMax = (d: any) => {
      let dateObj: Date | null = null;
      if (d && typeof d.toDate === 'function') {
        dateObj = d.toDate();
      } else if (d) {
        dateObj = new Date(d);
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        if (!minDate || dateObj < minDate) minDate = dateObj;
        if (!maxDate || dateObj > maxDate) maxDate = dateObj;
      }
    };

    revSnapshot.forEach((doc: any) => {
      const data = doc.data();

      // Filter out excluded revenues
      const revTerm = String(data.branch_name || data.assigned_project || '');
      const isRevExcluded = excludedRevenueTerms.some(filter => revTerm.includes(filter));
      if (isRevExcluded) return;

      const amount = data.amount || 0;
      const team = data.team || '기타';
      
      updateMinMax(data.date);
      
      let month = 0;
      if (data.date && typeof data.date.toDate === 'function') {
        month = data.date.toDate().getMonth();
      } else if (data.date) {
        month = new Date(data.date).getMonth();
      }

      totalRevenue += amount;
      teamRev[team] = (teamRev[team] || 0) + amount;
      
      if (!monthlyTeamRev[month]) monthlyTeamRev[month] = {};
      monthlyTeamRev[month][team] = (monthlyTeamRev[month][team] || 0) + amount;
    });

    expSnapshot.forEach((doc: any) => {
      const data = doc.data();
      
      // Filter out excluded expenses
      const term1 = String(data.mapped_term || '');
      const term2 = String(data.original_term || '');
      const desc = String(data.description || '');
      const proj = String(data.assigned_project || data.branch_name || '');
      const dept = String(data.dept_name || '');

      const isExpExcluded = excludedExpenseTerms.some(filter => 
        term1.includes(filter) || term2.includes(filter) || desc.includes(filter) || proj.includes(filter) || dept.includes(filter)
      );
      if (isExpExcluded) return;

      const amount = data.amount || 0;
      const team = data.team || '기타';
      
      updateMinMax(data.date);
      
      let month = 0;
      if (data.date && typeof data.date.toDate === 'function') {
        month = data.date.toDate().getMonth();
      } else if (data.date) {
        month = new Date(data.date).getMonth();
      }

      totalExpense += amount;
      teamExp[team] = (teamExp[team] || 0) + amount;
      
      if (!monthlyTeamExp[month]) monthlyTeamExp[month] = {};
      monthlyTeamExp[month][team] = (monthlyTeamExp[month][team] || 0) + amount;
    });

    const teams = Array.from(new Set([...Object.keys(teamRev), ...Object.keys(teamExp)]));

    const teamData = teams.map(team => {
      return { team, revenue: teamRev[team] || 0, expense: teamExp[team] || 0 };
    }).filter(t => t.revenue > 0 || t.expense > 0);

    const mappingsSnapshot = await db.collection('team_mappings').get();
    const teamMappings: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      const d = doc.data();
      teamMappings[d.columnName] = d.teamName;
    });

    return NextResponse.json({
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      teamData,
      monthlyTeamRev,
      monthlyTeamExp,
      teamMappings,
      minDate: minDate ? (minDate as Date).toISOString() : null,
      maxDate: maxDate ? (maxDate as Date).toISOString() : null
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
