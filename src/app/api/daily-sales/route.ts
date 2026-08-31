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
      // Zero-Hallucination: Do not mock data on failure. Provide empty state to UI.
      const errorText = await res.text();
      return NextResponse.json({ success: false, error: `Backend returned ${res.status}: ${errorText}`, data: { summary: {}, categories: [] } });
    }

    const data = await res.json();

    // Zero-Proxy 원칙: 프론트엔드는 가공 없이 백엔드의 JSON을 그대로 리턴합니다.
    return NextResponse.json({ 
      success: true, 
      data: data
    });

  } catch (error: any) {
    console.error('Daily Sales Data Fetch Error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 오류가 발생했습니다.', data: { summary: {}, categories: [] } }, { status: 500 });
  }
}
