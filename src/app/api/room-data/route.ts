import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let startDateStr = searchParams.get('startDate') || searchParams.get('startMonth');
    let endDateStr = searchParams.get('endDate') || searchParams.get('endMonth');

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

      // [API 9] 객실 대시보드 전용 완성형 리포트 (Pre-aggregated by Room Type)
      const url = `${BACKEND_URL}/api/v6/report/room-dashboard-summary?startDate=${startDate}&endDate=${endDate}`;
      
      const res = await fetch(url, { headers: m2mHeaders, next: { revalidate: 3600 } });
      if (res.ok) {
        externalData = await res.json();
      } else {
        console.error(`Failed to fetch API 9 room-dashboard-summary: HTTP ${res.status}`);
      }

    } catch (err) {
      console.error('Network error fetching from backend API:', err);
    }

    // [규칙 1 적용 완벽 준수] 부분 합산(SLICE SUMMATION) 절대 금지.
    // 백엔드가 완성해준 객실별 총합(totalRevenue, totalRoomsSold)을 그대로 UI 포맷으로 변환(Mapping)만 수행.
    
    const summary = externalData?.summary || {};
    const byRoomType = externalData?.byCategory || {};

    const results: Record<string, any> = {};

    Object.entries(byRoomType).forEach(([roomType, data]: [string, any]) => {
      // Create the structure expected by the frontend
      const marketsObj: Record<string, any> = {};
      
      const marketsArr = data.venues || data.markets || [];
      marketsArr.forEach((market: any) => {
        const marketName = market.venueName || market.channelName || market.segmentName || '통합 마켓(V5)';
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
    
    // SSOT: Use backend grand total directly (Strict Zero-Dummy Policy: No arbitrary * 3 estimate)
    const backendTotalRevenue = summary.totalRevenue || 0;
    const backendTotalNights = summary.totalRoomsSold || summary.totalRooms || 0;
    const preCalculatedExpectedGuests = summary.totalRoomCap || 0;

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
