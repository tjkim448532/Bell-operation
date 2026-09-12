import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    let startDate = searchParams.get('startDate') || dateParam;
    let endDate = searchParams.get('endDate') || dateParam || startDate;

    if (!startDate || !endDate) {
      // Default to current month if not specified
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      startDate = `${y}-${m}-01`;
      endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    }

    let BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
    if (BACKEND_URL.includes('api.belleforet.com') || !BACKEND_URL.startsWith('http')) {
      BACKEND_URL = 'https://belleforet-data.vercel.app';
    }
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
