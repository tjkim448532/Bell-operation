import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

const BACKEND_URL = 'https://belleforet-data.vercel.app';
const API_SECRET = 'belleforet-m2m-secret';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'LEISURE';

    // Fetch All Facilities Master List across resort (Normalized 47 Physical Venues)
    const modeAllRes = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
      headers: { 'Authorization': `Bearer ${API_SECRET}` },
      cache: 'no-store'
    });
    const modeAllJson = await modeAllRes.json();
    const allVenuesRaw: any[] = modeAllJson.data?.venues || [];

    const isLeisure = (v: any) => {
      const t = String(v.teamName || '').trim();
      const c = String(v.categoryCode || '').trim();
      return t === '레저본부' || c === 'TICKET';
    };

    const rawVenues = allVenuesRaw.filter(isLeisure);
    rawVenues.sort((a: any, b: any) => (b.aliasCount || 0) - (a.aliasCount || 0));

    const seenVenues = new Map<string, any>();
    rawVenues.forEach((v: any) => {
      const vName = String(v.venueName || v.facilityName || '').trim();
      if (vName && !seenVenues.has(vName)) {
        seenVenues.set(vName, {
          id: v.id,
          venueName: vName,
          teamName: v.teamName || '레저본부',
          partName: v.partName || '미분류',
          categoryCode: v.categoryCode || 'TICKET',
          isUnclassified: v.isUnclassified || v.partName === '미분류' || !v.partName
        });
      }
    });

    const leisureVenues = Array.from(seenVenues.values());

    const partsSet = new Set<string>();
    leisureVenues.forEach(v => {
      if (v.partName && v.partName !== '미분류') partsSet.add(v.partName);
    });

    // Merge custom teams from Firestore so empty new groups persist
    if (db) {
      try {
        const customDoc = await db.collection('settings').doc('customTeams').get();
        if (customDoc.exists) {
          (customDoc.data()?.teams || []).forEach((t: string) => {
            if (t && t !== '미분류') partsSet.add(t);
          });
        }
      } catch (e) {
        console.error('customTeams fetch error in v6-mapping:', e);
      }
    }

    const allVenues = allVenuesRaw.map((m: any) => ({
      venueName: m.venueName || m.facilityName || '',
      categoryCode: m.categoryCode || 'ETC',
      teamName: m.teamName || '미분류',
      partName: m.partName || '미분류',
      isUnclassified: m.partName === '미분류' || m.teamName === '미분류' || !m.partName
    }));

    return NextResponse.json({
      success: true,
      data: {
        category: 'LEISURE',
        categoryName: '레저본부 표준 영업장 배정',
        parts: Array.from(partsSet),
        venues: leisureVenues
      },
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

    // [AWS Lambda / EventBridge ETL 비동기 트리거 - 설정된 경우에만 실행]
    if (process.env.AWS_ETL_WEBHOOK_URL && !process.env.AWS_ETL_WEBHOOK_URL.includes('placeholder')) {
      fetch(process.env.AWS_ETL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AWS_ETL_SECRET || API_SECRET}`
        },
        body: JSON.stringify({ action: 'rebuild_v6_mapping', timestamp: new Date().toISOString() })
      }).catch(err => console.error('Lambda Trigger Failed:', err));
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
