import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
    if (BACKEND_URL.includes('api.belleforet.com')) {
      BACKEND_URL = 'https://belleforet-data.vercel.app';
    }
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    
    const leisureSubgroups = new Set<string>();

    // 1. V6 통합매핑 (SSOT): V6 레저본부 그룹 및 배정된 파트명 추출
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

    // 2. Merge Firestore customTeams & leisureSelection
    if (db) {
      try {
        const [customDoc, selDoc] = await Promise.all([
          db.collection('settings').doc('customTeams').get(),
          db.collection('settings').doc('leisureSelection').get()
        ]);
        if (customDoc.exists) {
          (customDoc.data()?.teams || []).forEach((t: string) => {
            if (t && t !== '미분류' && t !== '기타' && t !== '제외') leisureSubgroups.add(t);
          });
        }
        if (selDoc.exists) {
          (selDoc.data()?.selectedTeams || []).forEach((t: string) => {
            if (t && t !== '미분류' && t !== '기타' && t !== '제외') leisureSubgroups.add(t);
          });
        }
      } catch (e) {
        console.error('customTeams/leisureSelection fetch error in leisure-teams:', e);
      }
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
