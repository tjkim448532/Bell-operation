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
    let totalRooms = 0;
    let totalRoomCap = 0;
    let totalGolfTeams = 0;
    
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

          // [규칙 1 적용] 부분 합산 절대 금지 (SSOT Principle)
          // 배열을 reduce나 for문으로 더해서 '총 매출'을 구하지 마십시오. 
          // 반드시 백엔드가 1원 단위까지 정확히 계산해서 내려주는 단일 요약 필드만 사용합니다.
          const summary = day.summary || day || {};
          
          totalRevenue = summary.totalRevenue || summary.total_revenue || 0;
          totalRooms = summary.totalRooms || summary.total_rooms || 0;
          totalRoomCap = summary.totalRoomCap || summary.total_room_cap || summary.totalGuests || summary.total_guests || 0;
          totalGolfTeams = summary.totalGolfTeams || summary.total_golf_teams || 0;
          
          // [V5 신규 스키마 지원] salesByFacility 가 있으면 이를 breakdown의 기반으로 사용합니다.
          const salesByFacility = day.salesByFacility || day.sales_by_facility || [];

          breakdown.push(...salesByFacility);
        }

      } catch (err: any) {
        console.error('Network error fetching from backend API:', err);
        externalData = { fetch_error: err.message };
      }
    }

    const facilityVisitors: Record<string, number> = {};
    const allVisitorData = [...breakdown];
    
    allVisitorData.forEach((item: any) => {
      let facility = String(item.facility_name || item.shop_name || item.sub_group_name || item.subGroupName || item.category_name || item.category_code || '').trim();
      let visitors = item.visitors || item.guests || item.qty || item.roomsSold || item.sales_qty || item.mtd_qty || item.mtd_nights || item.nights || item.mtd_roomsSold || item.mtd_rooms_sold || item.mtd_sales_qty || item.guests_qty || item.rooms_sold || 0;
      
      if (facility && visitors > 0) {
        // Keep the maximum value found for a facility across different arrays to prevent double counting
        facilityVisitors[facility] = Math.max((facilityVisitors[facility] || 0), visitors);
      }
    });

    const roomSales: Record<string, number> = {};
    breakdown.forEach((item: any) => {
      const isRoom = item.team_name === '객실' || String(item.category_name || item.category_code).includes('객실');
      if (isRoom) {
        const type = String(item.category_name || item.category_code || item.part_name || item.facility_name || item.sub_group_name || '객실(Summary)').trim();
        const sold = item.qty || item.roomsSold || item.sales_qty || item.visitors || item.mtd_nights || item.nights || item.mtd_roomsSold || item.mtd_rooms_sold || item.mtd_qty || item.mtd_sales_qty || item.rooms_sold || item.totalRoomsSold || 0;
        if (type) {
          roomSales[type] = (roomSales[type] || 0) + sold;
        }
      }
    });

    // [규칙 1 적용 완벽 준수] 부분 합산(SLICE SUMMATION) 절대 금지. 
    // 배열을 루프 돌며 합산하지 않고, 최상단 summary 객체의 단일 값을 그대로 사용합니다.
    let preCalculatedExpectedGuests = totalRoomCap || 0;

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
      let facility = String(item.facility_name || item.shop_name || item.sub_group_name || item.subGroupName || item.category_name || item.category_code || '').trim();
      
      const isSummaryObject = item.totalTicketRevenue !== undefined || 
                              item.totalFnbRevenue !== undefined || 
                              item.totalGolfRevenue !== undefined || 
                              item.totalRoomRevenue !== undefined;

      // 백엔드 가이드: '요약행이라고 지레짐작하여 항목을 필터링하지 않고 그대로 합산합니다.'

      // 백엔드 가이드: 매출은 프론트엔드 칸반보드(teamMappings)를 최우선으로 따릅니다.
      // 신규 V5: 영업장 이름(facility)이 칸반보드에 매핑되어 있으면 그 팀을 사용하고, 없으면 백엔드 조직도를 따릅니다.
      let team = teamMappings[facility] || item.team_name || item.part_name || item.category_name || item.category_code || '미분류';
      if (team === '미분류') {
        const catStr = String(item.category_name || item.category_code || '');
        if (item._source === 'golf' || catStr.includes('골프')) team = '골프';
        else if (item._source === 'room' || catStr.includes('객실')) team = '객실';
        else if (item._source === 'fnb' || catStr.includes('식음') || catStr.includes('F&B')) team = 'F&B';
      }

      let amount = item.total_sales || item.mtd_actual || item.total_amount || item.amount || item.today_actual || item.revenue || item.totalRevenue || item.salesAmount || 0;
      
      // V4 legacy fallback removed.

      teamRev[team] = (teamRev[team] || 0) + amount;
    });

    // [규칙 1 적용] 프론트엔드의 임의 오버라이드 꼼수 제거
    // 백엔드의 단일 스냅샷 배열(breakdown)을 100% 신뢰하여 합산된 teamRev를 그대로 사용합니다.

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
      totalRooms,
      totalGolfTeams,
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
