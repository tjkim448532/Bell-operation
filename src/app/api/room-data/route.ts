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
        // V5 SSOT: Use salesByFacility
        const salesByFacility = dayData.salesByFacility || dayData.sales_by_facility || [];
        if (salesByFacility.length > 0) {
          const rooms = salesByFacility.filter((i: any) => 
            i.teamName === '객실' || i.team_name === '객실' || String(i.categoryName || i.category_name).includes('객실') || i._source === 'room'
          );
          externalData.roomTypeBreakdown.push(...rooms);
        }
        
        // Use salesByFacility for leisure visitors fallback
        if (salesByFacility.length > 0) {
          externalData.leisureVisitorBreakdown = (externalData.leisureVisitorBreakdown || []).concat(salesByFacility);
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
      let roomType = item.pyType || item.roomType || item.room_type || item.shopName || item.shop_name || item.facilityName || item.facility_name || '객실(Summary)';
      // Normalize roomType for UI (e.g. "16PY" -> "16평", "16PY(PET)" -> "16평(펫)", "72PY" -> "72평")
      roomType = roomType.replace(/(\d+)PY/gi, '$1평').replace(/\(PET\)/gi, '(펫)');

      // In V5, market type might be in category_name or part_name or channel_name
      const marketType = item.channelName || item.channel_name || item.marketType || item.market_type || item.segment || item.partName || item.part_name || '미분류 마켓';
      const amount = item.totalSales !== undefined ? item.totalSales : (item.total_sales !== undefined ? item.total_sales : (item.mtdActual !== undefined ? item.mtdActual : (item.mtd_actual !== undefined ? item.mtd_actual : (item.totalAmount || item.total_amount || item.todayActual || item.today_actual || item.revenue || item.amount || 0))));
      const nights = item.qty !== undefined ? item.qty : (item.roomsSold || item.rooms_sold || item.salesQty || item.sales_qty || item.mtdNights || item.mtd_nights || item.nights || 0);

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

    // [규칙 1 적용 완벽 준수] 부분 합산(SLICE SUMMATION) 절대 금지.
    // 배열을 루프 돌며 합산하지 않고, 최상단 summary 객체의 단일 값을 그대로 사용합니다.
    const summary = externalData.summary || externalData.data?.summary || {};
    let preCalculatedExpectedGuests = summary.totalRoomCap || summary.total_room_cap || summary.totalGuests || summary.total_guests || 0;

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
