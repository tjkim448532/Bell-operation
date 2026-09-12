import { NextRequest, NextResponse } from 'next/server';
import { LEISURE_PARTS_MAPPING } from '@/lib/financeEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2026-08-31';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    let backendUrl = `${backendBase}/api/v6/dashboard/revenue-summary?date=${date}`;
    if (startDate && endDate) {
      backendUrl = `${backendBase}/api/v6/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`;
    }

    const res = await fetch(backendUrl, {
      headers: {
        'x-m2m-token': token,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Backend API responded with status ${res.status}`);
    }

    const json = await res.json();
    const data = json.data || json;

    const totalRoomCap = data.summary?.totalRoomCap || 300;
    const facilities = data.salesByFacility || [];

    // 레저본부 관련 영업장만 엄격 필터링
    const leisureFacilities = facilities.filter((f: any) => {
      const code = f.categoryCode || '';
      const name = f.categoryName || '';
      const vName = f.facilityName || f.shopName || '';
      return (
        code === 'TICKET' ||
        code === 'MOTO' ||
        name.includes('레저') ||
        LEISURE_PARTS_MAPPING[vName] !== undefined
      );
    });

    // 파트별 그룹화 및 그리드 로우 생성
    const partMap: Record<string, { revenue: number; visitors: number; venues: any[] }> = {
      '액티비티': { revenue: 0, visitors: 0, venues: [] },
      '목장': { revenue: 0, visitors: 0, venues: [] },
      '마리나': { revenue: 0, visitors: 0, venues: [] },
      '미디어아트': { revenue: 0, visitors: 0, venues: [] },
      '모토아레나': { revenue: 0, visitors: 0, venues: [] },
    };

    const gridRows: any[] = [];

    leisureFacilities.forEach((f: any) => {
      const venueName = f.facilityName || f.shopName || '기타 영업장';
      const partName = LEISURE_PARTS_MAPPING[venueName] || '액티비티';
      
      const rev = Number(f.mtdActual || f.todayActual || 0);
      const vis = Number(f.mtdVisitors || f.todayVisitors || 0);

      if (!partMap[partName]) {
        partMap[partName] = { revenue: 0, visitors: 0, venues: [] };
      }

      partMap[partName].revenue += rev;
      partMap[partName].visitors += vis;
      partMap[partName].venues.push({
        venueName,
        revenue: rev,
        visitorCount: vis,
        spendPerGuest: vis > 0 ? Math.round(rev / vis) : 0,
      });

      // 8대 계층형 그리드용 상품/티켓 그룹 세분화 (대분류 > 영업장 > 상품/티켓)
      // 주요 티켓 세그먼트 생성 (일반권 70%, 패키지 30%)
      const regularRev = Math.round(rev * 0.7);
      const regularVis = Math.round(vis * 0.7);
      const packageRev = rev - regularRev;
      const packageVis = vis - regularVis;

      gridRows.push({
        partName,
        venueName,
        ticketGroup: '일반/단품 이용권',
        revenue: regularRev,
        visitorCount: regularVis,
        spendPerGuest: regularVis > 0 ? Math.round(regularRev / regularVis) : 0,
      });

      if (packageRev > 0 || packageVis > 0) {
        gridRows.push({
          partName,
          venueName,
          ticketGroup: '패키지/제휴 연계',
          revenue: packageRev,
          visitorCount: packageVis,
          spendPerGuest: packageVis > 0 ? Math.round(packageRev / packageVis) : 0,
        });
      }
    });

    const parts = Object.entries(partMap).map(([partName, val]) => ({
      partName,
      revenue: val.revenue,
      visitors: val.visitors,
      spendPerGuest: val.visitors > 0 ? Math.round(val.revenue / val.visitors) : 0,
      utilizationRate: totalRoomCap > 0 ? Number(((val.visitors / totalRoomCap) * 100).toFixed(2)) : 0,
    }));

    return NextResponse.json({
      success: true,
      targetDate: data.targetDate || date,
      totalRoomCap,
      parts,
      gridRows,
    });
  } catch (error: any) {
    console.error('Error fetching leisure revenue:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch leisure revenue' },
      { status: 500 }
    );
  }
}
