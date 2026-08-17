import { NextResponse } from 'next/server';
import { isWeekendOrHoliday } from '@/lib/holidays';
import { db } from '@/lib/firebaseAdmin';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
const M2M_API_TOKEN = process.env.M2M_API_TOKEN || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth') || '2026-07';
    const endMonth = searchParams.get('endMonth') || '2026-07';
    const selectedVenue = searchParams.get('venue') || 'all';

    // 1. Convert startMonth/endMonth to full date range (YYYY-MM-01 ~ YYYY-MM-lastDay)
    const [startYear, startM] = startMonth.split('-').map(Number);
    const [endYear, endM] = endMonth.split('-').map(Number);
    const startDate = `${startYear}-${String(startM).padStart(2, '0')}-01`;
    const lastDay = new Date(endYear, endM, 0).getDate();
    const endDate = `${endYear}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 2. Fetch Active Leisure Teams from Firestore (Dynamic Kanban Sync Rule)
    let activeLeisureTeams: string[] = ['목장', '액티비티', '미디어아트센터', '마운틴카트', '사계절썰매', '모토아레나', '기획전', '벨포레굿즈'];
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
    };
    if (M2M_API_TOKEN) {
      headers['Authorization'] = `Bearer ${M2M_API_TOKEN}`;
    }

    // 3. Attempt to call dedicated backend venue-analytics endpoint if available
    let backendVenueData = null;
    try {
      const venueRes = await fetch(
        `${BACKEND_BASE_URL}/api/v5/report/venue-analytics?startDate=${startDate}&endDate=${endDate}`,
        { headers, next: { revalidate: 60 } }
      );
      if (venueRes.ok) {
        const json = await venueRes.json();
        if (json.success && json.data) {
          backendVenueData = json.data;
        }
      }
    } catch (e) {
      // Expected if backend endpoint is not yet created
    }

    if (backendVenueData && Array.isArray(backendVenueData.venues)) {
      return NextResponse.json({
        success: true,
        startDate,
        endDate,
        venues: backendVenueData.venues
      });
    }

    // 4. Fallback: Aggregate from V5 matrix-weekly & daily trends (SSOT)
    let matrixRows: any[] = [];
    try {
      const matrixRes = await fetch(
        `${BACKEND_BASE_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`,
        { headers, next: { revalidate: 60 } }
      );
      if (matrixRes.ok) {
        const json = await matrixRes.json();
        if (json.success && Array.isArray(json.data)) {
          matrixRows = json.data;
        }
      }
    } catch (e) {
      console.error('Failed to fetch matrix-weekly:', e);
    }

    // Map venue metrics from matrixRows
    const venueMap: Record<string, any> = {};

    matrixRows.forEach((row: any) => {
      // Bell-operation Boundary: Only leisure and independent categories
      const teamName = row.teamName || row.categoryName || '';
      const partName = row.partName || '';
      const shopName = row.shopName || '';
      
      const venueKey = shopName || partName || teamName;
      if (!venueKey || venueKey === '전체' || venueKey === 'TOTAL') return;

      // Filter out non-leisure (e.g. ROOM, GOLF, FNB)
      const categoryCode = String(row.categoryCode || '').toUpperCase();
      const isLeisureOrIndependent = ['TICKET', 'MOTO', 'PROMOTION', 'GOODS', 'UNEARNED', 'PARKING', 'ETC'].includes(categoryCode) ||
        activeLeisureTeams.some(t => venueKey.includes(t) || teamName.includes(t));
        
      if (!isLeisureOrIndependent) return;

      if (!venueMap[venueKey]) {
        venueMap[venueKey] = {
          venueName: venueKey,
          teamName: teamName,
          categoryCode: row.categoryCode || 'TICKET',
          total: {
            revenue: 0,
            lyRevenue: 0,
            visitors: 0,
            lyVisitors: 0,
            spendPerGuest: 0,
            lySpendPerGuest: 0
          },
          weekday: {
            revenue: 0,
            lyRevenue: 0,
            visitors: 0,
            lyVisitors: 0,
            spendPerGuest: 0,
            lySpendPerGuest: 0
          },
          weekend: {
            revenue: 0,
            lyRevenue: 0,
            visitors: 0,
            lyVisitors: 0,
            spendPerGuest: 0,
            lySpendPerGuest: 0
          },
          dailyTrends: []
        };
      }

      const revActual = Number(row.todayActual || row.rangeActual || row.mtdActual || 0);
      const revLy = Number(row.todayLy || row.rangeLy || row.mtdLy || 0);
      const visitors = Number(row.visitors || row.todayVisitors || 0);
      const lyVisitors = Number(row.lyVisitors || row.todayLyVisitors || 0);

      // Aggregate Total
      if (row.isSubtotal || row.subtotalType === 'part' || !row.isGrandTotal) {
        venueMap[venueKey].total.revenue += revActual;
        venueMap[venueKey].total.lyRevenue += revLy;
        venueMap[venueKey].total.visitors += visitors;
        venueMap[venueKey].total.lyVisitors += lyVisitors;
      }
    });

    // Compute Per-Guest Spend (Strict: Revenue / Visitors, 0 if no visitors)
    const venueList = Object.values(venueMap).map((v: any) => {
      if (v.total.visitors > 0) {
        v.total.spendPerGuest = Math.round(v.total.revenue / v.total.visitors);
      }
      if (v.total.lyVisitors > 0) {
        v.total.lySpendPerGuest = Math.round(v.total.lyRevenue / v.total.lyVisitors);
      }
      return v;
    });

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      venues: venueList
    });
  } catch (error: any) {
    console.error('Error in /api/venue-analytics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
