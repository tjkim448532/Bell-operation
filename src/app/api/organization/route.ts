import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    const cookieHeader = request.headers.get('cookie') || '';
    
    const m2mHeaders = { 
      'Cookie': cookieHeader,
      'Authorization': `Bearer ${m2mToken}`
    };

    let url = `${BACKEND_URL}/api/v6/report/organization`;
    
    const res = await fetch(url, { headers: m2mHeaders, cache: 'no-store' });
    if (!res.ok) {
      console.error(`Failed to fetch API v6 organization: HTTP ${res.status}`);
      const errorText = await res.text();
      return NextResponse.json({ success: false, error: `Backend returned ${res.status}: ${errorText}`, data: null });
    }

    const data = await res.json();

    return NextResponse.json({ 
      success: true, 
      data: data
    });

  } catch (error: any) {
    console.error('Organization Data Fetch Error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 오류가 발생했습니다.', data: null }, { status: 500 });
  }
}
