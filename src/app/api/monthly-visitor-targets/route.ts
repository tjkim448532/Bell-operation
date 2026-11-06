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
  visitorTargetsByKey: Map<'LEISURE_TOTAL' | 'ROOM_VISITORS' | 'WALKIN_DIGITAL', SheetTargetSeries>;
  venueRateTargetsByName: Map<string, SheetTargetSeries>;
  venueRevenueTargetsByName: Map<string, SheetTargetSeries>;
  venueUnitPriceTargetsByName: Map<string, SheetTargetSeries>;
}

function calcAchievementPct(actual: number | null | undefined, target: number | null | undefined): number | null {
  if (actual === null || actual === undefined || !Number.isFinite(actual)) return null;
  if (target === null || target === undefined || !Number.isFinite(target) || target <= 0) return null;
  return Number(((actual / target) * 100).toFixed(2));
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

    const visitorTargetsByKey = new Map<'LEISURE_TOTAL' | 'ROOM_VISITORS' | 'WALKIN_DIGITAL', SheetTargetSeries>();
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
        } else if (rawLabel.includes('숙박')) {
          visitorTargetsByKey.set('ROOM_VISITORS', { annual, monthly });
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

    // SSOT 등식: 숙박 방문객(ROOM_VISITORS) + 나들이 방문객(WALKIN_DIGITAL) = 레저본부 방문객(LEISURE_TOTAL)
    if (!visitorTargetsByKey.has('ROOM_VISITORS')) {
      const leisureTotal = visitorTargetsByKey.get('LEISURE_TOTAL');
      const walkinDigital = visitorTargetsByKey.get('WALKIN_DIGITAL');
      if (leisureTotal && walkinDigital) {
        const roomMonthly: Record<string, number | null> = {};
        for (let m = 1; m <= 12; m++) {
          const mKey = String(m);
          const lVal = leisureTotal.monthly[mKey];
          const wVal = walkinDigital.monthly[mKey];
          roomMonthly[mKey] =
            lVal !== null && lVal !== undefined && wVal !== null && wVal !== undefined
              ? lVal - wVal
              : null;
        }
        const roomAnnual =
          leisureTotal.annual !== null &&
          leisureTotal.annual !== undefined &&
          walkinDigital.annual !== null &&
          walkinDigital.annual !== undefined
            ? leisureTotal.annual - walkinDigital.annual
            : null;
        visitorTargetsByKey.set('ROOM_VISITORS', {
          annual: roomAnnual,
          monthly: roomMonthly,
        });
      }
    }

    // 매출 목표 '합계' 행의 월별 목표가 시트에서 공란인 경우 7대 업장 월별 목표 합산(= 2,947,129,676원)으로 보강
    const totalRevSeries = venueRevenueTargetsByName.get('합계') || {
      annual: null,
      monthly: {},
    };
    let annualSumFromVenues = 0;
    let hasAnyVenueAnnual = false;
    for (const spec of REVENUE_SHEET_VENUE_SPECS) {
      const vSeries = venueRevenueTargetsByName.get(spec.displayName);
      if (vSeries?.annual !== null && vSeries?.annual !== undefined) {
        annualSumFromVenues += vSeries.annual;
        hasAnyVenueAnnual = true;
      }
    }
    if (totalRevSeries.annual === null && hasAnyVenueAnnual) {
      totalRevSeries.annual = annualSumFromVenues;
    }
    for (let m = 1; m <= 12; m++) {
      const mKey = String(m);
      if (totalRevSeries.monthly[mKey] === null || totalRevSeries.monthly[mKey] === undefined) {
        let monthSum = 0;
        let hasMonthTarget = false;
        for (const spec of REVENUE_SHEET_VENUE_SPECS) {
          const vTarget = venueRevenueTargetsByName.get(spec.displayName)?.monthly?.[mKey];
          if (vTarget !== null && vTarget !== undefined) {
            monthSum += vTarget;
            hasMonthTarget = true;
          }
        }
        totalRevSeries.monthly[mKey] = hasMonthTarget ? monthSum : null;
      }
    }
    venueRevenueTargetsByName.set('합계', totalRevSeries);

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

interface DailySalesPeriodMetric {
  isActivePeriod: boolean;
  revenueByVenueKey: Record<string, number>;
  unitPriceByVenueKey: Record<string, number | null>;
}

interface DailySalesActualsBundle {
  annual: DailySalesPeriodMetric;
  monthly: Record<string, DailySalesPeriodMetric>;
}

const dailySalesActualsCache = new Map<
  number,
  { timestamp: number; data: DailySalesActualsBundle }
>();
const ACTUALS_CACHE_TTL_MS = 5 * 60 * 1000;

function extractPeriodMetricFromDailySales(data: any[]): DailySalesPeriodMetric {
  const venueStats = new Map<
    string,
    { rev: number; vis: number; unitPrice: number | null }
  >();
  let ticketCategoryTotal = 0;
  let hasGiftShopInTicket = false;

  const ticketCat = Array.isArray(data)
    ? data.find((c: any) => c?.category_code === 'TICKET')
    : null;
  if (ticketCat) {
    ticketCategoryTotal = Number(ticketCat?.subtotal?.todayActual ?? 0);
    for (const t of ticketCat.teams || []) {
      for (const p of t.parts || []) {
        for (const v of p.venues || []) {
          const vName = String(v?.venue_name ?? '').trim();
          if (!vName) continue;
          if (vName === '미디어-기프트샵') hasGiftShopInTicket = true;
          const prev = venueStats.get(vName) || { rev: 0, vis: 0, unitPrice: null };
          const rev = Number(v?.subtotal?.todayActual ?? 0);
          const vis = Number(v?.subtotal?.visitorCount ?? 0);
          const uPrice =
            typeof v?.subtotal?.unitPrice === 'number' && v.subtotal.unitPrice > 0
              ? Math.round(v.subtotal.unitPrice)
              : prev.unitPrice;
          venueStats.set(vName, {
            rev: prev.rev + rev,
            vis: prev.vis + vis,
            unitPrice: uPrice,
          });
        }
      }
    }
  }

  if (!hasGiftShopInTicket) {
    const goodsCat = Array.isArray(data)
      ? data.find((c: any) => c?.category_code === 'GOODS')
      : null;
    if (goodsCat) {
      for (const t of goodsCat.teams || []) {
        for (const p of t.parts || []) {
          for (const v of p.venues || []) {
            if (v?.venue_name === '미디어-기프트샵') {
              const prev = venueStats.get('미디어-기프트샵') || {
                rev: 0,
                vis: 0,
                unitPrice: null,
              };
              const rev = Number(v?.subtotal?.todayActual ?? 0);
              venueStats.set('미디어-기프트샵', {
                rev: prev.rev + rev,
                vis: prev.vis,
                unitPrice: prev.unitPrice,
              });
            }
          }
        }
      }
    }
  }

  const getRev = (name: string) => venueStats.get(name)?.rev ?? 0;
  const getVis = (name: string) => venueStats.get(name)?.vis ?? 0;
  const getUnit = (name: string) => venueStats.get(name)?.unitPrice ?? null;

  // 시트 각주: 미디어 아트 센터 총 매출 합 = 미디어 아트 센터 + 카페 + 기념품
  const mediaArtRev = Math.round(
    getRev('미디어아트센터') + getRev('미디어-뮤지엄카페') + getRev('미디어-기프트샵')
  );
  const mediaArtVis = getVis('미디어아트센터');
  const mediaArtUnit = mediaArtVis > 0 ? Math.round(mediaArtRev / mediaArtVis) : null;

  // 시트 각주: 목장 총 매출 합 = 목장 + 목장체험 + 얼룩말카페
  const ranchRev = Math.round(
    getRev('벨포레 목장') + getRev('벨포레 목장(체험)') + getRev('얼룩말카페')
  );
  const ranchVis = getVis('벨포레 목장');
  const ranchUnit = ranchVis > 0 ? Math.round(ranchRev / ranchVis) : null;

  const sledRev = Math.round(getRev('사계절썰매장'));
  const sledVis = getVis('사계절썰매장');
  const sledUnit = getUnit('사계절썰매장') ?? (sledVis > 0 ? Math.round(sledRev / sledVis) : null);

  const mCartRev = Math.round(
    getRev('마운틴카트(그랜드포렛)') + getRev('마운틴카트(미니포렛)')
  );
  const mCartVis = getVis('마운틴카트(그랜드포렛)') + getVis('마운틴카트(미니포렛)');
  const mCartUnit = mCartVis > 0 ? Math.round(mCartRev / mCartVis) : null;

  const wonderRev = Math.round(getRev('원더풀'));
  const wonderVis = getVis('원더풀');
  const wonderUnit =
    getUnit('원더풀') ?? (wonderVis > 0 ? Math.round(wonderRev / wonderVis) : null);

  const summerRev = Math.round(getRev('썸머랜드'));
  const summerVis = getVis('썸머랜드');
  const summerUnit =
    getUnit('썸머랜드') ?? (summerVis > 0 ? Math.round(summerRev / summerVis) : null);

  const marinaRev = Math.round(getRev('마리나 클럽'));
  const marinaVis = getVis('마리나 클럽');
  const marinaUnit =
    getUnit('마리나 클럽') ?? (marinaVis > 0 ? Math.round(marinaRev / marinaVis) : null);

  const totalRev =
    mediaArtRev + ranchRev + sledRev + mCartRev + wonderRev + summerRev + marinaRev;

  return {
    isActivePeriod: ticketCategoryTotal > 0 || totalRev > 0,
    revenueByVenueKey: {
      MEDIA_ART: mediaArtRev,
      RANCH: ranchRev,
      SLED: sledRev,
      MOUNTAIN_CART: mCartRev,
      WONDERPOOL: wonderRev,
      SUMMERLAND: summerRev,
      MARINA_CLUB: marinaRev,
      TOTAL: totalRev,
    },
    unitPriceByVenueKey: {
      MEDIA_ART: mediaArtUnit,
      RANCH: ranchUnit,
      SLED: sledUnit,
      MOUNTAIN_CART: mCartUnit,
      WONDERPOOL: wonderUnit,
      SUMMERLAND: summerUnit,
      MARINA_CLUB: marinaUnit,
    },
  };
}

async function fetchBackendRevenueAndUnitPriceActuals(
  targetYear: number,
  backendBase: string,
  authHeaders: Record<string, string>
): Promise<DailySalesActualsBundle | null> {
  const cached = dailySalesActualsCache.get(targetYear);
  if (cached && Date.now() - cached.timestamp < ACTUALS_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthlyPromises = monthNumbers.map(async (m) => {
      const mm = String(m).padStart(2, '0');
      const lastDay = String(new Date(targetYear, m, 0).getDate()).padStart(2, '0');
      const start = `${targetYear}-${mm}-01`;
      const end = `${targetYear}-${mm}-${lastDay}`;
      try {
        const res = await fetch(
          `${backendBase}/api/v6/report/daily-sales?startDate=${start}&endDate=${end}`,
          {
            headers: authHeaders,
            next: { revalidate: 300 },
          }
        );
        if (res.ok) {
          const json = await res.json().catch(() => null);
          return { mKey: String(m), metric: extractPeriodMetricFromDailySales(json?.data || []) };
        }
      } catch {
        // Ignore single month fetch failure
      }
      return {
        mKey: String(m),
        metric: extractPeriodMetricFromDailySales([]),
      };
    });

    const annualPromise = (async () => {
      try {
        const res = await fetch(
          `${backendBase}/api/v6/report/daily-sales?startDate=${targetYear}-01-01&endDate=${targetYear}-12-31`,
          {
            headers: authHeaders,
            next: { revalidate: 300 },
          }
        );
        if (res.ok) {
          const json = await res.json().catch(() => null);
          return extractPeriodMetricFromDailySales(json?.data || []);
        }
      } catch {
        // Ignore annual fetch failure
      }
      return extractPeriodMetricFromDailySales([]);
    })();

    const [monthlyResults, annualMetric] = await Promise.all([
      Promise.all(monthlyPromises),
      annualPromise,
    ]);

    const monthlyMap: Record<string, DailySalesPeriodMetric> = {};
    for (const item of monthlyResults) {
      monthlyMap[item.mKey] = item.metric;
    }

    const bundle: DailySalesActualsBundle = {
      annual: annualMetric,
      monthly: monthlyMap,
    };
    dailySalesActualsCache.set(targetYear, { timestamp: Date.now(), data: bundle });
    return bundle;
  } catch {
    return null;
  }
}

function buildAmountRowsFromSheetAndBackend(
  sheetMap: Map<string, SheetTargetSeries> | undefined,
  backendRows: VenueAmountTargetRow[] | undefined,
  includeSummaryRow: boolean,
  dailySalesActuals: DailySalesActualsBundle | null,
  mode: 'REVENUE' | 'UNIT_PRICE'
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

  const resolveActual = (
    venueKey: string,
    bActual: number | null | undefined,
    periodMetric: DailySalesPeriodMetric | undefined,
    targetVal: number | null
  ): number | null => {
    if (bActual !== null && bActual !== undefined && Number.isFinite(bActual)) {
      return bActual;
    }
    if (!periodMetric || !periodMetric.isActivePeriod) return null;
    if (mode === 'REVENUE') {
      const rev = periodMetric.revenueByVenueKey[venueKey];
      if (rev === undefined) return null;
      // 비수기 목표 미배정(null)이면서 실매출도 0원인 경우 '-' 표출
      if (rev === 0 && (targetVal === null || targetVal === undefined)) return null;
      return rev;
    } else {
      const uPrice = periodMetric.unitPriceByVenueKey[venueKey];
      return uPrice !== null && uPrice !== undefined && uPrice > 0 ? uPrice : null;
    }
  };

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
      const finalTarget = hasSheetTarget ? sTarget : (bCell.target ?? null);
      const finalActual = resolveActual(
        spec.venueKey,
        bCell.actual,
        dailySalesActuals?.monthly?.[mKey],
        finalTarget
      );

      monthly[mKey] = {
        target: finalTarget,
        actual: finalActual,
        achievementRatePct: calcAchievementPct(finalActual, finalTarget),
      };
    }

    const sAnnualTarget = sSeries?.annual;
    const hasAnnualSheetTarget = sAnnualTarget !== null && sAnnualTarget !== undefined;
    const finalAnnualTarget = hasAnnualSheetTarget ? sAnnualTarget : (bRow?.annual?.target ?? null);
    const finalAnnualActual = resolveActual(
      spec.venueKey,
      bRow?.annual?.actual,
      dailySalesActuals?.annual,
      finalAnnualTarget
    );

    result.push({
      venueKey: spec.venueKey,
      venueName: spec.displayName,
      rawVenueName: spec.rawVenueName,
      isSummaryRow: false,
      annual: {
        target: finalAnnualTarget,
        actual: finalAnnualActual,
        achievementRatePct: calcAchievementPct(finalAnnualActual, finalAnnualTarget),
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
        const finalTarget = hasSheetTarget ? sTarget : (bCell.target ?? null);
        const finalActual = resolveActual(
          'TOTAL',
          bCell.actual,
          dailySalesActuals?.monthly?.[mKey],
          finalTarget
        );
        monthly[mKey] = {
          target: finalTarget,
          actual: finalActual,
          achievementRatePct: calcAchievementPct(finalActual, finalTarget),
        };
      }
      const sAnnualTotal = sTotal?.annual;
      const hasAnnualTotal = sAnnualTotal !== null && sAnnualTotal !== undefined;
      const finalAnnualTotalTarget = hasAnnualTotal ? sAnnualTotal : (bTotal?.annual?.target ?? null);
      const finalAnnualTotalActual = resolveActual(
        'TOTAL',
        bTotal?.annual?.actual,
        dailySalesActuals?.annual,
        finalAnnualTotalTarget
      );

      result.push({
        venueKey: 'TOTAL',
        venueName: '합계',
        rawVenueName: '합계',
        isSummaryRow: true,
        annual: {
          target: finalAnnualTotalTarget,
          actual: finalAnnualTotalActual,
          achievementRatePct: calcAchievementPct(finalAnnualTotalActual, finalAnnualTotalTarget),
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

    // 구글시트 '목표' 원천 데이터 + 백엔드 V6 daily-sales 월별/연간 매출·객단가 실적 병렬 조회
    const sheetTargetsPromise =
      targetYear === 2026 ? fetchSheetTargetsOnly() : Promise.resolve(null);
    const dailySalesActualsPromise = fetchBackendRevenueAndUnitPriceActuals(
      targetYear,
      backendBase,
      authHeaders
    );

    // 1. 백엔드 정식 엔드포인트(/api/v6/report/monthly-visitor-targets) 호출
    for (const ep of [
      '/api/v6/report/monthly-visitor-targets',
      '/api/v6/dashboard/monthly-visitor-targets',
    ]) {
      try {
        const [directRes, sheetTargets, dailySalesActuals] = await Promise.all([
          fetch(`${backendBase}${ep}?year=${targetYear}&_t=${Date.now()}`, {
            headers: authHeaders,
            cache: 'no-store',
          }),
          sheetTargetsPromise,
          dailySalesActualsPromise,
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
                row.rowKey === 'LEISURE_TOTAL' ||
                row.rowKey === 'ROOM_VISITORS' ||
                row.rowKey === 'WALKIN_DIGITAL'
                  ? sheetTargets?.visitorTargetsByKey.get(row.rowKey)
                  : null;
              if (!sheetSeries) return row;

              const mergedMonthly: Record<string, VisitorTargetCell> = {};
              for (let m = 1; m <= 12; m++) {
                const mKey = String(m);
                const bCell = row.monthly?.[mKey] || createEmptyVisitorCell();
                const sTarget = sheetSeries.monthly[mKey];
                const hasSheetTarget = sTarget !== null && sTarget !== undefined;
                const finalTarget = hasSheetTarget ? sTarget : bCell.target;
                const finalActual = bCell.actual ?? null;
                mergedMonthly[mKey] = {
                  target: finalTarget,
                  actual: finalActual,
                  achievementRatePct:
                    calcAchievementPct(finalActual, finalTarget) ?? bCell.achievementRatePct,
                };
              }

              const sAnnual = sheetSeries.annual;
              const hasAnnualSheet = sAnnual !== null && sAnnual !== undefined;
              const finalAnnualTarget = hasAnnualSheet ? sAnnual : (row.annual?.target ?? null);
              const finalAnnualActual = row.annual?.actual ?? null;

              return {
                ...row,
                annual: {
                  target: finalAnnualTarget,
                  actual: finalAnnualActual,
                  achievementRatePct:
                    calcAchievementPct(finalAnnualActual, finalAnnualTarget) ??
                    (row.annual?.achievementRatePct ?? null),
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
                  const finalTargetRate = hasSheetRate ? sTargetRate : bCell.targetRatePct;
                  const finalActualRate = bCell.actualRatePct ?? null;
                  mergedMonthly[mKey] = {
                    targetRatePct: finalTargetRate,
                    actualRatePct: finalActualRate,
                    achievementRatePct:
                      calcAchievementPct(finalActualRate, finalTargetRate) ??
                      bCell.achievementRatePct,
                    visitors: bCell.visitors ?? null,
                    denominator: bCell.denominator ?? null,
                  };
                }

                const sAnnualRate = sheetSeries.annual;
                const hasAnnualRate = sAnnualRate !== null && sAnnualRate !== undefined;
                const finalAnnualRate = hasAnnualRate
                  ? sAnnualRate
                  : (row.annual?.targetRatePct ?? null);
                const finalAnnualActualRate = row.annual?.actualRatePct ?? null;

                return {
                  ...row,
                  annual: {
                    targetRatePct: finalAnnualRate,
                    actualRatePct: finalAnnualActualRate,
                    achievementRatePct:
                      calcAchievementPct(finalAnnualActualRate, finalAnnualRate) ??
                      (row.annual?.achievementRatePct ?? null),
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
              true,
              dailySalesActuals,
              'REVENUE'
            );

            const venueUnitPriceTargets = buildAmountRowsFromSheetAndBackend(
              sheetTargets?.venueUnitPriceTargetsByName,
              directJson.venueUnitPriceTargets,
              false,
              dailySalesActuals,
              'UNIT_PRICE'
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

    // 2. Fallback: V6 공식 SSOT(venue-usage-rate + leisure-usage-rate + daily-sales) 실적 + 구글시트 목표 직결
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const [usageRes, seriesRes, sheetTargets, dailySalesActuals] = await Promise.all([
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
      dailySalesActualsPromise,
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
    const roomSheetSeries = sheetTargets?.visitorTargetsByKey.get('ROOM_VISITORS');
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
      roomVisitorsMonthly[mKey] = {
        ...createEmptyVisitorCell(),
        target: roomSheetSeries?.monthly?.[mKey] ?? null,
      };
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

      const lTarget =
        leisureSheetSeries?.monthly?.[mKey] ??
        (typeof mItem.targetVisitors === 'number' ? mItem.targetVisitors : null);
      const lActual =
        typeof mItem.targetPoolVisitors === 'number' ? mItem.targetPoolVisitors : null;
      leisureTotalMonthly[mKey] = {
        target: lTarget,
        actual: lActual,
        achievementRatePct:
          calcAchievementPct(lActual, lTarget) ??
          (typeof mItem.targetPoolAchievementPct === 'number'
            ? mItem.targetPoolAchievementPct
            : null),
      };

      const rTarget =
        roomSheetSeries?.monthly?.[mKey] ??
        (typeof mItem.targetRoomGuestsExGolf === 'number' ? mItem.targetRoomGuestsExGolf : null);
      const rActual = typeof mItem.roomGuestsExGolf === 'number' ? mItem.roomGuestsExGolf : null;
      roomVisitorsMonthly[mKey] = {
        target: rTarget,
        actual: rActual,
        achievementRatePct:
          calcAchievementPct(rActual, rTarget) ??
          (typeof mItem.roomGuestsAchievementPct === 'number'
            ? mItem.roomGuestsAchievementPct
            : null),
      };

      const wTarget =
        walkinSheetSeries?.monthly?.[mKey] ??
        (typeof mItem.targetParkingWalkinVisitors === 'number'
          ? mItem.targetParkingWalkinVisitors
          : null);
      const wActual =
        typeof mItem.parkingWalkinVisitors === 'number' ? mItem.parkingWalkinVisitors : null;
      walkinDigitalMonthly[mKey] = {
        target: wTarget,
        actual: wActual,
        achievementRatePct:
          calcAchievementPct(wActual, wTarget) ??
          (typeof mItem.walkinAchievementPct === 'number' ? mItem.walkinAchievementPct : null),
      };
    }

    const denom = usageData.denominator || {};
    const lAnnualTarget =
      leisureSheetSeries?.annual ??
      (typeof denom.targetAnnualPoolVisitors === 'number'
        ? denom.targetAnnualPoolVisitors
        : null);
    const lAnnualActual =
      typeof denom.targetPoolVisitors === 'number' ? denom.targetPoolVisitors : null;

    const rAnnualTarget =
      roomSheetSeries?.annual ??
      (typeof denom.targetAnnualRoomGuestsExGolf === 'number'
        ? denom.targetAnnualRoomGuestsExGolf
        : null);
    const rAnnualActual =
      typeof denom.roomGuestsExGolf === 'number' ? denom.roomGuestsExGolf : null;

    const wAnnualTarget =
      walkinSheetSeries?.annual ??
      (typeof denom.targetAnnualWalkinVisitors === 'number'
        ? denom.targetAnnualWalkinVisitors
        : null);
    const wAnnualActual =
      typeof denom.parkingWalkinVisitors === 'number' ? denom.parkingWalkinVisitors : null;

    const visitorTargets: VisitorTargetRow[] = [
      {
        rowKey: 'LEISURE_TOTAL',
        label: '레저본부 방문객',
        subLabel: '숙박 방문객 + 나들이 방문객 (통합 모수)',
        badgeText: '숙박 + 나들이 = 레저본부 방문객',
        annual: {
          target: lAnnualTarget,
          actual: lAnnualActual,
          achievementRatePct:
            calcAchievementPct(lAnnualActual, lAnnualTarget) ??
            (typeof denom.targetPoolAchievementPct === 'number'
              ? denom.targetPoolAchievementPct
              : null),
        },
        monthly: leisureTotalMonthly,
      },
      {
        rowKey: 'ROOM_VISITORS',
        label: '숙박 방문객',
        subLabel: '순수 숙박객 (골프 중복 숙박객 제외)',
        badgeText: '숙박객 (골프제외)',
        annual: {
          target: rAnnualTarget,
          actual: rAnnualActual,
          achievementRatePct:
            calcAchievementPct(rAnnualActual, rAnnualTarget) ??
            (typeof denom.roomGuestsAchievementPct === 'number'
              ? denom.roomGuestsAchievementPct
              : null),
        },
        monthly: roomVisitorsMonthly,
      },
      {
        rowKey: 'WALKIN_DIGITAL',
        label: '디지털지원 할당',
        subLabel: '나들이 방문객 (= 데일리 워크인 고객)',
        badgeText: '디지털지원 할당 = 나들이 방문객',
        annual: {
          target: wAnnualTarget,
          actual: wAnnualActual,
          achievementRatePct:
            calcAchievementPct(wAnnualActual, wAnnualTarget) ??
            (typeof denom.walkinAchievementPct === 'number' ? denom.walkinAchievementPct : null),
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

        const targetRatePct =
          sheetVenueSeries?.monthly?.[mKey] ??
          (typeof venueInTrend?.targetUsageRatePct === 'number'
            ? venueInTrend.targetUsageRatePct
            : null);

        monthlyCells[mKey] = {
          targetRatePct,
          actualRatePct,
          achievementRatePct:
            calcAchievementPct(actualRatePct, targetRatePct) ??
            (typeof venueInTrend?.achievementRatePct === 'number'
              ? venueInTrend.achievementRatePct
              : null),
          visitors,
          denominator,
        };
      }

      const annualTargetRatePct =
        sheetVenueSeries?.annual ??
        (typeof annualObj?.targetUsageRatePct === 'number'
          ? annualObj.targetUsageRatePct
          : null);
      const annualActualRatePct =
        typeof annualObj?.usageRatePct === 'number' ? annualObj.usageRatePct : null;

      return {
        venueKey,
        venueName: displayName,
        rawVenueName,
        partName,
        isCoreSheetVenue,
        annual: {
          targetRatePct: annualTargetRatePct,
          actualRatePct: annualActualRatePct,
          achievementRatePct:
            calcAchievementPct(annualActualRatePct, annualTargetRatePct) ??
            (typeof annualObj?.achievementRatePct === 'number'
              ? annualObj.achievementRatePct
              : null),
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
      true,
      dailySalesActuals,
      'REVENUE'
    );

    const venueUnitPriceTargets = buildAmountRowsFromSheetAndBackend(
      sheetTargets?.venueUnitPriceTargetsByName,
      undefined,
      false,
      dailySalesActuals,
      'UNIT_PRICE'
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
