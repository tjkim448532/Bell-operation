import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { cleanNum } from '@/lib/utils';
import { isWeekendOrHoliday } from '@/lib/holidays';

function getContiguousDayRanges(startDateStr: string, endDateStr: string) {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const ranges: { type: 'weekday' | 'weekend'; startDate: string; endDate: string }[] = [];
  const curDate = new Date(Date.UTC(sy, sm - 1, sd || 1));
  const endDate = new Date(Date.UTC(ey, em - 1, ed || 1));

  let currentType: 'weekday' | 'weekend' = isWeekendOrHoliday(curDate.toISOString().slice(0, 10)) ? 'weekend' : 'weekday';
  let rangeStart = curDate.toISOString().slice(0, 10);

  while (curDate <= endDate) {
    const dateStr = curDate.toISOString().slice(0, 10);
    const dayType: 'weekday' | 'weekend' = isWeekendOrHoliday(dateStr) ? 'weekend' : 'weekday';

    if (dayType !== currentType) {
      const prevDate = new Date(curDate);
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      ranges.push({
        type: currentType,
        startDate: rangeStart,
        endDate: prevDate.toISOString().slice(0, 10)
      });
      rangeStart = dateStr;
      currentType = dayType;
    }

    curDate.setUTCDate(curDate.getUTCDate() + 1);
  }

  ranges.push({
    type: currentType,
    startDate: rangeStart,
    endDate: endDate.toISOString().slice(0, 10)
  });

  return ranges;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startMonthStr = searchParams.get('startMonth') || (startDateParam ? startDateParam.slice(0, 7) : null);
    const endMonthStr = searchParams.get('endMonth') || (endDateParam ? endDateParam.slice(0, 7) : null);
    
    // Default to last 6 months if start/end month is not provided
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const targetDate = new Date(date);
    
    const last6Months: string[] = [];
    const targetEndDates: string[] = [];

    if (startMonthStr && endMonthStr) {
      // Loop from startMonth to endMonth
      const [sYear, sMonth] = startMonthStr.split('-').map(Number);
      const [eYear, eMonth] = endMonthStr.split('-').map(Number);
      
      let currYear = sYear;
      let currMonth = sMonth;
      
      while (currYear < eYear || (currYear === eYear && currMonth <= eMonth)) {
        const yyyy = currYear;
        const mm = String(currMonth).padStart(2, '0');
        last6Months.push(`${yyyy}-${mm}`);
        
        const lastDay = new Date(yyyy, currMonth, 0).getDate();
        targetEndDates.push(`${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`);
        
        currMonth++;
        if (currMonth > 12) {
          currMonth = 1;
          currYear++;
        }
      }
    } else {
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth(); // 0-indexed
      for (let i = 5; i >= 0; i--) {
        const d = new Date(targetYear, targetMonth - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        last6Months.push(`${yyyy}-${mm}`);
        
        const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
        targetEndDates.push(`${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`);
      }
    }

    const envToken = process.env.M2M_API_TOKEN;
    const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;
    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');

    let totalRevenue = 0;
    let totalRoomCap = 0;
    const revenueByFacility: Record<string, number> = {};

    // 1. Fetch Revenue and Mappings in Parallel (revenue-summary, matrix-weekly, facility-groups)
    const startDate = startDateParam || `${last6Months[0]}-01`;
    const endDate = endDateParam || targetEndDates[targetEndDates.length - 1];
    
    let matrixData: any[] = [];
    let salesByFacility: any[] = [];
    let v6Venues: any[] = [];
    let selectedActiveTeams: string[] = [];
    const teamMappingDict: Record<string, string> = {};

    try {
      const [revRes, matrixRes, v6Res, selDoc, mapSnap] = await Promise.all([
        fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        }).catch(() => ({ ok: false, json: async () => null })),
        fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        }).catch(() => ({ ok: false, json: async () => null })),
        fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        }).catch(() => ({ ok: false, json: async () => null })),
        db ? db.collection('settings').doc('leisureSelection').get().catch(() => ({ exists: false, data: () => ({}) })) : { exists: false, data: () => ({}) },
        db ? db.collection('team_mappings').get().catch(() => ({ forEach: () => {} })) : { forEach: () => {} }
      ]);

      const [revJson, matrixJson, v6Json] = await Promise.all([
        revRes.ok ? revRes.json().catch(() => null) : null,
        matrixRes.ok ? matrixRes.json().catch(() => null) : null,
        v6Res.ok ? v6Res.json().catch(() => null) : null
      ]);

      matrixData = matrixJson?.data || (Array.isArray(matrixJson) ? matrixJson : []);
      salesByFacility = revJson?.salesByFacility || [];
      v6Venues = v6Json?.data?.venues || [];

      if (selDoc && 'exists' in selDoc && selDoc.exists && Array.isArray((selDoc as any).data()?.selectedTeams)) {
        selectedActiveTeams = (selDoc as any).data()?.selectedTeams;
      }
      if (mapSnap && 'forEach' in mapSnap) {
        mapSnap.forEach((d: any) => {
          const mData = d.data();
          if (mData.columnName && mData.teamName) {
            teamMappingDict[mData.columnName] = mData.teamName;
          }
        });
      }
    } catch (e) {
      console.error('External V5/V6 API fetch failed in business-plan route:', e);
    }

    const validOrgTeams = new Set(selectedActiveTeams);

    const normalizeTeam = (name: string) => {
      const n = String(name || '').trim();
      return teamMappingDict[n] || n;
    };

    const isPartMatch = (part: string, validSet: Set<string>) => {
      if (!part) return false;
      const p = part.trim();
      if (validSet.size === 0) return true; // If no filter set, allow all
      return validSet.has(p) || validSet.has(normalizeTeam(p));
    };

    // Step A: Parse from matrixData if part-level subtotals exist
    if (Array.isArray(matrixData)) {
      matrixData.forEach((row: any) => {
        const teamName = String(row.teamName || '').trim();
        const catCode = String(row.categoryCode || '').toUpperCase();
        if (teamName === '레저본부' || teamName === '미분류' || catCode === 'TICKET' || catCode === 'MOTO') {
          const isSubtotal = !!row.isSubtotal;
          const subtotalType = row.subtotalType;
          const amount = cleanNum(row.rangeActual !== undefined ? row.rangeActual : (row.todayActual !== undefined ? row.todayActual : row.mtdActual));
          
          if (isSubtotal && subtotalType === 'part') {
             const normPart = normalizeTeam(row.partName);
             if (isPartMatch(row.partName, validOrgTeams)) {
               totalRevenue += amount;
               revenueByFacility[normPart] = (revenueByFacility[normPart] || 0) + amount;
             } else if (isPartMatch('미사용 티켓', validOrgTeams) && (row.partName === '미분류' || row.partName === '미사용 티켓') && row.categoryCode === 'TICKET') {
               totalRevenue += amount;
               revenueByFacility['미사용 티켓'] = (revenueByFacility['미사용 티켓'] || 0) + amount;
             }
          }
        }
      });
    }

    // Step B: If matrixData did not provide part rows, map directly from salesByFacility + v6Venues SSOT
    if (totalRevenue === 0 && salesByFacility.length > 0) {
      const venueGroupMap: Record<string, string> = {};
      v6Venues.forEach((v: any) => {
        const name = String(v.venueName || v.facilityName || '').trim();
        const group = String(v.partName || v.teamName || '미분류').trim();
        if (name) venueGroupMap[name] = group;
      });

      salesByFacility.forEach((f: any) => {
        const facName = String(f.facilityName || f.shopName || f.displayName || '').trim();
        const catCode = String(f.categoryCode || '').toUpperCase();
        
        let mappedGroup = venueGroupMap[facName] || '';
        if (!mappedGroup) {
          if (catCode === 'TICKET' || catCode === '레저본부' || catCode === '레져본부') mappedGroup = '액티비티';
          else if (catCode === 'MOTO' || catCode === '모토아레나') mappedGroup = '모토아레나';
          else if (catCode === 'GOODS' || catCode === '벨포레굿즈') mappedGroup = '미분류';
          else if (catCode === '주차관제' || catCode === 'PARKING') mappedGroup = '주차관제';
        }

        const normGroup = normalizeTeam(mappedGroup);
        if (normGroup && isPartMatch(normGroup, validOrgTeams)) {
          const amount = cleanNum(f.todayActual !== undefined ? f.todayActual : f.totalSales);
          if (amount !== 0) {
            totalRevenue += amount;
            revenueByFacility[normGroup] = (revenueByFacility[normGroup] || 0) + amount;
          }
        }
      });
    }

    // 2. Fetch Daily Data (1 year / 365 days) for Room Channel vs Leisure Revenue Correlation
    let dailyData: any[] = [];
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const queryDate = searchParams.get('date') || endDate || todayStr;
      const corrUrl = `${BACKEND_URL}/api/v5/report/channel-correlation?date=${queryDate}`;
      const res = await fetch(corrUrl, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const { dailyLeisure, dailyRooms } = json.data;
          
          const leisureMap: Record<string, number> = {};
          dailyLeisure.forEach((r: any) => {
            leisureMap[r.date] = r.leisureRev;
          });
          
          const roomsMap: Record<string, Record<string, number>> = {};
          dailyRooms.forEach((r: any) => {
            if (!roomsMap[r.date]) roomsMap[r.date] = {};
            roomsMap[r.date][r.channelName] = r.roomsSold;
          });
          
          Object.keys(leisureMap).forEach(dStr => {
            dailyData.push({
              date: dStr,
              leisureRev: leisureMap[dStr] || 0,
              channelRooms: roomsMap[dStr] || {}
            });
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch channel correlation data:', e);
    }

    const isWeekend = (dateStr: string) => {
      const day = new Date(dateStr).getDay();
      return day === 5 || day === 6; // 금, 토
    };

    const channels = new Set<string>();
    dailyData.forEach(d => Object.keys(d.channelRooms).forEach(c => channels.add(c)));
    
    const calculatePearson = (x: number[], y: number[]) => {
       const n = x.length;
       if (n === 0) return 0;
       const sumX = x.reduce((a, b) => a + b, 0);
       const sumY = y.reduce((a, b) => a + b, 0);
       const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
       const sumX2 = x.reduce((a, b) => a + b * b, 0);
       const sumY2 = y.reduce((a, b) => a + b * b, 0);
       
       const num = (n * sumXY) - (sumX * sumY);
       const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
       if (den === 0) return 0;
       return num / den;
    };
    
    const correlations: { channelName: string, correlationTotal: number, correlationWeekday: number, correlationWeekend: number, avgRoomsTotal: number, avgRoomsWeekday: number, avgRoomsWeekend: number }[] = [];
    
    channels.forEach(ch => {
       const totalX: number[] = [], totalY: number[] = [];
       const weekdayX: number[] = [], weekdayY: number[] = [];
       const weekendX: number[] = [], weekendY: number[] = [];
       
       dailyData.forEach(d => {
         const xVal = d.channelRooms[ch] || 0;
         const yVal = d.leisureRev;
         totalX.push(xVal);
         totalY.push(yVal);
         
         if (isWeekend(d.date)) {
           weekendX.push(xVal);
           weekendY.push(yVal);
         } else {
           weekdayX.push(xVal);
           weekdayY.push(yVal);
         }
       });

       const rTotal = calculatePearson(totalX, totalY);
       const rWeekday = calculatePearson(weekdayX, weekdayY);
       const rWeekend = calculatePearson(weekendX, weekendY);
       
       const avgTotal = totalX.reduce((a, b) => a + b, 0) / (totalX.length || 1);
       const avgWeekday = weekdayX.reduce((a, b) => a + b, 0) / (weekdayX.length || 1);
       const avgWeekend = weekendX.reduce((a, b) => a + b, 0) / (weekendX.length || 1);
       
       // Only consider channels with some minimal volume in total (at least 1 room per day on average)
       if (!isNaN(rTotal) && Math.round(avgTotal) > 0) {
         correlations.push({ 
           channelName: ch, 
           correlationTotal: isNaN(rTotal) ? 0 : rTotal,
           correlationWeekday: isNaN(rWeekday) ? 0 : rWeekday,
           correlationWeekend: isNaN(rWeekend) ? 0 : rWeekend,
           avgRoomsTotal: avgTotal,
           avgRoomsWeekday: avgWeekday,
           avgRoomsWeekend: avgWeekend
         });
       }
    });
    
    // [FIX] 백엔드 데이터 중복 매핑 버그 방어막 (Data Deduplication Shield)
    const uniqueCorrelations: typeof correlations = [];
    const seenSignatures = new Set<string>();
    
    correlations.forEach(c => {
       const signature = `${c.correlationTotal.toFixed(4)}_${c.avgRoomsTotal.toFixed(4)}`;
       if (!seenSignatures.has(signature)) {
         seenSignatures.add(signature);
         uniqueCorrelations.push(c);
       }
    });
    
    uniqueCorrelations.sort((a, b) => b.correlationTotal - a.correlationTotal);
    const topCorrelations = uniqueCorrelations;

    // 3. Fetch Expenses from Firebase
    let expensesSnapshot: any = [];
    let commonExpensesSnapshot: any = [];
    try {
      if (db) {
        expensesSnapshot = await db.collection('expenses').get();
        commonExpensesSnapshot = await db.collection('common_expenses').get();
      }
    } catch (e) {
      console.error('Firebase expenses fetch failed, falling back to empty expenses:', e);
    }

    const expenseByFacility: Record<string, number> = {};
    const expenseDetailsByFacility: Record<string, Record<string, number>> = {};
    const teamToPartMap: Record<string, string> = {};
    let totalOperationalExpense = 0;

    expensesSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (!last6Months.includes(data.month)) return; 
      
      // 칸반 보드 설정 상 활성화된 부서(selectedActiveTeams)만 P&L에 렌더링
      const team = data.team || '';
      
      // 비활성화된 부서는 P&L 집계에서 제외
      if (!isPartMatch(team, validOrgTeams)) return;

      const amount = Number(data.amount || data.금액 || 0);
      
      // [FIX] 사용자의 요청: 5개 업장(파트)만 나오게 통합. 개별 하위 영업장명은 세부내역(아코디언)에만 표시.
      const facilityName = normalizeTeam(team);
      
      if (facilityName) {
        expenseByFacility[facilityName] = (expenseByFacility[facilityName] || 0) + amount;
        teamToPartMap[facilityName] = '레저본부'; // 5개 파트는 모두 레저본부 소속으로 렌더링
        
        // 상세 항목 이름에는 원래의 업장명(영업장)을 표기해서 아코디언에서 출처를 알 수 있게 유지
        const rawFacilityName = data.assigned_project || data.mapped_facility || data.branch_name || data.영업장명 || data.dept_name || '미분류';
        const categoryName = data.macroCategory || data.category || data.계정과목 || data.mapped_term || data.description || data.assigned_project || data.account_name || '기타비용';
        
        const detailKey = `[${String(rawFacilityName).trim()}] ${categoryName}`;
        if (!expenseDetailsByFacility[facilityName]) expenseDetailsByFacility[facilityName] = {};
        expenseDetailsByFacility[facilityName][detailKey] = (expenseDetailsByFacility[facilityName][detailKey] || 0) + amount;
        
        totalOperationalExpense += amount;
      }
    });

    let totalCommonExpense = 0;
    commonExpensesSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (!last6Months.includes(data.month)) return;
      const amount = Number(data.amount || data.금액 || 0);
      totalCommonExpense += amount;
    });

    // 4. McKinsey Analytical Insights Computation & Filtering
    let bestFacility = { name: '-', margin: -Infinity };
    let worstFacility = { name: '-', margin: Infinity };
    
    // Merge revenue and expenses to create True P&L per facility
    const allFacilities = Array.from(new Set([...Object.keys(revenueByFacility), ...Object.keys(expenseByFacility)]));
    
    const facilitiesPerformance = allFacilities.map(facilityName => {
      const revenue = revenueByFacility[facilityName] || 0;
      const expense = expenseByFacility[facilityName] || 0;
      const contributionMargin = revenue - expense;

      const expenseDetailsRaw = expenseDetailsByFacility[facilityName] || {};
      const expenseDetails = Object.keys(expenseDetailsRaw).map(cat => ({
        category: cat,
        amount: expenseDetailsRaw[cat]
      })).sort((a, b) => b.amount - a.amount);

      // Only consider facilities that actually have revenue or expense
      if (revenue > 0 || expense > 0) {
        if (contributionMargin > bestFacility.margin) {
          bestFacility = { name: facilityName, margin: contributionMargin };
        }
        if (contributionMargin < worstFacility.margin) {
          worstFacility = { name: facilityName, margin: contributionMargin };
        }
      }

      return {
        facilityName,
        teamName: teamToPartMap[facilityName] || '레저본부',
        categoryCode: '본부/파트',
        revenue,
        expense,
        expenseDetails,
        contributionMargin
      };
    }).filter(fac => fac.revenue > 0 || fac.expense > 0)
      .sort((a, b) => b.contributionMargin - a.contributionMargin);

    // 4. Fetch Weather Data (Using Open-Meteo API for 100% accuracy and speed, replacing unreliable DB query)
    const weatherImpactMap: Record<string, { lastYearRainyDays: number, thisYearRainyDays: number }> = {};
    last6Months.forEach(m => {
      weatherImpactMap[m] = { lastYearRainyDays: 0, thisYearRainyDays: 0 };
    });

    try {
      let tyStart = `${last6Months[0]}-01`;
      let tyEnd = targetEndDates[targetEndDates.length - 1];
      let lyStart = `${Number(last6Months[0].split('-')[0]) - 1}-${last6Months[0].split('-')[1]}-01`;
      let lyEnd = `${Number(targetEndDates[targetEndDates.length - 1].split('-')[0]) - 1}-${targetEndDates[targetEndDates.length - 1].substring(5)}`;

      const todayKst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
      if (tyEnd > todayKst) tyEnd = todayKst;
      if (tyStart > tyEnd) tyStart = tyEnd;
      if (lyEnd > todayKst) lyEnd = todayKst;

      const fetchMeteo = async (start: string, end: string) => {
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=36.78&longitude=127.58&start_date=${start}&end_date=${end}&daily=precipitation_sum,snowfall_sum&timezone=Asia%2FSeoul`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
      };

      const [tyData, lyData] = await Promise.all([
        fetchMeteo(tyStart, tyEnd),
        fetchMeteo(lyStart, lyEnd)
      ]);

      const processMeteo = (data: any, isThisYear: boolean) => {
        if (!data || !data.daily || !data.daily.time) return;
        data.daily.time.forEach((dateStr: string, idx: number) => {
          const precip = data.daily.precipitation_sum ? data.daily.precipitation_sum[idx] : 0;
          const snowfall = data.daily.snowfall_sum ? data.daily.snowfall_sum[idx] : 0;
          
          // 1mm 이상 비가 오거나 0.5cm 이상 눈이 내린 날을 '강수/강설(우천·눈) 영향일'로 집계
          if ((precip && precip >= 1.0) || (snowfall && snowfall >= 0.5)) {
            const monthStr = isThisYear 
              ? dateStr.substring(0, 7) // e.g. 2024-01
              : `${Number(dateStr.substring(0, 4)) + 1}-${dateStr.substring(5, 7)}`; // e.g. 2023-01 -> 2024-01
            
            if (weatherImpactMap[monthStr]) {
              if (isThisYear) weatherImpactMap[monthStr].thisYearRainyDays++;
              else weatherImpactMap[monthStr].lastYearRainyDays++;
            }
          }
        });
      };

      processMeteo(tyData, true);
      processMeteo(lyData, false);
      
    } catch (e) {
      console.error('Failed to fetch weather from Open-Meteo', e);
    }

    const weatherImpact = last6Months.map(m => ({
      month: parseInt(m.split('-')[1], 10) + '월',
      lastYearRainyDays: weatherImpactMap[m].lastYearRainyDays,
      thisYearRainyDays: weatherImpactMap[m].thisYearRainyDays
    })).sort((a, b) => parseInt(a.month) - parseInt(b.month));

    const operatingMargin = totalRevenue > 0 
      ? Math.round(((totalRevenue - totalOperationalExpense - totalCommonExpense) / totalRevenue) * 100) 
      : 0;

    // 5. Fetch Customer Segmentation & Peak Time Analysis
    let customerSegmentation: any = null;
    try {
      const segStartDate = `${last6Months[0]}-01`;
      const segEndDate = targetEndDates[targetEndDates.length - 1];
      const segUrl = `${BACKEND_URL}/api/v5/report/customer-segmentation?startDate=${segStartDate}&endDate=${segEndDate}`;
      
      const segRes = await fetch(segUrl, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      });
      if (segRes.ok) {
        const segJson = await segRes.json();
        if (segJson.success && segJson.data) {
          customerSegmentation = segJson.data;
        }
      }

      // If facilityPreference is not populated from external endpoint, compute directly from real weekday/weekend blocks
      if (!customerSegmentation || !customerSegmentation.facilityPreference || customerSegmentation.facilityPreference.length === 0) {
        const ranges = getContiguousDayRanges(startDate, endDate);
        
        const rangeResList = await Promise.all(
          ranges.map(async (r) => {
            try {
              const res = await fetch(
                `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${r.startDate}&endDate=${r.endDate}`,
                { headers: { 'Authorization': `Bearer ${m2mToken}` }, cache: 'no-store' }
              );
              if (res.ok) {
                const json = await res.json();
                return { type: r.type, rows: Array.isArray(json.data) ? json.data : [] };
              }
            } catch (e) {
              console.error(`Failed to fetch range ${r.startDate}~${r.endDate}`, e);
            }
            return { type: r.type, rows: [] };
          })
        );

        const facilityPrefMap: Record<string, { weekdayRevenue: number; weekendRevenue: number }> = {};

        rangeResList.forEach(({ type, rows }) => {
          const rawRows = rows.filter((r: any) => !r.isSubtotal && !r.isGrandTotal);
          rawRows.forEach((row: any) => {
            const catCode = String(row.categoryCode || '').toUpperCase();
            if (catCode !== 'TICKET' && !['MOTO', 'GOODS', 'PARKING'].includes(catCode)) return;

            const partName = String(row.partName || '').trim();
            const facilityName = normalizeTeam(partName || row.categoryName || catCode);
            
            const isNonAttraction = 
              !facilityName ||
              facilityName.includes('주차') || 
              facilityName.includes('제외') || 
              facilityName.includes('미사용') || 
              facilityName.includes('공통') || 
              facilityName.includes('리조트') || 
              facilityName.includes('디지털') ||
              facilityName.includes('디지탈') ||
              facilityName === '미분류' || 
              facilityName === '기타';

            if (isNonAttraction) return;

            if (!facilityPrefMap[facilityName]) {
              facilityPrefMap[facilityName] = { weekdayRevenue: 0, weekendRevenue: 0 };
            }
            const amount = cleanNum(row.rangeActual !== undefined ? row.rangeActual : (row.todayActual !== undefined ? row.todayActual : row.mtdActual));
            if (type === 'weekday') {
              facilityPrefMap[facilityName].weekdayRevenue += amount;
            } else {
              facilityPrefMap[facilityName].weekendRevenue += amount;
            }
          });
        });

        const calculatedFacilityPref = Object.keys(facilityPrefMap).map(facilityName => ({
          facilityName,
          weekdayRevenue: facilityPrefMap[facilityName].weekdayRevenue,
          weekendRevenue: facilityPrefMap[facilityName].weekendRevenue
        })).filter(f => f.weekdayRevenue > 0 || f.weekendRevenue > 0);

        if (calculatedFacilityPref.length > 0) {
          customerSegmentation = {
            ...(customerSegmentation || {}),
            facilityPreference: calculatedFacilityPref
          };
        }
      }
    } catch (e) {
      console.error('Failed to fetch customer segmentation data:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalVisitors: totalRoomCap || 0,
          totalOperationalExpense,
          totalCommonExpense,
          operatingMargin,
          bestFacility: bestFacility.name,
          worstFacility: worstFacility.name
        },
        facilitiesPerformance,
        customerJourney: topCorrelations,
        weatherImpact,
        customerSegmentation
      }
    });
  } catch (error: any) {
    console.error('Business Plan API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate business plan report' }, { status: 500 });
  }
}
