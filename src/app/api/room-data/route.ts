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
      
      const m2mHeaders = { 
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${m2mToken}`
      };

      // [API 6] 객실 세그먼트 중심 실적 리포트
      const segUrl = `${BACKEND_URL}/api/v5/report/room-channel-sales?startDate=${startDate}&endDate=${endDate}`;
      let segmentData: any = [];
      try {
        const segRes = await fetch(segUrl, { headers: m2mHeaders, next: { revalidate: 3600 } });
        if (segRes.ok) {
          const json = await segRes.json();
          segmentData = json.data || [];
        }
      } catch (err) {
        console.error(`Failed to fetch API 6 room-channel-sales:`, err);
      }
      
      // [API 7] 상세 판매 채널 중심 실적 리포트
      const chUrl = `${BACKEND_URL}/api/v5/report/room-sales-by-channel?startDate=${startDate}&endDate=${endDate}`;
      let channelData: any = [];
      try {
        const chRes = await fetch(chUrl, { headers: m2mHeaders, next: { revalidate: 3600 } });
        if (chRes.ok) {
          const json = await chRes.json();
          channelData = json.data || [];
        }
      } catch (err) {
        console.error(`Failed to fetch API 7 room-sales-by-channel:`, err);
      }

      // Populate externalData with the flat arrays
      externalData.segmentData = segmentData;
      externalData.channelData = channelData;
      
      // V4.2 Bible - NO SLICE SUMMATION
      // We will look for the grand total in channelData instead of looping
      let grandTotal = channelData.find((d: any) => d.isGrandTotal === true);
      if (!grandTotal) {
         grandTotal = segmentData.find((d: any) => d.isGrandTotal === true) || {};
      }
      externalData.summary = {
        totalRevenue: grandTotal.ytdRevenue || grandTotal.mtdRevenue || grandTotal.todayRevenue || 0,
        totalRooms: grandTotal.ytdRooms || grandTotal.mtdRooms || grandTotal.todayRooms || 0,
        totalRoomCap: grandTotal.totalRoomCap || grandTotal.ytdRoomCap || grandTotal.mtdRoomCap || grandTotal.todayRoomCap || 0
      };

    } catch (err) {
      console.error('Network error fetching from backend API:', err);
    }

    const channelBreakdown = externalData.channelData || [];
    const segmentBreakdown = externalData.segmentData || [];

    // [규칙 1 적용 완벽 준수] 부분 합산(SLICE SUMMATION) 절대 금지.
    // 최상단 summary 객체의 단일 값을 그대로 사용합니다.
    const summary = externalData.summary || {};
    
    let preCalculatedExpectedGuests = summary.totalRoomCap || 0;
    
    // SSOT: Use backend grand total directly
    const backendTotalRevenue = summary.totalRevenue || 0;
    const backendTotalNights = summary.totalRooms || 0;

    return NextResponse.json({ 
      success: true, 
      data: {
        channels: channelBreakdown,
        segments: segmentBreakdown
      },
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
