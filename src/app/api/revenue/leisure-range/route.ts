import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    // The Bible explicitly dictates that for revenues, the V5 Backend API is the absolute SSOT for mapping.
    // We MUST NOT override it with Firebase team_mappings.

    // Handle YYYY-MM input format properly
    let startStr = startDateStr;
    let endStr = endDateStr;
    
    if (startDateStr.length === 7) startStr += '-01'; // First day of start month
    
    const start = new Date(startStr);
    let end = new Date(endStr);
    
    if (endDateStr.length === 7) {
      // Last day of end month
      const [y, m] = endDateStr.split('-');
      // To get the last day of the month in local time, we use the next month's day 0
      end = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59);
    }

    const dateStrings: string[] = [];
    
    // Generate all dates in range
    let current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dateStrings.push(`${y}-${m}-${d}`);
      // Increment by 1 day
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
          return { date: dateStr, data: json.data || [] };
        }
      } catch (err) {
        console.error(`Error fetching for ${dateStr}:`, err);
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);

    const records: any[] = [];
    
    results.forEach(result => {
      if (!result || !result.data) return;
      const { date, data } = result;
      
      data.forEach((row: any, idx: number) => {
        if (row.is_subtotal || row.is_grand_total) return;
        
        let teamName = String(row.team_name || '').trim();
        const partName = String(row.part_name || '').trim();
        const shopName = String(row.shop_name || '').trim();
        
        // Map teamName using strictly the backend's provided hierarchy
        if (teamName === '레저본부') {
          teamName = partName; // e.g. 액티비티, 목장, 미디어아트센터
        }
        
        if (teamName && shopName) {
          const amount = row.today_actual || row.total_sales || 0;
          
          if (amount > 0) {
            records.push({
              id: `v5-${date}-${shopName}-${idx}`,
              team: teamName, // The Kanban column (e.g. 액티비티)
              branch_name: shopName, // The middle node (e.g. 사계절썰매장)
              mapped_term: '매출 합계', // Required for logic
              description: '매출 합계', // For UI table display
              amount: amount,
              date: date + 'T00:00:00.000Z',
              source: 'v5-api'
            });
          }
        }
      });
    });

    return NextResponse.json(records);
    
  } catch (error: any) {
    console.error('Error in leisure-range API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
