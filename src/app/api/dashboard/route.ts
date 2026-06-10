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
      const end = new Date(endDateStr);
      end.setUTCHours(23, 59, 59, 999);
      
      revQuery = revQuery.where('date', '>=', start).where('date', '<=', end);
      expQuery = expQuery.where('date', '>=', start).where('date', '<=', end);
    }

    const revSnapshot = await revQuery.get();
    const expSnapshot = await expQuery.get();
    const filterSnapshot = await db.collection('expense_filters').get();

    const excludedTerms = new Set<string>();
    filterSnapshot.forEach((doc: any) => {
      excludedTerms.add(doc.data().term);
    });

    let totalRevenue = 0;
    let totalExpense = 0;
    
    const teamRev: Record<string, number> = {};
    const teamExp: Record<string, number> = {};
    const monthlyTeamRev: Record<number, Record<string, number>> = {};
    const monthlyTeamExp: Record<number, Record<string, number>> = {};

    revSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const amount = data.amount || 0;
      const team = data.team || '기타';
      
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
      const term = data.mapped_term || data.original_term;
      if (excludedTerms.has(term) || excludedTerms.has(data.original_term)) {
        return;
      }

      const amount = data.amount || 0;
      const team = data.team || '기타';
      
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

    return NextResponse.json({
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      teamData,
      monthlyTeamRev,
      monthlyTeamExp
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
