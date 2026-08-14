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
    
    let externalData: any = null;
    try {
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

      const startDate = `${startDateStr}-01`;
      let [ey, em] = endDateStr.split('-').map(Number);
      const lastDay = new Date(ey, em, 0).getDate();
      const endDate = `${endDateStr}-${lastDay}`;
      
      const m2mHeaders = { 
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${m2mToken}`
      };

      // [API 9] 객실 ?�?�보???�용 ?�성??리포??(Pre-aggregated by Room Type)
      const url = `${BACKEND_URL}/api/v5/report/room-dashboard-summary?startDate=${startDate}&endDate=${endDate}`;
      
      const res = await fetch(url, { headers: m2mHeaders, next: { revalidate: 3600 } });
      if (res.ok) {
        externalData = await res.json();
      } else {
        console.error(`Failed to fetch API 9 room-dashboard-summary: HTTP ${res.status}`);
      }

    } catch (err) {
      console.error('Network error fetching from backend API:', err);
    }

    // [규칙 1 ?�용 ?�벽 준?? 부�??�산(SLICE SUMMATION) ?��? 금�?.
    // 백엔?��? ?�성?��? 객실�?총합(totalRevenue, totalRoomsSold)??그�?�?UI ?�맷?�로 변??Mapping)�??�행.
    
    const summary = externalData?.summary || {};
    const byRoomType = externalData?.byRoomType || {};

    const results: Record<string, any> = {};

    Object.entries(byRoomType).forEach(([roomType, data]: [string, any]) => {
      // Create the structure expected by the frontend
      const marketsObj: Record<string, any> = {};
      
      const marketsArr = data.markets || [];
      marketsArr.forEach((market: any) => {
        const marketName = market.channelName || market.segmentName || '?�합 마켓(V5)';
        marketsObj[marketName] = {
          revenue: market.revenue || 0,
          nights: market.roomsSold || 0
        };
      });

      results[roomType] = {
        // SSOT: Use backend pre-aggregated totals directly
        totalRevenue: data.totalRevenue || 0,
        totalNights: data.totalRoomsSold || 0,
        markets: marketsObj
      };
    });
    
    // SSOT: Use backend grand total directly
    const backendTotalRevenue = summary.totalRevenue || 0;
    const backendTotalNights = summary.totalRoomsSold || summary.totalRooms || 0;
    const preCalculatedExpectedGuests = summary.totalRoomCap || (backendTotalNights * 3); // Fallback estimate

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
    return NextResponse.json({ error: error.message || '?�버 ?�류가 발생?�습?�다.' }, { status: 500 });
  }
}
