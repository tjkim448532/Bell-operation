import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2026-09-01';
    const endDate = searchParams.get('endDate') || '2026-09-30';

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    const url = `${backendBase}/api/v6/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(url, {
      headers: { 'x-m2m-token': token },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Backend responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch revenue-summary from backend');
    }

    const s = data.summary || {};
    const rv = data.resortVisitors || s.resortVisitors || {};

    // 1. 기준 모수 산출 (숙박객 + 데일리 워크인 고객, 골프 제외 SSOT)
    const roomGuests = Number(s.roomGuests || rv.roomTotalGuests || 0);
    const walkinGuests = Number(s.parkingWalkinVisitors || rv.parkingWalkinVisitors || 0);
    const golfExcluded = Number(s.totalGolfVisitors || rv.golfTotalPlayers || 0);
    const totalBase = roomGuests + walkinGuests;

    const roomGuestsShare = totalBase > 0 ? Number(((roomGuests / totalBase) * 100).toFixed(1)) : 0;
    const walkinGuestsShare = totalBase > 0 ? Number(((walkinGuests / totalBase) * 100).toFixed(1)) : 0;

    // 2. 매장/영업장별 이용객 및 이용률 산출
    // 골프장(GOLF) 및 객실(ROOM)은 리조트 모수 산출/이용률 분모-분자에서 제외 (콘도 숙박 및 골프 라운드는 별도 모수)
    const rawFacilities: any[] = data.salesByFacility || [];
    const facilityList = rawFacilities
      .filter((f) => 
        !f.isSubtotal && 
        !f.isGrandTotal && 
        f.facilityName !== 'ROOM' && 
        f.shopName !== 'ROOM' && 
        f.facilityName !== 'ROOM OTHER' &&
        f.shopName !== 'ROOM OTHER' &&
        f.categoryCode !== 'GOLF' && 
        f.categoryName !== '골프'
      )
      .map((f) => {
        const name = f.facilityName || f.shopName || '미분류';
        const category = f.categoryName || '기타';
        const categoryCode = f.categoryCode || 'OTHER';
        const visitors = Number(f.visitors || f.todayVisitors || 0);
        const lyVisitors = Number(f.lyVisitors || f.todayLyVisitors || 0);
        const revenue = Number(f.todayActual || f.revenue || 0);

        // 공식 이용률 산출: (이용객수 / 총 모수) * 100
        const usageRate = totalBase > 0 ? Number(((visitors / totalBase) * 100).toFixed(1)) : 0;
        const lyUsageRate = null; // 전년 동기 모수가 백엔드에 분리 제공되지 않으므로 추론 금지
        const rateDiff = null;
        const visitorGrowth = lyVisitors > 0
          ? Number((((visitors - lyVisitors) / lyVisitors) * 100).toFixed(1))
          : (visitors > 0 ? null : 0);

        const unitPrice = visitors > 0 && revenue > 0 ? Math.round(revenue / visitors) : null;

        return {
          facilityName: name,
          categoryName: category,
          categoryCode: categoryCode,
          visitors,
          usageRate,
          lyVisitors,
          lyUsageRate,
          rateDiff,
          visitorGrowth,
          revenue,
          unitPrice,
        };
      })
      .sort((a, b) => b.visitors - a.visitors);

    // 순위 부여
    const facilities = facilityList.map((f, index) => ({
      rank: index + 1,
      ...f,
    }));

    // 요약 지표
    const totalFacilityVisitors = facilities.reduce((sum, f) => sum + f.visitors, 0);
    const topFacility = facilities.length > 0 && facilities[0].visitors > 0 ? facilities[0] : null;

    return NextResponse.json({
      success: true,
      period: {
        startDate,
        endDate,
        label: `${startDate} ~ ${endDate}`,
      },
      population: {
        totalBase,
        roomGuests,
        roomGuestsShare,
        walkinGuests,
        walkinGuestsShare,
        golfExcluded,
      },
      summary: {
        totalFacilityVisitors,
        totalRevenue: s.totalRevenue || 0,
        topFacility: topFacility
          ? {
              name: topFacility.facilityName,
              visitors: topFacility.visitors,
              usageRate: topFacility.usageRate,
            }
          : null,
      },
      facilities,
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
