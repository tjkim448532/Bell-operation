import { NextResponse } from 'next/server';

const BACKEND_URL = 'https://belleforet-data.vercel.app';
const API_SECRET = 'belleforet-m2m-secret';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
      headers: { 'Authorization': `Bearer ${API_SECRET}` },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${API_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
