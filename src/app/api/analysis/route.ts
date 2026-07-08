import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'expense';
    const team = searchParams.get('team') || 'all';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    const collectionName = type === 'expense' ? 'expenses' : 'revenues';
    let query: any = db.collection(collectionName);
    
    // We will filter by team in memory to avoid needing a Firestore composite index.
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      let end = new Date(endDateStr);
      
      if (endDateStr.length === 7) {
        end.setUTCMonth(end.getUTCMonth() + 1);
        end = new Date(end.getTime() - 1);
      } else {
        end.setUTCHours(23, 59, 59, 999);
      }
      query = query.where('date', '>=', start).where('date', '<=', end);
    }
    
    // Get expense filters
    const expenseFilterSnapshot = await db.collection('expense_filters').get();
    const excludedExpenseTerms: string[] = [];
    expenseFilterSnapshot.forEach((doc: any) => {
      excludedExpenseTerms.push(doc.data().term);
    });

    // Get revenue filters
    const revenueFilterSnapshot = await db.collection('revenue_filters').get();
    const excludedRevenueTerms: string[] = [];
    revenueFilterSnapshot.forEach((doc: any) => {
      excludedRevenueTerms.push(doc.data().term);
    });

    let records: any[] = [];
    
    if (type !== 'revenue') {
      const snapshot = await query.get();
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();

        // Manual team filter
        if (team !== 'all' && data.team !== team) {
          return;
        }

        // Filter out excluded expenses
        if (type === 'expense') {
          const term1 = String(data.mapped_term || '');
          const term2 = String(data.original_term || '');
          const desc = String(data.description || '');
          const proj = String(data.assigned_project || data.branch_name || '');
          const dept = String(data.dept_name || '');

          const isExcluded = excludedExpenseTerms.some(filter => 
            term1.includes(filter) || term2.includes(filter) || desc.includes(filter) || proj.includes(filter) || dept.includes(filter)
          );
          if (isExcluded) return;
        }

        if (data.date && typeof data.date.toDate === 'function') {
          data.date = data.date.toDate().toISOString();
        }
        records.push({ id: doc.id, ...data });
      });
    }
    
    // --- Inject V5 MariaDB Revenues ---
    if (type === 'revenue' && startDateStr && endDateStr) {
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
        const cookieHeader = request.headers.get('cookie') || '';
        const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

        // Fetch team_mappings
        const teamMappings: Record<string, string> = {};
        const mappingsSnapshot = await db.collection('team_mappings').get();
        mappingsSnapshot.forEach((doc: any) => {
          const d = doc.data();
          teamMappings[d.columnName] = d.teamName;
        });
        teamMappings['엑티비티(Summary)'] = '엑티비티';
        teamMappings['F&B(Summary)'] = 'F&B';
        teamMappings['골프(Summary)'] = '골프';
        teamMappings['객실(Summary)'] = '객실';

        const getDates = (start: string, end: string) => {
          const arr = [];
          const dt = new Date(start);
          const endDt = new Date(end);
          while (dt <= endDt) {
            arr.push(new Date(dt).toISOString().split('T')[0]);
            dt.setDate(dt.getDate() + 1);
          }
          return arr;
        };
        const dateList = getDates(apiStartDate, apiEndDate);

        const fetchPromises = dateList.map(async (dateStr) => {
          const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${dateStr}`;
          try {
            const res = await fetch(revUrl, {
              headers: { 'Cookie': cookieHeader, 'Authorization': `Bearer ${m2mToken}` },
              next: { revalidate: 3600 }
            });
            if (res.ok) {
              const json = await res.json();
              return { dateStr, data: json.data || json };
            }
          } catch(e) {}
          return null;
        });

        const results = await Promise.all(fetchPromises);

        results.forEach((resData: any) => {
          if (!resData || !resData.data) return;
          const { dateStr, data } = resData;

          const ticketSummary = data.ticketSummary || [];
          const fnbSummary = data.fnbSummary || [];
          const golfSummary = data.golfSummary || [];
          const roomSummary = data.roomSummary || [];

          const ticketFacilityBreakdown = data.ticketFacilityBreakdown || [];
          const fnbFacilityBreakdown = data.fnbFacilityBreakdown || [];
          const golfFacilityBreakdown = data.golfFacilityBreakdown || [];
          const roomTypeBreakdown = data.roomTypeBreakdown || [];

          const breakdowns = [
            ...(ticketFacilityBreakdown.length > 0 ? [] : (Array.isArray(ticketSummary) ? ticketSummary : [ticketSummary])),
            ...(fnbFacilityBreakdown.length > 0 ? [] : (Array.isArray(fnbSummary) ? fnbSummary : [fnbSummary])),
            ...(golfFacilityBreakdown.length > 0 ? [] : (Array.isArray(golfSummary) ? golfSummary : [golfSummary])),
            ...roomTypeBreakdown,
            ...(data.roomMarketBreakdown || []),
            ...(data.dailyReportBreakdown || []),
            ...ticketFacilityBreakdown,
            ...fnbFacilityBreakdown,
            ...golfFacilityBreakdown,
            ...(data.leisureProductBreakdown || []),
            ...(data.leisureVisitorBreakdown || [])
          ];

          if (roomTypeBreakdown.length === 0 && roomSummary && Object.keys(roomSummary).length > 0) {
            breakdowns.push(...(Array.isArray(roomSummary) ? roomSummary : [roomSummary]));
          }

          breakdowns.forEach((item: any, idx: number) => {
            let facility = String(item.facility_name || item.shop_name || item.category_name || '').trim();
            let amount = item.total_amount || item.amount || item.today_actual || item.revenue || 0;

            if (item.totalTicketRevenue !== undefined) { amount = item.totalTicketRevenue; facility = '엑티비티(Summary)'; }
            else if (item.totalFnbRevenue !== undefined) { amount = item.totalFnbRevenue; facility = 'F&B(Summary)'; }
            else if (item.totalGolfRevenue !== undefined) { amount = item.totalGolfRevenue; facility = '골프(Summary)'; }
            else if (item.totalRoomRevenue !== undefined) { amount = item.totalRoomRevenue; facility = '객실(Summary)'; }

            let mappedTeam = teamMappings[facility] || '기타';

            if (amount > 0) {
              const isExcluded = excludedRevenueTerms.some(filter => facility.includes(filter));
              if (!isExcluded) {
                // Apply manual team filter
                if (team === 'all' || mappedTeam === team) {
                  records.push({
                    id: `v5-${dateStr}-${facility}-${idx}`,
                    team: mappedTeam,
                    branch_name: facility,
                    amount: amount,
                    date: dateStr + 'T00:00:00.000Z',
                    source: 'v5-mariadb'
                  });
                }
              }
            }
          });
        });
      } catch (err) {
        console.error('Error fetching V5 revenues in analysis API:', err);
      }
    }
    
    // Sort by date desc in memory since we don't have an index yet
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Send all records for the period to allow client-side aggregation
    return NextResponse.json(records);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
