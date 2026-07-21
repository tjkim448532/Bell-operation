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

    if (Array.isArray(matrixData)) {
      matrixData.forEach((row: any) => {
        const teamName = String(row.teamName || '').trim();
        if (teamName === '레저본부' || teamName === '미분류') {
          const isSubtotal = !!row.isSubtotal;
          const subtotalType = row.subtotalType;
          const amount = row.mtdActual || 0; // mtdActual contains the total for the specified range in V5
          
          const validOrgTeams = new Set(['본부팀', '목장', '액티비티', '디지털지원팀', '미디어아트센터']);
          
          if (isSubtotal && subtotalType === 'part') {
             if (validOrgTeams.has(row.partName)) {
               totalRevenue += amount;
             } else if (row.partName === '미분류' && row.categoryCode === 'TICKET') {
               // 백엔드에서 생성해준 '티켓' 카테고리의 '미분류' 소계를 추가
               totalRevenue += amount;
             }
          }

          if (!isSubtotal && row.shopName) {
             const facName = String(row.shopName || '').trim();
             // Exclude non-leisure shops natively mapped to other teams (which are already filtered above),
             // but if they are inside '미분류' or '레저본부', we accept them as provided by V5.
             if (facName) {
               revenueByFacility[facName] = (revenueByFacility[facName] || 0) + amount;
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
    
    correlations.sort((a, b) => b.correlation - a.correlation);
    const topCorrelations = correlations.slice(0, 5);

    // 3. Fetch Expenses from Firebase
    const expensesSnapshot = await db.collection('expenses').get();
    const commonExpensesSnapshot = await db.collection('common_expenses').get();

    const expenseByFacility: Record<string, number> = {};
    const expenseDetailsByFacility: Record<string, Record<string, number>> = {};
    const teamToPartMap: Record<string, string> = {};
    let totalOperationalExpense = 0;

    expensesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!last6Months.includes(data.month)) return; 
      
      // 특수 규칙: 조직도 상의 공식 5개 부서만 렌더링 (미분류, 놀이동산 제외)
      const validOrgTeams = new Set(['본부팀', '목장', '액티비티', '디지털지원팀', '미디어아트센터']);
      const team = data.team || '';
      
      // 공식 조직도가 아닌 타 본부 및 미분류는 제외
      if (!validOrgTeams.has(team)) return;

      const amount = Number(data.amount || data.금액 || 0);
      
      // [FIX] 하드코딩된 normalizeFacilityName 대신, 사용자가 수동 교정 기억장치(projectOverrides) 
      // 또는 맵핑 기능으로 직접 어사인한 'assigned_project' 값을 최우선으로 존중합니다.
      const rawFacilityName = data.assigned_project || data.mapped_facility || data.branch_name || data.영업장명 || data.dept_name || '미분류';
      const facilityName = String(rawFacilityName).trim();
      
      if (facilityName && facilityName !== 'EXCLUDE') {
        expenseByFacility[facilityName] = (expenseByFacility[facilityName] || 0) + amount;
        teamToPartMap[facilityName] = data.team; // Map facility to its team
        
        const categoryName = data.macroCategory || data.category || data.계정과목 || data.mapped_term || data.description || data.assigned_project || data.account_name || '기타비용';
        if (!expenseDetailsByFacility[facilityName]) expenseDetailsByFacility[facilityName] = {};
        expenseDetailsByFacility[facilityName][categoryName] = (expenseDetailsByFacility[facilityName][categoryName] || 0) + amount;
        
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
        categoryCode: '영업장',
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
      const tyStart = `${last6Months[0]}-01`;
      const tyEnd = targetEndDates[targetEndDates.length - 1];
      const lyStart = `${Number(last6Months[0].split('-')[0]) - 1}-${last6Months[0].split('-')[1]}-01`;
      const lyEnd = `${Number(targetEndDates[targetEndDates.length - 1].split('-')[0]) - 1}-${targetEndDates[targetEndDates.length - 1].substring(5)}`;

      const fetchMeteo = async (start: string, end: string) => {
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=36.78&longitude=127.58&start_date=${start}&end_date=${end}&daily=precipitation_sum&timezone=Asia%2FSeoul`;
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
          const precip = data.daily.precipitation_sum[idx];
          if (precip >= 1.0) { // 1mm 이상 강수 시 '비 온 날'로 카운트
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
    let customerSegmentation = null;
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
