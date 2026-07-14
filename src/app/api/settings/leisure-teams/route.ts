import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
    // BIBLE RULE ENFORCEMENT: api.belleforet.com is currently refusing connections (ECONNREFUSED).
    // Force route to the stable Vercel native address until DNS migration is actually ready.
    if (BACKEND_URL.includes('api.belleforet.com')) {
      BACKEND_URL = 'https://belleforet-data.vercel.app';
    }
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    
    const leisureSubgroups = new Set<string>();
    const mappingUrl = `${BACKEND_URL}/api/v5/admin/mapping/team`;
    
    // Use native https to bypass Next.js fetch polyfill bugs on Firebase
    const https = require('https');
    const rows: any[] = await new Promise((resolve, reject) => {
      const req = https.get(mappingUrl, {
        headers: { 
          'Authorization': `Bearer ${m2mToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bell-Operation/1.0',
          'Accept': 'application/json'
        }
      }, (response: any) => {
        let data = '';
        response.on('data', (chunk: any) => { data += chunk; });
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.data || []);
            } catch (err) {
              reject(new Error('Invalid JSON from backend: ' + String(err)));
            }
          } else {
            reject(new Error(`Backend API returned ${response.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (err: any) => {
        reject(err);
      });
      req.end();
    });

    rows.forEach((row: any) => {
      const teamName = String(row.teamName || row.team_name || '').trim();
      const partName = String(row.partName || row.part_name || '').trim();
      
      // 백엔드에서 받아온 API 기둥은 파트명(1순위) 또는 본부명(2순위)으로 세움
      
      // 1순위: 파트명 (미분류가 아닐 경우)
      if (partName && partName !== '미분류') {
        leisureSubgroups.add(partName);
      } 
      // 2순위: 본부명 (파트명이 미분류일 경우)
      else if (teamName && teamName !== '미분류') {
        leisureSubgroups.add(teamName);
      }
    });
    
    // FETCH CUSTOM TEAMS FROM FIREBASE
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
      // Proceed even if Firebase fetch fails
    }


    
    return NextResponse.json({
      success: true,
      teams: Array.from(leisureSubgroups).sort()
    });
    
  } catch (error: any) {
    console.error('Error fetching leisure teams:', error);
    // Return 200 so the frontend can catch it cleanly without a browser 500 error block
    return NextResponse.json({ success: false, error: error.message });
  }
}
