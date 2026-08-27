import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
const M2M_API_TOKEN = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentYear = new Date().getFullYear();
    const year = Number(searchParams.get('year')) || currentYear;

    // 1. Get active leisure teams from Firestore
    let activeTeams = ['액티비티', '벨포레 목장', '미디어아트센터', '디지털지원'];
    try {
      const selDoc = await db.collection('settings').doc('leisureSelection').get();
      if (selDoc.exists) {
        const data = selDoc.data();
        if (Array.isArray(data?.selectedTeams) && data.selectedTeams.length > 0) {
          activeTeams = data.selectedTeams;
        }
      }
    } catch (e) {
      console.warn('Using default active teams:', e);
    }

    // 2. Fetch expenses from Firestore for the target year
    const startMonthStr = `${year}-01`;
    const endMonthStr = `${year}-12`;

    const [expSnap, commonExpSnap, expenseFilterSnap, teamMappingSnap] = await Promise.all([
      db.collection('expenses').where('month', '>=', startMonthStr).where('month', '<=', endMonthStr).get(),
      db.collection('common_expenses').where('month', '>=', startMonthStr).where('month', '<=', endMonthStr).get(),
      db.collection('expense_filters').get(),
      db.collection('team_mappings').get()
    ]);

    const teamMappingDict: Record<string, string> = {};
    teamMappingSnap.forEach((doc: any) => {
      const d = doc.data();
      if (d.columnName && d.teamName) {
        teamMappingDict[d.columnName] = d.teamName;
      }
    });

    const excludedTerms: string[] = [];
    expenseFilterSnap.forEach((doc: any) => {
      const d = doc.data();
      if (d.term) excludedTerms.push(String(d.term));
    });

    const monthlyExpensesByTeam: Record<string, Record<string, number>> = {};
    const monthlyTotalExpenses: Record<string, number> = {};

    const processExpenseDoc = (doc: any) => {
      const data = doc.data();
      const month = data.month || (data.date ? String(data.date).substring(0, 7) : '');
      if (!month || !month.startsWith(String(year))) return;

      const rawAmount = typeof data.amount === 'number' ? data.amount : Number(String(data.amount || 0).replace(/,/g, ''));
      if (isNaN(rawAmount) || rawAmount === 0) return;

      const rawTeam = String(data.team || '').trim();
      const project = String(data.assigned_project || '');
      const originalTerm = String(data.mapped_term || '');
      const description = String(data.description || '');

      // Lookup standard team from SSOT team_mappings
      let team = teamMappingDict[rawTeam] || teamMappingDict[project] || teamMappingDict[originalTerm] || rawTeam || '미분류';

      const isExcluded = excludedTerms.some(f => originalTerm.includes(f) || description.includes(f) || project.includes(f));
      if (isExcluded || team === '제외') return;

      if (!monthlyExpensesByTeam[month]) monthlyExpensesByTeam[month] = {};
      monthlyExpensesByTeam[month][team] = (monthlyExpensesByTeam[month][team] || 0) + rawAmount;
      monthlyTotalExpenses[month] = (monthlyTotalExpenses[month] || 0) + rawAmount;
    };

    expSnap.forEach(processExpenseDoc);
    commonExpSnap.forEach(processExpenseDoc);

    // 3. Fetch monthly revenues in parallel from Backend MariaDB Track 3
    const monthsList = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      return `${year}-${m}`;
    });

    const revenuePromises = monthsList.map(async (mStr) => {
      const [y, m] = mStr.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const startDate = `${mStr}-01`;
      const endDate = `${mStr}-${String(lastDay).padStart(2, '0')}`;

      try {
        const url = `${BACKEND_BASE_URL}/api/v6/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${M2M_API_TOKEN}` },
          cache: 'no-store'
        });
        if (!res.ok) return { month: mStr, rows: [] };
        const json = await res.json();
        return { month: mStr, rows: json.data || [] };
      } catch (e) {
        return { month: mStr, rows: [] };
      }
    });

    const revenueResults = await Promise.all(revenuePromises);

    const monthlyRevenuesByPart: Record<string, Record<string, number>> = {};
    const monthlyTotalRevenues: Record<string, number> = {};

    revenueResults.forEach(({ month, rows }) => {
      monthlyRevenuesByPart[month] = {};
      let totalRev = 0;

      rows.forEach((row: any) => {
        if (row.isSubtotal || row.isGrandTotal) return;

        const val = Number(String(row.rangeActual !== undefined ? row.rangeActual : (row.todayActual !== undefined ? row.todayActual : 0)).replace(/,/g, '')) || 0;
        if (val === 0) return;

        const sName = String(row.shopName || row.facilityName || '').trim();
        const pName = String(row.partName || '').trim();
        const tName = String(row.teamName || '').trim();
        const catCode = String(row.categoryCode || '').toUpperCase();

        const isLeisureCategory = catCode === 'TICKET' || catCode === 'MOTO' || catCode === 'GOODS' || catCode === 'PROMOTION' || catCode === 'PARKING';
        const isLeisureTeam = tName === '레저본부' || tName === '레저운영팀' || tName === '모토팀' || tName === '주차관제';

        if (!isLeisureCategory && !isLeisureTeam) return;

        const part = teamMappingDict[sName] || teamMappingDict[pName] || pName || tName || '미분류';
        if (part && part !== '소계' && part !== '제외') {
          monthlyRevenuesByPart[month][part] = (monthlyRevenuesByPart[month][part] || 0) + val;
          totalRev += val;
        }
      });

      monthlyTotalRevenues[month] = totalRev;
    });

    // 4. Combine monthly metrics
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthlyData = monthsList.map((monthKey) => {
      const revenue = monthlyTotalRevenues[monthKey] || 0;
      const expense = monthlyTotalExpenses[monthKey] || 0;
      const profit = revenue - expense;
      const profitMargin = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;
      const expenseRatio = revenue > 0 ? Number(((expense / revenue) * 100).toFixed(1)) : 0;

      let status: 'completed' | 'current' | 'future' = 'future';
      if (monthKey < currentMonthKey) {
        status = 'completed';
      } else if (monthKey === currentMonthKey) {
        status = 'current';
      }

      return {
        month: monthKey,
        monthLabel: `${Number(monthKey.split('-')[1])}월`,
        status,
        revenue,
        expense,
        profit,
        profitMargin,
        expenseRatio,
        revenueByPart: monthlyRevenuesByPart[monthKey] || {},
        expenseByTeam: monthlyExpensesByTeam[monthKey] || {}
      };
    });

    // 5. Fetch YTD totals directly from Backend (Zero-Proxy)
    let ytd = {
      revenue: 0, expense: 0, profit: 0, profitMargin: 0, expenseRatio: 0,
      revenueByPart: {}, expenseByTeam: {}
    };
    try {
      const ytdUrl = `${BACKEND_BASE_URL}/api/v6/dashboard/revenue-summary?startDate=${year}-01-01&endDate=${year}-12-31`;
      const ytdRes = await fetch(ytdUrl, { headers: { 'Authorization': `Bearer ${M2M_API_TOKEN}` }, cache: 'no-store' });
      if (ytdRes.ok) {
        const ytdJson = await ytdRes.json();
        const data = ytdJson.data || ytdJson;
        if (data.ytd) ytd = data.ytd;
        else if (data.summary) {
           ytd.revenue = data.summary.totalRevenue || 0;
           ytd.expense = data.summary.totalExpense || 0;
        }
      }
    } catch(e) {
      console.error('YTD fetch failed', e);
    }

    return NextResponse.json({
      success: true,
      year,
      ytd,
      months: monthlyData,
      activeTeams
    });
  } catch (error: any) {
    console.error('Error in monthly-trends API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
