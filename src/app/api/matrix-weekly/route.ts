import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    const cookieHeader = request.headers.get('cookie') || '';

    let url = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly`;
    if (dateStr) {
      url += `?date=${dateStr}`;
    }

    const res = await fetch(url, {
      headers: {
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${m2mToken}`
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching matrix-weekly:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
