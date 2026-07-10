import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    
    const leisureSubgroups = new Set<string>();
    
    const mappingUrl = `${BACKEND_URL}/api/v5/admin/mapping/team`;
    const res = await fetch(mappingUrl, {
      headers: { 'Authorization': `Bearer ${m2mToken}` },
      cache: 'no-store'
    });
    
    if (res.ok) {
      const json = await res.json();
      const rows = json.data || [];
      
      rows.forEach((row: any) => {
        if (row.team_name === '레저본부') {
          const partName = String(row.part_name || '').trim();
          if (partName && partName !== '미분류') {
            leisureSubgroups.add(partName);
          }
        } else {
          const teamName = String(row.team_name || '').trim();
          if (teamName && teamName !== '기타' && teamName !== '미분류') {
            leisureSubgroups.add(teamName);
          }
        }
      });
    } else {
      console.error(`Error fetching admin mapping team API: ${res.status}`);
    }
    
    return NextResponse.json({
      success: true,
      teams: Array.from(leisureSubgroups).sort()
    });
    
  } catch (error: any) {
    console.error('Error fetching leisure teams:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
