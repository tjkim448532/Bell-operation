import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let startDateStr = searchParams.get('startDate');
    let endDateStr = searchParams.get('endDate');

    // --- 백엔드 가이드: 반드시 YYYY-MM-DD 포맷을 사용해야 함 ---
    let apiStartDate = startDateStr;
    let apiEndDate = endDateStr;
    
    if (startDateStr && startDateStr.length === 7) {
      apiStartDate = `${startDateStr}-01`;
    }
    if (endDateStr && endDateStr.length === 7) {
      const [year, month] = endDateStr.split('-');
      // 해당 월의 마지막 날짜 구하기 (0을 넣으면 이전 달 마지막 날이 나옴)
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      apiEndDate = `${endDateStr}-${lastDay}`;
    }

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
      
      expQuery = expQuery.where('date', '>=', start).where('date', '<=', end);
    }

    let expSnapshot: any = { forEach: () => {} };
    let expenseFilterSnapshot: any = { forEach: () => {} };
    const excludedExpenseTerms: string[] = [];

    try {
      expSnapshot = await expQuery.get();
      expenseFilterSnapshot = await db.collection('expense_filters').get();
      expenseFilterSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.term) excludedExpenseTerms.push(data.term);
      });
    } catch (e: any) {
      console.error('Firebase expenses fetch error:', e.message);
    }

    const excludedRevenueTerms: string[] = [];
    try {
      const revFilterSnapshot = await db.collection('revenue_filters').get();
      revFilterSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.term) excludedRevenueTerms.push(data.term);
      });
    } catch (e: any) {
      console.error('Firebase revenue filters fetch error:', e.message);
    }

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

    if (startDateStr) minDate = new Date(startDateStr);
    if (endDateStr) maxDate = new Date(endDateStr);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
    const cookieHeader = request.headers.get('cookie') || '';
    
    let externalData: any = {};
    if (startDateStr && endDateStr) {
      try {
        const revUrl = `${BACKEND_URL}/api/v3/dashboard/revenue-summary?startDate=${apiStartDate}&endDate=${apiEndDate}`;
        const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
        const res = await fetch(revUrl, {
          headers: { 
            'Authorization': `Bearer ${m2mToken}`
          }
        });
        if (res.ok) {
          externalData = await res.json();
        } else {
          const errText = await res.text();
          console.error('Failed to fetch from backend API:', res.status, errText);
          externalData = { error_status: res.status, error_body: errText, requestedUrl: revUrl };
        }
      } catch (err: any) {
        console.error('Network error fetching from backend API:', err);
        externalData = { fetch_error: err.message };
      }
    }

    const breakdown = externalData.dailyReportBreakdown || externalData.data?.dailyReportBreakdown || [];
    const ticketFacilityBreakdown = externalData.ticketFacilityBreakdown || externalData.data?.ticketFacilityBreakdown || [];
    const leisureProductBreakdown = externalData.leisureProductBreakdown || externalData.data?.leisureProductBreakdown || [];
    const roomTypeBreakdown = externalData.roomTypeBreakdown || externalData.data?.roomTypeBreakdown || [];
    const leisureVisitorBreakdown = externalData.leisureVisitorBreakdown || externalData.data?.leisureVisitorBreakdown || [];

    const facilityVisitors: Record<string, number> = {};
    [...ticketFacilityBreakdown, ...leisureProductBreakdown].forEach((item: any) => {
      const facility = String(item.facility_name || '').trim();
      const visitors = item.sales_qty || item.visitors || 0;
      if (facility) {
        facilityVisitors[facility] = (facilityVisitors[facility] || 0) + visitors;
      }
    });

    const roomSales: Record<string, number> = {};
    roomTypeBreakdown.forEach((item: any) => {
      const type = String(item.facility_name || '').trim();
      const sold = item.rooms_sold || 0;
      if (type) {
        roomSales[type] = (roomSales[type] || 0) + sold;
      }
    });

    let preCalculatedExpectedGuests = 0;
    leisureVisitorBreakdown.forEach((item: any) => {
      if (String(item.facility_name).trim() === '객실') {
        preCalculatedExpectedGuests += item.visitors || item.sales_qty || 0;
      }
    });

    // mappingsSnapshot is fetched below, let's fetch it earlier
    const teamMappings: Record<string, string> = {};
    try {
      const mappingsSnapshot = await db.collection('team_mappings').get();
      mappingsSnapshot.forEach((doc: any) => {
        const d = doc.data();
        teamMappings[d.columnName] = d.teamName;
      });
    } catch (e: any) {
      console.error('Firebase team_mappings fetch error:', e.message);
    }

    breakdown.forEach((item: any) => {
      const facility = String(item.facility_name || item.category_name || '');
      const isRevExcluded = excludedRevenueTerms.some(filter => facility.includes(filter));
      if (isRevExcluded) return;

      const amount = item.total_amount || item.amount || item.today_actual || 0;
      const team = teamMappings[facility] || '기타';

      totalRevenue += amount;
      teamRev[team] = (teamRev[team] || 0) + amount;
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

    // We already fetched teamMappings above, so remove the duplicate fetch
    
    return NextResponse.json({
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      teamData,
      monthlyTeamRev,
      monthlyTeamExp,
      teamMappings,
      facilityVisitors,
      roomSales,
      preCalculatedExpectedGuests,
      minDate: minDate ? (minDate as Date).toISOString() : null,
      maxDate: maxDate ? (maxDate as Date).toISOString() : null,
      debugExternalData: externalData
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
