import { NextRequest, NextResponse } from 'next/server';
import { getLatestClosedDateStr } from '@/lib/dateUtils';
import type {
  MonthlyVisitorTargetsResponse,
  VisitorTargetCell,
  VisitorTargetRow,
  VenueUsageTargetCell,
  VenueUsageTargetRow,
} from '@/types/monthly-visitor-targets';

export const dynamic = 'force-dynamic';

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

    // 1. 백엔드 신규 전용 엔드포인트(/api/v6/report/monthly-visitor-targets) 1:1 직결 호출 시도
    for (const ep of [
      '/api/v6/report/monthly-visitor-targets',
      '/api/v6/dashboard/monthly-visitor-targets',
    ]) {
      try {
        const directRes = await fetch(
          `${backendBase}${ep}?year=${targetYear}&_t=${Date.now()}`,
          {
            headers: authHeaders,
            cache: 'no-store',
          }
        );
        if (directRes.ok) {
          const directJson = await directRes.json();
          if (
            directJson &&
            directJson.success &&
            Array.isArray(directJson.visitorTargets) &&
            Array.isArray(directJson.venueUsageTargets)
          ) {
            return NextResponse.json({
              ...directJson,
              isTargetEndpointReady: true,
            });
          }
        }
      } catch {
        // Proceed to V6 SSOT actuals bridge while target endpoint is pending deployment
      }
    }

    // 2. 백엔드 목표치 전용 API 배포 전: V6 공식 SSOT(venue-usage-rate + leisure-usage-rate)에서
    //    연간/월별 '실적(actual)' 완제품만 1:1 직결하고, '목표(target)' 및 '달성률(achievementRatePct)'은
    //    Zero-Proxy / Fail-Stop 원칙에 따라 null('-')로 반환
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const [usageRes, seriesRes] = await Promise.all([
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

    // 보조 시리즈 맵 (마운틴카트(전체) 및 벨포레 목장(체험) 등 월별 백엔드 사전연산 값 조회용)
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

    // -------------------------------------------------------------------------
    // Table 1: 월별 방문객 목표 (레저본부 방문객 / 숙박 방문객 / 디지털지원 할당=나들이 방문객)
    // -------------------------------------------------------------------------
    const leisureTotalMonthly: Record<string, VisitorTargetCell> = {};
    const roomVisitorsMonthly: Record<string, VisitorTargetCell> = {};
    const walkinDigitalMonthly: Record<string, VisitorTargetCell> = {};

    for (let m = 1; m <= 12; m++) {
      const mKey = String(m);
      leisureTotalMonthly[mKey] = createEmptyVisitorCell();
      roomVisitorsMonthly[mKey] = createEmptyVisitorCell();
      walkinDigitalMonthly[mKey] = createEmptyVisitorCell();
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
        target: typeof mItem.targetVisitors === 'number' ? mItem.targetVisitors : null,
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
          typeof mItem.targetParkingWalkinVisitors === 'number'
            ? mItem.targetParkingWalkinVisitors
            : null,
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
          target: typeof denom.targetAnnualPoolVisitors === 'number' ? denom.targetAnnualPoolVisitors : null,
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
          target: typeof denom.targetAnnualRoomGuestsExGolf === 'number' ? denom.targetAnnualRoomGuestsExGolf : null,
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
            typeof denom.targetAnnualWalkinVisitors === 'number'
              ? denom.targetAnnualWalkinVisitors
              : null,
          actual:
            typeof denom.parkingWalkinVisitors === 'number' ? denom.parkingWalkinVisitors : null,
          achievementRatePct:
            typeof denom.walkinAchievementPct === 'number' ? denom.walkinAchievementPct : null,
        },
        monthly: walkinDigitalMonthly,
      },
    ];

    // -------------------------------------------------------------------------
    // Table 2: 월별 이용률 목표 (레저본부 영업장별)
    // -------------------------------------------------------------------------
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

      const monthlyCells: Record<string, VenueUsageTargetCell> = {};
      for (let m = 1; m <= 12; m++) {
        const mKey = String(m);
        monthlyCells[mKey] = createEmptyVenueCell();
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
            typeof venueInTrend?.targetUsageRatePct === 'number'
              ? venueInTrend.targetUsageRatePct
              : null,
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
            typeof annualObj?.targetUsageRatePct === 'number'
              ? annualObj.targetUsageRatePct
              : null,
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

    // 1) 이미지 시트 기준 4대 핵심 레저 영업장 우선 배치 (미디어아트센터, 목장, 사계절썰매, 마운틴카트)
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

    // 2) 그 외 레저본부 소속 영업장 추가 (타 본부 놀이동산·모토아레나·골프장 100% 격리 배제)
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

    const responsePayload: MonthlyVisitorTargetsResponse = {
      success: true,
      year: targetYear,
      lastUpdated: defaultDate,
      isTargetEndpointReady: false,
      ssotFormula:
        '숙박 방문객(골프제외) + 나들이 방문객(디지털지원 할당) = 레저본부 방문객',
      visitorTargets,
      venueUsageTargets,
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
