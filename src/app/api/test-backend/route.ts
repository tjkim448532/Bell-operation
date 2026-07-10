import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    
    const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=2026-06-30`;
    const res = await fetch(revUrl, {
      headers: { 
        'Authorization': `Bearer ${m2mToken}`
      },
      cache: 'no-store'
    });
    
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      // ignore
    }

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      url: revUrl,
      text: text.substring(0, 5000), // First 5000 chars
      json: json
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
