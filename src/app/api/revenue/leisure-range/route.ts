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
      const startMonthStr = startDate.slice(0, 7);
      const endMonthStr = endDate.slice(0, 7);

      const url = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`;
      const matrixRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${m2mToken}` },
        cache: 'no-store'
      });
      if (matrixRes.ok) {
        const json = await matrixRes.json();
        results = json.data || [];
      }
    } catch(err) {
      console.error('Error fetching matrix-weekly range:', err);
    }

    const data = results || [];

    const records: any[] = [];
    
    data.forEach((row: any, idx: number) => {
      const val = row.rangeActual !== undefined ? row.rangeActual : (row.mtdActual !== undefined ? row.mtdActual : row.todayActual);
      if (row.isGrandTotal) {
        records.push({
          id: `v5-${startMonth}-grandtotal-${idx}`,
          team: '총계',
          branchName: '총계',
          amount: val || 0,
          date: startMonth + '-01T00:00:00.000Z',
          source: 'v5-api',
          isSubtotal: true,
          isGrandTotal: true
        });
        return;
      }
      
      let teamName = String(row.teamName || '').trim();
      const catCode = String(row.categoryCode || '').toUpperCase();
      
      // V4.2 Bible: TICKET is displayed as '레저본부'
      if (catCode === 'TICKET') {
         teamName = '레저본부';
         row.teamName = '레저본부';
         row.categoryName = '레저본부';
         if (row.shopName === '소계') row.shopName = '레저본부 소계';
      }

      const isIndependentCategory = ['MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'UNEARNED'].includes(catCode);
      if (teamName !== '레저본부' && teamName !== '미분류' && !isIndependentCategory) {
        return; // 타 본부 데이터(FNB, 객실, 골프 등) 무조건 필터링 버림
      }

      const partName = String(row.partName || '').trim();
      const shopName = String(row.shopName || '').trim();
      const categoryCode = String(row.categoryCode || '').trim();
      
      // Map teamName using strictly the backend's provided hierarchy (Kanban column logic)
      let groupName = teamName;
      if (partName && partName !== '미분류') {
        groupName = partName;
      } else if (teamName && teamName !== '미분류') {
        groupName = teamName;
      }
      teamName = groupName;
      
      if (teamName) {
        const amount = val || 0;
        
        if (row.isSubtotal) {
          records.push({
            id: `v5-${startMonth}-${teamName}-subtotal-${idx}`,
            team: teamName, // The Kanban column (e.g. 미사용 티켓)
            branchName: partName || teamName,
            mappedTerm: partName || teamName,
            description: partName || teamName,
            amount: amount,
            date: startMonth + '-01T00:00:00.000Z',
            source: 'v5-api',
            isSubtotal: true,
            subtotalType: row.subtotalType || 'part',
            categoryCode: row.categoryCode || '',
            categoryName: row.categoryName || ''
          });
        } else if (shopName && amount !== 0) {
          records.push({
            id: `v5-${startMonth}-${shopName}-${idx}`,
            team: teamName, // The Kanban column (e.g. 액티비티)
            branchName: shopName, // e.g. 사계절썰매장
            mappedTerm: shopName, // Show actual shop name instead of '매출 합계'
            description: shopName, // For UI table display
            amount: amount,
            date: startMonth + '-01T00:00:00.000Z',
            source: 'v5-api',
            isSubtotal: false,
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
