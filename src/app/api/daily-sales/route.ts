import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    const cookieHeader = request.headers.get('cookie') || '';
    
    const m2mHeaders = { 
      'Cookie': cookieHeader,
      'Authorization': `Bearer ${m2mToken}`
    };

    let url = `${BACKEND_URL}/api/v6/report/daily-sales`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    } else if (date) {
      url += `?date=${date}`;
    }
    
    const res = await fetch(url, { headers: m2mHeaders, cache: 'no-store' });
    if (!res.ok) {
      console.error(`Failed to fetch API v6 daily-sales: HTTP ${res.status}`);
      const errorText = await res.text();
      // Fail loudly
      return NextResponse.json(
        { success: false, message: `Backend Error: ${res.status}`, details: errorText },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({ 
      success: true, 
      data: data.data || data
    });

  } catch (error: any) {
    console.error('Daily Sales Data Fetch Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
