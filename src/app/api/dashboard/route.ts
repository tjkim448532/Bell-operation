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
    
    if (startDateStr && endDateStr) {
      try {
        const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
        
        // Generate array of dates
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
              headers: { 
                'Cookie': cookieHeader,
                'Authorization': `Bearer ${m2mToken}`
              },
              next: { revalidate: 3600 }
            });
            if (res.ok) {
              const json = await res.json();
              return json.data || json;
            } else {
              return null;
            }
          } catch (err) {
            return null;
          }
        });

        const results = await Promise.all(fetchPromises);
        
        results.forEach(dayData => {
          if (!dayData) return;
          
          if (dayData.ticketSummary) externalData.ticketSummary.push(...(Array.isArray(dayData.ticketSummary) ? dayData.ticketSummary : [dayData.ticketSummary]));
          if (dayData.fnbSummary) externalData.fnbSummary.push(...(Array.isArray(dayData.fnbSummary) ? dayData.fnbSummary : [dayData.fnbSummary]));
          if (dayData.golfSummary) externalData.golfSummary.push(...(Array.isArray(dayData.golfSummary) ? dayData.golfSummary : [dayData.golfSummary]));
          if (dayData.roomSummary) externalData.roomSummary.push(...(Array.isArray(dayData.roomSummary) ? dayData.roomSummary : [dayData.roomSummary]));
          if (dayData.roomTypeBreakdown) externalData.roomTypeBreakdown.push(...(Array.isArray(dayData.roomTypeBreakdown) ? dayData.roomTypeBreakdown : []));
          if (dayData.roomMarketBreakdown) externalData.roomMarketBreakdown.push(...(Array.isArray(dayData.roomMarketBreakdown) ? dayData.roomMarketBreakdown : []));
          
          // Legacy V4 Fallbacks (just in case)
          if (dayData.channelBreakdown) externalData.channelBreakdown.push(...(Array.isArray(dayData.channelBreakdown) ? dayData.channelBreakdown : []));
          if (dayData.dailyReportBreakdown) externalData.dailyReportBreakdown.push(...(Array.isArray(dayData.dailyReportBreakdown) ? dayData.dailyReportBreakdown : []));
          if (dayData.ticketFacilityBreakdown) externalData.ticketFacilityBreakdown.push(...(Array.isArray(dayData.ticketFacilityBreakdown) ? dayData.ticketFacilityBreakdown : []));
          if (dayData.fnbFacilityBreakdown) externalData.fnbFacilityBreakdown.push(...(Array.isArray(dayData.fnbFacilityBreakdown) ? dayData.fnbFacilityBreakdown : []));
          if (dayData.golfFacilityBreakdown) externalData.golfFacilityBreakdown.push(...(Array.isArray(dayData.golfFacilityBreakdown) ? dayData.golfFacilityBreakdown : []));
          if (dayData.leisureProductBreakdown) externalData.leisureProductBreakdown.push(...(Array.isArray(dayData.leisureProductBreakdown) ? dayData.leisureProductBreakdown : []));
          if (dayData.leisureVisitorBreakdown) externalData.leisureVisitorBreakdown.push(...(Array.isArray(dayData.leisureVisitorBreakdown) ? dayData.leisureVisitorBreakdown : []));
          
          // Future-proofing for new ETL fields
          if (dayData.rateTypeBreakdown) externalData.rateTypeBreakdown.push(...(Array.isArray(dayData.rateTypeBreakdown) ? dayData.rateTypeBreakdown : []));
          if (dayData.weather) externalData.weather = dayData.weather;
          if (dayData.mtd) externalData.mtd = dayData.mtd;
          if (dayData.ytd) externalData.ytd = dayData.ytd;
          if (dayData.gridData) externalData.gridData = dayData.gridData;
        });

      } catch (err: any) {
        console.error('Network error fetching from backend API:', err);
        externalData = { fetch_error: err.message };
      }
    }

    let roomTypeBreakdown = externalData.roomTypeBreakdown || externalData.data?.roomTypeBreakdown || [];
    if (!roomTypeBreakdown || roomTypeBreakdown.length === 0) {
      roomTypeBreakdown = externalData.channelBreakdown || externalData.data?.channelBreakdown || [];
    }

    const ticketSummary = externalData.ticketSummary || externalData.data?.ticketSummary || [];
    const fnbSummary = externalData.fnbSummary || externalData.data?.fnbSummary || [];
    const golfSummary = externalData.golfSummary || externalData.data?.golfSummary || [];
    const roomSummary = externalData.roomSummary || externalData.data?.roomSummary || [];
    const roomMarketBreakdown = externalData.roomMarketBreakdown || externalData.data?.roomMarketBreakdown || [];

    const ticketFacilityBreakdown = externalData.ticketFacilityBreakdown || externalData.data?.ticketFacilityBreakdown || [];
    const fnbFacilityBreakdown = externalData.fnbFacilityBreakdown || externalData.data?.fnbFacilityBreakdown || [];
    const golfFacilityBreakdown = externalData.golfFacilityBreakdown || externalData.data?.golfFacilityBreakdown || [];

    const breakdown = [
      ...(ticketFacilityBreakdown.length > 0 ? ticketFacilityBreakdown : ticketSummary),
      ...(fnbFacilityBreakdown.length > 0 ? fnbFacilityBreakdown : fnbSummary),
      ...(golfFacilityBreakdown.length > 0 ? golfFacilityBreakdown : golfSummary),
      ...(roomTypeBreakdown.length > 0 ? roomTypeBreakdown : roomSummary)
    ];

    const facilityVisitors: Record<string, number> = {};
    const allVisitorData = [
      ...breakdown,
      ...(externalData.leisureVisitorBreakdown || externalData.data?.leisureVisitorBreakdown || []),
      ...(externalData.dailyReportBreakdown || externalData.data?.dailyReportBreakdown || [])
    ];
    
    allVisitorData.forEach((item: any) => {
      let facility = String(item.facility_name || item.shop_name || '').trim();
      let visitors = item.visitors || item.guests_qty || item.guests || item.sales_qty || item.qty || item.rooms_sold || item.roomsSold || 0;
      
      if (item.totalTicketRevenue !== undefined) {
        facility = '엑티비티(Summary)';
        visitors = item.totalTicketVisitors || item.totalVisitors || item.totalQuantity || 0;
      } else if (item.totalFnbRevenue !== undefined) {
        facility = 'F&B(Summary)';
        visitors = item.totalFnbVisitors || item.totalVisitors || item.totalQuantity || 0;
      } else if (item.totalGolfRevenue !== undefined) {
        facility = '골프(Summary)';
        visitors = item.totalGolfPlayers || item.totalPlayers || item.totalVisitors || 0;
      } else if (item.totalRoomRevenue !== undefined) {
        facility = '객실(Summary)';
        visitors = item.totalRoomsSold || item.rooms_sold || item.roomsSold || 0;
      }
      
      if (facility && visitors > 0) {
        // Keep the maximum value found for a facility across different arrays to prevent double counting
        facilityVisitors[facility] = Math.max((facilityVisitors[facility] || 0), visitors);
      }
    });

    const roomSales: Record<string, number> = {};
    const roomItems = roomTypeBreakdown.length > 0 ? roomTypeBreakdown : (roomSummary.length > 0 ? roomSummary : []);
    roomItems.forEach((item: any) => {
      const type = String(item.pyType || item.facility_name || item.shop_name || item.roomType || '객실(Summary)').trim();
      const sold = item.rooms_sold || item.sales_qty || item.qty || item.roomsSold || item.totalRoomsSold || 0;
      if (type) {
        roomSales[type] = (roomSales[type] || 0) + sold;
      }
    });

    let preCalculatedExpectedGuests = 0;
    allVisitorData.forEach((item: any) => {
      let facilityName = String(item.facility_name || item.shop_name || '').trim();
      let visitors = item.visitors || item.guests_qty || item.guests || item.sales_qty || item.qty || item.rooms_sold || item.roomsSold || 0;
      
      if (item.totalRoomRevenue !== undefined) {
        facilityName = '객실(Summary)';
        visitors = item.totalRoomsSold || item.rooms_sold || item.roomsSold || 0;
      }

      if (facilityName.includes('객실') || facilityName.includes('콘도') || facilityName.includes('숙박')) {
        preCalculatedExpectedGuests += visitors;
      }
    });

    // Fallback: If preCalculatedExpectedGuests is still 0, calculate based on roomSales
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

    const getFallbackTeam = (name: string): string => {
      if (!name) return '기타';
      if (name.includes('모토아레나') || name.includes('마운틴카트') || name.includes('사계절썰매') || name.includes('마리나') || name.includes('요트') || name.includes('제트보트') || name.includes('썸머랜드') || name.includes('원더풀') || name.includes('기타티켓')) return '엑티비티';
      if (name.includes('놀이동산')) return '놀이동산';
      if (name.includes('미디어아트센터') || name.includes('미디어')) return '미디어아트센터';
      if (name.includes('목장')) return '목장';
      if (name.includes('딜라이트') || name.includes('남도예담') || name.includes('벼루재촌') || name.includes('브리스킷346') || name.includes('투썸') || name.includes('얼룩말카페') || name.includes('클럽하우스') || name.includes('밤밤') || name.includes('핏스탑') || name.includes('BHC') || name.includes('CU') || name.includes('벨포레홀') || name.includes('FNB') || name.includes('기획전')) return 'F&B';
      if (name.includes('평') || name.includes('객실') || name.includes('펫룸') || name.includes('리조트') || name.includes('콘도') || name.includes('미지정')) return '객실';
      if (name.includes('그린피') || name.includes('카트대여') || name.includes('골프')) return '골프';
      return '기타';
    };

    breakdown.forEach((item: any) => {
      let facility = String(item.facility_name || item.shop_name || item.category_name || '').trim();
      
      const isSummaryObject = item.totalTicketRevenue !== undefined || 
                              item.totalFnbRevenue !== undefined || 
                              item.totalGolfRevenue !== undefined || 
                              item.totalRoomRevenue !== undefined;

      // Prevent double-counting from API-provided total/summary rows inside the breakdown arrays
      if (!isSummaryObject) {
        if (['합계', '총계', '소계', '전체'].some(kw => facility.includes(kw))) return;
        if (facility.toLowerCase() === 'total') return;
      }

      let amount = item.total_amount || item.amount || item.today_actual || item.revenue || 0;
      
      let team = teamMappings[facility];
      if (!team || team === '기타') {
        team = getFallbackTeam(facility);
        if (team === '기타' && facility) console.log(`[UNMAPPED FACILITY in Dashboard] ${facility}`);
      }

      // Extract V5 summary objects directly since breakdown arrays are missing
      if (item.totalTicketRevenue !== undefined) {
        amount = item.totalTicketRevenue;
        team = '엑티비티';
        facility = '엑티비티(Summary)';
      } else if (item.totalFnbRevenue !== undefined) {
        amount = item.totalFnbRevenue;
        team = 'F&B';
        facility = 'F&B(Summary)';
      } else if (item.totalGolfRevenue !== undefined) {
        amount = item.totalGolfRevenue;
        team = '골프';
        facility = '골프(Summary)';
      } else if (item.totalRoomRevenue !== undefined) {
        amount = item.totalRoomRevenue;
        team = '객실';
        facility = '객실(Summary)';
      }

      const isRevExcluded = excludedRevenueTerms.some(filter => facility.includes(filter));
      if (isRevExcluded) return;

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
