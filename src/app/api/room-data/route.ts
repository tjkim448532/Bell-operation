import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let startDateStr = searchParams.get('startDate');
    let endDateStr = searchParams.get('endDate');

    // Default to current month if not provided
    if (!startDateStr || !endDateStr) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      startDateStr = `${year}-${month}`;
      endDateStr = `${year}-${month}`;
    }

    const apiStartDate = `${startDateStr}-01`;
    let apiEndDate = `${endDateStr}-31`; // Fallback, will calculate exactly below
    if (endDateStr) {
      const [year, month] = endDateStr.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      apiEndDate = `${endDateStr}-${lastDay}`;
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
    const cookieHeader = request.headers.get('cookie') || '';
    
    let externalData: any = {
      channelBreakdown: [],
      roomMarketBreakdown: [],
      roomTypeBreakdown: []
    };
    try {
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

      // Generate a list of end-of-month dates for the selected range
      const getEndOfMonthDates = (startYYYYMM: string, endYYYYMM: string) => {
        const dates = [];
        const [startYear, startMonth] = startYYYYMM.split('-').map(Number);
        const [endYear, endMonth] = endYYYYMM.split('-').map(Number);
        
        let currentYear = startYear;
        let currentMonth = startMonth;
        
        while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
          // Get the last day of the current month
          const lastDay = new Date(currentYear, currentMonth, 0).getDate();
          const monthStr = String(currentMonth).padStart(2, '0');
          dates.push(`${currentYear}-${monthStr}-${lastDay}`);
          
          currentMonth++;
          if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
          }
        }
        return dates;
      };

      const monthEndDates = getEndOfMonthDates(startDateStr, endDateStr);
      
      const fetchPromises = monthEndDates.map(async (targetDate) => {
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${targetDate}`;
        try {
          const res = await fetch(revUrl, {
            headers: { 
              'Cookie': cookieHeader,
              'Authorization': `Bearer ${m2mToken}`
            },
            next: { revalidate: 3600 }
          });
          if (res.ok) {
            const json = await res.json();
            return json.data || json;
          }
        } catch (err) {
          console.error(`Failed to fetch V5 room data for ${targetDate}:`, err);
        }
        return null;
      });

      const results = await Promise.all(fetchPromises);
      
      if (results.length > 0) {
        const dayData = results[results.length - 1]; // [규칙 2 적용] 스냅샷 덮어쓰기 (배열 누적 방지)
        if (!dayData) return;
        // Merge each month's MTD data
        if (dayData.channelBreakdown) externalData.channelBreakdown.push(...(Array.isArray(dayData.channelBreakdown) ? dayData.channelBreakdown : []));
        if (dayData.roomMarketBreakdown) externalData.roomMarketBreakdown.push(...(Array.isArray(dayData.roomMarketBreakdown) ? dayData.roomMarketBreakdown : []));
        if (dayData.roomTypeBreakdown) externalData.roomTypeBreakdown.push(...(Array.isArray(dayData.roomTypeBreakdown) ? dayData.roomTypeBreakdown : []));
        
        // V5 Object Fallback
        if (dayData.roomSummary && Object.keys(dayData.roomSummary).length > 0 && !Array.isArray(dayData.roomSummary)) {
          if (!dayData.roomTypeBreakdown || dayData.roomTypeBreakdown.length === 0) {
            externalData.roomTypeBreakdown.push({ ...dayData.roomSummary, _source: 'room' });
          }
        }
        
        // Visitor data
        if (dayData.leisureVisitorBreakdown) {
          externalData.leisureVisitorBreakdown = (externalData.leisureVisitorBreakdown || []).concat(dayData.leisureVisitorBreakdown);
        }
        if (dayData.dailyReportBreakdown) {
          externalData.dailyReportBreakdown = (externalData.dailyReportBreakdown || []).concat(dayData.dailyReportBreakdown);
        }
      }

    } catch (err) {
      console.error('Network error fetching from backend API:', err);
    }

    const rooms = externalData.channelBreakdown || externalData.data?.channelBreakdown || externalData.roomMarketBreakdown || externalData.data?.roomMarketBreakdown || externalData.roomTypeBreakdown || externalData.data?.roomTypeBreakdown || [];

    // Aggregate logic
    const results: Record<string, any> = {};
    let totalRevenue = 0;
    let totalNights = 0;

    rooms.forEach((item: any) => {
      let roomType = item.pyType || item.shop_name || item.facility_name || item.roomType || '객실(Summary)';
      // Normalize roomType for UI (e.g. "16PY" -> "16평", "16PY(PET)" -> "16평(펫)", "72PY" -> "72평")
      roomType = roomType.replace(/(\d+)PY/gi, '$1평').replace(/\(PET\)/gi, '(펫)');

      const marketType = item.channel_name || item.segment || '미분류 마켓';
      const amount = item.mtd_actual || item.total_amount || item.today_actual || item.revenue || item.amount || 0;
      const nights = item.qty || item.rooms_sold || item.sales_qty || 0;

      if (amount === 0 && nights === 0) return;

      if (!results[roomType]) {
        results[roomType] = { totalRevenue: 0, totalNights: 0, markets: {} };
      }
      if (!results[roomType].markets[marketType]) {
        results[roomType].markets[marketType] = { revenue: 0, nights: 0 };
      }

      results[roomType].totalRevenue += amount;
      results[roomType].totalNights += nights;
      results[roomType].markets[marketType].revenue += amount;
      results[roomType].markets[marketType].nights += nights;

      totalRevenue += amount;
      totalNights += nights;
    });

    let leisureVisitorBreakdown = externalData.leisureVisitorBreakdown || externalData.data?.leisureVisitorBreakdown;
    if (!leisureVisitorBreakdown || leisureVisitorBreakdown.length === 0) {
      leisureVisitorBreakdown = externalData.dailyReportBreakdown || externalData.data?.dailyReportBreakdown || [];
    }

    let preCalculatedExpectedGuests = 0;
    leisureVisitorBreakdown.forEach((item: any) => {
      // [규칙 3 적용] 문자열 검색(includes) 금지. 오직 백엔드 명시 source만 신뢰
      if (item._source === 'room') {
        preCalculatedExpectedGuests += item.visitors || item.guests_qty || item.guests || item.sales_qty || item.qty || item.rooms_sold || item.roomsSold || 0;
      }
    });

    // [규칙 1 적용] 백엔드에서 visitors 필드를 주지 않으면 0으로 처리. (임의 수학 연산 및 승수 적용 절대 금지)

    return NextResponse.json({ 
      success: true, 
      data: results,
      summary: {
        totalRevenue,
        totalNights,
        expectedGuests: preCalculatedExpectedGuests
      }
    });

  } catch (error: any) {
    console.error('Room Data Fetch Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
