import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const reqTeam = searchParams.get('team') || 'all';

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const dateStrings: string[] = [];
    
    // Generate all dates in range
    let current = new Date(start);
    while (current <= end) {
      dateStrings.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    // Fetch all dates in parallel
    const fetchPromises = dateStrings.map(async (dateStr) => {
      try {
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=${dateStr}`;
        const res = await fetch(revUrl, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          return { date: dateStr, data: json.data || [], isFallback: false };
        } else {
          // Fallback to revenue-summary if matrix-weekly is not deployed yet
          const fallbackUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${dateStr}`;
          const fallbackRes = await fetch(fallbackUrl, {
            headers: { 'Authorization': `Bearer ${m2mToken}` },
            cache: 'no-store'
          });
          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            return { date: dateStr, data: fallbackJson.salesByFacility || [], isFallback: true };
          }
        }
      } catch (err) {
        console.error(`Error fetching for ${dateStr}:`, err);
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    
    // Fetch team mappings from Firebase for fallback
    const teamMappings: Record<string, string> = {};
    try {
      const mappingsSnapshot = await db.collection('team_mappings').get();
      mappingsSnapshot.forEach((doc: any) => {
        const d = doc.data();
        teamMappings[d.columnName] = d.teamName;
      });
    } catch (e) {
      console.error('Failed to load team_mappings for fallback', e);
    }

    const records: any[] = [];
    
    results.forEach(result => {
      if (!result || !result.data) return;
      const { date, data, isFallback } = result;
      
      data.forEach((row: any, idx: number) => {
        if (row.is_subtotal || row.is_grand_total) return;
        
        let teamName = '';
        let partName = '';
        let shopName = '';
        let amount = 0;

        if (isFallback) {
          // Parse revenue-summary format
          shopName = String(row.sub_group_name || '').trim();
          teamName = String(row.team_name || row.category_code || '').trim();
          partName = teamMappings[shopName] || teamName; // Fallback mapping
          amount = row.total_sales || 0;
          
          if (partName === '레저본부' || teamName === '레저본부') {
            teamName = teamMappings[shopName] || '액티비티'; // Default if not found
          } else {
            teamName = partName;
          }
        } else {
          // Parse matrix-weekly format
          teamName = String(row.team_name || '').trim();
          partName = String(row.part_name || '').trim();
          shopName = String(row.shop_name || '').trim();
          amount = row.today_actual !== undefined ? row.today_actual : (row.total_sales || 0);

          if (teamName === '레저본부') {
            teamName = partName; // e.g. 액티비티, 목장, 미디어아트센터
          } else if (teamName.includes('객실')) {
            teamName = '객실';
          } else if (teamName.includes('식음') || teamName.includes('F&B')) {
            teamName = 'F&B';
          } else if (teamName.includes('골프')) {
            teamName = '골프';
          }
        }
        
        // Final mapping
        if (teamName.includes('객실')) teamName = '객실';
        if (teamName.includes('식음') || teamName.includes('F&B')) teamName = 'F&B';
        if (teamName.includes('골프')) teamName = '골프';

        if (!teamName || teamName === '제외') return;

        if (reqTeam === 'all' || teamName === reqTeam) {
          records.push({
            id: `rev-${date}-${shopName}-${idx}`,
            date: date + 'T00:00:00.000Z',
            team: teamName,
            branch_name: shopName,
            amount: amount === 0 ? 1 : amount, // Fake 1 won to appear in UI
            description: '매출 합계',
            mapped_term: '매출 합계', // Required for logic
            source: isFallback ? 'v5-mariadb-fallback' : 'v5-matrix-weekly'
          });
        }
      });
    });

    return NextResponse.json(records);
    
  } catch (error: any) {
    console.error('Error in leisure-range API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
