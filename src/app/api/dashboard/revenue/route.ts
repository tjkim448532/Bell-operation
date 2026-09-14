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

    // 2. 카테고리 및 본부 필터링: 오직 '레저본부'만 엄격 추출 (모토서킷/모토아레나 전면 배제)
    const rawCategories: any[] = dailySalesJson.data || [];
    const leisureCategories = rawCategories.filter((cat: any) => {
      const catCode = cat.category_code || '';
      return (
        catCode === 'TICKET' ||
        (cat.teams && cat.teams.some((t: any) => t.team_name === '레저본부' || t.team_name === '미분류'))
      );
    });

    // 4대 공식 팀 매퍼 (놀이동산 -> 액티비티 통합, 디지털지원 독립)
    const rawTeamAgg: Record<string, {
      revenue: number;
      visitors: number;
      todayLy: number;
      todayGrowth: number;
      mtdActual: number;
      mtdQuantity: number;
      venues: any[];
    }> = {
      '미디어아트센터': { revenue: 0, visitors: 0, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, venues: [] },
      '액티비티': { revenue: 0, visitors: 0, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, venues: [] },
      '목장': { revenue: 0, visitors: 0, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, venues: [] },
      '디지털지원': { revenue: 0, visitors: 0, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, venues: [
        {
          venueName: '디지털지원팀 (지원업무)',
          revenue: 0,
          visitorCount: 0,
          spendPerGuest: 0,
          todayLy: 0,
          todayGrowth: 0,
          mtdActual: 0,
          mtdQuantity: 0,
        }
      ] },
    };

    const gridRows: any[] = [];

    // 3. 백엔드 원천 계층(본부 -> 파트 -> 영업장 -> 티켓군) 4대 팀으로 정규화
    leisureCategories.forEach((cat: any) => {
      cat.teams?.forEach((team: any) => {
        const teamName = team.team_name || '레저본부';
        
        // 레저본부 및 미분류 외 타 본부(모토아레나 등) 데이터 100% 차단
        if (teamName !== '레저본부' && teamName !== '미분류') return;

        team.parts?.forEach((part: any) => {
          const rawPartName = part.part_name || '기타';
          // 외주업체(놀이동산)는 직영 실적 및 원장 집계에서 전면 배제
          if (rawPartName === '놀이동산') return;

          const officialTeam = (rawPartName === '액티비티')
            ? '액티비티'
            : (rawPartName === '미디어아트센터' ? '미디어아트센터' : (rawPartName === '목장' ? '목장' : '기타'));

          if (!rawTeamAgg[officialTeam]) {
            rawTeamAgg[officialTeam] = { revenue: 0, visitors: 0, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, venues: [] };
          }

          const pSub = part.subtotal || {};
          const pRev = Number(pSub.todayActual || 0);
          const pVis = Number(pSub.todayQuantity || 0);

          rawTeamAgg[officialTeam].revenue += pRev;
          rawTeamAgg[officialTeam].visitors += pVis;
          rawTeamAgg[officialTeam].todayLy += Number(pSub.todayLy || 0);
          rawTeamAgg[officialTeam].mtdActual += Number(pSub.mtdActual || 0);
          rawTeamAgg[officialTeam].mtdQuantity += Number(pSub.mtdQuantity || 0);

          part.venues?.forEach((venue: any) => {
            const venueName = venue.venue_name || '영업장';
            const vSub = venue.subtotal || {};

            const vRev = Number(vSub.todayActual || 0);
            const vVis = Number(vSub.todayQuantity || 0);
            const vSpend = vVis > 0 ? Math.round(vRev / vVis) : 0;

            rawTeamAgg[officialTeam].venues.push({
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
                  partName: officialTeam,
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
                partName: officialTeam,
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
        });
      });
    });

    // 디지털지원팀 원장 행 추가 (매출 0원)
    gridRows.push({
      teamName: '레저본부',
      partName: '디지털지원',
      venueName: '디지털지원팀 (지원업무)',
      ticketGroup: '지원업무',
      revenue: 0,
      visitorCount: 0,
      spendPerGuest: 0,
      todayLy: 0,
      todayGrowth: 0,
      mtdActual: 0,
      mtdQuantity: 0,
    });

    // 4대 공식 팀 순서 고정 배열 생성
    const OFFICIAL_ORDER = ['미디어아트센터', '액티비티', '목장', '디지털지원'];
    const parts = OFFICIAL_ORDER.map((tName) => {
      const agg = rawTeamAgg[tName] || { revenue: 0, visitors: 0, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, venues: [] };
      const pSpend = agg.visitors > 0 ? Math.round(agg.revenue / agg.visitors) : 0;
      const pUtil = totalRoomCap > 0 ? Number(((agg.visitors / totalRoomCap) * 100).toFixed(2)) : 0;
      const pGrowth = agg.todayLy > 0 ? Number((((agg.revenue - agg.todayLy) / agg.todayLy) * 100).toFixed(1)) : 0;

      return {
        teamName: '레저본부',
        partName: tName,
        revenue: agg.revenue,
        visitors: agg.visitors,
        spendPerGuest: pSpend,
        utilizationRate: pUtil,
        todayLy: agg.todayLy,
        todayGrowth: pGrowth,
        mtdActual: agg.mtdActual,
        mtdQuantity: agg.mtdQuantity,
        venues: agg.venues,
        isSupportTeam: tName === '디지털지원',
      };
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
