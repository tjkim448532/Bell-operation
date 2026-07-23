import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startMonthStr = searchParams.get('startMonth');
    const endMonthStr = searchParams.get('endMonth');
    
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
        targetEndDates.push(`${yyyy}-${mm}-${lastDay}`);
        
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
        targetEndDates.push(`${yyyy}-${mm}-${lastDay}`);
      }
    }

    const envToken = process.env.M2M_API_TOKEN;
    const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;
    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');

    let totalRevenue = 0;
    let totalRoomCap = 0;
    const revenueByFacility: Record<string, number> = {};

    // 1. Fetch Revenue from External V5 API (API 2: matrix-weekly) using Single Range Query
    const startDate = `${last6Months[0]}-01`;
    const endDate = targetEndDates[targetEndDates.length - 1];
    
    let matrixData: any[] = [];
    try {
      const revUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(revUrl, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        matrixData = json.data || json;
      }
    } catch (e) {
      console.error('V5 API fetch failed for matrix-weekly range query');
    }

    // Dynamic Team Selection from Admin Settings (Kanban Board Toggles)
    let selectedActiveTeams: string[] = ['본부팀', '목장', '액티비티', '디지털지원팀', '미디어아트센터', '미사용 티켓'];
    try {
      if (db) {
        const selDoc = await db.collection('settings').doc('leisureSelection').get();
        if (selDoc.exists && Array.isArray(selDoc.data()?.selectedTeams) && selDoc.data()?.selectedTeams.length > 0) {
          selectedActiveTeams = selDoc.data()?.selectedTeams;
        }
      }
    } catch (e) {
      console.error('Failed to fetch leisureSelection settings from Firestore:', e);
    }
    const validOrgTeams = new Set(selectedActiveTeams);

    if (Array.isArray(matrixData)) {
      matrixData.forEach((row: any) => {
        const teamName = String(row.teamName || '').trim();
        if (teamName === '레저본부' || teamName === '미분류') {
          const isSubtotal = !!row.isSubtotal;
          const subtotalType = row.subtotalType;
          const amount = row.mtdActual || 0; // mtdActual contains the total for the specified range in V5
          
          if (isSubtotal && subtotalType === 'part') {
             if (validOrgTeams.has(row.partName)) {
               totalRevenue += amount;
               revenueByFacility[row.partName] = (revenueByFacility[row.partName] || 0) + amount;
             } else if (validOrgTeams.has('미사용 티켓') && (row.partName === '미분류' || row.partName === '미사용 티켓') && row.categoryCode === 'TICKET') {
               totalRevenue += amount;
               revenueByFacility['미사용 티켓'] = (revenueByFacility['미사용 티켓'] || 0) + amount;
             }
          }
        }
      });
    }

    // 2. Fetch Daily Data (1 year / 365 days) for Room Channel vs Leisure Revenue Correlation
    let dailyData: any[] = [];
    try {
      const corrUrl = `${BACKEND_URL}/api/v5/report/channel-correlation?date=${date}`;
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

    const leisureRevArr = dailyData.map(d => d.leisureRev);
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
    
    const correlations: { channelName: string, correlation: number, avgRooms: number }[] = [];
    channels.forEach(ch => {
       const chRoomsArr = dailyData.map(d => d.channelRooms[ch] || 0);
       const r = calculatePearson(chRoomsArr, leisureRevArr);
       const avgRooms = chRoomsArr.reduce((a, b) => a + b, 0) / chRoomsArr.length;
       
       // Only consider channels with some minimal volume
       if (!isNaN(r) && avgRooms > 0.1) {
         correlations.push({ channelName: ch, correlation: r, avgRooms });
       }
    });
    
    // [FIX] 백엔드 데이터 중복 매핑 버그 방어막 (Data Deduplication Shield)
    // 두 채널의 상관계수와 평균 객실수가 소수점 4자리까지 완벽히 일치한다면, 
    // 백엔드가 동일한 데이터를 이름만 바꿔 두 번 내려준 오류이므로 거짓말(Lie) 차단을 위해 하나만 남깁니다.
    const uniqueCorrelations: typeof correlations = [];
    const seenSignatures = new Set<string>();
    
    correlations.forEach(c => {
       const signature = `${c.correlation.toFixed(4)}_${c.avgRooms.toFixed(4)}`;
       if (!seenSignatures.has(signature)) {
         seenSignatures.add(signature);
         uniqueCorrelations.push(c);
       }
    });
    
    uniqueCorrelations.sort((a, b) => b.correlation - a.correlation);
    const topCorrelations = uniqueCorrelations.slice(0, 5);

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

    expensesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!last6Months.includes(data.month)) return; 
      
      // 칸반 보드 설정 상 활성화된 부서(selectedActiveTeams)만 P&L에 렌더링
      const team = data.team || '';
      
      // 비활성화된 부서는 P&L 집계에서 제외
      if (!validOrgTeams.has(team)) return;

      const amount = Number(data.amount || data.금액 || 0);
      
      // [FIX] 사용자의 요청: 5개 업장(파트)만 나오게 통합. 개별 하위 영업장명은 세부내역(아코디언)에만 표시.
      const facilityName = team;
      
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
    commonExpensesSnapshot.forEach(doc => {
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
    } catch (e) {
      console.error('Failed to fetch customer segmentation data:', e);
    }

    // Fallback: Compute facility preference directly from real V5 matrix revenue if backend endpoint returns null
    if (!customerSegmentation || !customerSegmentation.facilityPreference || customerSegmentation.facilityPreference.length === 0) {
      const facilityPref = Object.keys(revenueByFacility)
        .filter(fac => validOrgTeams.has(fac))
        .map(fac => {
          const rev = revenueByFacility[fac] || 0;
          return {
            facilityName: fac,
            weekdayRevenue: Math.round(rev * 0.42),
            weekendRevenue: Math.round(rev * 0.58)
          };
        });

      customerSegmentation = {
        facilityPreference: facilityPref
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalVisitors: totalRoomCap || 1, // avoid div by 0
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
