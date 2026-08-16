import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
    if (BACKEND_URL.includes('api.belleforet.com')) {
      BACKEND_URL = 'https://belleforet-data.vercel.app';
    }
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    
    const leisureSubgroups = new Set<string>();

    // V6 통합매핑 (SSOT): V6 레저본부 그룹 및 배정된 파트명 추출
    try {
      const v6Res = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
        headers: { 
          'Authorization': `Bearer ${m2mToken}`,
          'User-Agent': 'Mozilla/5.0 Bell-Operation/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      if (v6Res.ok) {
        const v6Json = await v6Res.json();
        const venues = v6Json.data?.venues || [];
        const isLeisure = (v: any) => {
          const t = String(v.teamName || '').trim();
          const c = String(v.categoryCode || '').trim();
          return t === '레저본부' || c === 'TICKET';
        };
        venues.filter(isLeisure).forEach((v: any) => {
          const part = String(v.partName || '').trim();
          if (part && part !== '미분류') {
            leisureSubgroups.add(part);
          }
        });
      }
    } catch (e) {
      console.error('v6 facility-groups fetch error in leisure-teams:', e);
    }

    // Fallback: 만약 V6가 비어있을 때만 기본 목록 보장
    if (leisureSubgroups.size === 0) {
      ['액티비티', '목장', '미디어아트', '놀이동산', '모토아레나'].forEach(t => leisureSubgroups.add(t));
    }

    return NextResponse.json({
      success: true,
      teams: Array.from(leisureSubgroups)
    });
    
  } catch (error: any) {
    console.error('Error fetching leisure teams:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
