import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');
    const startMonthParam = searchParams.get('startMonth');
    const endMonthParam = searchParams.get('endMonth');

    const startMonth = startMonthParam || monthStr || '';
    const endMonth = endMonthParam || startMonth;

    let targetDates: string[] = [];
    if (startMonth && endMonth && startMonth.length === 7 && endMonth.length === 7) {
      let [sy, sm] = startMonth.split('-').map(Number);
      let [ey, em] = endMonth.split('-').map(Number);
      
      let current = new Date(sy, sm - 1, 1);
      const end = new Date(ey, em - 1, 1);
      
      while (current <= end) {
        const y = current.getFullYear();
        const m = current.getMonth() + 1; // 1-12
        const lastDay = new Date(y, m, 0).getDate();
        const mStr = String(m).padStart(2, '0');
        targetDates.push(`${y}-${mStr}-${lastDay}`);
        current.setMonth(current.getMonth() + 1);
      }
    }

    let expQuery: any = db.collection('expenses');
    if (startMonth && endMonth) {
      expQuery = expQuery.where('month', '>=', startMonth).where('month', '<=', endMonth);
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

    // 환경변수를 사용하여 백엔드 URL 동적 할당 (로컬/운영 분리)
    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
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

    if (targetDates.length > 0) {
      try {
        const envToken = process.env.M2M_API_TOKEN;
        const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;
        
        const fetchPromises = targetDates.map(async (apiEndDate) => {
          let revData = null;
          let mData = [];
          let utilData = null;

          const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${apiEndDate}`;
          const res = await fetch(revUrl, {
            headers: { 'Authorization': `Bearer ${m2mToken}` },
            cache: 'no-store'
          });
          if (res.ok) {
            const json = await res.json();
            revData = json.data || json;
          }

          const matrixUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=${apiEndDate}`;
          const matrixRes = await fetch(matrixUrl, {
            headers: { 
              'Authorization': `Bearer ${m2mToken}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bell-Operation/1.0',
              'Accept': 'application/json'
            },
            cache: 'no-store'
          });
          if (matrixRes.ok) {
            const mJson = await matrixRes.json();
            mData = mJson.data || [];
          }

          try {
            const mtdRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/utilization-mtd?date=${apiEndDate}`, {
              headers: { 'Authorization': `Bearer ${m2mToken}` },
              cache: 'no-store'
            });
            if (mtdRes.ok) {
              const utilJson = await mtdRes.json();
              utilData = utilJson.data || utilJson;
            }
          } catch(err) {}

          return { revData, matrixData: mData, utilData };
        });

        const results = await Promise.all(fetchPromises);

        let utilizationTotalRoomGuests = 0;
        const matrixMap = new Map<string, any>();
        const utilFacilitiesMap = new Map<string, number>();

        results.forEach((res, index) => {
          const revData = res.revData || {};
          const summary = revData.summary || revData || {};
          
          totalRevenue += summary.totalRevenue || 0;
          totalRooms += summary.totalRooms || 0;
          totalRoomCap += summary.totalRoomCap || 0;
          totalGolfTeams += summary.totalGolfTeams || 0;

          if (res.utilData?.totalRoomGuestsMtd) {
            utilizationTotalRoomGuests += res.utilData.totalRoomGuestsMtd;
          }
          if (res.utilData?.facilities && Array.isArray(res.utilData.facilities)) {
            res.utilData.facilities.forEach((f: any) => {
              const current = utilFacilitiesMap.get(f.facilityName) || 0;
              utilFacilitiesMap.set(f.facilityName, current + (f.visitorsMtd || 0));
            });
          }

          res.matrixData.forEach((row: any) => {
            const key = `${row.isSubtotal}-${row.isGrandTotal}-${row.subtotalType}-${row.categoryCode}-${row.teamName}-${row.partName}-${row.shopName}-${row.facilityName}`;
            if (!matrixMap.has(key)) {
              matrixMap.set(key, { ...row, mtdActual: 0, mtdLy: 0, todayActual: 0, todayLy: 0 });
            }
            const existing = matrixMap.get(key);
            existing.mtdActual += (row.mtdActual || 0);
            existing.mtdLy += (row.mtdLy || 0);
            existing.todayActual += (row.todayActual || 0);
            existing.todayLy += (row.todayLy || 0);
            existing.ytdActual = row.ytdActual || existing.ytdActual;
          });

          // Set latest daily breakdowns based on the last month in range
          if (index === results.length - 1) {
            externalData.leisureVisitorBreakdown = revData.leisureVisitorBreakdown || [];
            externalData.dailyReportBreakdown = revData.dailyReportBreakdown || [];
            externalData.channelBreakdown = revData.channelBreakdown || [];
            externalData.roomTypeBreakdown = revData.roomTypeBreakdown || [];
            externalData.weather = revData.weather || null;
            externalData.mtd = revData.mtd || null;
            externalData.ytd = revData.ytd || null;
          }
        });

        const aggregatedFacilities = Array.from(utilFacilitiesMap.entries()).map(([facilityName, visitorsMtd]) => ({
          facilityName,
          visitorsMtd
        }));
        
        externalData.utilizationMtdData = { 
          totalRoomGuestsMtd: utilizationTotalRoomGuests,
          facilities: aggregatedFacilities
        };
        matrixData = Array.from(matrixMap.values());
        breakdown.push(...matrixData);

      } catch (err: any) {
        console.error('Network error fetching from backend API:', err);
        externalData = { fetch_error: err.message };
      }
    }

    const facilityVisitors: Record<string, number> = {};
    const allVisitorData = [...breakdown];
    
    allVisitorData.forEach((item: any) => {
      const facility = String(item.facilityName || item.shopName || item.subGroupName || item.categoryName || item.categoryCode || '').trim();
      const visitors = item.visitors || item.guests || item.qty || item.roomsSold || item.nights || 0;
      
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
    const allKnownTeams = new Set<string>();
    try {
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
      
      try {
        const v5MappingRes = await fetch(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
          headers: { 
            'Authorization': `Bearer ${m2mToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bell-Operation/1.0',
            'Accept': 'application/json'
          }
        });
        if (v5MappingRes.ok) {
          const parsed = await v5MappingRes.json();
          const parsedData = Array.isArray(parsed) ? parsed : (parsed.data || []);
          v5Rows = parsedData.map((m: any) => ({
            facilityName: m.facilityName || m.facility_name || '',
            categoryCode: m.categoryCode || m.category_code || '',
            teamName: m.teamName || m.team_name || '',
            partName: m.partName || m.part_name || ''
          }));
        } else {
          console.error('v5Mapping fetch failed with status:', v5MappingRes.status);
        }
      } catch (err) {
        console.error('v5Mapping fetch error:', err);
      }

      v5Rows.forEach((row: any) => {
        const teamName = String(row.teamName || '').trim();
        const partName = String(row.partName || '').trim();
        const facilityName = String(row.facilityName || '').trim();
        
        if (teamName) allKnownTeams.add(teamName);
        if (partName) allKnownTeams.add(partName);

        // 오직 레저본부 및 미분류 파트만 leisureTeams로 취급
        if (teamName !== '레저본부' && teamName !== '미분류') return;

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
        savedTeams = savedTeams.map((t: string) => t === '외주' ? '외주_놀이공원' : t);
        
        explicitLeisureTeams = savedTeams.filter((t: string) => leisureTeams.has(t));
      }
    } catch (e: any) {
      console.error('leisureSelection fetch error:', e.message);
    }

    let leisureTeamArray = explicitLeisureTeams && explicitLeisureTeams.length > 0 
      ? explicitLeisureTeams 
      : Array.from(leisureTeams);
      
    // --- 1. Revenue (Minus Rule) ---
    let leisureGrandTotal = 0;
    let dashboardMatrixData: any[] = [];
    let excludedRevenue = 0;
    
    matrixData.forEach((row: any) => {
      const teamName = String(row.teamName || '').trim();
      
      // 오직 '레저본부' 또는 '미분류' 데이터만 통과
      if (teamName === '레저본부' || teamName === '미분류') {
        const isSubtotal = !!row.isSubtotal;
        const subtotalType = row.subtotalType;
        const amount = row.mtdActual || 0;
        
        if (isSubtotal && subtotalType === 'team') {
          leisureGrandTotal += amount;
        }
        
        let team = '미분류';
        const partName = row.partName;
        if (partName && partName !== '미분류' && partName !== '소계') {
          team = partName;
        } else {
          team = teamName;
        }
        
        if (isSubtotal && subtotalType === 'part' && team !== '총계') {
          if (!leisureTeamArray.includes(team)) {
            excludedRevenue += amount;
          }
        }
        
        dashboardMatrixData.push({ ...row, team });
      }
    });

    let displayTotalRevenue = leisureGrandTotal - excludedRevenue;

    // --- 2. Expense ---
    let displayTotalExpense = 0;
    const expenseData: Record<string, { total: number, items: any[] }> = {};
    
    expSnapshot.forEach((doc: any) => {
      const data = doc.data();
      
      // 비용 통제 제외 항목(감가상각비 등) 동적 필터링
      const originalTerm = String(data.mapped_term || '');
      const description = String(data.description || '');
      const project = String(data.assigned_project || '');
      const dept = String(data.department || '');
      
      const isExcluded = excludedExpenseTerms.some(filter => 
        originalTerm.includes(filter) || description.includes(filter) || project.includes(filter) || dept.includes(filter)
      );
      if (isExcluded) return;

      const amount = data.amount || 0;
      let team = data.team || '기타';
      
      // 타 본부(FNB본부, 객실 등) 지출은 기타로 묶지 말고 완전히 필터링하여 버림
      const isKnownNonLeisure = allKnownTeams.has(team) && !leisureTeams.has(team) && team !== '기타' && team !== '제외' && team !== '미분류';
      if (isKnownNonLeisure) {
        return; 
      }
      
      const isValidTeam = leisureTeams.has(team) || ['기타', '제외', '미분류'].includes(team);
      if (!isValidTeam) team = '기타';

      // 켜진 팀(leisureTeamArray)의 지출만 합산
      if (leisureTeamArray.includes(team)) {
        displayTotalExpense += amount;
        
        if (!expenseData[team]) expenseData[team] = { total: 0, items: [] };
        expenseData[team].total += amount;
        expenseData[team].items.push({
          name: data.assigned_project || data.branch_name || data.mapped_term || data.description || '기타 지출',
          amount
        });
      }
    });

    // (레거시 팀별 이용객 차트 호환 유지용 - 신규 API가 반환한 시설 데이터 기반으로 매핑)
    const leisureTeamVisitors: Record<string, number> = {};
    const leisureFacilityVisitors: Record<string, number> = {};
    
    if (externalData.utilizationMtdData?.facilities && Array.isArray(externalData.utilizationMtdData.facilities)) {
      externalData.utilizationMtdData.facilities.forEach((d: any) => {
        const facilityName = String(d.facilityName || '').trim();
        const visitors = Number(d.visitorsMtd) || 0;
        
        leisureFacilityVisitors[facilityName] = (leisureFacilityVisitors[facilityName] || 0) + visitors;
        
        let team = v5Mapping[facilityName];
        if (!team) {
          if (leisureTeams.has(facilityName)) team = facilityName;
          else team = '미분류';
        }
        
        if (leisureTeamArray.includes(team)) {
          leisureTeamVisitors[team] = (leisureTeamVisitors[team] || 0) + visitors;
        }
      });
    }

    return NextResponse.json({
      totalRevenue: displayTotalRevenue,
      totalRooms,
      totalGolfTeams,
      totalExpense: displayTotalExpense,
      netProfit: displayTotalRevenue - displayTotalExpense,
      leisureRevenue: displayTotalRevenue,
      leisureExpense: displayTotalExpense,
      matrixData: dashboardMatrixData,
      adminMappings: v5Rows,
      expenseData,
      v5Mapping,
      monthlyTeamRev,
      monthlyTeamExp,
      teamMappings,
      facilityVisitors,
      leisureTeamVisitors,
      leisureFacilityVisitors,
      utilizationMtdData: externalData.utilizationMtdData,
      preCalculatedExpectedGuests,
      minDate: null,
      maxDate: null,
      weather: externalData.weather || externalData.data?.weather || null,
      mtd: externalData.mtd || externalData.data?.mtd || null,
      ytd: externalData.ytd || externalData.data?.ytd || null,
      gridData: externalData.gridData || externalData.data?.gridData || null,
      rateTypeBreakdown: externalData.rateTypeBreakdown || externalData.data?.rateTypeBreakdown || [],
      debugExternalData: externalData
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, cause: (error as any).cause ? String((error as any).cause) : undefined }, { status: 500 });
  }
}

