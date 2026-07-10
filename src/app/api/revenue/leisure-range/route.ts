import { NextResponse } from 'next/server';

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
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${dateStr}`;
        const res = await fetch(revUrl, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          return { date: dateStr, data: json.data || json };
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
      const salesByFacility = data.salesByFacility || data.sales_by_facility || [];
      
      salesByFacility.forEach((item: any, idx: number) => {
        const category = String(item.category_code || item.category_name || '').trim();
        const subGroup = String(item.sub_group_name || item.facility_name || '').trim();
        
        let teamName = subGroup;
        // If it's not Leisure (티켓), group it by category (e.g. 객실, 식음, 골프)
        // Because Kanban board only manages Leisure subgroups in detail.
        if (category !== '티켓') {
          if (category.includes('객실')) teamName = '객실';
          else if (category.includes('식음') || category.includes('F&B')) teamName = 'F&B';
          else if (category.includes('골프')) teamName = '골프';
          else teamName = category;
        }

        if (teamName) {
          const amount = item.total_sales || item.today_actual || 0;
          
          if (amount > 0) {
            records.push({
              id: `v5-${date}-${subGroup}-${idx}`,
              team: teamName,
              branch_name: category + ' 매출', // Display category
              mapped_term: subGroup,
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
