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
    
    let externalData: any = {};
    try {
      const revUrl = `${BACKEND_URL}/api/v3/dashboard/revenue-summary?startDate=${apiStartDate}&endDate=${apiEndDate}`;
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
      const res = await fetch(revUrl, {
        headers: { 
          'Authorization': `Bearer ${m2mToken}`
        }
      });
      if (res.ok) {
        externalData = await res.json();
      } else {
        console.error('Failed to fetch from backend API:', res.status);
      }
    } catch (err) {
      console.error('Network error fetching from backend API:', err);
    }

    const rooms = externalData.roomTypeBreakdown || externalData.data?.roomTypeBreakdown || [];

    // Aggregate logic
    const results: Record<string, any> = {};
    let totalRevenue = 0;
    let totalNights = 0;

    rooms.forEach((item: any) => {
      const roomType = item.facility_name || '기타 평형';
      const marketType = item.channel_name || item.segment_name || '미분류 마켓';
      const amount = item.total_amount || item.amount || item.today_actual || 0;
      const nights = item.rooms_sold || 0;

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

    return NextResponse.json({ 
      success: true, 
      data: results,
      summary: {
        totalRevenue,
        totalNights
      }
    });

  } catch (error: any) {
    console.error('Room Data Fetch Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
