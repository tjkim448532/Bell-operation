import { NextResponse } from 'next/server';

const BACKEND_URL = 'https://belleforet-data.vercel.app';
const API_SECRET = 'belleforet-m2m-secret';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/team`, {
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
    // 맵핑 정보가 저장된 즉시 TicketAllocationEngine 및 V6 ETL 파이프라인을 가동하여 0-Variance 재적재 수행.
    // 사용자의 응답 지연을 막기 위해 await 없이 fire-and-forget 방식으로 호출.
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
