import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { cleanNum } from '@/lib/utils';

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

    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
    const envToken = process.env.M2M_API_TOKEN;
    const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;

    let expQuery: any = db ? db.collection('expenses') : null;
    let commonExpQuery: any = db ? db.collection('common_expenses') : null;
    if (startMonth && endMonth && expQuery) {
      expQuery = expQuery.where('month', '>=', startMonth).where('month', '<=', endMonth);
      commonExpQuery = commonExpQuery.where('month', '>=', startMonth).where('month', '<=', endMonth);
    }

    const targetDateParam = endDate || startDate || new Date().toISOString().split('T')[0];

    // ALL FIRESTORE & EXTERNAL API CALLS IN PARALLEL (1-SHOT PROMISE.ALL)
    const [
      eSnap,
      cSnap,
      expenseFilterSnapshot,
      revFilterSnapshot,
      mappingsSnapshot,
      macroMappingSnapshot,
      customDoc,
      selDoc,
      revRes,
      matrixRes,
      utilRes,
      v6Res,
      v5MappingRes
    ] = await Promise.all([
      expQuery ? expQuery.get().catch((e: any) => { console.error('expenses err', e); return { forEach: () => {} }; }) : { forEach: () => {} },
      commonExpQuery ? commonExpQuery.get().catch((e: any) => { console.error('common_expenses err', e); return { forEach: () => {} }; }) : { forEach: () => {} },
      db ? db.collection('expense_filters').get().catch(() => ({ forEach: () => {} })) : { forEach: () => {} },
      db ? db.collection('revenue_filters').get().catch(() => ({ forEach: () => {} })) : { forEach: () => {} },
      db ? db.collection('team_mappings').get().catch(() => ({ forEach: () => {} })) : { forEach: () => {} },
      db ? db.collection('expense_macro_mappings').get().catch(() => ({ forEach: () => {} })) : { forEach: () => {} },
      db ? db.collection('settings').doc('customTeams').get().catch(() => ({ exists: false, data: () => ({}) })) : { exists: false, data: () => ({}) },
      db ? db.collection('settings').doc('leisureSelection').get().catch(() => ({ exists: false, data: () => ({}) })) : { exists: false, data: () => ({}) },
      (startDate && endDate) ? fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      }).catch(e => ({ ok: false, json: async () => null })) : Promise.resolve({ ok: false, json: async () => null }),
      (startDate && endDate) ? fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 
          'Authorization': `Bearer ${m2mToken}`,
          'User-Agent': 'Mozilla/5.0 Bell-Operation/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }).catch(e => ({ ok: false, json: async () => null })) : Promise.resolve({ ok: false, json: async () => null }),
      fetch(`${BACKEND_URL}/api/v5/dashboard/utilization-mtd?date=${targetDateParam}`, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      }).catch(e => ({ ok: false, json: async () => null })),
      fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
        headers: { 
          'Authorization': `Bearer ${m2mToken}`,
          'User-Agent': 'Mozilla/5.0 Bell-Operation/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }).catch(e => ({ ok: false, json: async () => null })),
      fetch(`${BACKEND_URL}/api/v6/admin/mapping/team`, {
        headers: { 
          'Authorization': `Bearer ${m2mToken}`,
          'User-Agent': 'Mozilla/5.0 Bell-Operation/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }).catch(e => ({ ok: false, json: async () => null }))
    ]);

    const [revJson, matrixJson, utilJson, v6Json, v5MappingJson] = await Promise.all([
      revRes.ok ? revRes.json().catch(() => null) : null,
      matrixRes.ok ? matrixRes.json().catch(() => null) : null,
      utilRes.ok ? utilRes.json().catch(() => null) : null,
      v6Res.ok ? v6Res.json().catch(() => null) : null,
      v5MappingRes.ok ? v5MappingRes.json().catch(() => null) : null
    ]);

    let expDocs: any[] = [];
    eSnap.forEach((doc: any) => expDocs.push(doc));
    cSnap.forEach((doc: any) => expDocs.push(doc));

    const excludedExpenseTerms: string[] = [];
    expenseFilterSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.term) excludedExpenseTerms.push(data.term);
    });

    const expSnapshot = { forEach: (fn: any) => expDocs.forEach(fn) };

    const excludedRevenueTerms: string[] = [];
    revFilterSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.term) excludedRevenueTerms.push(data.term);
    });

    const teamMappings: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      const d = doc.data();
      teamMappings[d.columnName] = d.teamName;
    });
    
    const macroMappings: Record<string, string> = {};
    macroMappingSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.rawCategory && data.macroCategory) {
        macroMappings[data.rawCategory] = data.macroCategory;
      }
    });

    const revData = revJson?.data || revJson || null;
    const matrixData: any[] = matrixJson?.data || [];
    const utilData = utilJson?.data || utilJson || null;

    const summary = revData?.summary || revData || {};
    const totalRevenue = summary.totalRevenue || 0;
    const totalRooms = summary.totalRooms || 0;
    const totalRoomCap = summary.totalRoomCap || 0;
    const totalGolfTeams = summary.totalGolfTeams || 0;

    const externalData: any = {
      ticketSummary: [],
      fnbSummary: [],
      golfSummary: [],
      roomSummary: [],
      roomTypeBreakdown: revData?.roomTypeBreakdown || [],
      roomMarketBreakdown: [],
      channelBreakdown: revData?.channelBreakdown || [],
      dailyReportBreakdown: revData?.dailyReportBreakdown || [],
      ticketFacilityBreakdown: [],
      fnbFacilityBreakdown: [],
      golfFacilityBreakdown: [],
      leisureProductBreakdown: [],
      leisureVisitorBreakdown: revData?.leisureVisitorBreakdown || [],
      rateTypeBreakdown: revData?.rateTypeBreakdown || [],
      weather: revData?.weather || null,
      mtd: revData?.mtd || null,
      ytd: revData?.ytd || null,
      gridData: null,
      utilizationMtdData: { 
        totalRoomGuestsMtd: utilData?.totalRoomGuestsMtd || 0,
        facilities: utilData?.facilities || []
      }
    };

    const breakdown: any[] = [...matrixData];
    const facilityVisitors: Record<string, number> = {};
    breakdown.forEach((item: any) => {
      const facility = String(item.facilityName || item.shopName || item.subGroupName || item.categoryName || item.categoryCode || '').trim();
      const visitors = item.visitors || item.guests || item.qty || item.roomsSold || item.nights || 0;
      if (facility && visitors > 0) {
        facilityVisitors[facility] = Math.max((facilityVisitors[facility] || 0), visitors);
      }
    });

    const preCalculatedExpectedGuests = externalData.utilizationMtdData?.totalRoomGuestsMtd || totalRoomCap || 0;

    // V5/V6 Venue & Team Mappings
    const v5Mapping: Record<string, string> = {};
    const leisureTeams = new Set<string>();
    const allKnownTeams = new Set<string>();

    const isLeisure = (v: any) => {
      const t = String(v.teamName || '').trim();
      const c = String(v.categoryCode || '').trim();
      return t === '레저본부' || c === 'TICKET';
    };

    const rawVenues = (v6Json?.data?.venues || []).filter(isLeisure);
    
    // Sort rawVenues by aliasCount descending so the most specific/complete mapping wins
    rawVenues.sort((a: any, b: any) => (b.aliasCount || 0) - (a.aliasCount || 0));

    const seenVenues = new Map<string, any>();
    rawVenues.forEach((v: any) => {
      const vName = String(v.venueName || v.facilityName || '').trim();
      if (vName && !seenVenues.has(vName)) {
        seenVenues.set(vName, {
          facilityName: vName,
          venueName: vName,
          teamName: v.teamName || '레저본부',
          partName: v.partName || '미분류',
          categoryCode: v.categoryCode || 'TICKET',
          aliasCount: v.aliasCount || 0
        });
      }
    });

    const v6Venues: any[] = Array.from(seenVenues.values());

    v6Venues.forEach((v: any) => {
      const vName = String(v.venueName || '').trim();
      const pName = String(v.partName || '').trim();
      if (pName && pName !== '미분류') {
        leisureTeams.add(pName);
        if (vName) v5Mapping[vName] = pName;
      }
    });

    const parsedData = Array.isArray(v5MappingJson) ? v5MappingJson : (v5MappingJson?.data || []);
    const v5Rows = parsedData.map((m: any) => ({
      facilityName: m.facilityName || m.facility_name || '',
      categoryCode: m.categoryCode || m.category_code || '',
      teamName: m.teamName || m.team_name || '',
      partName: m.partName || m.part_name || ''
    }));

    v5Rows.forEach((row: any) => {
      const teamName = String(row.teamName || '').trim();
      const partName = String(row.partName || '').trim();
      const facilityName = String(row.facilityName || '').trim();
      
      if (teamName) allKnownTeams.add(teamName);
      if (partName) allKnownTeams.add(partName);

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

    if (customDoc.exists) {
      (customDoc.data()?.teams || []).forEach((t: string) => leisureTeams.add(t));
    }

    let explicitLeisureTeams: string[] | null = null;
    if (selDoc.exists) {
      let savedTeams = selDoc.data()?.selectedTeams || [];
      savedTeams = savedTeams.map((t: string) => t === '외주' ? '외주_놀이공원' : t);
      explicitLeisureTeams = savedTeams;
    }

    let leisureTeamArray = explicitLeisureTeams && explicitLeisureTeams.length > 0 
      ? explicitLeisureTeams 
      : Array.from(leisureTeams);

    const monthlyTeamRev: Record<number, Record<string, number>> = {};
    const monthlyTeamExp: Record<number, Record<string, number>> = {};
      
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
    const baseLeisureRevenue = ticketSubtotalRow 
      ? cleanNum(ticketSubtotalRow.todayActual !== undefined ? ticketSubtotalRow.todayActual : (ticketSubtotalRow.rangeActual !== undefined ? ticketSubtotalRow.rangeActual : ticketSubtotalRow.mtdActual)) 
      : 0;
    
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
        const amount = cleanNum(row.todayActual !== undefined ? row.todayActual : (row.rangeActual !== undefined ? row.rangeActual : row.mtdActual));
        
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
        
        // SSOT Minus Rule: If user turned off a leisure part, subtract from base. Only add independent category if selected.
        if (isSubtotal && !row.isGrandTotal) {
          if (catCode === 'TICKET' && subtotalType === 'part' && team !== '소계') {
            if (!leisureTeamArray.includes(team)) {
              excludedRevenue += amount;
            }
          } else if (isIndependentCategory) {
            if (leisureTeamArray.includes(team)) {
              addedIndependentRevenue += amount;
            }
          }
        }
        
        dashboardMatrixData.push({ ...row, team });
      }
    });

    // SSOT: Base Leisure subtotal minus excluded teams plus selected independent categories
    let displayTotalRevenue = baseLeisureRevenue - excludedRevenue + addedIndependentRevenue;

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

      const amount = parseNumber(data.amount);
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

    const teamDataMap = new Map<string, { team: string, revenue: number, expense: number }>();
    
    // Initialize active leisure departments
    leisureTeamArray.forEach((team: string) => {
      teamDataMap.set(team, { team, revenue: 0, expense: 0 });
    });

    // V6 통합매출 영업장 중 '총합에 포함'으로 선택된 부서 소속 영업장 실적 산출 및 팀별 합산
    const venueSalesDetails: { venueName: string; groupName: string; revenue: number }[] = [];
    const rawMatrixRows = (matrixData || []).filter((r: any) => !r.isSubtotal && !r.isGrandTotal);

    v6Venues.forEach((venue: any) => {
      const vName = venue.venueName || venue.facilityName;
      const group = venue.partName || venue.teamName || '미분류';

      // '총합에 포함'된 그룹인지 확인
      const isGroupIncluded = leisureTeamArray.includes(group) || (group === '레저본부');
      if (!isGroupIncluded && group !== '미분류') return;

      let amount = 0;
      const matches = rawMatrixRows.filter((m: any) => {
        const mShop = String(m.shopName || '').trim();
        const mFac = String(m.facilityName || '').trim();
        return mShop === vName || mFac === vName;
      });

      if (matches.length > 0) {
        amount = matches.reduce((sum: number, m: any) => sum + cleanNum(m.todayActual !== undefined ? m.todayActual : (m.rangeActual !== undefined ? m.rangeActual : m.mtdActual)), 0);
      }

      venueSalesDetails.push({
        venueName: vName,
        groupName: group,
        revenue: amount
      });

      // V6 소속 부서별 매출 가산
      if (teamDataMap.has(group)) {
        teamDataMap.get(group)!.revenue += amount;
      }
    });

    venueSalesDetails.sort((a, b) => b.revenue - a.revenue);

    // V6 소속 부서별 지출 가산
    Object.keys(expenseData).forEach(team => {
      let displayTeamName = team === '기타' ? '미분류 (기타)' : team;
      const isLeisure = leisureTeamArray.includes(team) || team === '미분류' || team === '기타';
      if (isLeisure) {
        const amount = expenseData[team].total || 0;
        const existing = teamDataMap.get(displayTeamName) || teamDataMap.get(team) || { team: displayTeamName, revenue: 0, expense: 0 };
        existing.expense += amount;
        teamDataMap.set(displayTeamName, existing);
        if (displayTeamName !== team) {
          teamDataMap.delete(team); 
        }
      }
    });

    const teamData = Array.from(teamDataMap.values());

    return NextResponse.json({
      totalRevenue: displayTotalRevenue,
      totalRooms,
      totalGolfTeams,
      totalExpense: displayTotalExpense,
      netProfit: displayTotalRevenue - displayTotalExpense,
      leisureRevenue: displayTotalRevenue,
      leisureExpense: displayTotalExpense,
      teamData,
      venueSalesDetails,
      matrixData: dashboardMatrixData,
      adminMappings: v6Venues.length > 0 ? v6Venues : v5Rows,
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

