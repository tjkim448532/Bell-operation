import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { cleanNum } from '@/lib/utils';

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
const M2M_API_TOKEN = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth') || '2026-07';
    const endMonth = searchParams.get('endMonth') || '2026-07';

    // 1. Date Range
    const [startYear, startM] = startMonth.split('-').map(Number);
    const [endYear, endM] = endMonth.split('-').map(Number);
    const startDate = `${startYear}-${String(startM).padStart(2, '0')}-01`;
    const lastDay = new Date(endYear, endM, 0).getDate();
    const endDate = `${endYear}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 2. Fetch Active Leisure Teams from Firestore (Dynamic Kanban Sync Rule)
    let activeLeisureTeams = ['액티비티', '벨포레 목장', '목장', '미디어아트센터', '모토아레나', '놀이동산'];
    try {
      if (db) {
        const selectionDoc = await db.collection('settings').doc('leisureSelection').get();
        if (selectionDoc.exists) {
          const data = selectionDoc.data();
          if (Array.isArray(data?.selectedTeams) && data.selectedTeams.length > 0) {
            activeLeisureTeams = data.selectedTeams;
          }
        }
      }
    } catch (e) {
      console.warn('Firestore leisureSelection fetch error:', e);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${M2M_API_TOKEN}`
    };

    // 3. Fetch Matrix Data from V5 API (SSOT)
    let matrixRows: any[] = [];
    try {
      const matrixRes = await fetch(
        `${BACKEND_BASE_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`,
        { headers, cache: 'no-store' }
      );
      if (matrixRes.ok) {
        const json = await matrixRes.json();
        matrixRows = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
      }
    } catch (e) {
      console.error('Failed to fetch matrix-weekly:', e);
    }

    // 4. Extract and Group Active Leisure Departments & Venues from Matrix Raw Rows
    const rawRows = matrixRows.filter((r: any) => !r.isSubtotal && !r.isGrandTotal);
    const departmentMap: Record<string, any> = {};

    rawRows.forEach((row: any) => {
      const catCode = String(row.categoryCode || '').toUpperCase();
      if (catCode !== 'TICKET' && !['MOTO', 'GOODS', 'PARKING'].includes(catCode)) return;

      const partName = String(row.partName || '').trim();
      const shopName = String(row.shopName || row.facilityName || '').trim();
      const amount = cleanNum(row.rangeActual !== undefined ? row.rangeActual : (row.todayActual !== undefined ? row.todayActual : row.mtdActual));
      const lyAmount = cleanNum(row.rangeLy !== undefined ? row.rangeLy : (row.todayLy !== undefined ? row.todayLy : row.mtdLy));
      const visitors = Number(row.visitors || row.rangeVisitors || row.todayVisitors || 0);
      const lyVisitors = Number(row.lyVisitors || row.rangeLyVisitors || row.todayLyVisitors || 0);

      // Skip generic non-venue rows (e.g. ERP consolidated package row '벨포레 리조트', subtotal strings)
      if (partName.includes('리조트') || shopName.includes('리조트') || partName === '소계' || shopName === '소계') return;

      const deptKey = (catCode === 'TICKET' ? partName : (row.categoryName || catCode)) || '미분류';
      if (!deptKey || deptKey === '미분류') return;

      if (!departmentMap[deptKey]) {
        departmentMap[deptKey] = {
          departmentName: deptKey,
          teamName: '레저본부',
          categoryCode: catCode,
          revenue: 0,
          lyRevenue: 0,
          visitors: 0,
          lyVisitors: 0,
          venues: []
        };
      }

      departmentMap[deptKey].revenue += amount;
      departmentMap[deptKey].lyRevenue += lyAmount;
      departmentMap[deptKey].visitors += visitors;
      departmentMap[deptKey].lyVisitors += lyVisitors;

      departmentMap[deptKey].venues.push({
        venueName: shopName || deptKey,
        revenue: amount,
        lyRevenue: lyAmount,
        visitors: visitors,
        lyVisitors: lyVisitors,
        spendPerGuest: visitors > 0 ? Math.round(amount / visitors) : 0,
        lySpendPerGuest: lyVisitors > 0 ? Math.round(lyAmount / lyVisitors) : 0
      });
    });

    // 5. Build clean department list with spendPerGuest metrics
    const departments = Object.values(departmentMap)
      .filter((d: any) => d.revenue > 0 || d.lyRevenue > 0 || d.visitors > 0)
      .map((d: any) => {
        const spendPerGuest = d.visitors > 0 ? Math.round(d.revenue / d.visitors) : 0;
        const lySpendPerGuest = d.lyVisitors > 0 ? Math.round(d.lyRevenue / d.lyVisitors) : 0;

        return {
          ...d,
          spendPerGuest,
          lySpendPerGuest
        };
      })
      .sort((a: any, b: any) => b.revenue - a.revenue);

    // Calculate Grand Total across all active departments
    let totalRevenue = 0;
    let totalLyRevenue = 0;
    let totalVisitors = 0;
    let totalLyVisitors = 0;

    departments.forEach((d: any) => {
      totalRevenue += d.revenue;
      totalLyRevenue += d.lyRevenue;
      totalVisitors += d.visitors;
      totalLyVisitors += d.lyVisitors;
    });

    const totalSpendPerGuest = totalVisitors > 0 ? Math.round(totalRevenue / totalVisitors) : 0;
    const totalLySpendPerGuest = totalLyVisitors > 0 ? Math.round(totalLyRevenue / totalLyVisitors) : 0;

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      totalSummary: {
        revenue: totalRevenue,
        lyRevenue: totalLyRevenue,
        visitors: totalVisitors,
        lyVisitors: totalLyVisitors,
        spendPerGuest: totalSpendPerGuest,
        lySpendPerGuest: totalLySpendPerGuest
      },
      departments
    });
  } catch (error: any) {
    console.error('Error in venue-analytics route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
