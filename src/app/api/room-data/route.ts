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

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const cookieHeader = request.headers.get('cookie') || '';
    
    let externalData: any = {
      channelBreakdown: [],
      roomMarketBreakdown: [],
      roomTypeBreakdown: []
    };
    try {
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

      const startDate = `${startDateStr}-01`;
      let [ey, em] = endDateStr.split('-').map(Number);
      const lastDay = new Date(ey, em, 0).getDate();
      const endDate = `${endDateStr}-${lastDay}`;
      
      const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`;
      let dayData = null;
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
          dayData = json.data || json;
        }
      } catch (err) {
        console.error(`Failed to fetch V5 room data for range:`, err);
      }
      
      if (dayData) {
        
        // V5 SSOT: Prefer roomSummaryByType if available
        const roomSummaryByType = dayData.roomSummaryByType || [];
        if (roomSummaryByType.length > 0) {
          externalData.roomTypeBreakdown.push(...roomSummaryByType);
        } else {
          const salesByFacility = dayData.salesByFacility || [];
          if (salesByFacility.length > 0) {
            const rooms = salesByFacility.filter((i: any) => 
              i.categoryCode === 'ROOM' || i.teamName === '객실' || String(i.categoryName).includes('객실') || i._source === 'room'
            );
            externalData.roomTypeBreakdown.push(...rooms);
          }
        }
        
        // Use salesByFacility for leisure visitors fallback
        const salesByFacilityAll = dayData.salesByFacility || [];
        if (salesByFacilityAll.length > 0) {
          externalData.leisureVisitorBreakdown = (externalData.leisureVisitorBreakdown || []).concat(salesByFacilityAll);
        }

        // Add summary to externalData
        externalData.summary = dayData.summary || dayData;
      }

    } catch (err) {
      console.error('Network error fetching from backend API:', err);
    }

    const rooms = externalData.channelBreakdown || externalData.data?.channelBreakdown || externalData.roomMarketBreakdown || externalData.data?.roomMarketBreakdown || externalData.roomTypeBreakdown || externalData.data?.roomTypeBreakdown || [];

    // Aggregate logic
    const results: Record<string, any> = {};

    rooms.forEach((item: any) => {
      let roomType = item.roomType || item.pyType || item.shopName || item.subGroupName || item.facilityName || '객실(Summary)';
      // Normalize roomType for UI (e.g. "16PY" -> "16평", "16PY(PET)" -> "16평(펫)", "72PY" -> "72평")
      roomType = roomType.replace(/(\d+)PY/gi, '$1평').replace(/\(PET\)/gi, '(펫)');

      // In V5, market type is decoupled from room type in roomSummaryByType, so we use a generic label if not provided
      const marketType = item.channelName || item.marketType || item.segment || item.partName || '통합 마켓(V5)';
      const amount = item.revenue !== undefined ? item.revenue : (item.totalSales !== undefined ? item.totalSales : (item.mtdActual !== undefined ? item.mtdActual : (item.totalAmount || item.todayActual || item.amount || 0)));
      const nights = item.roomsSold !== undefined ? item.roomsSold : (item.qty !== undefined ? item.qty : (item.salesQty || item.mtdNights || item.nights || 0));

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
    });

    let leisureVisitorBreakdown = externalData.leisureVisitorBreakdown || externalData.data?.leisureVisitorBreakdown;
    if (!leisureVisitorBreakdown || leisureVisitorBreakdown.length === 0) {
      leisureVisitorBreakdown = externalData.dailyReportBreakdown || externalData.data?.dailyReportBreakdown || [];
    }

    // [규칙 1 적용 완벽 준수] 부분 합산(SLICE SUMMATION) 절대 금지.
    // 배열을 루프 돌며 합산하지 않고, 최상단 summary 객체의 단일 값을 그대로 사용합니다.
    const summary = externalData.summary || externalData.data?.summary || {};
    let preCalculatedExpectedGuests = summary.totalRoomCap || summary.totalGuests || 0;
    
    // SSOT: Use backend totalRevenue and totalRooms directly
    const backendTotalRevenue = summary.totalRevenue || summary.mtdRevenue || 0;
    const backendTotalNights = summary.totalRooms || 0;

    // [규칙 1 적용] 백엔드에서 visitors 필드를 주지 않으면 0으로 처리. (임의 수학 연산 및 승수 적용 절대 금지)

    return NextResponse.json({ 
      success: true, 
      data: results,
      summary: {
        totalRevenue: backendTotalRevenue,
        totalNights: backendTotalNights,
        expectedGuests: preCalculatedExpectedGuests
      }
    });

  } catch (error: any) {
    console.error('Room Data Fetch Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
