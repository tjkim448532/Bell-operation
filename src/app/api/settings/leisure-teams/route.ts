import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
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
      if (row.team_name === '레저본부') {
        const partName = String(row.part_name || '').trim();
        if (partName && partName !== '미분류') {
          leisureSubgroups.add(partName);
        }
      }
    });
    
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
