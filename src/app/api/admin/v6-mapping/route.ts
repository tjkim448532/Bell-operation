import { NextResponse } from 'next/server';

const BACKEND_URL = 'https://belleforet-data.vercel.app';
const API_SECRET = 'belleforet-m2m-secret';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'LEISURE';

    // 1. Fetch Leisure Standard Venues
    const leisureRes = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=${mode}`, {
      headers: { 'Authorization': `Bearer ${API_SECRET}` },
      cache: 'no-store'
    });
    const leisureData = await leisureRes.json();

    // 2. Fetch All Facilities Master List across resort
    let allVenues: any[] = [];
    try {
      const allRes = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/team`, {
        headers: { 'Authorization': `Bearer ${API_SECRET}` },
        cache: 'no-store'
      });
      const allJson = await allRes.json();
      if (allJson && allJson.data) {
        allVenues = allJson.data.map((m: any) => ({
          venueName: m.facilityName || m.facility_name || '',
          categoryCode: m.categoryCode || m.category_code || 'ETC',
          teamName: m.teamName || m.team_name || '미분류',
          partName: m.partName || m.part_name || '미분류'
        }));
      }
    } catch (e) {
      console.error('Failed to fetch all venues master list', e);
    }

    return NextResponse.json({
      success: true,
      data: leisureData.data || leisureData,
      allVenues
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${API_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // [AWS Lambda / EventBridge ETL 비동기 트리거]
    const lambdaUrl = process.env.AWS_ETL_WEBHOOK_URL || 'https://placeholder-lambda-url.amazonaws.com/trigger';
    fetch(lambdaUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AWS_ETL_SECRET || API_SECRET}`
      },
      body: JSON.stringify({ action: 'rebuild_v6_mapping', timestamp: new Date().toISOString() })
    }).catch(err => console.error('Lambda Trigger Failed:', err));

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
