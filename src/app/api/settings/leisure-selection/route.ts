import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const docRef = db.collection('settings').doc('leisureSelection');
    const doc = await docRef.get();
    
    let selectedTeams = doc.exists ? doc.data()?.selectedTeams || [] : [];
    
    if (selectedTeams.length === 0) {
      // Fallback to default leisure teams from V5 Admin + customTeams
      const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
      const leisureSubgroups = new Set<string>();
      
      try {
        const https = require('https');
        const rows: any[] = await new Promise((resolve) => {
          const req = https.get(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
            headers: { 'Authorization': `Bearer ${m2mToken}` }
          }, (res: any) => {
            let data = '';
            res.on('data', (c: any) => data += c);
            res.on('end', () => {
              try { resolve(JSON.parse(data).data || []); } catch(e) { resolve([]); }
            });
          });
          req.on('error', () => resolve([]));
          req.end();
        });
        
        rows.forEach((row: any) => {
          const teamName = String(row.teamName || row.team_name || '').trim();
          const partName = String(row.partName || row.part_name || '').trim();
          if (teamName === '미분류' && partName === '미분류') return;
          if (partName && partName !== '미분류') leisureSubgroups.add(partName);
          else if (teamName && teamName !== '미분류') leisureSubgroups.add(teamName);
        });
        
        const customDoc = await db.collection('settings').doc('customTeams').get();
        if (customDoc.exists) {
          (customDoc.data()?.teams || []).forEach((t: string) => leisureSubgroups.add(t));
        }
        
        selectedTeams = Array.from(leisureSubgroups).sort();
      } catch (err) {
        console.error('Fallback fetch error:', err);
      }
    }
    
    return NextResponse.json({ success: true, selectedTeams });
  } catch (error) {
    console.error('Failed to get leisure selection:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { selectedTeams } = await request.json();
    
    if (!Array.isArray(selectedTeams)) {
      return NextResponse.json({ success: false, error: 'Invalid selectedTeams format' }, { status: 400 });
    }

    const docRef = db.collection('settings').doc('leisureSelection');
    await docRef.set({ selectedTeams }, { merge: true });

    return NextResponse.json({ success: true, selectedTeams });
  } catch (error) {
    console.error('Failed to save leisure selection:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
