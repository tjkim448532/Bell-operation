import { NextRequest, NextResponse } from 'next/server';
import { getLatestClosedDateStr } from '@/lib/dateUtils';
import type {
  MonthlyVisitorTargetsResponse,
  VisitorTargetCell,
  VisitorTargetRow,
  VenueUsageTargetCell,
  VenueUsageTargetRow,
  VenueAmountTargetCell,
  VenueAmountTargetRow,
} from '@/types/monthly-visitor-targets';

export const dynamic = 'force-dynamic';

const TARGET_SHEET_ID = '1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA';
const TARGET_SHEET_URL = `https://docs.google.com/spreadsheets/d/${TARGET_SHEET_ID}/edit?usp=sharing`;
const TARGET_SHEET_GVIZ_URL = `https://docs.google.com/spreadsheets/d/${TARGET_SHEET_ID}/gviz/tq?tqx=out:json`;

// 비레저본부 영업장 제외 필터 (AGENTS.md 레저본부 데이터 격리 표준)
const EXCLUDED_NON_LEISURE_VENUES = new Set([
  '놀이동산',
  '모토아레나',
  '골프장',
]);

// 이미지 시트 표준 4대 레저본부 핵심 영업장 정의
const CORE_SHEET_VENUE_SPECS: Array<{
  venueKey: string;
  displayName: string;
  rawVenueName: string;
  partName: string;
}> = [
  {
    venueKey: 'MEDIA_ART',
    displayName: '미디어아트센터',
    rawVenueName: '미디어아트센터',
    partName: '미디어아트',
  },
  {
    venueKey: 'RANCH',
    displayName: '목장',
    rawVenueName: '벨포레 목장',
    partName: '목장',
  },
  {
    venueKey: 'SLED',
    displayName: '사계절썰매',
    rawVenueName: '사계절썰매장',
    partName: '사계절썰매',
  },
  {
    venueKey: 'MOUNTAIN_CART',
    displayName: '마운틴카트',
    rawVenueName: '마운틴카트(전체)',
    partName: '마운틴카트',
  },
];

const REVENUE_SHEET_VENUE_SPECS: Array<{
  venueKey: string;
  displayName: string;
  rawVenueName: string;
}> = [
  { venueKey: 'MEDIA_ART', displayName: '미디어아트센터', rawVenueName: '미디어아트센터' },
  { venueKey: 'RANCH', displayName: '목장', rawVenueName: '벨포레 목장' },
  { venueKey: 'SLED', displayName: '사계절썰매', rawVenueName: '사계절썰매장' },
  { venueKey: 'MOUNTAIN_CART', displayName: '마운틴카트', rawVenueName: '마운틴카트(전체)' },
  { venueKey: 'WONDERPOOL', displayName: '원더풀', rawVenueName: '원더풀' },
  { venueKey: 'SUMMERLAND', displayName: '썸머랜드', rawVenueName: '썸머랜드' },
  { venueKey: 'MARINA_CLUB', displayName: '마리나', rawVenueName: '마리나 클럽' },
];

interface SheetTargetSeries {
  annual: number | null;
  monthly: Record<string, number | null>;
}

interface ParsedGoogleSheetTargets {
  visitorTargetsByKey: Map<'LEISURE_TOTAL' | 'WALKIN_DIGITAL', SheetTargetSeries>;
  venueRateTargetsByName: Map<string, SheetTargetSeries>;
  venueRevenueTargetsByName: Map<string, SheetTargetSeries>;
  venueUnitPriceTargetsByName: Map<string, SheetTargetSeries>;
}

