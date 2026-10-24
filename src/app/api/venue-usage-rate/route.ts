import { NextRequest, NextResponse } from 'next/server';
import { getLatestClosedDateStr } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

function shiftYearBack(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yr = Number(parts[0]) - 1;
  return `${yr}-${parts[1]}-${parts[2]}`;
}

function calcDaysBetween(startStr: string, endStr: string): number {
  const d1 = new Date(startStr);
  const d2 = new Date(endStr);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (24 * 3600 * 1000)) + 1;
  return diff > 0 ? diff : 1;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const defaultDate = getLatestClosedDateStr();
    const singleDate = searchParams.get('targetDate') || searchParams.get('date');
    const startDate = searchParams.get('startDate') || singleDate || defaultDate;
    const endDate = searchParams.get('endDate') || singleDate || startDate;
    const targetYear = Number(searchParams.get('year')) || Number(endDate.slice(0, 4));

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'x-m2m-token': token,
    };

    // 1. 백엔드 정식 V6 엔드포인트(/api/v6/report/venue-usage-rate) 최우선 1:1 직결 호출
    const v6Query = `startDate=${startDate}&endDate=${endDate}&year=${targetYear}&_t=${Date.now()}`;
    for (const ep of ['/api/v6/report/venue-usage-rate', '/api/v6/dashboard/venue-usage-rate']) {
      try {
        const directRes = await fetch(`${backendBase}${ep}?${v6Query}`, {
          headers: authHeaders,
          cache: 'no-store',
        });
        if (directRes.ok) {
          const directJson = await directRes.json();
          if (directJson && directJson.success && directJson.denominator) {
            return NextResponse.json(directJson);
          }
        }
      } catch {
        // Proceed to V6 Gold Mart aggregation if endpoint is still propagating on Vercel CDN
      }
    }

    // 2. Vercel CDN 전파 대기 시 V6 Gold Mart(revenue-summary + synergy-store-correlation-v2 + leisure-usage-rate) 기반 동일 규격 생성
    const lyStartDate = shiftYearBack(startDate);
    const lyEndDate = shiftYearBack(endDate);

    const [cyRes, lyRes, synergyRes, monthlyRes] = await Promise.all([
      fetch(`${backendBase}/api/v6/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`, {
        headers: authHeaders,
        cache: 'no-store',
      }),
      fetch(`${backendBase}/api/v6/dashboard/revenue-summary?startDate=${lyStartDate}&endDate=${lyEndDate}`, {
        headers: authHeaders,
        cache: 'no-store',
      }).catch(() => null),
      fetch(`${backendBase}/api/v6/report/synergy-store-correlation-v2?startDate=${startDate}&endDate=${endDate}`, {
        headers: authHeaders,
        cache: 'no-store',
      }).catch(() => null),
      fetch(`${backendBase}/api/v6/report/leisure-usage-rate`, {
        headers: authHeaders,
        cache: 'no-store',
      }).catch(() => null),
    ]);

    if (!cyRes.ok) {
      throw new Error(`Backend V6 responded with HTTP ${cyRes.status}`);
    }

    const cyData = await cyRes.json();
    if (!cyData.success) {
      throw new Error(cyData.error || 'Failed to fetch V6 revenue-summary');
    }

    const lyData = lyRes && lyRes.ok ? await lyRes.json().catch(() => null) : null;
    const synergyData = synergyRes && synergyRes.ok ? await synergyRes.json().catch(() => null) : null;
    const monthlyData = monthlyRes && monthlyRes.ok ? await monthlyRes.json().catch(() => null) : null;

    // Synergy store quantity map (for itemQuantity of F&B and 벨포레 목장(체험))
    const storeQtyMap = new Map<string, number>();
    if (Array.isArray(synergyData?.stores)) {
      for (const st of synergyData.stores) {
        if (st.storeName) {
          storeQtyMap.set(st.storeName, Number(st.totalQuantity || 0));
        }
      }
    }

    const s = cyData.summary || {};
    const rv = cyData.resortVisitors || s.resortVisitors || {};
    const lyRv = lyData?.resortVisitors || lyData?.summary?.resortVisitors || {};

    // 모수(Denominator) SSOT 공식: (room_total_guests - room_golf_synergy_guests) + parking_walkin_visitors
    const roomTotalGuests = Number(rv.roomTotalGuests || s.roomGuests || 0);
    const roomSoldUnits = Number(rv.roomSoldUnits || s.roomsSold || 0);
    const roomGolfSynergyRooms = Number(rv.golfCondoCrossCars || s.golfCondoCrossCars || 0);
    const roomGolfSynergyGuests = Number(rv.roomGolfSynergyGuests || s.roomGolfSynergyGuests || 0);
    const roomGuestsExGolf = Math.max(0, roomTotalGuests - roomGolfSynergyGuests);
    const parkingWalkinVisitors = Number(rv.parkingWalkinVisitors || s.parkingWalkinVisitors || 0);
    const targetPoolVisitors = roomGuestsExGolf + parkingWalkinVisitors;
    const grossPoolVisitors = roomTotalGuests + parkingWalkinVisitors;
    const golfTotalPlayers = Number(rv.golfTotalPlayers || s.totalGolfVisitors || 0);
    const netPhysicalResortGuests = Number(rv.netPhysicalResortGuests || s.netPhysicalResortGuests || 0);

    const roomGuestsExGolfSharePct = targetPoolVisitors > 0
      ? Number(((roomGuestsExGolf / targetPoolVisitors) * 100).toFixed(1))
      : 0;
    const walkinSharePct = targetPoolVisitors > 0
      ? Number((100 - roomGuestsExGolfSharePct).toFixed(1))
      : 0;

    // 전년 동기 모수
    const lyRoomTotalGuests = Number(lyRv.roomTotalGuests || 0);
    const lyRoomGolfSynergyGuests = Number(lyRv.roomGolfSynergyGuests || 0);
    const lyRoomGuestsExGolf = Math.max(0, lyRoomTotalGuests - lyRoomGolfSynergyGuests);
    const lyParkingWalkinVisitors = Number(lyRv.parkingWalkinVisitors || 0);
    const lyTargetPoolVisitors = lyRoomGuestsExGolf + lyParkingWalkinVisitors;
    const targetPoolDiff = targetPoolVisitors - lyTargetPoolVisitors;
    const targetPoolGrowthPct = lyTargetPoolVisitors > 0
      ? Number((((targetPoolVisitors - lyTargetPoolVisitors) / lyTargetPoolVisitors) * 100).toFixed(1))
      : null;

    // LY 시설별 매핑
    const lyFacilitiesMap = new Map<string, { visitors: number; revenue: number }>();
    if (Array.isArray(lyData?.salesByFacility)) {
      for (const lf of lyData.salesByFacility) {
        const name = lf.facilityName || lf.shopName;
        if (name) {
          lyFacilitiesMap.set(name, {
            visitors: Number(lf.visitors || lf.todayVisitors || 0),
            revenue: Number(lf.todayActual || lf.revenue || 0),
          });
        }
      }
    }

    // 카페/식음/부대 제외 순수 어트랙션·레저 매장 분류
    const NON_VISITOR_CAFE_SHOPS = new Set([
      '미디어-뮤지엄카페',
      '얼룩말카페',
      '핏스탑',
      '모토아레나 렌탈샵',
    ]);

    const rawFacilities: any[] = cyData.salesByFacility || [];
    const ranchMainRow = rawFacilities.find(
      (f) => (f.facilityName || f.shopName) === '벨포레 목장'
    );
    const ranchMainVisitors = Number(ranchMainRow?.visitors || ranchMainRow?.todayVisitors || 0);

    // 1) 주요 이용률 산출 대상 매장 (TICKET, MOTO 중 식음성 카페 제외)
    const activeVenueCandidates = rawFacilities.filter((f) => {
      if (f.isSubtotal || f.isGrandTotal) return false;
      const name = f.facilityName || f.shopName || '';
      const code = f.categoryCode || '';
      if (code !== 'TICKET' && code !== 'MOTO') return false;
      if (NON_VISITOR_CAFE_SHOPS.has(name)) return false;
      const v = Number(f.visitors || f.todayVisitors || 0) || (name === '벨포레 목장(체험)' ? (storeQtyMap.get(name) || 0) : 0);
      const rev = Number(f.todayActual || f.revenue || 0);
      return v > 0 || rev > 0;
    });

    // 순수 입장 매장 합산 (체험 서브매장 제외하여 중복 합산 방지)
    const totalVenueVisitors = activeVenueCandidates
      .filter((f) => (f.facilityName || f.shopName) !== '벨포레 목장(체험)')
      .reduce((acc, f) => acc + Number(f.visitors || f.todayVisitors || 0), 0);

    const lyTotalVenueVisitors = lyRv.leisureTicketVisitors
      ? Number(lyRv.leisureTicketVisitors)
      : activeVenueCandidates
          .filter((f) => (f.facilityName || f.shopName) !== '벨포레 목장(체험)')
          .reduce((acc, f) => {
            const name = f.facilityName || f.shopName || '';
            const lyItem = lyFacilitiesMap.get(name);
            return acc + (lyItem ? lyItem.visitors : Number(f.lyVisitors || 0));
          }, 0);

    const totalVenueRevenue = activeVenueCandidates.reduce(
      (acc, f) => acc + Number(f.todayActual || f.revenue || 0),
      0
    );

    const lyTotalVenueRevenue = activeVenueCandidates.reduce((acc, f) => {
      const name = f.facilityName || f.shopName || '';
      const lyItem = lyFacilitiesMap.get(name);
      return acc + (lyItem ? lyItem.revenue : Number(f.todayLy || 0));
    }, 0);

    const sortedCandidates = [...activeVenueCandidates].sort((a, b) => {
      const nameA = a.facilityName || a.shopName || '';
      const nameB = b.facilityName || b.shopName || '';
      const vA = Number(a.visitors || a.todayVisitors || 0) || (nameA === '벨포레 목장(체험)' ? (storeQtyMap.get(nameA) || 0) : 0);
      const vB = Number(b.visitors || b.todayVisitors || 0) || (nameB === '벨포레 목장(체험)' ? (storeQtyMap.get(nameB) || 0) : 0);
      if (vB !== vA) return vB - vA;
      return Number(b.todayActual || 0) - Number(a.todayActual || 0);
    });

    // 최대잔여법(Largest Remainder Method) 기반 visitorSharePct 산출 (비서브 매장 대상 합계 100.0% 보장)
    const exactShares = sortedCandidates.map((f) => {
      const name = f.facilityName || f.shopName || '';
      if (name === '벨포레 목장(체험)') return 0;
      const v = Number(f.visitors || f.todayVisitors || 0);
      return totalVenueVisitors > 0 ? (v / totalVenueVisitors) * 100 : 0;
    });
    const flooredTenths = exactShares.map((val) => Math.floor(val * 10));
    const remainderTenths = totalVenueVisitors > 0
      ? 1000 - flooredTenths.reduce((a, b) => a + b, 0)
      : 0;

    const indicesByRemainder = exactShares
      .map((val, idx) => ({
        idx,
        isSub: (sortedCandidates[idx].facilityName || sortedCandidates[idx].shopName) === '벨포레 목장(체험)',
        rem: val * 10 - flooredTenths[idx],
      }))
      .filter((item) => !item.isSub)
      .sort((a, b) => b.rem - a.rem);

    for (let i = 0; i < remainderTenths && i < indicesByRemainder.length; i++) {
      flooredTenths[indicesByRemainder[i].idx] += 1;
    }

    const venues = sortedCandidates.map((f, idx) => {
      const venueName = f.facilityName || f.shopName || '미분류';
      const categoryCode = f.categoryCode || 'TICKET';
      const categoryName = f.categoryName || '레저본부';
      const isExperienceSubVenue = venueName === '벨포레 목장(체험)';
      const visitors = isExperienceSubVenue
        ? Number(f.visitors || f.todayVisitors || storeQtyMap.get(venueName) || 0)
        : Number(f.visitors || f.todayVisitors || 0);
      const lyMatch = lyFacilitiesMap.get(venueName);
      const lyVisitors = lyMatch ? lyMatch.visitors : Number(f.lyVisitors || f.todayLyVisitors || 0);
      const visitorsDiff = visitors - lyVisitors;
      const visitorsGrowthPct = lyVisitors > 0
        ? Number((((visitors - lyVisitors) / lyVisitors) * 100).toFixed(1))
        : null;

      const usageRatePct = targetPoolVisitors > 0
        ? Number(((visitors / targetPoolVisitors) * 100).toFixed(1))
        : 0;
      const lyUsageRatePct = lyTargetPoolVisitors > 0 && lyVisitors > 0
        ? Number(((lyVisitors / lyTargetPoolVisitors) * 100).toFixed(1))
        : null;
      const usageRateDiffPctp = lyUsageRatePct !== null
        ? Number((usageRatePct - lyUsageRatePct).toFixed(1))
        : null;

      const usageRateGrossPoolPct = grossPoolVisitors > 0
        ? Number(((visitors / grossPoolVisitors) * 100).toFixed(1))
        : 0;
      const usageRateRoomOnlyPct = roomGuestsExGolf > 0
        ? Number(((visitors / roomGuestsExGolf) * 100).toFixed(1))
        : 0;
      const usageRateTotalResortPct = netPhysicalResortGuests > 0
        ? Number(((visitors / netPhysicalResortGuests) * 100).toFixed(1))
        : 0;

      const visitorSharePct = Number((flooredTenths[idx] / 10).toFixed(1));
      const revenue = Math.round(Number(f.todayActual || f.revenue || 0));
      const lyRevenue = Math.round(lyMatch ? lyMatch.revenue : Number(f.todayLy || 0));
      const unitPrice = visitors > 0 && revenue > 0 ? Math.round(revenue / visitors) : null;
      const spendPerPoolGuest = targetPoolVisitors > 0 ? Math.round(revenue / targetPoolVisitors) : 0;

      const conversionFromRanchPct = isExperienceSubVenue && ranchMainVisitors > 0 && visitors > 0
        ? Number(((visitors / ranchMainVisitors) * 100).toFixed(1))
        : null;

      return {
        venueName,
        categoryCode,
        categoryName,
        teamName: categoryCode === 'MOTO' ? '모토아레나' : '레저본부',
        partName: f.partName && f.partName !== '미분류' ? f.partName : venueName,
        isExperienceSubVenue,
        ...(isExperienceSubVenue ? { conversionFromRanchPct } : {}),
        visitors,
        lyVisitors,
        visitorsDiff,
        visitorsGrowthPct,
        denominator: targetPoolVisitors,
        lyDenominator: lyTargetPoolVisitors,
        usageRatePct,
        lyUsageRatePct,
        usageRateDiffPctp,
        usageRateGrossPoolPct,
        usageRateRoomOnlyPct,
        usageRateTotalResortPct,
        visitorSharePct,
        revenue,
        lyRevenue,
        unitPrice,
        spendPerPoolGuest,
      };
    });

    // 마운틴카트(전체) 통합 객체
    const cartGrand = venues.find((v) => v.venueName === '마운틴카트(그랜드포렛)');
    const cartMini = venues.find((v) => v.venueName === '마운틴카트(미니포렛)');
    const cartVisitors = (cartGrand?.visitors || 0) + (cartMini?.visitors || 0);
    const cartLyVisitors = (cartGrand?.lyVisitors || 0) + (cartMini?.lyVisitors || 0);
    const cartRevenue = (cartGrand?.revenue || 0) + (cartMini?.revenue || 0);
    const cartUsageRatePct = targetPoolVisitors > 0
      ? Number(((cartVisitors / targetPoolVisitors) * 100).toFixed(1))
      : 0;
    const cartLyUsageRatePct = lyTargetPoolVisitors > 0
      ? Number(((cartLyVisitors / lyTargetPoolVisitors) * 100).toFixed(1))
      : null;
    const cartUsageRateDiffPctp = cartLyUsageRatePct !== null
      ? Number((cartUsageRatePct - cartLyUsageRatePct).toFixed(1))
      : null;

    const mountainCartCombined = {
      venueName: '마운틴카트(전체)',
      visitors: cartVisitors,
      lyVisitors: cartLyVisitors,
      denominator: targetPoolVisitors,
      usageRatePct: cartUsageRatePct,
      lyUsageRatePct: cartLyUsageRatePct,
      usageRateDiffPctp: cartUsageRateDiffPctp,
      revenue: cartRevenue,
    };

    // 식음(F&B)·카페·연회 참고 섹션
    const fnbAndOtherVenues = rawFacilities
      .filter((f) => {
        if (f.isSubtotal || f.isGrandTotal) return false;
        const name = f.facilityName || f.shopName || '';
        const code = f.categoryCode || '';
        if (code === 'ROOM' || code === 'GOLF') return false;
        const isCafeInLeisure = NON_VISITOR_CAFE_SHOPS.has(name);
        const isFnbOrOther = code === 'FNB' || code === 'BANQUET' || code === 'GOODS';
        if (!isCafeInLeisure && !isFnbOrOther) return false;
        const rev = Number(f.todayActual || f.revenue || 0);
        return rev > 0;
      })
      .map((f) => {
        const venueName = f.facilityName || f.shopName || '기타';
        const categoryCode = f.categoryCode || 'FNB';
        const categoryName = categoryCode === 'FNB' ? '식음(F&B)' : (f.categoryName || '식음(F&B)');
        const revenue = Math.round(Number(f.todayActual || f.revenue || 0));
        const itemQuantity = Number(f.itemQuantity || f.quantity || storeQtyMap.get(venueName) || 0);
        const orderRatePerPoolPct = itemQuantity > 0 && targetPoolVisitors > 0
          ? Number(((itemQuantity / targetPoolVisitors) * 100).toFixed(1))
          : null;
        const spendPerPoolGuest = targetPoolVisitors > 0 ? Math.round(revenue / targetPoolVisitors) : 0;

        return {
          venueName,
          categoryCode,
          categoryName,
          teamName: categoryCode === 'FNB' ? '콘텐츠기획본부' : categoryName,
          isVisitorTracked: false,
          itemQuantity,
          orderRatePerPoolPct,
          revenue,
          spendPerPoolGuest,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // 월별 트렌드 구성 (leisure-usage-rate 연동)
    const monthlyTrends: any[] = [];
    if (monthlyData?.success && Array.isArray(monthlyData.months) && Array.isArray(monthlyData.series)) {
      const targetYearPrefix = `${targetYear}-`;
      const relevantMonths = monthlyData.months.filter((m: string) => m.startsWith(targetYearPrefix));
      for (const m of relevantMonths) {
        const venueMap: Record<string, { visitors: number; usageRatePct: number }> = {};
        let monthRoomGuests = 0;
        let monthTotalVenueVisitors = 0;

        for (const sItem of monthlyData.series) {
          const fName = sItem.facilityName;
          if (!fName || fName === '골프장' || fName === '마운틴카트') continue;
          const pt = Array.isArray(sItem.data) ? sItem.data.find((d: any) => d.month === m) : null;
          if (pt) {
            const vCount = Number(pt.visitors || 0);
            const uRate = Number(pt.usageRate || 0);
            if (pt.totalRoomGuests && pt.totalRoomGuests > monthRoomGuests) {
              monthRoomGuests = Number(pt.totalRoomGuests);
            }
            venueMap[fName] = {
              visitors: vCount,
              usageRatePct: uRate,
            };
            if (fName !== '마운틴카트(전체)' && fName !== '벨포레 목장(체험)') {
              monthTotalVenueVisitors += vCount;
            }
          }
        }

        const overallRate = monthRoomGuests > 0
          ? Number(((monthTotalVenueVisitors / monthRoomGuests) * 100).toFixed(1))
          : 0;

        monthlyTrends.push({
          month: m,
          targetPoolVisitors: monthRoomGuests,
          totalVenueVisitors: monthTotalVenueVisitors,
          overallUsageRatePct: overallRate,
          venues: venueMap,
        });
      }
    }

    const totalVenueVisitorsDiff = totalVenueVisitors - lyTotalVenueVisitors;
    const totalVenueVisitorsGrowthPct = lyTotalVenueVisitors > 0
      ? Number((((totalVenueVisitors - lyTotalVenueVisitors) / lyTotalVenueVisitors) * 100).toFixed(1))
      : null;

    const overallUsageRatePct = targetPoolVisitors > 0
      ? Number(((totalVenueVisitors / targetPoolVisitors) * 100).toFixed(1))
      : 0;
    const lyOverallUsageRatePct = lyTargetPoolVisitors > 0
      ? Number(((lyTotalVenueVisitors / lyTargetPoolVisitors) * 100).toFixed(1))
      : null;
    const overallUsageRateDiffPctp = lyOverallUsageRatePct !== null
      ? Number((overallUsageRatePct - lyOverallUsageRatePct).toFixed(1))
      : null;
    const avgVenuesPerGuest = targetPoolVisitors > 0
      ? Number((totalVenueVisitors / targetPoolVisitors).toFixed(2))
      : 0;

    const topVenue = venues.find((v) => !v.isExperienceSubVenue && v.visitors > 0) || null;

    return NextResponse.json({
      success: true,
      ssotFormula:
        '모수(targetPoolVisitors) = 숙박객(골프제외: room_total_guests - room_golf_synergy_guests) + 데일리 워크인(parking_walkin_visitors)',
      period: {
        targetDate: endDate,
        startDate,
        endDate,
        lyStartDate,
        lyEndDate,
        daysCount: calcDaysBetween(startDate, endDate),
        year: targetYear,
      },
      denominator: {
        targetPoolVisitors,
        roomGuestsExGolf,
        parkingWalkinVisitors,
        roomGuestsExGolfSharePct,
        walkinSharePct,
        roomTotalGuests,
        roomSoldUnits,
        roomGolfSynergyRooms,
        roomGolfSynergyGuests,
        grossPoolVisitors,
        golfTotalPlayers,
        netPhysicalResortGuests,
        lyTargetPoolVisitors,
        lyRoomGuestsExGolf,
        lyParkingWalkinVisitors,
        targetPoolDiff,
        targetPoolGrowthPct,
      },
      summary: {
        targetPoolVisitors,
        roomGuestsExGolf,
        parkingWalkinVisitors,
        roomGuestsExGolfSharePct,
        walkinSharePct,
        totalVenueVisitors,
        lyTotalVenueVisitors,
        totalVenueVisitorsDiff,
        totalVenueVisitorsGrowthPct,
        overallUsageRatePct,
        lyOverallUsageRatePct,
        overallUsageRateDiffPctp,
        avgVenuesPerGuest,
        totalVenueRevenue,
        lyTotalVenueRevenue,
        topVenueName: topVenue ? topVenue.venueName : null,
        topVenueVisitors: topVenue ? topVenue.visitors : 0,
        topVenueUsageRatePct: topVenue ? topVenue.usageRatePct : 0,
      },
      venues,
      mountainCartCombined,
      fnbAndOtherVenues,
      dailyTrends: [],
      monthlyTrends,
    });
  } catch (error: any) {
    console.error('Error in /api/venue-usage-rate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '매장별 이용률 데이터를 가져오지 못했습니다.',
      },
      { status: 500 }
    );
  }
}
