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

    // 1. Fetch V6 LEISURE facility groups and extract ACTIVE assigned parts
    try {
      const v6Res = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=LEISURE`, {
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
        venues.forEach((v: any) => {
          const part = String(v.partName || '').trim();
          if (part && part !== '미분류') {
            leisureSubgroups.add(part);
          }
        });
      }
    } catch (e) {
      console.error('v6 facility-groups fetch error:', e);
    }

    // 2. Fetch V6 team mapping as fallback/supplement
    const mappingUrl = `${BACKEND_URL}/api/v6/admin/mapping/team`;
    let rows: any[] = [];
    try {
      const v5MappingRes = await fetch(mappingUrl, {
        headers: { 
          'Authorization': `Bearer ${m2mToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bell-Operation/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      if (v5MappingRes.ok) {
        const parsed = await v5MappingRes.json();
        rows = parsed.data || [];
      } else {
        console.error('v5Mapping fetch failed with status:', v5MappingRes.status);
      }
    } catch (err) {
      console.error('v5Mapping fetch error:', err);
    }

    rows.forEach((row: any) => {
      const teamName = String(row.teamName || row.team_name || '').trim();
      const partName = String(row.partName || row.part_name || '').trim();
      
      // BIBLE RULE: 오직 teamName이 '레저본부'이거나 '미분류'인 데이터만 통과
      if (teamName !== '레저본부' && teamName !== '미분류') return;

      if (partName && partName !== '미분류') {
        leisureSubgroups.add(partName);
      } else if (teamName && teamName !== '미분류') {
        leisureSubgroups.add(teamName);
      }
    });
    
    // 3. FETCH CUSTOM TEAMS FROM FIREBASE
    try {
      const docRef = db.collection('settings').doc('customTeams');
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data() || {};
        const customTeams = data.teams || [];
        customTeams.forEach((t: string) => leisureSubgroups.add(t));
      }
    } catch (firebaseErr) {
      console.error('Error fetching custom teams from Firebase:', firebaseErr);
    }

    return NextResponse.json({
      success: true,
      teams: Array.from(leisureSubgroups).sort()
    });
    
  } catch (error: any) {
    console.error('Error fetching leisure teams:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
