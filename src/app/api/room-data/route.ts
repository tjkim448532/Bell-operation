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

    // Convert YYYY-MM to YYYY-MM-DD for the backend API
    const formatToDate = (dateStr: string, isEnd: boolean) => {
      if (dateStr.length === 7) {
        return isEnd ? `${dateStr}-31` : `${dateStr}-01`;
      }
      return dateStr;
    };
    const apiStartDate = formatToDate(startDateStr, false);
    const apiEndDate = formatToDate(endDateStr, true);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
    const cookieHeader = request.headers.get('cookie') || '';
    
    let externalData: any = {};
    try {
      const revUrl = `${BACKEND_URL}/api/v3/dashboard/revenue-summary?startDate=${apiStartDate}&endDate=${apiEndDate}`;
      const res = await fetch(revUrl, {
        headers: { 'Cookie': cookieHeader }
      });
      if (res.ok) {
        externalData = await res.json();
      } else {
        console.error('Failed to fetch from backend API:', res.status);
      }
    } catch (err) {
      console.error('Network error fetching from backend API:', err);
    }

    const rooms = externalData.rooms || externalData.data?.rooms || [];

    // Aggregate logic
    const results: Record<string, any> = {};
    let totalRevenue = 0;
    let totalNights = 0;

    rooms.forEach((item: any) => {
      const roomType = item.room_type || '기타 평형';
      const marketType = item.channel_name || item.segment_name || '미분류 마켓';
      const amount = item.today_actual || 0;
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
