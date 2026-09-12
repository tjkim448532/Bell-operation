import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2026-08-31';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    const dateParams = (startDate && endDate)
      ? `startDate=${startDate}&endDate=${endDate}`
      : `date=${date}`;

    // 1. 백엔드 SSOT V6 일일 리포트 및 대시보드 요약 동시 조회
    const [dailySalesRes, summaryRes] = await Promise.all([
      fetch(`${backendBase}/api/v6/report/daily-sales?${dateParams}`, {
        headers: { 'x-m2m-token': token },
        next: { revalidate: 0 },
      }),
      fetch(`${backendBase}/api/v6/dashboard/revenue-summary?${dateParams}`, {
        headers: { 'x-m2m-token': token },
        next: { revalidate: 0 },
      }),
    ]);

    if (!dailySalesRes.ok) {
      throw new Error(`Daily sales API responded with status ${dailySalesRes.status}`);
    }

    const dailySalesJson = await dailySalesRes.json();
    const summaryJson = summaryRes.ok ? await summaryRes.json() : null;

    // 백엔드 제공 리조트 객실 정원 및 일자별 실측 추이 (가짜 숫자 300 원천 차단)
    const totalRoomCap = summaryJson?.summary?.totalRoomCap || 0;
    const dailyTrends = summaryJson?.dailyTrends || [];

    // 2. 카테고리 필터링: TICKET (레저본부) 및 MOTO (모토아레나)
    const rawCategories: any[] = dailySalesJson.data || [];
    const leisureCategories = rawCategories.filter((cat: any) => {
      const catCode = cat.category_code || '';
      return (
        catCode === 'TICKET' ||
        catCode === 'MOTO' ||
        (cat.teams && cat.teams.some((t: any) => t.team_name === '레저본부' || t.team_name === '모토아레나' || t.team_name === '미분류'))
      );
    });

    const parts: any[] = [];
    const gridRows: any[] = [];

    // 3. 백엔드 원천 계층(본부 -> 파트 -> 영업장 -> 티켓군) 100% 보존 추출
    leisureCategories.forEach((cat: any) => {
      cat.teams?.forEach((team: any) => {
        const teamName = team.team_name || '레저본부';

        team.parts?.forEach((part: any) => {
          const partName = part.part_name || '기타';
          const pSub = part.subtotal || {};

          const pRev = Number(pSub.todayActual || 0);
          const pVis = Number(pSub.todayQuantity || 0);
          const pSpend = pVis > 0 ? Math.round(pRev / pVis) : 0;
          const pUtil = totalRoomCap > 0 ? Number(((pVis / totalRoomCap) * 100).toFixed(2)) : 0;

          const venuesList: any[] = [];

          part.venues?.forEach((venue: any) => {
            const venueName = venue.venue_name || '영업장';
            const vSub = venue.subtotal || {};

            const vRev = Number(vSub.todayActual || 0);
            const vVis = Number(vSub.todayQuantity || 0);
            const vSpend = vVis > 0 ? Math.round(vRev / vVis) : 0;

            venuesList.push({
              venueName,
              revenue: vRev,
              visitorCount: vVis,
              spendPerGuest: vSpend,
              todayLy: Number(vSub.todayLy || 0),
              todayGrowth: Number(vSub.todayGrowth || 0),
              mtdActual: Number(vSub.mtdActual || 0),
              mtdQuantity: Number(vSub.mtdQuantity || 0),
            });

            if (venue.ticket_groups && venue.ticket_groups.length > 0) {
              venue.ticket_groups.forEach((group: any) => {
                const gSub = group.subtotal || {};
                const gRev = Number(gSub.todayActual || 0);
                const gVis = Number(gSub.todayQuantity || 0);
                const gSpend = gVis > 0 ? Math.round(gRev / gVis) : 0;

                gridRows.push({
                  teamName,
                  partName,
                  venueName,
                  ticketGroup: group.ticket_group || '일반',
                  revenue: gRev,
                  visitorCount: gVis,
                  spendPerGuest: gSpend,
                  todayLy: Number(gSub.todayLy || 0),
                  todayGrowth: Number(gSub.todayGrowth || 0),
                  mtdActual: Number(gSub.mtdActual || 0),
                  mtdQuantity: Number(gSub.mtdQuantity || 0),
                });
              });
            } else {
              gridRows.push({
                teamName,
                partName,
                venueName,
                ticketGroup: '일반',
                revenue: vRev,
                visitorCount: vVis,
                spendPerGuest: vSpend,
                todayLy: Number(vSub.todayLy || 0),
                todayGrowth: Number(vSub.todayGrowth || 0),
                mtdActual: Number(vSub.mtdActual || 0),
                mtdQuantity: Number(vSub.mtdQuantity || 0),
              });
            }
          });

          parts.push({
            teamName,
            partName,
            revenue: pRev,
            visitors: pVis,
            spendPerGuest: pSpend,
            utilizationRate: pUtil,
            todayLy: Number(pSub.todayLy || 0),
            todayGrowth: Number(pSub.todayGrowth || 0),
            mtdActual: Number(pSub.mtdActual || 0),
            mtdQuantity: Number(pSub.mtdQuantity || 0),
            venues: venuesList,
          });
        });
      });
    });

    return NextResponse.json({
      success: true,
      targetDate: (startDate && endDate) ? `${startDate} ~ ${endDate}` : date,
      totalRoomCap,
      parts,
      gridRows,
      dailyTrends,
    });
  } catch (error: any) {
    console.error('Error fetching leisure revenue:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch leisure revenue' },
      { status: 500 }
    );
  }
}
