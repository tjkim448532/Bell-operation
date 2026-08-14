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

    let startDate = '';
    let endDate = '';
    if (startMonth && endMonth && startMonth.length === 7 && endMonth.length === 7) {
      startDate = `${startMonth}-01`;
      let [ey, em] = endMonth.split('-').map(Number);
      const lastDay = new Date(ey, em, 0).getDate();
      endDate = `${endMonth}-${lastDay}`;
    }

    let expQuery: any = db.collection('expenses');
    let commonExpQuery: any = db.collection('common_expenses');
    if (startMonth && endMonth) {
      expQuery = expQuery.where('month', '>=', startMonth).where('month', '<=', endMonth);
      commonExpQuery = commonExpQuery.where('month', '>=', startMonth).where('month', '<=', endMonth);
    }

    let expDocs: any[] = [];
    let expenseFilterSnapshot: any = { forEach: () => {} };
    const excludedExpenseTerms: string[] = [];

    try {
      const [eSnap, cSnap] = await Promise.all([
        expQuery.get(),
        commonExpQuery.get()
      ]);
      eSnap.forEach((doc: any) => expDocs.push(doc));
      cSnap.forEach((doc: any) => expDocs.push(doc));

      expenseFilterSnapshot = await db.collection('expense_filters').get();
      expenseFilterSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.term) excludedExpenseTerms.push(data.term);
      });
    } catch (e: any) {
      console.error('Firebase expenses fetch error:', e.message);
    }

    const expSnapshot = { forEach: (fn: any) => expDocs.forEach(fn) };

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

    if (startDate && endDate) {
      try {
        const envToken = process.env.M2M_API_TOKEN;
        const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;
        
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`;
        const revRes = await fetch(revUrl, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });
        let revData = null;
        if (revRes.ok) {
          const json = await revRes.json();
          revData = json.data || json;
        }

        // Check if query spans multiple months
        const startMonthStr = startDate.slice(0, 7);
        const endMonthStr = endDate.slice(0, 7);

        if (startMonthStr !== endMonthStr) {
          const [sy, sm] = startMonthStr.split('-').map(Number);
          const [ey, em] = endMonthStr.split('-').map(Number);

          const monthTasks: { year: number, month: number }[] = [];
          let currY = sy, currM = sm;
          while (currY < ey || (currY === ey && currM <= em)) {
            monthTasks.push({ year: currY, month: currM });
            currM++;
            if (currM > 12) { currM = 1; currY++; }
          }

          const monthlyResults = await Promise.all(monthTasks.map(async (t) => {
            const monthStr = `${t.year}-${String(t.month).padStart(2, '0')}`;
            const lastDay = new Date(t.year, t.month, 0).getDate();
            const mStart = `${monthStr}-01`;
            const mEnd = `${monthStr}-${lastDay}`;
            const mUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${mStart}&endDate=${mEnd}`;
            try {
              const mRes = await fetch(mUrl, {
                headers: { 
                  'Authorization': `Bearer ${m2mToken}`,
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bell-Operation/1.0',
                  'Accept': 'application/json'
                },
                cache: 'no-store'
              });
              if (mRes.ok) {
                const mJson = await mRes.json();
                return mJson.data || [];
              }
            } catch(e) {}
            return [];
          }));

          const combinedMap = new Map<string, any>();
          monthlyResults.forEach(rows => {
            rows.forEach((r: any) => {
              const key = `${r.categoryCode || ''}_${r.teamName || ''}_${r.partName || ''}_${r.shopName || ''}_${r.isSubtotal}_${r.isGrandTotal}`;
              if (!combinedMap.has(key)) {
                combinedMap.set(key, { ...r, mtdActual: 0, todayActual: 0, todayLy: 0 });
              }
              const item = combinedMap.get(key);
              item.mtdActual = (item.mtdActual || 0) + (r.rangeActual || r.mtdActual || r.todayActual || 0);
              item.todayActual = (item.todayActual || 0) + (r.todayActual || 0);
              item.todayLy = (item.todayLy || 0) + (r.todayLy || 0);
            });
          });

          matrixData = Array.from(combinedMap.values());
        } else {
          const matrixUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`;
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
            matrixData = mJson.data || [];
          }
        }

        let utilData = null;
        try {
          const targetDateParam = endDate || startDate || new Date().toISOString().split('T')[0];
          const utilUrl = `${BACKEND_URL}/api/v5/dashboard/utilization-mtd?date=${targetDateParam}`;
          const utilRes = await fetch(utilUrl, {
            headers: { 'Authorization': `Bearer ${m2mToken}` },
            cache: 'no-store'
          });
          if (utilRes.ok) {
            const utilJson = await utilRes.json();
            utilData = utilJson.data || utilJson;
          }
        } catch(err) {}

        const summary = revData?.summary || revData || {};
        
        totalRevenue = summary.totalRevenue || 0;
        totalRooms = summary.totalRooms || 0;
        totalRoomCap = summary.totalRoomCap || 0;
        totalGolfTeams = summary.totalGolfTeams || 0;

        externalData.leisureVisitorBreakdown = revData?.leisureVisitorBreakdown || [];
        externalData.dailyReportBreakdown = revData?.dailyReportBreakdown || [];
        externalData.channelBreakdown = revData?.channelBreakdown || [];
        externalData.roomTypeBreakdown = revData?.roomTypeBreakdown || [];
        externalData.weather = revData?.weather || null;
        externalData.mtd = revData?.mtd || null;
        externalData.ytd = revData?.ytd || null;

        externalData.utilizationMtdData = { 
          totalRoomGuestsMtd: utilData?.totalRoomGuestsMtd || 0,
          facilities: utilData?.facilities || []
        };
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

    // [규칙 1 적용 완벽 준수] 부분 합산(SLICE SUMMATION) 절대 금지. 
    // 배열을 루프 돌며 합산하지 않고, 최상단 summary 객체의 단일 값을 그대로 사용합니다.
    // [FIX] revenue-summary API는 기간 조회를 지원하지 않아 1일치 숙박객(1,860명 등)만 반환하는 버그가 있습니다. 
    // 따라서 기간 조회를 완벽히 지원하는 utilization-mtd의 totalRoomGuestsMtd를 최우선적으로 사용합니다.
    const preCalculatedExpectedGuests = externalData.utilizationMtdData?.totalRoomGuestsMtd || totalRoomCap || 0;

    // mappingsSnapshot is fetched below, let's fetch it earlier
    const teamMappings: Record<string, string> = {};
    const macroMappings: Record<string, string> = {};
    try {
      const mappingsSnapshot = await db.collection('team_mappings').get();
      mappingsSnapshot.forEach((doc: any) => {
        const d = doc.data();
        teamMappings[d.columnName] = d.teamName;
      });
      
      const macroMappingSnapshot = await db.collection('expense_macro_mappings').get();
      macroMappingSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.rawCategory && data.macroCategory) {
          macroMappings[data.rawCategory] = data.macroCategory;
        }
      });
    } catch (e: any) {
      console.error('Firebase mapping fetch error:', e.message);
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
        
        explicitLeisureTeams = savedTeams;
      }
    } catch (e: any) {
      console.error('leisureSelection fetch error:', e.message);
    }

    let leisureTeamArray = explicitLeisureTeams && explicitLeisureTeams.length > 0 
      ? explicitLeisureTeams 
      : Array.from(leisureTeams);
      
    // --- 1. Revenue (Minus Rule) ---
    // Base Leisure Revenue from Backend (TICKET category subtotal)
    const ticketSubtotalRow = matrixData.find((r: any) => 
      String(r.categoryCode || '').toUpperCase() === 'TICKET' && 
      r.isSubtotal === true && 
      (String(r.subtotalType || '').toLowerCase() === 'category' || (r.partName === '소계' && r.teamName === '소계'))
    ) || matrixData.find((r: any) => 
      String(r.categoryCode || '').toUpperCase() === 'TICKET' && 
      r.isSubtotal === true && 
      r.subtotalType !== 'part'
    );
    const baseLeisureRevenue = ticketSubtotalRow ? (ticketSubtotalRow.mtdActual || 0) : 0;
    
    let dashboardMatrixData: any[] = [];
    let excludedRevenue = 0;
    let addedIndependentRevenue = 0;
    
    matrixData.forEach((row: any) => {
      const catCode = String(row.categoryCode || '').toUpperCase();
      
      // V4.2 Bible: TICKET is displayed as '레저본부'
      if (catCode === 'TICKET') {
         row.teamName = '레저본부';
         row.categoryName = '레저본부';
         if (row.shopName === '소계') row.shopName = '레저본부 소계';
      }
      
      const teamName = String(row.teamName || '').trim();
      
      // V4.2 Bible: Allow independent categories to pass through
      const isIndependentCategory = ['MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'UNEARNED'].includes(catCode);

      // 오직 '레저본부', '미분류', 또는 신규 독립 카테고리만 통과
      if (teamName === '레저본부' || teamName === '미분류' || isIndependentCategory) {
        const isSubtotal = !!row.isSubtotal;
        const subtotalType = row.subtotalType;
        const amount = row.mtdActual || 0;
        
        let team = '미분류';
        const partName = row.partName;
        const rawTeamName = row.teamName;
        const categoryName = row.categoryName;

        if (partName && partName !== '미분류' && partName !== '소계') {
          team = partName;
        } else if (rawTeamName && rawTeamName !== '미분류' && rawTeamName !== '소계') {
          team = rawTeamName;
        } else if (categoryName && categoryName !== '소계') {
          team = categoryName;
        }
        
        if (isSubtotal && !row.isGrandTotal) {
          if (isIndependentCategory) {
            addedIndependentRevenue += amount;
          }
        }
        
        dashboardMatrixData.push({ ...row, team });
      }
    });

    // Full Leisure Division Total Revenue for the selected period
    let displayTotalRevenue = baseLeisureRevenue + addedIndependentRevenue;

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

      const amount = data.amount || 0;
      let team = data.team || '기타';
      
      // 타 본부(FNB본부, 객실 등) 지출 필터링
      const isKnownNonLeisure = allKnownTeams.has(team) && !leisureTeams.has(team) && team !== '기타' && team !== '제외' && team !== '미분류';
      
      if (team === '미분류') team = '기타';
      
      const isValidTeam = leisureTeams.has(team) || ['기타', '제외'].includes(team);
      if (!isValidTeam) team = '기타';

      // 칸반보드에 모든 금액이 표시되어야 하므로 expenseData에는 무조건 넣습니다.
      if (!expenseData[team]) expenseData[team] = { total: 0, items: [] };
      expenseData[team].total += amount;
      
      const macroCat = macroMappings[originalTerm];
      const displayName = macroCat ? String(macroCat) : (data.assigned_project || data.branch_name || data.mapped_term || data.description || '기타 지출');
      
      expenseData[team].items.push({
        name: displayName,
        amount
      });

      // 대시보드 레저본부 전체 총지출(displayTotalExpense) 합산
      if (!isKnownNonLeisure) {
        displayTotalExpense += amount;
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
      weather: (() => {
        const w = externalData.weather || externalData.data?.weather || null;
        if (!w) return null;
        let desc = w.description || '';
        const code = Number(w.weatherCode);
        if (!desc || desc === '데이터없음') {
          if (code === 0) desc = '맑음';
          else if (code >= 1 && code <= 3) desc = '구름조금/흐림';
          else if (code >= 45 && code <= 48) desc = '안개';
          else if (code >= 51 && code <= 55) desc = '이슬비';
          else if (code >= 61 && code <= 65) desc = '비';
          else if (code >= 71 && code <= 75) desc = '눈';
          else if (code >= 80 && code <= 82) desc = '소나기';
          else if (code >= 95) desc = '뇌우';
          else desc = '보통';
        }
        return { ...w, description: desc };
      })(),
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

