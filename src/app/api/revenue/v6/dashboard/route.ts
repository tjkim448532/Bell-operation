import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ status: 400, message: 'startDate and endDate are required', data: null }, { status: 400 });
    }

    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
    const envToken = process.env.M2M_API_TOKEN;
    const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;

    const url = `${BACKEND_URL}/api/revenue/v6/dashboard?startDate=${startDate}&endDate=${endDate}`;
    
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${m2mToken}`
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error(`Failed to fetch API v6 dashboard: HTTP ${res.status}`);
      const text = await res.text();
      return NextResponse.json({ status: res.status, message: `Backend Error: ${res.status}`, data: null, details: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('BFF Error:', err);
    return NextResponse.json({ status: 500, message: err.message, data: null }, { status: 500 });
  }
}
