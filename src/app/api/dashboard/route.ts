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
    // [동적 매핑 복구] 백엔드 가이드 예외 처리. 관리자 페이지의 매핑을 우선 적용하기 위해 프론트엔드가 자체 합산(Slice Summation)을 수행합니다.
    breakdown.forEach((item: any) => {
      // 프론트엔드 동적 매핑 적용을 위해 소계가 아닌 최하위 영업장 데이터(is_subtotal: false)만 추출
      if (item.is_subtotal) return;

      let facilityName = String(item.facility_name || item.shop_name || '').trim();
      let team = '미분류';
      
      // 1순위: team_mappings (프론트엔드 관리자 페이지 설정)
      if (teamMappings[facilityName]) {
        team = teamMappings[facilityName];
      }
      // 2순위: V5 Mapping
      else if (v5Mapping[facilityName]) {
        team = v5Mapping[facilityName];
      }
      // 3순위: 백엔드 기본 파트/본부
      else if (item.part_name && item.part_name !== '미분류' && item.part_name !== '소계') {
        team = item.part_name;
      } else if (item.team_name && item.team_name !== '미분류') {
        team = item.team_name;
      }

      let amount = item.total_sales || item.mtd_actual || item.total_amount || item.amount || item.today_actual || item.revenue || item.totalRevenue || item.salesAmount || 0;
      
      // 동적 누적 합산 (+=)
      if (team) {
        teamRev[team] = (teamRev[team] || 0) + amount;
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
      let finalMappedTeam = null;
      
      // 1순위: V5 백엔드 어드민 매핑 (가장 정확한 최신 조직도)
      if (v5Mapping[assignedTeam]) {
        finalMappedTeam = v5Mapping[assignedTeam];
      } else if (v5Mapping[data.original_term]) {
        finalMappedTeam = v5Mapping[data.original_term];
      } else if (v5Mapping[data.description]) {
        finalMappedTeam = v5Mapping[data.description];
      } 
      // 2순위: 기존 프론트엔드 파이어베이스 매핑 (하위 호환성)
      else if (teamMappings[assignedTeam]) {
        finalMappedTeam = teamMappings[assignedTeam];
      } else if (teamMappings[data.original_term]) {
        finalMappedTeam = teamMappings[data.original_term];
      } else if (teamMappings[data.description]) {
        finalMappedTeam = teamMappings[data.description];
      }

      if (finalMappedTeam) {
        team = finalMappedTeam;
      } else if (assignedTeam && assignedTeam !== '기타' && assignedTeam !== '미분류 프로젝트' && assignedTeam !== '0' && assignedTeam !== '미분류') {
        team = assignedTeam;
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
      
      if (!monthlyTeamExp[month]) monthlyTeamExp[month] = {};
      monthlyTeamExp[month][team] = (monthlyTeamExp[month][team] || 0) + amount;
    });

    const teams = Array.from(new Set([...Object.keys(teamRev), ...Object.keys(teamExp)]));

    const teamData = teams.map(team => {
      return { team, revenue: teamRev[team] || 0, expense: teamExp[team] || 0 };
    }).filter(t => t.revenue > 0 || t.expense > 0);

    // [레저본부 중심 아키텍처 개편]
    // 총매출과 총지출을 백엔드의 전사 매출 대신 레저본부 팀들의 합계로 강제 덮어씌웁니다.
    // 대표님이 직접 선택한 팀 배열이 있으면 그것을 최우선으로 사용, 없으면 자동 산출된 leisureTeams 사용
    const leisureTeamArray = explicitLeisureTeams && explicitLeisureTeams.length > 0 ? explicitLeisureTeams : Array.from(leisureTeams);
    
    if (leisureTeamArray.length > 0) {
      let leisureTotalRevenue = 0;
      let leisureTotalExpense = 0;
      teams.forEach(team => {
        if (leisureTeamArray.includes(team)) {
          leisureTotalRevenue += (teamRev[team] || 0);
          leisureTotalExpense += (teamExp[team] || 0);
        }
      });
      totalRevenue = leisureTotalRevenue;
      totalExpense = leisureTotalExpense;
    }

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
