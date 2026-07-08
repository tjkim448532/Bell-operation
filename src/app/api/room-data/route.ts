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
      
      const getDates = (start: string, end: string) => {
        const arr = [];
        const dt = new Date(start);
        const endDt = new Date(end);
        while (dt <= endDt) {
          arr.push(new Date(dt).toISOString().split('T')[0]);
          dt.setDate(dt.getDate() + 1);
        }
        return arr;
      };
      const dateList = getDates(apiStartDate, apiEndDate);
      
      const fetchPromises = dateList.map(async (dateStr) => {
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${dateStr}`;
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
          } else {
            return null;
          }
        } catch (err) {
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      
      results.forEach(dayData => {
        if (!dayData) return;
        if (dayData.channelBreakdown) externalData.channelBreakdown.push(...(Array.isArray(dayData.channelBreakdown) ? dayData.channelBreakdown : []));
        if (dayData.roomMarketBreakdown) externalData.roomMarketBreakdown.push(...(Array.isArray(dayData.roomMarketBreakdown) ? dayData.roomMarketBreakdown : []));
        if (dayData.roomTypeBreakdown) externalData.roomTypeBreakdown.push(...(Array.isArray(dayData.roomTypeBreakdown) ? dayData.roomTypeBreakdown : []));
      });

    } catch (err) {
      console.error('Network error fetching from backend API:', err);
    }

    const rooms = externalData.channelBreakdown || externalData.data?.channelBreakdown || externalData.roomMarketBreakdown || externalData.data?.roomMarketBreakdown || externalData.roomTypeBreakdown || externalData.data?.roomTypeBreakdown || [];

    // Aggregate logic
    const results: Record<string, any> = {};
    let totalRevenue = 0;
    let totalNights = 0;

    rooms.forEach((item: any) => {
      let roomType = item.pyType || item.shop_name || item.facility_name || '기타 평형';
      // Normalize roomType for UI (e.g. "16PY" -> "16평", "16PY(PET)" -> "16평(펫)", "72PY" -> "72평")
      roomType = roomType.replace(/(\d+)PY/gi, '$1평').replace(/\(PET\)/gi, '(펫)');

      const marketType = item.channel_name || item.segment || '미분류 마켓';
      const amount = item.today_actual || item.revenue || 0;
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
      const facilityName = String(item.facility_name || item.shop_name || '').trim();
      if (facilityName.includes('객실') || facilityName.includes('콘도') || facilityName.includes('숙박')) {
        preCalculatedExpectedGuests += item.visitors || item.guests_qty || item.guests || item.sales_qty || item.qty || 0;
      }
    });

    // Fallback: If preCalculatedExpectedGuests is still 0, calculate based on room nights
    if (preCalculatedExpectedGuests === 0 && Object.keys(results).length > 0) {
      Object.entries(results).forEach(([type, data]: [string, any]) => {
        let multiplier = 2; // Default for 16PY
        if (type.includes('35')) multiplier = 4;
        else if (type.includes('51')) multiplier = 6;
        else if (type.includes('72')) multiplier = 8;
        preCalculatedExpectedGuests += (data.totalNights * multiplier);
      });
    }

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
