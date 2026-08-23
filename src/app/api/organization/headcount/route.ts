import { NextResponse } from 'next/server';

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
const M2M_API_TOKEN = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/v6/report/leisure-organization`, {
      headers: {
        'Authorization': `Bearer ${M2M_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch from backend' }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error: any) {
    console.error('Error in headcount route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