// 신규 구글 스프레드시트(1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA)에서 4대 목표 테이블(방문객/이용률/매출/객단가) 원본값만 1:1 추출
async function fetchSheetTargetsOnly(): Promise<ParsedGoogleSheetTargets | null> {
  try {
    const res = await fetch(TARGET_SHEET_GVIZ_URL, {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) return null;

    const json = JSON.parse(text.substring(startIdx, endIdx + 1));
    const rows: any[] = json?.table?.rows || [];

    const visitorTargetsByKey = new Map<'LEISURE_TOTAL' | 'WALKIN_DIGITAL', SheetTargetSeries>();
    const venueRateTargetsByName = new Map<string, SheetTargetSeries>();
    const venueRevenueTargetsByName = new Map<string, SheetTargetSeries>();
    const venueUnitPriceTargetsByName = new Map<string, SheetTargetSeries>();

    let currentSection: 'VISITOR' | 'USAGE_RATE' | 'REVENUE' | 'UNIT_PRICE' = 'VISITOR';

    const extractCellNumber = (cellObj: any, isPct: boolean): number | null => {
      if (!cellObj) return null;
      if (isPct && typeof cellObj.f === 'string' && cellObj.f.includes('%')) {
        const parsed = parseFloat(cellObj.f.replace('%', '').replace(/,/g, '').trim());
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (typeof cellObj.v === 'number' && Number.isFinite(cellObj.v)) {
        return isPct ? cellObj.v : Math.round(cellObj.v);
      }
      if (typeof cellObj.f === 'string') {
        const cleaned = cellObj.f.replace(/,/g, '').replace('%', '').trim();
        if (!cleaned || cleaned === '-') return null;
        const parsed = parseFloat(cleaned);
        if (!Number.isFinite(parsed)) return null;
        return isPct ? parsed : Math.round(parsed);
      }
      return null;
    };

    for (const row of rows) {
      const cells: any[] = row?.c || [];
      const rawLabel = String(cells[4]?.v ?? cells[4]?.f ?? '').trim();

      if (rawLabel.includes('월별 이용율 목표') || rawLabel.includes('월별 이용률 목표')) {
        currentSection = 'USAGE_RATE';
        continue;
      }
      if (rawLabel.includes('월별 매출 목표')) {
        currentSection = 'REVENUE';
        continue;
      }
      if (rawLabel === '객단가' || rawLabel.includes('목표 객단가')) {
        currentSection = 'UNIT_PRICE';
        continue;
      }
      if (
        rawLabel === '업장' ||
        rawLabel.startsWith('미디어 아트 센터 총 매출 합') ||
        rawLabel.startsWith('목장 총 매출 합')
      ) {
        continue;
      }

      // 매출 목표의 합계 행 (라벨은 비어있고 c[17]에 2,947,129,676 존재)
      if (!rawLabel && currentSection === 'REVENUE') {
        const totalAnnual = extractCellNumber(cells[17], false);
        if (totalAnnual !== null) {
          const monthly: Record<string, number | null> = {};
          for (let m = 1; m <= 12; m++) {
            monthly[String(m)] = extractCellNumber(cells[4 + m], false);
          }
          venueRevenueTargetsByName.set('합계', {
            annual: totalAnnual,
            monthly,
          });
        }
        continue;
      }

      if (!rawLabel) continue;

      if (currentSection === 'VISITOR') {
        const monthly: Record<string, number | null> = {};
        for (let m = 1; m <= 12; m++) {
          monthly[String(m)] = extractCellNumber(cells[4 + m], false);
        }
        const annual = extractCellNumber(cells[17], false);
        if (rawLabel.includes('전체 방문객') || rawLabel.includes('레저본부 방문객')) {
          visitorTargetsByKey.set('LEISURE_TOTAL', { annual, monthly });
        } else if (rawLabel.includes('지원 할당') || rawLabel.includes('나들이')) {
          visitorTargetsByKey.set('WALKIN_DIGITAL', { annual, monthly });
        }
      } else if (currentSection === 'USAGE_RATE') {
        const monthly: Record<string, number | null> = {};
        for (let m = 1; m <= 12; m++) {
          monthly[String(m)] = extractCellNumber(cells[4 + m], true);
        }
        venueRateTargetsByName.set(rawLabel, {
          annual: extractCellNumber(cells[17], true),
          monthly,
        });
      } else if (currentSection === 'REVENUE') {
        const monthly: Record<string, number | null> = {};
        for (let m = 1; m <= 12; m++) {
          monthly[String(m)] = extractCellNumber(cells[4 + m], false);
        }
        venueRevenueTargetsByName.set(rawLabel, {
          annual: extractCellNumber(cells[17], false),
          monthly,
        });
      } else if (currentSection === 'UNIT_PRICE') {
        // 객단가 섹션: c[5]가 기본 목표 객단가, 마운틴카트는 c[6](4,500원)이 12,1,2월 객단가
        const basePrice = extractCellNumber(cells[5], false);
        const winterPrice = extractCellNumber(cells[6], false);
        const monthly: Record<string, number | null> = {};
        for (let m = 1; m <= 12; m++) {
          if (
            rawLabel === '마운틴카트' &&
            winterPrice !== null &&
            (m === 1 || m === 2 || m === 12)
          ) {
            monthly[String(m)] = winterPrice;
          } else {
            monthly[String(m)] = basePrice;
          }
        }
        venueUnitPriceTargetsByName.set(rawLabel, {
          annual: basePrice,
          monthly,
        });
      }
    }

    return {
      visitorTargetsByKey,
      venueRateTargetsByName,
      venueRevenueTargetsByName,
      venueUnitPriceTargetsByName,
    };
  } catch {
    return null;
  }
}

function createEmptyVisitorCell(): VisitorTargetCell {
  return {
    target: null,
    actual: null,
    achievementRatePct: null,
  };
}

function createEmptyVenueCell(): VenueUsageTargetCell {
  return {
    targetRatePct: null,
    actualRatePct: null,
    achievementRatePct: null,
    visitors: null,
    denominator: null,
  };
}

function createEmptyAmountCell(): VenueAmountTargetCell {
  return {
    target: null,
    actual: null,
    achievementRatePct: null,
  };
}

function buildAmountRowsFromSheetAndBackend(
  sheetMap: Map<string, SheetTargetSeries> | undefined,
  backendRows: VenueAmountTargetRow[] | undefined,
  includeSummaryRow: boolean
): VenueAmountTargetRow[] {
  const backendByKey = new Map<string, VenueAmountTargetRow>();
  const backendByName = new Map<string, VenueAmountTargetRow>();
  if (Array.isArray(backendRows)) {
    for (const r of backendRows) {
      if (r.venueKey) backendByKey.set(r.venueKey, r);
      if (r.venueName) backendByName.set(r.venueName, r);
      if (r.rawVenueName) backendByName.set(r.rawVenueName, r);
    }
  }

  const result: VenueAmountTargetRow[] = [];

  for (const spec of REVENUE_SHEET_VENUE_SPECS) {
    const sSeries = sheetMap?.get(spec.displayName);
    const bRow =
      backendByKey.get(spec.venueKey) ||
      backendByName.get(spec.displayName) ||
      backendByName.get(spec.rawVenueName);

    const monthly: Record<string, VenueAmountTargetCell> = {};
    for (let m = 1; m <= 12; m++) {
      const mKey = String(m);
      const bCell = bRow?.monthly?.[mKey] || createEmptyAmountCell();
      const sTarget = sSeries?.monthly?.[mKey];
      const hasSheetTarget = sTarget !== null && sTarget !== undefined;
      const isTargetSynced =
        !hasSheetTarget ||
        (bCell.target !== null &&
          bCell.target !== undefined &&
          Math.abs(bCell.target - sTarget) <= 1);
      monthly[mKey] = {
        target: hasSheetTarget ? sTarget : bCell.target,
        actual: bCell.actual ?? null,
        achievementRatePct: isTargetSynced ? (bCell.achievementRatePct ?? null) : null,
      };
    }

    const sAnnualTarget = sSeries?.annual;
    const hasAnnualSheetTarget = sAnnualTarget !== null && sAnnualTarget !== undefined;
    const bAnnualTarget = bRow?.annual?.target ?? null;
    const isAnnualSynced =
      !hasAnnualSheetTarget ||
      (bAnnualTarget !== null && Math.abs(bAnnualTarget - sAnnualTarget) <= 1);

    result.push({
      venueKey: spec.venueKey,
      venueName: spec.displayName,
      rawVenueName: spec.rawVenueName,
      isSummaryRow: false,
      annual: {
        target: hasAnnualSheetTarget ? sAnnualTarget : bAnnualTarget,
        actual: bRow?.annual?.actual ?? null,
        achievementRatePct: isAnnualSynced ? (bRow?.annual?.achievementRatePct ?? null) : null,
      },
      monthly,
    });
  }

  if (includeSummaryRow) {
    const sTotal = sheetMap?.get('합계');
    const bTotal = backendByKey.get('TOTAL') || backendByName.get('합계');
    if (sTotal || bTotal) {
      const monthly: Record<string, VenueAmountTargetCell> = {};
      for (let m = 1; m <= 12; m++) {
        const mKey = String(m);
        const bCell = bTotal?.monthly?.[mKey] || createEmptyAmountCell();
        const sTarget = sTotal?.monthly?.[mKey];
        const hasSheetTarget = sTarget !== null && sTarget !== undefined;
        const isTargetSynced =
          !hasSheetTarget ||
          (bCell.target !== null &&
            bCell.target !== undefined &&
            Math.abs(bCell.target - sTarget) <= 1);
        monthly[mKey] = {
          target: hasSheetTarget ? sTarget : bCell.target,
          actual: bCell.actual ?? null,
          achievementRatePct: isTargetSynced ? (bCell.achievementRatePct ?? null) : null,
        };
      }
      const sAnnualTotal = sTotal?.annual;
      const hasAnnualTotal = sAnnualTotal !== null && sAnnualTotal !== undefined;
      const bAnnualTotal = bTotal?.annual?.target ?? null;
      const isAnnualTotalSynced =
        !hasAnnualTotal ||
        (bAnnualTotal !== null && Math.abs(bAnnualTotal - sAnnualTotal) <= 1);

      result.push({
        venueKey: 'TOTAL',
        venueName: '합계',
        rawVenueName: '합계',
        isSummaryRow: true,
        annual: {
          target: hasAnnualTotal ? sAnnualTotal : bAnnualTotal,
          actual: bTotal?.annual?.actual ?? null,
          achievementRatePct: isAnnualTotalSynced ? (bTotal?.annual?.achievementRatePct ?? null) : null,
        },
        monthly,
      });
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const defaultDate = getLatestClosedDateStr();
    const defaultYear = Number(defaultDate.slice(0, 4));
    const parsedYear = Number(searchParams.get('year'));
    const targetYear = Number.isFinite(parsedYear) && parsedYear >= 2024 ? parsedYear : defaultYear;

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'x-m2m-token': token,
    };

    // 구글시트 '목표' 원천 데이터 병렬 조회 (2026년 시트 기준)
    const sheetTargetsPromise =
      targetYear === 2026 ? fetchSheetTargetsOnly() : Promise.resolve(null);

    // 1. 백엔드 정식 엔드포인트(/api/v6/report/monthly-visitor-targets) 호출
    for (const ep of [
      '/api/v6/report/monthly-visitor-targets',
      '/api/v6/dashboard/monthly-visitor-targets',
    ]) {
      try {
        const [directRes, sheetTargets] = await Promise.all([
          fetch(`${backendBase}${ep}?year=${targetYear}&_t=${Date.now()}`, {
            headers: authHeaders,
            cache: 'no-store',
          }),
          sheetTargetsPromise,
        ]);

        if (directRes.ok) {
          const directJson = await directRes.json();
          if (
            directJson &&
            directJson.success &&
            Array.isArray(directJson.visitorTargets) &&
            Array.isArray(directJson.venueUsageTargets)
          ) {
            const mergedVisitorTargets = directJson.visitorTargets.map((row: VisitorTargetRow) => {
              const sheetSeries =
                row.rowKey === 'LEISURE_TOTAL' || row.rowKey === 'WALKIN_DIGITAL'
                  ? sheetTargets?.visitorTargetsByKey.get(row.rowKey)
                  : null;
              if (!sheetSeries) return row;

              const mergedMonthly: Record<string, VisitorTargetCell> = {};
              for (let m = 1; m <= 12; m++) {
                const mKey = String(m);
                const bCell = row.monthly?.[mKey] || createEmptyVisitorCell();
                const sTarget = sheetSeries.monthly[mKey];
                const hasSheetTarget = sTarget !== null && sTarget !== undefined;
                const isTargetSynced =
                  !hasSheetTarget ||
                  (bCell.target !== null &&
                    bCell.target !== undefined &&
                    Math.abs(bCell.target - sTarget) <= 0.001);
                mergedMonthly[mKey] = {
                  target: hasSheetTarget ? sTarget : bCell.target,
                  actual: bCell.actual,
                  achievementRatePct: isTargetSynced ? bCell.achievementRatePct : null,
                };
              }

              const sAnnual = sheetSeries.annual;
              const hasAnnualSheet = sAnnual !== null && sAnnual !== undefined;
              const bAnnualTarget = row.annual?.target ?? null;
              const isAnnualSynced =
                !hasAnnualSheet ||
                (bAnnualTarget !== null && Math.abs(bAnnualTarget - sAnnual) <= 0.001);

              return {
                ...row,
                annual: {
                  target: hasAnnualSheet ? sAnnual : bAnnualTarget,
                  actual: row.annual?.actual ?? null,
                  achievementRatePct: isAnnualSynced
                    ? (row.annual?.achievementRatePct ?? null)
                    : null,
                },
                monthly: mergedMonthly,
              };
            });

            const mergedVenueUsageTargets = directJson.venueUsageTargets.map(
              (row: VenueUsageTargetRow) => {
                const sheetSeries = sheetTargets?.venueRateTargetsByName.get(row.venueName);
                if (!sheetSeries) return row;

                const mergedMonthly: Record<string, VenueUsageTargetCell> = {};
                for (let m = 1; m <= 12; m++) {
                  const mKey = String(m);
                  const bCell = row.monthly?.[mKey] || createEmptyVenueCell();
                  const sTargetRate = sheetSeries.monthly[mKey];
                  const hasSheetRate = sTargetRate !== null && sTargetRate !== undefined;
                  const isRateSynced =
                    !hasSheetRate ||
                    (bCell.targetRatePct !== null &&
                      bCell.targetRatePct !== undefined &&
                      Math.abs(bCell.targetRatePct - sTargetRate) <= 0.001);
                  mergedMonthly[mKey] = {
                    targetRatePct: hasSheetRate ? sTargetRate : bCell.targetRatePct,
                    actualRatePct: bCell.actualRatePct,
                    achievementRatePct: isRateSynced ? bCell.achievementRatePct : null,
                    visitors: bCell.visitors ?? null,
                    denominator: bCell.denominator ?? null,
                  };
                }

                const sAnnualRate = sheetSeries.annual;
                const hasAnnualRate = sAnnualRate !== null && sAnnualRate !== undefined;
                const bAnnualRate = row.annual?.targetRatePct ?? null;
                const isAnnualRateSynced =
                  !hasAnnualRate ||
                  (bAnnualRate !== null && Math.abs(bAnnualRate - sAnnualRate) <= 0.001);

                return {
                  ...row,
                  annual: {
                    targetRatePct: hasAnnualRate ? sAnnualRate : bAnnualRate,
                    actualRatePct: row.annual?.actualRatePct ?? null,
                    achievementRatePct: isAnnualRateSynced
                      ? (row.annual?.achievementRatePct ?? null)
                      : null,
                    visitors: row.annual?.visitors ?? null,
                    denominator: row.annual?.denominator ?? null,
                  },
                  monthly: mergedMonthly,
                };
              }
            );

            const venueRevenueTargets = buildAmountRowsFromSheetAndBackend(
              sheetTargets?.venueRevenueTargetsByName,
              directJson.venueRevenueTargets,
              true
            );

            const venueUnitPriceTargets = buildAmountRowsFromSheetAndBackend(
              sheetTargets?.venueUnitPriceTargetsByName,
              directJson.venueUnitPriceTargets,
              false
            );

            return NextResponse.json({
              ...directJson,
              lastUpdated: directJson.lastUpdated || defaultDate,
              sheetUrl: TARGET_SHEET_URL,
              isTargetEndpointReady: true,
              visitorTargets: mergedVisitorTargets,
              venueUsageTargets: mergedVenueUsageTargets,
              venueRevenueTargets,
              venueUnitPriceTargets,
            });
          }
        }
      } catch {
        // Proceed to V6 SSOT actuals bridge if endpoint is unreachable
      }
    }

    // 2. Fallback: V6 공식 SSOT(venue-usage-rate + leisure-usage-rate) 실적 + 구글시트 목표 직결
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const [usageRes, seriesRes, sheetTargets] = await Promise.all([
      fetch(
        `${backendBase}/api/v6/report/venue-usage-rate?startDate=${startDate}&endDate=${endDate}&year=${targetYear}&_t=${Date.now()}`,
        {
          headers: authHeaders,
          cache: 'no-store',
        }
      ),
      fetch(`${backendBase}/api/v6/report/leisure-usage-rate?_t=${Date.now()}`, {
        headers: authHeaders,
        cache: 'no-store',
      }).catch(() => null),
      sheetTargetsPromise,
    ]);

    if (!usageRes.ok) {
      throw new Error(`Backend V6 venue-usage-rate responded with HTTP ${usageRes.status}`);
    }

    const usageData = await usageRes.json();
    if (!usageData?.success || !usageData?.denominator) {
      throw new Error(usageData?.error || 'Failed to fetch V6 venue-usage-rate SSOT data');
    }

    const seriesData =
      seriesRes && seriesRes.ok ? await seriesRes.json().catch(() => null) : null;

    const seriesByFacility = new Map<
      string,
      Map<string, { visitors: number | null; usageRatePct: number | null; denominator: number | null }>
    >();
    if (seriesData?.success && Array.isArray(seriesData.series)) {
      for (const sItem of seriesData.series) {
        const fName = sItem?.facilityName;
        if (!fName || !Array.isArray(sItem.data)) continue;
        const monthMap = new Map<
          string,
          { visitors: number | null; usageRatePct: number | null; denominator: number | null }
        >();
        for (const pt of sItem.data) {
          if (typeof pt?.month === 'string' && pt.month.startsWith(`${targetYear}-`)) {
            const mNum = String(Number(pt.month.slice(5, 7)));
            monthMap.set(mNum, {
              visitors: typeof pt.visitors === 'number' ? pt.visitors : null,
              usageRatePct: typeof pt.usageRate === 'number' ? pt.usageRate : null,
              denominator:
                typeof pt.exGolfVisitors === 'number'
                  ? pt.exGolfVisitors
                  : typeof pt.totalRoomGuests === 'number'
                    ? pt.totalRoomGuests
                    : null,
            });
          }
        }
        seriesByFacility.set(fName, monthMap);
      }
    }

    const leisureSheetSeries = sheetTargets?.visitorTargetsByKey.get('LEISURE_TOTAL');
    const walkinSheetSeries = sheetTargets?.visitorTargetsByKey.get('WALKIN_DIGITAL');

    const leisureTotalMonthly: Record<string, VisitorTargetCell> = {};
    const roomVisitorsMonthly: Record<string, VisitorTargetCell> = {};
    const walkinDigitalMonthly: Record<string, VisitorTargetCell> = {};

    for (let m = 1; m <= 12; m++) {
      const mKey = String(m);
      leisureTotalMonthly[mKey] = {
        ...createEmptyVisitorCell(),
        target: leisureSheetSeries?.monthly?.[mKey] ?? null,
      };
      roomVisitorsMonthly[mKey] = createEmptyVisitorCell();
      walkinDigitalMonthly[mKey] = {
        ...createEmptyVisitorCell(),
        target: walkinSheetSeries?.monthly?.[mKey] ?? null,
      };
    }

    const monthlyTrends: any[] = Array.isArray(usageData.monthlyTrends)
      ? usageData.monthlyTrends
      : [];

    for (const mItem of monthlyTrends) {
      const mNum =
        typeof mItem.monthNum === 'number'
          ? mItem.monthNum
          : typeof mItem.month === 'string'
            ? Number(mItem.month.slice(5, 7))
            : 0;
      if (mNum < 1 || mNum > 12) continue;
      const mKey = String(mNum);

      leisureTotalMonthly[mKey] = {
        target:
          leisureSheetSeries?.monthly?.[mKey] ??
          (typeof mItem.targetVisitors === 'number' ? mItem.targetVisitors : null),
        actual: typeof mItem.targetPoolVisitors === 'number' ? mItem.targetPoolVisitors : null,
        achievementRatePct:
          typeof mItem.targetPoolAchievementPct === 'number'
            ? mItem.targetPoolAchievementPct
            : null,
      };

      roomVisitorsMonthly[mKey] = {
        target: typeof mItem.targetRoomGuestsExGolf === 'number' ? mItem.targetRoomGuestsExGolf : null,
        actual: typeof mItem.roomGuestsExGolf === 'number' ? mItem.roomGuestsExGolf : null,
        achievementRatePct:
          typeof mItem.roomGuestsAchievementPct === 'number'
            ? mItem.roomGuestsAchievementPct
            : null,
      };

      walkinDigitalMonthly[mKey] = {
        target:
          walkinSheetSeries?.monthly?.[mKey] ??
          (typeof mItem.targetParkingWalkinVisitors === 'number'
            ? mItem.targetParkingWalkinVisitors
            : null),
        actual:
          typeof mItem.parkingWalkinVisitors === 'number' ? mItem.parkingWalkinVisitors : null,
        achievementRatePct:
          typeof mItem.walkinAchievementPct === 'number' ? mItem.walkinAchievementPct : null,
      };
    }

    const denom = usageData.denominator || {};
    const visitorTargets: VisitorTargetRow[] = [
      {
        rowKey: 'LEISURE_TOTAL',
        label: '레저본부 방문객',
        subLabel: '숙박 방문객 + 나들이 방문객 (통합 모수)',
        badgeText: '숙박 + 나들이 = 레저본부 방문객',
        annual: {
          target:
            leisureSheetSeries?.annual ??
            (typeof denom.targetAnnualPoolVisitors === 'number'
              ? denom.targetAnnualPoolVisitors
              : null),
          actual: typeof denom.targetPoolVisitors === 'number' ? denom.targetPoolVisitors : null,
          achievementRatePct:
            typeof denom.targetPoolAchievementPct === 'number'
              ? denom.targetPoolAchievementPct
              : null,
        },
        monthly: leisureTotalMonthly,
      },
      {
        rowKey: 'ROOM_VISITORS',
        label: '숙박 방문객',
        subLabel: '순수 숙박객 (골프 중복 숙박객 제외)',
        badgeText: '숙박객 (골프제외)',
        annual: {
          target:
            typeof denom.targetAnnualRoomGuestsExGolf === 'number'
              ? denom.targetAnnualRoomGuestsExGolf
              : null,
          actual: typeof denom.roomGuestsExGolf === 'number' ? denom.roomGuestsExGolf : null,
          achievementRatePct:
            typeof denom.roomGuestsAchievementPct === 'number'
              ? denom.roomGuestsAchievementPct
              : null,
        },
        monthly: roomVisitorsMonthly,
      },
      {
        rowKey: 'WALKIN_DIGITAL',
        label: '디지털지원 할당',
        subLabel: '나들이 방문객 (= 데일리 워크인 고객)',
        badgeText: '디지털지원 할당 = 나들이 방문객',
        annual: {
          target:
            walkinSheetSeries?.annual ??
            (typeof denom.targetAnnualWalkinVisitors === 'number'
              ? denom.targetAnnualWalkinVisitors
              : null),
          actual:
            typeof denom.parkingWalkinVisitors === 'number' ? denom.parkingWalkinVisitors : null,
          achievementRatePct:
            typeof denom.walkinAchievementPct === 'number' ? denom.walkinAchievementPct : null,
        },
        monthly: walkinDigitalMonthly,
      },
    ];

    const rawVenues: any[] = Array.isArray(usageData.venues) ? usageData.venues : [];
    const annualVenueMap = new Map<string, any>();
    for (const v of rawVenues) {
      if (v?.venueName) {
        annualVenueMap.set(v.venueName, v);
      }
    }
    if (usageData.mountainCartCombined?.venueName) {
      annualVenueMap.set(
        usageData.mountainCartCombined.venueName,
        usageData.mountainCartCombined
      );
    }

    const buildVenueRow = (
      venueKey: string,
      displayName: string,
      rawVenueName: string,
      partName: string,
      isCoreSheetVenue: boolean
    ): VenueUsageTargetRow => {
      const annualObj = annualVenueMap.get(rawVenueName);
      const facilitySeriesMap = seriesByFacility.get(rawVenueName);
      const sheetVenueSeries = sheetTargets?.venueRateTargetsByName.get(displayName);

      const monthlyCells: Record<string, VenueUsageTargetCell> = {};
      for (let m = 1; m <= 12; m++) {
        const mKey = String(m);
        monthlyCells[mKey] = {
          ...createEmptyVenueCell(),
          targetRatePct: sheetVenueSeries?.monthly?.[mKey] ?? null,
        };
      }

      for (const mItem of monthlyTrends) {
        const mNum =
          typeof mItem.monthNum === 'number'
            ? mItem.monthNum
            : typeof mItem.month === 'string'
              ? Number(mItem.month.slice(5, 7))
              : 0;
        if (mNum < 1 || mNum > 12) continue;
        const mKey = String(mNum);

        const venueInTrend = mItem.venues ? mItem.venues[rawVenueName] : undefined;
        const venueInSeries = facilitySeriesMap ? facilitySeriesMap.get(mKey) : undefined;

        const actualRatePct =
          typeof venueInTrend?.usageRatePct === 'number'
            ? venueInTrend.usageRatePct
            : typeof venueInSeries?.usageRatePct === 'number'
              ? venueInSeries.usageRatePct
              : null;

        const visitors =
          typeof venueInTrend?.visitors === 'number'
            ? venueInTrend.visitors
            : typeof venueInSeries?.visitors === 'number'
              ? venueInSeries.visitors
              : null;

        const denominator =
          typeof mItem.targetPoolVisitors === 'number'
            ? mItem.targetPoolVisitors
            : typeof venueInSeries?.denominator === 'number'
              ? venueInSeries.denominator
              : null;

        monthlyCells[mKey] = {
          targetRatePct:
            sheetVenueSeries?.monthly?.[mKey] ??
            (typeof venueInTrend?.targetUsageRatePct === 'number'
              ? venueInTrend.targetUsageRatePct
              : null),
          actualRatePct,
          achievementRatePct:
            typeof venueInTrend?.achievementRatePct === 'number'
              ? venueInTrend.achievementRatePct
              : null,
          visitors,
          denominator,
        };
      }

      return {
        venueKey,
        venueName: displayName,
        rawVenueName,
        partName,
        isCoreSheetVenue,
        annual: {
          targetRatePct:
            sheetVenueSeries?.annual ??
            (typeof annualObj?.targetUsageRatePct === 'number'
              ? annualObj.targetUsageRatePct
              : null),
          actualRatePct:
            typeof annualObj?.usageRatePct === 'number' ? annualObj.usageRatePct : null,
          achievementRatePct:
            typeof annualObj?.achievementRatePct === 'number'
              ? annualObj.achievementRatePct
              : null,
          visitors: typeof annualObj?.visitors === 'number' ? annualObj.visitors : null,
          denominator:
            typeof annualObj?.denominator === 'number'
              ? annualObj.denominator
              : typeof denom.targetPoolVisitors === 'number'
                ? denom.targetPoolVisitors
                : null,
        },
        monthly: monthlyCells,
      };
    };

    const venueUsageTargets: VenueUsageTargetRow[] = [];
    const includedRawNames = new Set<string>();

    for (const spec of CORE_SHEET_VENUE_SPECS) {
      venueUsageTargets.push(
        buildVenueRow(
          spec.venueKey,
          spec.displayName,
          spec.rawVenueName,
          spec.partName,
          true
        )
      );
      includedRawNames.add(spec.rawVenueName);
    }

    for (const v of rawVenues) {
      const rName = v?.venueName;
      if (!rName || includedRawNames.has(rName)) continue;
      if (EXCLUDED_NON_LEISURE_VENUES.has(rName)) continue;
      if (v.teamName && v.teamName !== '레저본부' && v.teamName !== '미분류') continue;
      if (v.categoryCode === 'MOTO') continue;

      venueUsageTargets.push(
        buildVenueRow(
          `EXTRA_${rName}`,
          rName,
          rName,
          v.partName || rName,
          false
        )
      );
      includedRawNames.add(rName);
    }

    const venueRevenueTargets = buildAmountRowsFromSheetAndBackend(
      sheetTargets?.venueRevenueTargetsByName,
      undefined,
      true
    );

    const venueUnitPriceTargets = buildAmountRowsFromSheetAndBackend(
      sheetTargets?.venueUnitPriceTargetsByName,
      undefined,
      false
    );

    const responsePayload: MonthlyVisitorTargetsResponse = {
      success: true,
      year: targetYear,
      lastUpdated: defaultDate,
      sheetUrl: TARGET_SHEET_URL,
      isTargetEndpointReady: false,
      ssotFormula:
        '숙박 방문객(골프제외) + 나들이 방문객(디지털지원 할당) = 레저본부 방문객',
      visitorTargets,
      venueUsageTargets,
      venueRevenueTargets,
      venueUnitPriceTargets,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error in /api/monthly-visitor-targets:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || '월별 방문객 및 이용률 목표 데이터를 불러오지 못했습니다.',
      },
      { status: 500 }
    );
  }
}
