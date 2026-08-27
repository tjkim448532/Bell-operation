import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { cleanNum } from '@/lib/utils';
import { isWeekendOrHoliday } from '@/lib/holidays';

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');
const M2M_API_TOKEN = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

function getContiguousDayRanges(startDateStr: string, endDateStr: string) {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const ranges: { type: 'weekday' | 'weekend'; startDate: string; endDate: string }[] = [];
  const curDate = new Date(Date.UTC(sy, sm - 1, sd || 1));
  const endDate = new Date(Date.UTC(ey, em - 1, ed || 1));

  let currentType: 'weekday' | 'weekend' = isWeekendOrHoliday(curDate.toISOString().slice(0, 10)) ? 'weekend' : 'weekday';
  let rangeStart = curDate.toISOString().slice(0, 10);

  while (curDate <= endDate) {
    const dateStr = curDate.toISOString().slice(0, 10);
    const dayType: 'weekday' | 'weekend' = isWeekendOrHoliday(dateStr) ? 'weekend' : 'weekday';

    if (dayType !== currentType) {
      const prevDate = new Date(curDate);
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      ranges.push({
        type: currentType,
        startDate: rangeStart,
        endDate: prevDate.toISOString().slice(0, 10)
      });
      rangeStart = dateStr;
      currentType = dayType;
    }

    curDate.setUTCDate(curDate.getUTCDate() + 1);
  }

  ranges.push({
    type: currentType,
    startDate: rangeStart,
    endDate: endDate.toISOString().slice(0, 10)
  });

  return ranges;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startMonthParam = searchParams.get('startMonth');
    const endMonthParam = searchParams.get('endMonth');

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const defaultLastDay = new Date(curYear, now.getMonth() + 1, 0).getDate();

    let startDate = startDateParam || '';
    let endDate = endDateParam || '';

    if (!startDate && startMonthParam) {
      startDate = `${startMonthParam}-01`;
    }
    if (!endDate && endMonthParam) {
      const [ey, em] = endMonthParam.split('-').map(Number);
      const lastDay = new Date(ey, em, 0).getDate();
      endDate = `${endMonthParam}-${String(lastDay).padStart(2, '0')}`;
    }

    if (!startDate) startDate = `${curYear}-${curMonth}-01`;
    if (!endDate) endDate = `${curYear}-${curMonth}-${String(defaultLastDay).padStart(2, '0')}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${M2M_API_TOKEN}`
    };

    // 2. Compute Contiguous Weekday vs Weekend Blocks
    const ranges = getContiguousDayRanges(startDate, endDate);

    // 3. Fetch Matrix Data for all contiguous blocks in parallel
    const rangeResponses = await Promise.all(
      ranges.map(async (r) => {
        try {
          const res = await fetch(
            `${BACKEND_BASE_URL}/api/v6/dashboard/matrix-weekly?startDate=${r.startDate}&endDate=${r.endDate}`,
            { headers, cache: 'no-store' }
          );
          if (res.ok) {
            const json = await res.json();
            return { type: r.type, rows: Array.isArray(json.data) ? json.data : [] };
          }
        } catch (e) {
          console.error(`Failed to fetch range ${r.startDate}~${r.endDate}`, e);
        }
        return { type: r.type, rows: [] };
      })
    );

    // 4. Aggregate by Department and Sub-Venue with Weekday / Weekend Breakdown
    interface MetricSet {
      revenue: number;
      lyRevenue: number;
      visitors: number;
      lyVisitors: number;
      spendPerGuest: number;
      lySpendPerGuest: number;
    }

    interface VenueAgg {
      venueName: string;
      total: MetricSet;
      weekday: MetricSet;
      weekend: MetricSet;
    }

    interface DeptAgg {
      departmentName: string;
      teamName: string;
      categoryCode: string;
      total: MetricSet;
      weekday: MetricSet;
      weekend: MetricSet;
      venues: Record<string, VenueAgg>;
    }

    const initMetricSet = (): MetricSet => ({
      revenue: 0,
      lyRevenue: 0,
      visitors: 0,
      lyVisitors: 0,
      spendPerGuest: 0,
      lySpendPerGuest: 0
    });

    const departmentMap: Record<string, DeptAgg> = {};

    rangeResponses.forEach(({ type, rows }) => {
      const rawRows = rows.filter((r: any) => !r.isSubtotal && !r.isGrandTotal);

      rawRows.forEach((row: any) => {
        const catCode = String(row.categoryCode || '').toUpperCase();
        if (catCode !== 'TICKET' && !['MOTO', 'GOODS', 'PARKING'].includes(catCode)) return;

        const partName = String(row.partName || '').trim();
        const shopName = String(row.shopName || row.facilityName || '').trim();
        const amount = cleanNum(row.rangeActual !== undefined ? row.rangeActual : (row.todayActual !== undefined ? row.todayActual : row.mtdActual));
        const lyAmount = cleanNum(row.rangeLy !== undefined ? row.rangeLy : (row.todayLy !== undefined ? row.todayLy : row.mtdLy));
        const visitors = Number(row.rangeVisitors !== undefined ? row.rangeVisitors : (row.visitors !== undefined ? row.visitors : (row.todayVisitors || 0)));
        const lyVisitors = Number(row.rangeLyVisitors !== undefined ? row.rangeLyVisitors : (row.lyVisitors !== undefined ? row.lyVisitors : (row.todayLyVisitors || 0)));

        // Skip generic non-venue rows
        if (partName.includes('리조트') || shopName.includes('리조트') || partName === '소계' || shopName === '소계') return;

        const deptKey = (catCode === 'TICKET' ? partName : (row.categoryName || catCode)) || '미분류';
        if (!deptKey || deptKey === '미분류') return;

        if (!departmentMap[deptKey]) {
          departmentMap[deptKey] = {
            departmentName: deptKey,
            teamName: '레저본부',
            categoryCode: catCode,
            total: initMetricSet(),
            weekday: initMetricSet(),
            weekend: initMetricSet(),
            venues: {}
          };
        }

        const dept = departmentMap[deptKey];
        
        // Add to total
        dept.total.revenue += amount;
        dept.total.lyRevenue += lyAmount;
        dept.total.visitors += visitors;
        dept.total.lyVisitors += lyVisitors;

        // Add to specific day type (weekday or weekend)
        dept[type].revenue += amount;
        dept[type].lyRevenue += lyAmount;
        dept[type].visitors += visitors;
        dept[type].lyVisitors += lyVisitors;

        // Venue level
        const vName = shopName || deptKey;
        if (!dept.venues[vName]) {
          dept.venues[vName] = {
            venueName: vName,
            total: initMetricSet(),
            weekday: initMetricSet(),
            weekend: initMetricSet()
          };
        }

        const venue = dept.venues[vName];
        venue.total.revenue += amount;
        venue.total.lyRevenue += lyAmount;
        venue.total.visitors += visitors;
        venue.total.lyVisitors += lyVisitors;

        venue[type].revenue += amount;
        venue[type].lyRevenue += lyAmount;
        venue[type].visitors += visitors;
        venue[type].lyVisitors += lyVisitors;
      });
    });

    const finalizeMetricSet = (m: MetricSet): MetricSet => ({
      ...m,
      spendPerGuest: m.visitors > 0 ? Math.round(m.revenue / m.visitors) : 0,
      lySpendPerGuest: m.lyVisitors > 0 ? Math.round(m.lyRevenue / m.lyVisitors) : 0
    });

    // 5. Finalize Departments and SpendPerGuest metrics
    const departments = Object.values(departmentMap)
      .filter((d) => d.total.revenue > 0 || d.total.lyRevenue > 0 || d.total.visitors > 0)
      .map((d) => {
        const finalizedVenues = Object.values(d.venues).map((v) => ({
          venueName: v.venueName,
          total: finalizeMetricSet(v.total),
          weekday: finalizeMetricSet(v.weekday),
          weekend: finalizeMetricSet(v.weekend)
        }));

        return {
          departmentName: d.departmentName,
          teamName: d.teamName,
          categoryCode: d.categoryCode,
          total: finalizeMetricSet(d.total),
          weekday: finalizeMetricSet(d.weekday),
          weekend: finalizeMetricSet(d.weekend),
          venues: finalizedVenues
        };
      })
      .sort((a, b) => b.total.revenue - a.total.revenue);

    // 6. Finalize Grand Total
    const totalSummary = {
      total: initMetricSet(),
      weekday: initMetricSet(),
      weekend: initMetricSet()
    };

    departments.forEach((d) => {
      (['total', 'weekday', 'weekend'] as const).forEach((t) => {
        totalSummary[t].revenue += d[t].revenue;
        totalSummary[t].lyRevenue += d[t].lyRevenue;
        totalSummary[t].visitors += d[t].visitors;
        totalSummary[t].lyVisitors += d[t].lyVisitors;
      });
    });

    // 7. If matrix-weekly did not provide visitors, integrate from Google Sheet (goals/latest) SSOT
    if (totalSummary.total.visitors === 0 && db) {
      try {
        const [sY, sM, sD] = startDate.split('-').map(Number);
        const [eY, eM, eD] = endDate.split('-').map(Number);

        let totalLeisureVisitors = 0;
        let totalLyLeisureVisitors = 0;

        const goalsSnap = await db.collection('goals').doc(String(sY)).get();
        const fallbackSnap = !goalsSnap.exists ? await db.collection('goals').doc('2026').get() : null;
        const targetSnap = goalsSnap.exists ? goalsSnap : fallbackSnap;

        if (targetSnap && targetSnap.exists) {
          const gData = targetSnap.data();
          const actualVisitors = gData?.visitors?.actual?.['레저본부 방문객'] || gData?.visitors?.actual?.['리조트 총 방문객'] || [];
          const targetVisitors = gData?.visitors?.target?.['레저본부 방문객'] || gData?.visitors?.target?.['리조트 총 방문객'] || [];

          let curY = sY;
          let curM = sM;
          while (curY < eY || (curY === eY && curM <= eM)) {
            const mIdx = curM - 1;
            const mActual = actualVisitors[mIdx] || 0;
            const mTarget = targetVisitors[mIdx] || 0;

            const totalDaysInMonth = new Date(curY, curM, 0).getDate();
            let activeDaysInMonth = totalDaysInMonth;
            if (curY === sY && curM === sM && curY === eY && curM === eM) {
              activeDaysInMonth = Math.max(1, (eD || totalDaysInMonth) - (sD || 1) + 1);
            } else if (curY === sY && curM === sM) {
              activeDaysInMonth = Math.max(1, totalDaysInMonth - (sD || 1) + 1);
            } else if (curY === eY && curM === eM) {
              activeDaysInMonth = Math.max(1, (eD || totalDaysInMonth));
            }

            const ratio = Math.min(1, activeDaysInMonth / totalDaysInMonth);
            totalLeisureVisitors += Math.round(mActual * ratio);
            totalLyLeisureVisitors += Math.round(mTarget * ratio);

            curM++;
            if (curM > 12) {
              curM = 1;
              curY++;
            }
          }
        }

        if (totalLeisureVisitors > 0) {
          const totalRev = totalSummary.total.revenue || 1;
          const totalLyRev = totalSummary.total.lyRevenue || 1;
          const weekdayRevRatio = totalSummary.weekday.revenue / totalRev;
          const weekdayLyRevRatio = totalSummary.weekday.lyRevenue / totalLyRev;

          totalSummary.total.visitors = totalLeisureVisitors;
          totalSummary.total.lyVisitors = totalLyLeisureVisitors;
          totalSummary.weekday.visitors = Math.round(totalLeisureVisitors * weekdayRevRatio);
          totalSummary.weekend.visitors = totalLeisureVisitors - totalSummary.weekday.visitors;
          totalSummary.weekday.lyVisitors = Math.round(totalLyLeisureVisitors * weekdayLyRevRatio);
          totalSummary.weekend.lyVisitors = totalLyLeisureVisitors - totalSummary.weekday.lyVisitors;

          departments.forEach((dept) => {
            const deptRevShare = dept.total.revenue / totalRev;
            const deptLyRevShare = dept.total.lyRevenue / totalLyRev;
            dept.total.visitors = Math.round(totalLeisureVisitors * deptRevShare);
            dept.total.lyVisitors = Math.round(totalLyLeisureVisitors * deptLyRevShare);

            const deptRev = dept.total.revenue || 1;
            const deptLyRev = dept.total.lyRevenue || 1;
            dept.weekday.visitors = Math.round(dept.total.visitors * (dept.weekday.revenue / deptRev));
            dept.weekend.visitors = dept.total.visitors - dept.weekday.visitors;

            dept.weekday.lyVisitors = Math.round(dept.total.lyVisitors * (dept.weekday.lyRevenue / deptLyRev));
            dept.weekend.lyVisitors = dept.total.lyVisitors - dept.weekday.lyVisitors;

            dept.total = finalizeMetricSet(dept.total);
            dept.weekday = finalizeMetricSet(dept.weekday);
            dept.weekend = finalizeMetricSet(dept.weekend);
          });
        }
      } catch (err) {
        console.error('Error integrating Google Sheet visitor actuals:', err);
      }
    }

    (['total', 'weekday', 'weekend'] as const).forEach((t) => {
      totalSummary[t] = finalizeMetricSet(totalSummary[t]);
    });

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      totalSummary,
      departments
    });
  } catch (error: any) {
    console.error('Error in venue-analytics route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
