import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const targetDate = new Date(date);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0-indexed
    const last6Months: string[] = [];
    const targetEndDates: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      last6Months.push(`${yyyy}-${mm}`);
      
      const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
      targetEndDates.push(`${yyyy}-${mm}-${lastDay}`);
    }

    const envToken = process.env.M2M_API_TOKEN;
    const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;
    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');

    const normalizeFacilityName = (name: string) => {
      const n = String(name || '').trim();
      
      // 1. 놀이동산 제외 (필터링용 마커 반환)
      if (n.includes('놀이동산') || n.includes('미니골프') || n.includes('회전그네')) return 'EXCLUDE';
      
      // 2. 미디어아트센터 사업부 통합
      if (n.includes('미디어아트') || n.includes('미디어-') || n.includes('벨포레홀')) return '미디어아트센터';
      
      // 3. 액티비티 사업부 통합 (썸머랜드, 원더풀 제외)
      if (
        n.includes('사계절썰매장') || 
        n.includes('마리나') || 
        n.includes('마운틴카트') || 
        n.includes('미니포렛') || 
        n.includes('액티비티') || 
        n.includes('엑티비티')
      ) return '액티비티';

      // 4. 독립 유지 항목 (얼룩말카페, 썸머랜드, 원더풀은 이름 그대로 유지)
      if (n.includes('얼룩말카페')) return '얼룩말카페';
      if (n.includes('썸머랜드')) return '썸머랜드';
      if (n.includes('원더풀')) return '원더풀';

      // 5. 목장 사업부 (얼룩말카페 제외한 나머지 목장)
      if (n.includes('목장')) return '벨포레 목장';
      
      // 6. 공통 지원 부서 통합
      if (n.includes('본부') || n.includes('디지털지원')) return '레저사업본부';

      return n;
    };

    let totalRevenue = 0;
    let totalRoomCap = 0;
    const revenueByFacility: Record<string, number> = {};

    // 1. Fetch Revenue from External V5 API (API 2: matrix-weekly) across 6 months
    const fetchPromises = targetEndDates.map(async (apiEndDate) => {
      try {
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=${apiEndDate}`;
        const res = await fetch(revUrl, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch (e) {
        console.error('V5 API fetch failed for', apiEndDate);
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    results.forEach(matrixData => {
      if (!matrixData || !Array.isArray(matrixData)) return;
      
      let monthlyLeisureRevenue = 0;

      matrixData.forEach((row: any) => {
        const teamName = String(row.teamName || '').trim();
        if (teamName === '레저본부' || teamName === '미분류') {
          const isSubtotal = !!row.isSubtotal;
          const subtotalType = row.subtotalType;
          const amount = row.mtdActual || 0;
          
          if (isSubtotal && subtotalType === 'team' && row.partName !== '놀이동산') {
            monthlyLeisureRevenue += amount;
          }

          if (!isSubtotal && row.shopName) {
             const facName = normalizeFacilityName(row.shopName);
             if (facName !== 'EXCLUDE') {
               revenueByFacility[facName] = (revenueByFacility[facName] || 0) + amount;
             }
          }
        }
      });
      totalRevenue += monthlyLeisureRevenue;
      // We don't have accurate visitors from matrix-weekly, but the dashboard uses 1 if unavailable anyway.
    });

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
    const teamToPartMap: Record<string, string> = {};
    let totalOperationalExpense = 0;

    expensesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!last6Months.includes(data.month)) return; 
      
      // 특수 규칙: 레저본부 하위 팀들(목장, 액티비티 등) 및 미분류만 렌더링
      const leisureTeams = new Set(['본부팀', '목장', '액티비티', '디지털지원팀', '놀이동산', '미디어아트센터']);
      const team = data.team || '미분류';
      
      // 타 본부는 제외
      if (!leisureTeams.has(team) && team !== '미분류') return;

      const amount = Number(data.amount || data.금액 || 0);
      const rawFacilityName = data.branch_name || data.영업장명 || data.dept_name || '미분류';
      const facilityName = normalizeFacilityName(rawFacilityName);
      
      if (facilityName !== 'EXCLUDE') {
        expenseByFacility[facilityName] = (expenseByFacility[facilityName] || 0) + amount;
        teamToPartMap[facilityName] = data.team; // Map facility to its team
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
        contributionMargin
      };
    }).filter(fac => fac.revenue > 0 || fac.expense > 0)
      .sort((a, b) => b.contributionMargin - a.contributionMargin);

    const operatingMargin = totalRevenue > 0 
      ? Math.round(((totalRevenue - totalOperationalExpense - totalCommonExpense) / totalRevenue) * 100) 
      : 0;

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
        weatherImpact: []
      }
    });
  } catch (error: any) {
    console.error('Business Plan API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate business plan report' }, { status: 500 });
  }
}
