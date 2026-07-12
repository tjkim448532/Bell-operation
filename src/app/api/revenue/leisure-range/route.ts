import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');

    if (!monthStr || monthStr.length !== 7) {
      return NextResponse.json({ error: 'Missing or invalid month (YYYY-MM)' }, { status: 400 });
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    const [year, month] = monthStr.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const fetchDate = `${monthStr}-${lastDay}`;

    const revUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=${fetchDate}`;
    const res = await fetch(revUrl, {
      headers: { 'Authorization': `Bearer ${m2mToken}` },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Matrix API' }, { status: res.status });
    }
    
    const json = await res.json();
    const data = json.data || [];

    const records: any[] = [];
    
    data.forEach((row: any, idx: number) => {
      // [동적 매핑 복구] 백엔드의 소계(Subtotal) 행을 버리지 않고 그대로 살려서 프론트엔드로 전달합니다.
      if (row.is_grand_total) return;
      
      let teamName = String(row.team_name || '').trim();
      const partName = String(row.part_name || '').trim();
      const shopName = String(row.shop_name || '').trim();
      
      // Map teamName using strictly the backend's provided hierarchy
      if (teamName === '레저본부' || teamName === '소계') {
        teamName = partName; // e.g. 액티비티, 목장, 미디어아트센터, 소계
      }
      
      if (teamName && shopName) {
        // Use mtd_actual since we fetch the last day of the month
        const amount = row.mtd_actual || 0;
        
        if (amount > 0 || row.is_subtotal) {
          records.push({
            id: `v5-${fetchDate}-${shopName}-${idx}`,
            team: teamName, // The Kanban column (e.g. 액티비티)
            branch_name: shopName, // e.g. 사계절썰매장
            mapped_term: shopName, // Show actual shop name instead of '매출 합계'
            description: shopName, // For UI table display
            amount: amount,
            date: fetchDate + 'T00:00:00.000Z',
            source: 'v5-api',
            is_subtotal: !!row.is_subtotal
          });
        }
      }
    });

    return NextResponse.json(records);
    
  } catch (error: any) {
    console.error('Error in leisure-range API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
