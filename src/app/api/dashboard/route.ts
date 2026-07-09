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
    let manualRevenueSum = 0; // For fallback if summary doesn't exist
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
    
    let externalData: any = {
      ticketSummary: [],
      fnbSummary: [],
      golfSummary: [],
      roomSummary: [],
      roomTypeBreakdown: [],
      roomMarketBreakdown: [],
      channelBreakdown: [],
      dailyReportBreakdown: [],
      ticketFacilityBreakdown: [],
      fnbFacilityBreakdown: [],
      golfFacilityBreakdown: [],
      leisureProductBreakdown: [],
      leisureVisitorBreakdown: [],
      rateTypeBreakdown: [],
      weather: null,
      mtd: null,
      ytd: null,
      gridData: null
    };
    
    let breakdown: any[] = [];
    let ticketSummary: any[] = [];
    let fnbSummary: any[] = [];
    let golfSummary: any[] = [];
    let roomSummary: any[] = [];
    let roomTypeBreakdown: any[] = [];

    if (startDateStr && endDateStr) {
      try {
        const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
        
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${apiEndDate}`;
        const res = await fetch(revUrl, {
          headers: { 
            'Cookie': cookieHeader,
            'Authorization': `Bearer ${m2mToken}`
          },
          cache: 'no-store'
        });
        
        let apiData = null;
        if (res.ok) {
          const json = await res.json();
          apiData = json.data || json;
        }

        let daysData: any[] = [];
        if (apiData) {
          daysData = Array.isArray(apiData) ? apiData.map((d: any) => d.data || d) : [apiData];
          // V5 API 응답에서 공통 배열들(leisureVisitorBreakdown 등)을 externalData에 병합
          const lastDayData = daysData[daysData.length - 1] || {};
          externalData.leisureVisitorBreakdown = lastDayData.leisureVisitorBreakdown || [];
          externalData.dailyReportBreakdown = lastDayData.dailyReportBreakdown || [];
          externalData.channelBreakdown = lastDayData.channelBreakdown || [];
          externalData.roomTypeBreakdown = lastDayData.roomTypeBreakdown || [];
        }

        if (daysData.length > 0) {
          const day = lastDayData;

          ticketSummary = day.ticketSummary || [];
          fnbSummary = day.fnbSummary || [];
          golfSummary = day.golfSummary || [];
          roomSummary = day.roomSummary || [];
          
          // [규칙 2 적용] 상태 누적(State Accumulation) 절대 금지. 스냅샷 덮어쓰기.
          // V5 API는 해당 날짜까지의 월 누적(mtd_actual)을 반환하므로 마지막 일자 데이터만 취합니다.
          const gTotal = golfSummary.mtd_actual || 0;
          const rTotal = roomSummary.mtd_actual || 0;
          const tTotal = ticketSummary.mtd_actual || 0;
          const fTotal = fnbSummary.mtd_actual || 0;
          
          totalRevenue = (gTotal + rTotal + tTotal + fTotal);

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

          roomTypeBreakdown = day.roomTypeBreakdown || roomSummary.roomTypeBreakdown || [];
          if (roomTypeBreakdown.length === 0) roomTypeBreakdown = day.channelBreakdown || roomSummary.channelBreakdown || [];
          if (roomTypeBreakdown.length === 0) roomTypeBreakdown = day.roomFacilityBreakdown || roomSummary.facilityBreakdown || [];

          // facilityBreakdown이 Summary 객체 안에 들어있는 경우 대응
          const tBreakdown = day.ticketFacilityBreakdown?.length > 0 ? day.ticketFacilityBreakdown : (ticketSummary.facilityBreakdown || (Object.keys(ticketSummary).length > 0 && !Array.isArray(ticketSummary) ? [ticketSummary] : (Array.isArray(ticketSummary) ? ticketSummary : [])));
          const fBreakdown = day.fnbFacilityBreakdown?.length > 0 ? day.fnbFacilityBreakdown : (fnbSummary.facilityBreakdown || (Object.keys(fnbSummary).length > 0 && !Array.isArray(fnbSummary) ? [fnbSummary] : (Array.isArray(fnbSummary) ? fnbSummary : [])));
          const gBreakdown = day.golfFacilityBreakdown?.length > 0 ? day.golfFacilityBreakdown : (golfSummary.facilityBreakdown || (Object.keys(golfSummary).length > 0 && !Array.isArray(golfSummary) ? [golfSummary] : (Array.isArray(golfSummary) ? golfSummary : [])));

          breakdown.push(
            ...tBreakdown.map((i: any) => {
              return { ...i, _source: 'ticket' };
            }),
            ...fBreakdown.map((i: any) => ({ ...i, _source: 'fnb' })),
            ...gBreakdown.map((i: any) => ({ ...i, _source: 'golf' })),
            ...(roomTypeBreakdown.length > 0 ? roomTypeBreakdown : (Object.keys(roomSummary).length > 0 && !Array.isArray(roomSummary) ? [roomSummary] : (Array.isArray(roomSummary) ? roomSummary : []))).map((i: any) => ({ ...i, _source: 'room' }))
          );
        }

      } catch (err: any) {
        console.error('Network error fetching from backend API:', err);
        externalData = { fetch_error: err.message };
      }
    }

    const facilityVisitors: Record<string, number> = {};
    const allVisitorData = [
      ...breakdown,
      ...(externalData.leisureVisitorBreakdown || externalData.data?.leisureVisitorBreakdown || []),
      ...(externalData.dailyReportBreakdown || externalData.data?.dailyReportBreakdown || [])
    ];
    
    allVisitorData.forEach((item: any) => {
      let facility = String(item.facility_name || item.shop_name || '').trim();
      let visitors = item.mtd_nights || item.nights || item.mtd_roomsSold || item.mtd_rooms_sold || item.mtd_qty || item.mtd_sales_qty || item.visitors || item.guests_qty || item.guests || item.sales_qty || item.qty || item.rooms_sold || item.roomsSold || 0;
      
      if (facility && visitors > 0) {
        // Keep the maximum value found for a facility across different arrays to prevent double counting
        facilityVisitors[facility] = Math.max((facilityVisitors[facility] || 0), visitors);
      }
    });

    const roomSales: Record<string, number> = {};
    const roomItems = roomTypeBreakdown.length > 0 ? roomTypeBreakdown : (Array.isArray(roomSummary) && roomSummary.length > 0 ? roomSummary : Object.keys(roomSummary).length > 0 ? [roomSummary] : []);
    roomItems.forEach((item: any) => {
      const type = String(item.pyType || item.facility_name || item.shop_name || item.roomType || '객실(Summary)').trim();
      const sold = item.mtd_nights || item.nights || item.mtd_roomsSold || item.mtd_rooms_sold || item.mtd_qty || item.mtd_sales_qty || item.rooms_sold || item.sales_qty || item.qty || item.roomsSold || item.totalRoomsSold || 0;
      if (type) {
        roomSales[type] = (roomSales[type] || 0) + sold;
      }
    });

    let preCalculatedExpectedGuests = 0;
    allVisitorData.forEach((item: any) => {
      let facilityName = String(item.facility_name || item.shop_name || '').trim();
      let visitors = item.mtd_nights || item.nights || item.mtd_roomsSold || item.mtd_rooms_sold || item.mtd_qty || item.mtd_sales_qty || item.visitors || item.guests_qty || item.guests || item.sales_qty || item.qty || item.rooms_sold || item.roomsSold || 0;
      
      // V4 legacy fallback removed.

      // 백엔드 가이드: 문자열 검색(includes) 기반의 UI 그룹핑 금지.
      // source가 명시적으로 'room'인 데이터만 합산
      if (item._source === 'room') {
        preCalculatedExpectedGuests += visitors;
      }
    });

    // Fallback: If preCalculatedExpectedGuests is still 0, calculate based on roomSales
    // Fallback: 백엔드의 visitors 필드가 비어있을 경우에만 차선책으로 roomSales에 고정 승수 적용 (이것도 지양해야 하나 호환성을 위해 유지)
    if (preCalculatedExpectedGuests === 0 && Object.keys(roomSales).length > 0) {
      Object.entries(roomSales).forEach(([type, nights]) => {
        let multiplier = 2; // Default for 16PY
        if (type.includes('35')) multiplier = 4;
        else if (type.includes('51')) multiplier = 6;
        else if (type.includes('72')) multiplier = 8;
        preCalculatedExpectedGuests += (nights * multiplier);
      });
    }

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
    
    // Inject V5 summary objects into teamMappings so the UI can map visitors to the correct team
    teamMappings['엑티비티(Summary)'] = '엑티비티';
    teamMappings['F&B(Summary)'] = 'F&B';
    teamMappings['골프(Summary)'] = '골프';
    teamMappings['객실(Summary)'] = '객실';



    breakdown.forEach((item: any) => {
      let facility = String(item.facility_name || item.shop_name || item.category_name || '').trim();
      
      const isSummaryObject = item.totalTicketRevenue !== undefined || 
                              item.totalFnbRevenue !== undefined || 
                              item.totalGolfRevenue !== undefined || 
                              item.totalRoomRevenue !== undefined;

      // 백엔드 가이드: '요약행이라고 지레짐작하여 항목을 필터링하지 않고 그대로 합산합니다.'

      let team = teamMappings[facility];
      
      if (!team || team === '기타') {
        if (item._source === 'fnb') team = 'F&B';
        else if (item._source === 'golf') team = '골프';
        else if (item._source === 'room') team = '객실';
        else team = '미분류';
      }

      let amount = item.mtd_actual || item.total_amount || item.amount || item.today_actual || item.revenue || 0;
      
      // V4 legacy fallback removed.

      // [규칙 2 적용] 백엔드 제공 스냅샷 데이터의 무조건적인 합산 (임의 필터링 금지)
      // 백엔드 원장 대조 결과 데이터 뻥튀기가 없음이 증명되었으므로, 어떠한 자체 필터링 없이 그대로 합산합니다.
      manualRevenueSum += amount;
      
      teamRev[team] = (teamRev[team] || 0) + amount;
    });

    // [규칙 1 적용] 프론트엔드의 임의 오버라이드 꼼수 제거
    // 백엔드의 단일 스냅샷 배열(breakdown)을 100% 신뢰하여 합산된 teamRev를 그대로 사용합니다.
    if (totalRevenue === 0 && manualRevenueSum > 0) {
      totalRevenue = manualRevenueSum;
    }

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
      weather: externalData.weather || externalData.data?.weather || null,
      mtd: externalData.mtd || externalData.data?.mtd || null,
      ytd: externalData.ytd || externalData.data?.ytd || null,
      gridData: externalData.gridData || externalData.data?.gridData || null,
      rateTypeBreakdown: externalData.rateTypeBreakdown || externalData.data?.rateTypeBreakdown || [],
      debugExternalData: externalData
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
