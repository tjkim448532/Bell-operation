import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
    const envToken = process.env.M2M_API_TOKEN;
    const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;

    const url = `${BACKEND_URL}/api/v6/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${m2mToken}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[BFF] revenue-summary backend error: HTTP ${res.status}`);
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `Backend Error: ${res.status}`, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[BFF] revenue-summary exception:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}