import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    const cookieHeader = request.headers.get('cookie') || '';
    
    const m2mHeaders = { 
      'Cookie': cookieHeader,
      'Authorization': `Bearer ${m2mToken}`
    };

    const url = `${BACKEND_URL}/api/v6/report/room-channel-sales${date ? `?date=${date}` : ''}`;
    
    const res = await fetch(url, { headers: m2mHeaders, next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`Failed to fetch API v6 room-channel-sales: HTTP ${res.status}`);
      return NextResponse.json({ success: false, error: 'Backend Error' }, { status: 500 });
    }

    const data = await res.json();

    // Zero-Proxy 원칙: 프론트엔드는 가공 없이 백엔드의 JSON을 그대로 리턴합니다.
    return NextResponse.json({ 
      success: true, 
      data: data
    });

  } catch (error: any) {
    console.error('Room Channel Sales Data Fetch Error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
