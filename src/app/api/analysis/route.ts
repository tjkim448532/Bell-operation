import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'expense';
    const team = searchParams.get('team') || 'all';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

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

        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${apiEndDate}`;
        const res = await fetch(revUrl, {
          headers: { 'Cookie': cookieHeader, 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });

        let apiData: any;
        if (res.ok) {
          const json = await res.json();
          apiData = json.data || json;
        }

        if (team === 'debug') {
          return NextResponse.json({
            ok: res.ok,
            status: res.status,
            apiData: apiData
          });
        }

        let daysData: any[] = [];
        if (apiData) {
          daysData = Array.isArray(apiData) ? apiData.map((d: any) => d.data || d) : [apiData];
        }

        let breakdowns: any[] = [];
        if (daysData.length > 0) {
          const day = daysData[daysData.length - 1]; // [규칙 2 적용] 스냅샷 덮어쓰기 (배열 누적 방지)
          const ticketSummary = day.ticketSummary || [];
          const fnbSummary = day.fnbSummary || [];
          const golfSummary = day.golfSummary || [];
          const roomSummary = day.roomSummary || [];
          const dateStr = day.date || apiStartDate;

          // [규칙 3 적용] 티켓 매핑 O(1) 사전
          const productMap: Record<string, string> = {};
          if (ticketSummary.productLevelMapping) {
            ticketSummary.productLevelMapping.forEach((item: any) => {
              productMap[item.ticketName] = item.groupName;
            });
          }
          
          const facilityMap: Record<string, string> = {};
          if (ticketSummary.facilityLevelMapping) {
            ticketSummary.facilityLevelMapping.forEach((item: any) => {
              facilityMap[item.facilityName] = item.groupName;
            });
          }

          const tBreakdown = day.ticketFacilityBreakdown?.length > 0 ? day.ticketFacilityBreakdown : (ticketSummary.facilityBreakdown || (Object.keys(ticketSummary).length > 0 && !Array.isArray(ticketSummary) ? [ticketSummary] : (Array.isArray(ticketSummary) ? ticketSummary : [])));
          const fBreakdown = day.fnbFacilityBreakdown?.length > 0 ? day.fnbFacilityBreakdown : (fnbSummary.facilityBreakdown || (Object.keys(fnbSummary).length > 0 && !Array.isArray(fnbSummary) ? [fnbSummary] : (Array.isArray(fnbSummary) ? fnbSummary : [])));
          const gBreakdown = day.golfFacilityBreakdown?.length > 0 ? day.golfFacilityBreakdown : (golfSummary.facilityBreakdown || (Object.keys(golfSummary).length > 0 && !Array.isArray(golfSummary) ? [golfSummary] : (Array.isArray(golfSummary) ? golfSummary : [])));
          const rBreakdown = day.roomMarketBreakdown?.length > 0 ? day.roomMarketBreakdown : (roomSummary.roomMarketBreakdown || (Object.keys(roomSummary).length > 0 && !Array.isArray(roomSummary) ? [roomSummary] : (Array.isArray(roomSummary) ? roomSummary : [])));

          if (tBreakdown.length > 0) console.log('TBREAKDOWN KEYS:', Object.keys(tBreakdown[0])); breakdowns.push(
            ...tBreakdown.map((i: any) => {
              return { ...i, _source: 'ticket', _date: dateStr };
            }),
            ...fBreakdown.map((i: any) => ({ ...i, _source: 'fnb', _date: dateStr })),
            ...gBreakdown.map((i: any) => ({ ...i, _source: 'golf', _date: dateStr })),
            ...rBreakdown.map((i: any) => ({ ...i, _source: 'room', _date: dateStr }))
          );
        }

        if (breakdowns.length > 0) {


          breakdowns.forEach((item: any, idx: number) => {
            let facility = String(item.facility_name || item.shop_name || item.category_name || '').trim();
            const dateStr = item.date || apiStartDate;
            
            const isSummaryObject = item.totalTicketRevenue !== undefined || 
                                    item.totalFnbRevenue !== undefined || 
                                    item.totalGolfRevenue !== undefined || 
                                    item.totalRoomRevenue !== undefined;

            // V5 에서는 배열 아이템 내부에 요약 필드가 존재하지 않고 객체로 전달됩니다.

            let amount = item.mtd_actual || item.total_amount || item.amount || item.today_actual || item.revenue || 0;

            // V5 에서는 배열 아이템 내부에 요약 필드가 존재하지 않고 객체로 전달됩니다.
            // _source 꼬리표를 통해 Summary 객체임을 식별하여 라벨을 부여합니다.
            if (item.totalTicketRevenue !== undefined) { amount = item.totalTicketRevenue; facility = '티켓(Summary)'; }
            else if (item.totalFnbRevenue !== undefined) { amount = item.totalFnbRevenue; facility = 'F&B(Summary)'; }
            else if (item.totalGolfRevenue !== undefined) { amount = item.totalGolfRevenue; facility = '골프(Summary)'; }
            else if (item.totalRoomRevenue !== undefined) { amount = item.totalRoomRevenue; facility = '객실(Summary)'; }
            else if (facility === '') {
              if (item._source === 'ticket') facility = '티켓(Summary)';
              else if (item._source === 'fnb') facility = 'F&B(Summary)';
              else if (item._source === 'golf') facility = '골프(Summary)';
              else if (item._source === 'room') facility = '객실(Summary)';
            }

            // [규칙 3 적용] 매핑 사전에 없으면 무조건 '미분류'로 처리하여 관리자가 인지하게 함
            let mappedTeam = teamMappings[facility] || '미분류';

            if (amount > 0) {
              // 백엔드 원장 대조 결과 데이터 뻥튀기가 없음이 증명되었으므로 자체 필터링 없이 그대로 합산
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
        }
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
