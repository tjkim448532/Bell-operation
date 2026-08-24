import { NextResponse } from 'next/server';
import { cleanNum } from '@/lib/utils';
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
    endDate = `${endMonth}-${String(lastDay).padStart(2, '0')}`;

    let results: any[] = [];
    try {
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

    const teamMappingDict: Record<string, string> = {};
    if (db) {
      try {
        const snap = await db.collection('team_mappings').get();
        snap.forEach((d: any) => {
          const mData = d.data();
          if (mData.columnName && mData.teamName) {
            teamMappingDict[mData.columnName] = mData.teamName;
          }
        });
      } catch(e) {
        console.error('Error fetching team_mappings in leisure-range:', e);
      }
    }

    const data = results || [];
    const records: any[] = [];
    
    data.forEach((row: any, idx: number) => {
      // V5 matrix-weekly에서 기간(startDate~endDate) 조회 시 실제 해당 기간 총매출은 todayActual 또는 rangeActual에 담겨 내려옵니다.
      const val = cleanNum(row.todayActual !== undefined ? row.todayActual : (row.rangeActual !== undefined ? row.rangeActual : row.mtdActual));
      
      // 전체 리조트 Grand Total(26억)은 레저본부 앱의 Grand Total로 오염되지 않도록 제외
      if (row.isGrandTotal) {
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

      // 레저본부 카테고리 전체 소계(2.71억)를 레저본부 Grand Total로 등록
      if (catCode === 'TICKET' && row.isSubtotal && row.subtotalType === 'category') {
        records.push({
          id: `v5-${startMonth}-leisure-grand-total`,
          team: '레저본부',
          branchName: '레저본부 총계',
          mappedTerm: '레저본부 총계',
          description: '레저본부 총계',
          amount: val || 0,
          date: startMonth + '-01T00:00:00.000Z',
          source: 'v5-api',
          isGrandTotal: true,
          isSubtotal: true,
          subtotalType: 'category',
          categoryCode: row.categoryCode || '',
          categoryName: '레저본부'
        });
        return;
      }

      const isIndependentCategory = ['MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'UNEARNED'].includes(catCode);
      if (teamName !== '레저본부' && teamName !== '미분류' && !isIndependentCategory) {
        return; // 타 본부 데이터(FNB, 객실, 골프 등) 무조건 필터링 버림
      }

      const partName = String(row.partName || '').trim();
      const shopName = String(row.shopName || '').trim();
      const categoryCode = String(row.categoryCode || '').trim();
      
      // Map teamName using strictly the backend's provided hierarchy with SSOT team_mappings
      let groupName = teamName;
      if (partName && partName !== '미분류' && partName !== '소계') {
        groupName = teamMappingDict[partName] || partName;
      } else if (teamName && teamName !== '미분류') {
        groupName = teamMappingDict[teamName] || teamName;
      }

      teamName = groupName;
      
      if (teamName) {
        const amount = val || 0;
        
        if (row.isSubtotal) {
          records.push({
            id: `v5-${startMonth}-${teamName}-subtotal-${idx}`,
            team: teamName, // The Kanban column (e.g. 벨포레 목장, 액티비티)
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
