import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

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
    const manualRevenueSum = 0; // For fallback if summary doesn't exist
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
    
    const breakdown: any[] = [];
    let matrixData: any[] = [];

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
      const facility = String(item.facility_name || item.shop_name || item.sub_group_name || item.subGroupName || item.category_name || item.category_code || '').trim();
      const visitors = item.visitors || item.guests || item.qty || item.roomsSold || item.sales_qty || item.mtd_qty || item.mtd_nights || item.nights || item.mtd_roomsSold || item.mtd_rooms_sold || item.mtd_sales_qty || item.guests_qty || item.rooms_sold || 0;
      
      if (facility && visitors > 0) {
        // Keep the maximum value found for a facility across different arrays to prevent double counting
        facilityVisitors[facility] = Math.max((facilityVisitors[facility] || 0), visitors);
      }
    });

    // V4 Legacy roomSales calculation removed to enforce SSOT (frontend ignores it anyway)

    // [규칙 1 적용 완벽 준수] 부분 합산(SLICE SUMMATION) 절대 금지. 
    // 배열을 루프 돌며 합산하지 않고, 최상단 summary 객체의 단일 값을 그대로 사용합니다.
    const preCalculatedExpectedGuests = totalRoomCap || 0;

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
    let v5Rows: any[] = [];
    try {
      const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
      
      const https = require('https');
      v5Rows = await new Promise((resolve, reject) => {
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
        const teamName = String(row.teamName || row.team_name || '').trim();
        const partName = String(row.partName || row.part_name || '').trim();
        const facilityName = String(row.facilityName || row.facility_name || '').trim();
        


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
        let savedTeams = selDoc.data()?.selectedTeams || [];
        // [매핑 버그 수정] 과거 저장된 '외주'를 '외주_놀이공원'으로 자동 치환
        savedTeams = savedTeams.map((t: string) => t === '외주' ? '외주_놀이공원' : t);
        
        explicitLeisureTeams = savedTeams.filter((t: string) => leisureTeams.has(t));
      }
    } catch (e: any) {
      console.error('leisureSelection fetch error:', e.message);
    }

    let leisureTeamArray = explicitLeisureTeams && explicitLeisureTeams.length > 0 
      ? explicitLeisureTeams 
      : Array.from(leisureTeams);
      
    // [앱 유일 목적 적용] "중분류 레져본부만 불러오고 레져본부내 소분류 및 각각 영업장의 매출을 가지고와"
    let leisureGrandTotal = 0;
    let dashboardMatrixData: any[] = [];
    let excludedRevenue = 0;
    
    matrixData.forEach((row: any) => {
      const teamName = row.teamName || row.team_name || '';
      
      // 오직 '레저본부' 데이터만 통과시킴
      if (teamName.trim() === '레저본부') {
        const isSubtotal = row.isSubtotal !== undefined ? row.isSubtotal : row.is_subtotal;
        const subtotalType = row.subtotalType || row.subtotal_type;
        const amount = row.mtdActual || row.mtd_actual || row.todayActual || row.today_actual || 0;
        
        // 레저본부 총매출액 계산 (team 레벨 소계들의 합)
        if (isSubtotal && subtotalType === 'team') {
          leisureGrandTotal += amount;
        }
        
        // 프론트엔드 그룹핑을 위한 team 필드 세팅 (소분류 partName 기준)
        let team = '미분류';
        const partName = row.partName || row.part_name;
        if (partName && partName !== '미분류' && partName !== '소계') {
          team = partName;
        } else {
          team = teamName;
        }
        
        // 활성화된 팀(leisureTeamArray)에 속하지 않은 파트의 매출은 총합에서 차감(Minus)
        if (isSubtotal && subtotalType === 'part' && team !== '총계') {
          if (!leisureTeamArray.includes(team)) {
            excludedRevenue += amount;
          }
        }
        
        dashboardMatrixData.push({ ...row, team });
      }
    });

    let displayTotalRevenue = leisureGrandTotal - excludedRevenue; // 레저본부 순수 매출 총합 (비활성화 파트 제외)
    let displayTotalExpense = totalExpense;

    let excludedExpense = 0;

    const expenseData: Record<string, { total: number, items: any[] }> = {};
    
    // Calculate total expense, excluded expense, and group expenses from raw Firebase expenses
    expSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const amount = data.amount || 0;
      totalExpense += amount;
      
      let team = data.team || '기타';
      const isValidTeam = leisureTeams.has(team) || ['기타', '제외'].includes(team);
      if (!isValidTeam) team = '기타';

      if (!leisureTeamArray.includes(team)) {
        excludedExpense += amount;
      }

      if (!expenseData[team]) expenseData[team] = { total: 0, items: [] };
      expenseData[team].total += amount;
      expenseData[team].items.push({
        name: data.assigned_project || data.branch_name || data.mapped_term || data.description || '기타 지출',
        amount
      });
    });

    displayTotalRevenue = displayTotalRevenue - excludedRevenue;
    displayTotalExpense = totalExpense - excludedExpense;

    return NextResponse.json({
      totalRevenue: displayTotalRevenue,
      totalRooms,
      totalGolfTeams,
      totalExpense: displayTotalExpense,
      netProfit: displayTotalRevenue - displayTotalExpense,
      matrixData, // 100% SSOT from Backend
      adminMappings: v5Rows, // 100% SSOT for the mapping schema
      expenseData, // For Expense rendering
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

