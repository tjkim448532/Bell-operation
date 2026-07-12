import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');

    // --- 백엔드 가이드: 반드시 YYYY-MM-DD 포맷을 사용해야 함 ---
    let apiEndDate = '';
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    
    if (monthStr && monthStr.length === 7) {
      const [year, month] = monthStr.split('-');
      // 해당 월의 마지막 날짜 구하기 (0을 넣으면 이전 달 마지막 날이 나옴)
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      apiEndDate = `${monthStr}-${lastDay}`;
      
      minDate = new Date(`${monthStr}-01`);
      maxDate = new Date(apiEndDate);
    }

    let expQuery: any = db.collection('expenses');
    if (monthStr) {
      // 비용(Expense) 데이터는 엑셀 업로드 시 월 단위로 등록되므로, 
      // 일(Day) 단위로 자르면 월말에 기록된 지출이 누락되어 로직이 파괴된 것처럼 보일 수 있습니다.
      // 따라서 선택한 기간이 포함된 '월(month)' 전체의 데이터를 항상 가져옵니다.
      expQuery = expQuery.where('month', '==', monthStr);
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
    const teamFacilities: Record<string, {name: string, type: 'revenue' | 'expense', amount: number, rawName?: string}[]> = {};

    const updateMinMax = (d: any) => {
      let dateObj: Date | null = null;
      if (d && typeof d.toDate === 'function') {
        dateObj = d.toDate();
      } else if (d) {
        dateObj = new Date(d);
      }
      
      // We already set minDate and maxDate from monthStr, so we don't strictly need this unless we want to bound it by actual data.
      // But keeping it just in case.
    };

    // 강제로 Vercel 백엔드 URL 고정 (Cloud 환경변수 무시)
    const BACKEND_URL = 'https://belleforet-data.vercel.app';
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

    if (monthStr && apiEndDate) {
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

        const matrixUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=${apiEndDate}`;
        const matrixRes = await fetch(matrixUrl, {
          headers: { 
            'Cookie': cookieHeader,
            'Authorization': `Bearer ${m2mToken}`
          },
          cache: 'no-store'
        });
        let matrixData: any[] = [];
        if (matrixRes.ok) {
          const mJson = await matrixRes.json();
          matrixData = mJson.data || [];
        }

        let daysData: any[] = [];
        let lastDayData: any = {};
        if (apiData) {
          daysData = Array.isArray(apiData) ? apiData.map((d: any) => d.data || d) : [apiData];
          lastDayData = daysData[daysData.length - 1] || {};
          externalData.leisureVisitorBreakdown = lastDayData.leisureVisitorBreakdown || [];
          externalData.dailyReportBreakdown = lastDayData.dailyReportBreakdown || [];
          externalData.channelBreakdown = lastDayData.channelBreakdown || [];
          externalData.roomTypeBreakdown = lastDayData.roomTypeBreakdown || [];
        }

        if (daysData.length > 0) {
          const day = lastDayData;

          const summary = day.summary || day || {};
          
          totalRevenue = summary.mtdRevenue || summary.totalRevenue || summary.total_revenue || 0;
          totalRooms = summary.totalRooms || summary.total_rooms || 0;
          totalRoomCap = summary.totalRoomCap || summary.total_room_cap || summary.totalGuests || summary.total_guests || 0;
          totalGolfTeams = summary.totalGolfTeams || summary.total_golf_teams || 0;
          
          // Use matrix-weekly data for the breakdown so we get MTD actual per facility
          breakdown.push(...matrixData);
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

    // V4 Legacy roomSales calculation removed to enforce SSOT (frontend ignores it anyway)

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
    // Fetch V5 Admin mapping to use for expense routing (SSOT V5 Mapping)
    const v5Mapping: Record<string, string> = {};
    const leisureTeams = new Set<string>();
    try {
      const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
      
      const https = require('https');
      const v5Rows: any[] = await new Promise((resolve, reject) => {
        const req = https.get(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
          headers: { 
            'Authorization': `Bearer ${m2mToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bell-Operation/1.0',
            'Accept': 'application/json'
          }
        }, (response: any) => {
          let data = '';
          response.on('data', (chunk: any) => { data += chunk; });
          response.on('end', () => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              try {
                const parsed = JSON.parse(data);
                resolve(parsed.data || []);
              } catch (err) { resolve([]); }
            } else { resolve([]); }
          });
        });
        req.on('error', () => resolve([]));
        req.end();
      });

      v5Rows.forEach((row: any) => {
        const teamName = String(row.team_name || '').trim();
        const partName = String(row.part_name || '').trim();
        const facilityName = String(row.facility_name || '').trim();
        
        if (teamName !== '미분류' || partName !== '미분류') {
          if (partName && partName !== '미분류') leisureTeams.add(partName);
          else if (teamName && teamName !== '미분류') leisureTeams.add(teamName);
        }

        let groupName = '기타';
        if (partName && partName !== '미분류') groupName = partName;
        else if (teamName && teamName !== '미분류') groupName = teamName;
        
        if (groupName !== '기타' && facilityName) {
          v5Mapping[facilityName] = groupName;
        }
      });
    } catch (e: any) {
      console.error('V5 mapping fetch error:', e.message);
    }

    try {
      const customDoc = await db.collection('settings').doc('customTeams').get();
      if (customDoc.exists) {
        (customDoc.data()?.teams || []).forEach((t: string) => leisureTeams.add(t));
      }
    } catch (e: any) {
      console.error('customTeams fetch error:', e.message);
    }

    let explicitLeisureTeams: string[] | null = null;
    try {
      const selDoc = await db.collection('settings').doc('leisureSelection').get();
      if (selDoc.exists) {
        explicitLeisureTeams = selDoc.data()?.selectedTeams || null;
      }
    } catch (e: any) {
      console.error('leisureSelection fetch error:', e.message);
    }
    
    const expenseMappings: Record<string, string> = {};
    try {
      const expMapSnapshot = await db.collection('expense_mappings').get();
      expMapSnapshot.forEach((doc: any) => {
        const d = doc.data();
        if (d.rawText && d.targetTeam) {
          expenseMappings[d.rawText] = d.targetTeam;
        }
      });
    } catch (e: any) {
      console.error('Firebase expense_mappings fetch error:', e.message);
    }
    // [바이블 엄수] 프론트엔드 자체 합산(Slice Summation) 전면 폐지.
    // 백엔드의 is_subtotal: true (소계) 데이터 중 'part' 레벨 소계만 추출하여 그대로 사용합니다.
    breakdown.forEach((item: any) => {
      let team = '미분류';
      if (item.part_name && item.part_name !== '미분류' && item.part_name !== '소계') {
        team = item.part_name;
      } else if (item.team_name && item.team_name !== '미분류' && item.team_name !== '소계') {
        team = item.team_name;
      }

      let amount = item.total_sales || item.mtd_actual || item.total_amount || item.amount || item.today_actual || item.revenue || item.totalRevenue || item.salesAmount || 0;

      if (!item.is_subtotal && !item.is_grand_total) {
        // This is a facility (shop) row. Record it for the UI breakdown.
        const facilityName = String(item.facility_name || item.shop_name || '').trim();
        if (facilityName && team !== '미분류') {
          if (!teamFacilities[team]) teamFacilities[team] = [];
          teamFacilities[team].push({ name: facilityName, type: 'revenue', amount });
        }
      }

      if (!item.is_subtotal || item.subtotal_type !== 'part') return;

      // 이미 백엔드에서 합산된 소계 데이터이므로 그대로 저장
      if (team !== '미분류') {
        teamRev[team] = amount;
      }
    });

    // [동적 매핑 복구] 프론트엔드가 합산한 teamRev를 그대로 사용합니다.

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
      let team = data.team || '기타';
      
      let assignedTeam = data.mapped_team || data.assigned_project || data.branch_name || '기타';
      
      // [바이블 예외 인정 - 지출 전용 매핑 사전 조회]
      if (expenseMappings[assignedTeam]) {
        team = expenseMappings[assignedTeam];
      } else if (expenseMappings[term1]) {
        team = expenseMappings[term1];
      } else if (expenseMappings[term2]) {
        team = expenseMappings[term2];
      } else if (expenseMappings[desc]) {
        team = expenseMappings[desc];
      } else {
        team = assignedTeam && assignedTeam !== '기타' && assignedTeam !== '미분류 프로젝트' && assignedTeam !== '0' && assignedTeam !== '미분류' ? assignedTeam : '기타';
      }
      
      updateMinMax(data.date);
      
      let month = 0;
      if (data.date && typeof data.date.toDate === 'function') {
        month = data.date.toDate().getMonth();
      } else if (data.date) {
        month = new Date(data.date).getMonth();
      }

      totalExpense += amount;
      teamExp[team] = (teamExp[team] || 0) + amount;
      
      if (!teamFacilities[team]) teamFacilities[team] = [];
      teamFacilities[team].push({ 
        name: term1 || desc || '기타 지출', 
        rawName: term2, // For tooltip info
        type: 'expense', 
        amount 
      });

      if (!monthlyTeamExp[month]) monthlyTeamExp[month] = {};
      monthlyTeamExp[month][team] = (monthlyTeamExp[month][team] || 0) + amount;
    });

    const teams = Array.from(new Set([...Object.keys(teamRev), ...Object.keys(teamExp)]));

    const teamData = teams.map(team => {
      // Consolidate facilities with same name and type
      const facMap = new Map<string, any>();
      (teamFacilities[team] || []).forEach(f => {
        const key = `${f.type}-${f.name}`;
        if (facMap.has(key)) {
          facMap.get(key).amount += f.amount;
        } else {
          facMap.set(key, { ...f });
        }
      });
      const consolidatedFacilities = Array.from(facMap.values());

      return { 
        team, 
        revenue: teamRev[team] || 0, 
        expense: teamExp[team] || 0,
        facilities: consolidatedFacilities
      };
    }).filter(t => t.revenue > 0 || t.expense > 0);

    // [바이블 엄수 - UI 필터링 (Minus 방식)]
    // 총매출은 백엔드 totalRevenue를 절대 신뢰하며, 화면 조작(Toggle) 시 제외된 팀의 소계만큼만 차감합니다.
    let displayTotalRevenue = totalRevenue;
    let displayTotalExpense = totalExpense;

    if (explicitLeisureTeams && explicitLeisureTeams.length > 0) {
      let excludedRevenue = 0;
      let excludedExpense = 0;
      
      teams.forEach(team => {
        if (!explicitLeisureTeams!.includes(team)) {
          excludedRevenue += (teamRev[team] || 0);
          excludedExpense += (teamExp[team] || 0);
        }
      });
      
      displayTotalRevenue = totalRevenue - excludedRevenue;
      displayTotalExpense = totalExpense - excludedExpense;
    }

    // We already fetched teamMappings above, so remove the duplicate fetch
    
    return NextResponse.json({
      totalRevenue: displayTotalRevenue,
      totalRooms,
      totalGolfTeams,
      totalExpense: displayTotalExpense,
      netProfit: displayTotalRevenue - displayTotalExpense,
      teamData,
      monthlyTeamRev,
      monthlyTeamExp,
      teamMappings,
      facilityVisitors,
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
