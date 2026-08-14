import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const docRef = db.collection('goals').doc('2026');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // Return empty structure if not synced yet
      return NextResponse.json({ 
        success: true, 
        data: {}, 
        revenue: {},
        visitors: { target: {}, actual: {} },
        utilization: { target: {}, actual: {} },
        lastSyncedAt: null
      });
    }

    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');

    const selectedMonths: number[] = [];
    if (startMonth && endMonth && startMonth.length === 7 && endMonth.length === 7) {
      let [sy, sm] = startMonth.split('-').map(Number);
      let [ey, em] = endMonth.split('-').map(Number);
      let current = new Date(sy, sm - 1, 1);
      const end = new Date(ey, em - 1, 1);
      while (current <= end) {
        if (current.getFullYear() === 2026) {
          selectedMonths.push(current.getMonth());
        }
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Default to all months if not specified
      for (let i=0; i<12; i++) selectedMonths.push(i);
    }

    const dataObj = docSnap.data() || {};
    
    // Helper to sum arrays
    const aggregateArray = (obj: any) => {
      if (!obj) return {};
      const result: Record<string, number> = {};
      for (const [key, arr] of Object.entries(obj)) {
        if (Array.isArray(arr)) {
          result[key] = selectedMonths.reduce((sum, m) => sum + (arr[m] || 0), 0);
        }
      }
      return result;
    };
    
    // Helper to average arrays for utilization
    const aggregateAvg = (obj: any) => {
      if (!obj) return {};
      const result: Record<string, number> = {};
      for (const [key, arr] of Object.entries(obj)) {
        if (Array.isArray(arr)) {
          let sum = 0;
          let count = 0;
          selectedMonths.forEach(m => {
            if (arr[m] !== undefined && arr[m] !== null) {
              sum += arr[m];
              count++;
            }
          });
          result[key] = count > 0 ? sum / count : 0;
        }
      }
      return result;
    };

    const aggregatedRevenue = aggregateArray(dataObj?.revenue);
    
    const visitorsTarget = aggregateArray(dataObj?.visitors?.target);
    const visitorsActual = aggregateArray(dataObj?.visitors?.actual);
    
    // Auto-calculate total visitors
    let targetTotal = 0;
    let actualTotal = 0;
    const visitorKeysToTry = ['레저본부 방문객', '합계', '총계', '방문객', '전체 방문객'];
    for (const key of visitorKeysToTry) {
      if (visitorsTarget[key]) {
        targetTotal = visitorsTarget[key];
        actualTotal = visitorsActual[key] || 0;
        break;
      }
    }

    // Process utilization data dynamically
    const dynamicTeams = Array.from(new Set([
      ...Object.keys(dataObj?.utilization?.target || {}),
      ...Object.keys(dataObj?.utilization?.actual || {})
    ]));
    
    const utilTarget = aggregateAvg(dataObj?.utilization?.target);
    const utilActual = aggregateAvg(dataObj?.utilization?.actual);
    
    const utilizationData = dynamicTeams.map(team => ({
      team,
      avgGoal: utilTarget[team] || 0,
      avgActual: utilActual[team] || 0
    })).filter(d => d.avgGoal > 0 || d.avgActual > 0);

    return NextResponse.json({ 
      success: true, 
      data: aggregatedRevenue,
      revenue: aggregatedRevenue,
      visitors: { target: visitorsTarget, actual: visitorsActual, targetTotal, actualTotal },
      utilizationData: utilizationData,
      lastSyncedAt: dataObj?.lastSyncedAt || null
    });

  } catch (error: any) {
    console.error('Goals fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
