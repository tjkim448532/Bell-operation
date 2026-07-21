import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');
    const startMonthParam = searchParams.get('startMonth');
    const endMonthParam = searchParams.get('endMonth');

    const startMonth = startMonthParam || monthStr || '';
    const endMonth = endMonthParam || startMonth;

    if (!startMonth || startMonth.length !== 7) {
      return NextResponse.json({ error: 'Missing or invalid startMonth (YYYY-MM)' }, { status: 400 });
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    let startDate = '';
    let endDate = '';
    let [ey, em] = endMonth.split('-').map(Number);
    const lastDay = new Date(ey, em, 0).getDate();
    startDate = `${startMonth}-01`;
    endDate = `${endMonth}-${lastDay}`;

    let results: any[] = [];
    try {
      const revUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(revUrl, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        results = json.data || [];
      }
    } catch(err) {
      console.error('Error fetching matrix-weekly range:', err);
    }

    const matrixMap = new Map<string, any>();
    
    results.forEach((row: any) => {
      const key = `${row.isSubtotal}-${row.isGrandTotal}-${row.subtotalType}-${row.categoryCode}-${row.teamName}-${row.partName}-${row.shopName}-${row.facilityName}`;
      if (!matrixMap.has(key)) {
        matrixMap.set(key, { ...row, mtdActual: 0 });
      }
      const existing = matrixMap.get(key);
      existing.mtdActual += (row.mtdActual || 0);
    });

    const data = Array.from(matrixMap.values());

    const records: any[] = [];
    
    data.forEach((row: any, idx: number) => {
      if (row.isGrandTotal) {
        records.push({
          id: `v5-${startMonth}-grandtotal-${idx}`,
          team: '총계',
          branchName: '총계',
          amount: row.mtdActual || 0,
          date: startMonth + '-01T00:00:00.000Z',
          source: 'v5-api',
          isSubtotal: true,
          isGrandTotal: true
        });
        return;
      }
      
      let teamName = String(row.teamName || '').trim();
      const partName = String(row.partName || '').trim();
      const shopName = String(row.shopName || '').trim();
      
      // Map teamName using strictly the backend's provided hierarchy (Kanban column logic)
      let groupName = teamName;
      if (partName && partName !== '미분류') {
        groupName = partName;
      } else if (teamName && teamName !== '미분류') {
        groupName = teamName;
      }
      teamName = groupName;
      
      if (teamName && shopName) {
        // Use mtdActual since we fetch the last day of the month
        const amount = row.mtdActual || 0;
        
        if (amount !== 0 || row.isSubtotal) {
          records.push({
            id: `v5-${startMonth}-${shopName}-${idx}`,
            team: teamName, // The Kanban column (e.g. 액티비티)
            branchName: shopName, // e.g. 사계절썰매장
            mappedTerm: shopName, // Show actual shop name instead of '매출 합계'
            description: shopName, // For UI table display
            amount: amount,
            date: startMonth + '-01T00:00:00.000Z',
            source: 'v5-api',
            isSubtotal: !!row.isSubtotal,
            subtotalType: row.subtotalType  || '',
            categoryCode: row.categoryCode || '',
            categoryName: row.categoryName || ''
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
