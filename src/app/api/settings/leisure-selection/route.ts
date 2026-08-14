import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const docRef = db.collection('settings').doc('leisureSelection');
    const doc = await docRef.get();
    
    let selectedTeams = doc.exists ? doc.data()?.selectedTeams || [] : [];
    
    // Auto-cleanup legacy garbage
    const originalLength = selectedTeams.length;
    selectedTeams = selectedTeams.filter((t: string) => !t.includes('외주'));
    if (selectedTeams.length !== originalLength) {
      await docRef.set({ selectedTeams }, { merge: true });
    }
    if (selectedTeams.length === 0) {
      // Fallback to default leisure teams from V5 Admin + customTeams
      const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
      const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
      const leisureSubgroups = new Set<string>();
      
        let rows: any[] = [];
        try {
          const res = await fetch(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
            headers: { 'Authorization': `Bearer ${m2mToken}` },
            cache: 'no-store'
          });
          if (res.ok) {
            const json = await res.json();
            rows = json.data || [];
          }
        } catch(e) {
          console.error('leisure-selection mapping fetch error:', e);
        }
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
