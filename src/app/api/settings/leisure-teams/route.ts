import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    
    const leisureSubgroups = new Set<string>();
    
    // Look back up to 7 days to ensure we capture all active facilities,
    // even if today has no sales yet or some facilities are closed on certain days.
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      
      try {
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=${dateStr}`;
        const res = await fetch(revUrl, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });
        
        if (res.ok) {
          const json = await res.json();
          const rows = json.data || [];
          
          rows.forEach((row: any) => {
            if (row.team_name === '레저본부' && row.is_subtotal === undefined && row.is_grand_total === undefined) {
              const partName = String(row.part_name || '').trim();
              if (partName) {
                leisureSubgroups.add(partName);
              }
            }
          });
        }
      } catch (err) {
        console.error(`Error fetching for ${dateStr}:`, err);
      }
    }
    
    let teams = Array.from(leisureSubgroups).sort();
    
    // Fallback: If backend matrix-weekly API is not deployed yet or returns 404,
    // ensure the kanban board still loads the essential columns.
    if (teams.length === 0) {
      teams = ['미디어아트센터', '목장', '액티비티', '놀이동산'];
    }

    return NextResponse.json({
      success: true,
      teams: teams
    });
    
  } catch (error: any) {
    console.error('Error fetching leisure teams:', error);
    // If it fails completely, return fallback teams instead of error
    return NextResponse.json({ success: true, teams: ['미디어아트센터', '목장', '액티비티', '놀이동산'], warning: error.message });
  }
}
