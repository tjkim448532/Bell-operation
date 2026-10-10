import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const todayKST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    const date = searchParams.get('date') || todayKST;
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
      const errJson = await dailySalesRes.json().catch(() => null);
      if (errJson && (errJson.details?.includes('심야 절전 운영') || errJson.error?.includes('심야 절전 운영'))) {
        return NextResponse.json({
          success: false,
          isSleeping: true,
          error: "API Execution Failed",
          details: errJson.details || "🌙 현재 벨포레 데이터베이스는 심야 절전 운영 시간(20:00 ~ 08:00)입니다. 매일 아침 08:00에 정상 가동됩니다."
        });
      }
      throw new Error(errJson?.details || errJson?.error || `Daily sales API responded with status ${dailySalesRes.status}`);
    }

    const dailySalesJson = (await dailySalesRes.json().catch(() => null)) || {};
    const summaryJson = summaryRes.ok ? await summaryRes.json().catch(() => null) : null;

    // 백엔드 제공 리조트 객실 정원 (가짜 숫자 300 원천 차단)
    const totalRoomCap = summaryJson?.summary?.totalRoomCap || 0;
    // ⚠️ 백엔드 revenue-summary의 dailyTrends는 전사(객실+골프+식음 등) 총매출 추이이므로, 레저본부 전용 대시보드에 전사 매출이 혼입되는 것을 원천 차단 (SSOT 준수)
    const dailyTrends: any[] = [];

    // 2. 카테고리 및 본부 필터링: 오직 '레저본부(TICKET)'만 엄격 추출 (모토서킷/모토아레나/굿즈 전면 배제)
    const rawCategories: any[] = dailySalesJson.data || [];
    const leisureCategories = rawCategories.filter((cat: any) => {
      const catCode = cat.category_code || '';
      return catCode === 'TICKET';
    });

    // 4대 공식 팀 매퍼 (놀이동산 -> 액티비티 통합, 디지털지원 독립)
    const rawTeamAgg: Record<string, {
      revenue: number;
      visitors: number;
      visitorCount: number;
      ticketQuantity: number;
      unitPrice: number | null;
      todayLy: number;
      todayGrowth: number;
      mtdActual: number;
      mtdQuantity: number;
      mtdVisitorCount: number;
      mtdUnitPrice: number | null;
      ytdActual: number;
      ytdQuantity: number;
      ytdVisitorCount: number;
      ytdUnitPrice: number | null;
      venues: any[];
    }> = {
      '미디어아트센터': { revenue: 0, visitors: 0, visitorCount: 0, ticketQuantity: 0, unitPrice: null, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, mtdVisitorCount: 0, mtdUnitPrice: null, ytdActual: 0, ytdQuantity: 0, ytdVisitorCount: 0, ytdUnitPrice: null, venues: [] },
      '액티비티': { revenue: 0, visitors: 0, visitorCount: 0, ticketQuantity: 0, unitPrice: null, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, mtdVisitorCount: 0, mtdUnitPrice: null, ytdActual: 0, ytdQuantity: 0, ytdVisitorCount: 0, ytdUnitPrice: null, venues: [] },
      '목장': { revenue: 0, visitors: 0, visitorCount: 0, ticketQuantity: 0, unitPrice: null, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, mtdVisitorCount: 0, mtdUnitPrice: null, ytdActual: 0, ytdQuantity: 0, ytdVisitorCount: 0, ytdUnitPrice: null, venues: [] },
      '디지털지원': { revenue: 0, visitors: 0, visitorCount: 0, ticketQuantity: 0, unitPrice: null, todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, mtdVisitorCount: 0, mtdUnitPrice: null, ytdActual: 0, ytdQuantity: 0, ytdVisitorCount: 0, ytdUnitPrice: null, venues: [] },
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
          const isOutsourced = (rawPartName === '놀이동산');

          // 외주업체(놀이동산)는 직영 4대 팀 실적에서는 제외하되, 영업장별 상세 P&L(외주 분석)을 위해 gridRows에 포함
          if (isOutsourced) {
            part.venues?.forEach((venue: any) => {
              const venueName = venue.venue_name || '놀이동산';
              const vSub = venue.subtotal || {};
              const vRev = Number(vSub.todayActual || 0);
              const vVis = Number(vSub.visitorCount ?? 0);
              const vTicketQty = Number(vSub.ticketQuantity ?? vSub.todayQuantity ?? 0);
              const vUnitPrice = vSub.unitPrice !== undefined ? vSub.unitPrice : null;

              gridRows.push({
                teamName: '레저본부',
                partName: '외주',
                venueName,
                ticketGroup: '외주위탁',
                revenue: vRev,
                visitorCount: vVis,
                ticketQuantity: vTicketQty,
                unitPrice: vUnitPrice,
                spendPerGuest: vUnitPrice,
                todayLy: Number(vSub.todayLy || 0),
                todayGrowth: Number(vSub.todayGrowth || 0),
                mtdActual: Number(vSub.mtdActual || 0),
                mtdQuantity: Number(vSub.mtdQuantity || 0),
                mtdVisitorCount: Number(vSub.mtdVisitorCount || 0),
                mtdUnitPrice: vSub.mtdUnitPrice !== undefined ? vSub.mtdUnitPrice : null,
                isOutsourced: true,
              });
            });
            return;
          }

          const officialTeam = (rawPartName === '액티비티')
            ? '액티비티'
            : (rawPartName === '미디어아트센터' ? '미디어아트센터' : (rawPartName === '목장' ? '목장' : '기타'));

          if (!rawTeamAgg[officialTeam]) {
            rawTeamAgg[officialTeam] = { 
              revenue: 0, visitors: 0, visitorCount: 0, ticketQuantity: 0, unitPrice: null, 
              todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, mtdVisitorCount: 0, mtdUnitPrice: null,
              ytdActual: 0, ytdQuantity: 0, ytdVisitorCount: 0, ytdUnitPrice: null, venues: [] 
            };
          }

          const pSub = part.subtotal || {};
          const pRev = Number(pSub.todayActual || 0);
          const pVis = Number(pSub.visitorCount ?? 0);
          const pTicketQty = Number(pSub.ticketQuantity ?? pSub.todayQuantity ?? 0);
          const pUnitPrice = pSub.unitPrice !== undefined ? pSub.unitPrice : null;

          rawTeamAgg[officialTeam].revenue += pRev;
          rawTeamAgg[officialTeam].visitors += pVis;
          rawTeamAgg[officialTeam].visitorCount += pVis;
          rawTeamAgg[officialTeam].ticketQuantity += pTicketQty;
          if (rawTeamAgg[officialTeam].unitPrice === null && pUnitPrice !== null) {
            rawTeamAgg[officialTeam].unitPrice = pUnitPrice;
          }
          rawTeamAgg[officialTeam].todayLy += Number(pSub.todayLy || 0);
          rawTeamAgg[officialTeam].todayGrowth = Number(pSub.todayGrowth || 0);
          rawTeamAgg[officialTeam].mtdActual += Number(pSub.mtdActual || 0);
          rawTeamAgg[officialTeam].mtdQuantity += Number(pSub.mtdQuantity || 0);
          rawTeamAgg[officialTeam].mtdVisitorCount += Number(pSub.mtdVisitorCount || 0);
          rawTeamAgg[officialTeam].mtdUnitPrice = pSub.mtdUnitPrice !== undefined ? pSub.mtdUnitPrice : null;
          rawTeamAgg[officialTeam].ytdActual += Number(pSub.ytdActual || 0);
          rawTeamAgg[officialTeam].ytdQuantity += Number(pSub.ytdQuantity || 0);
          rawTeamAgg[officialTeam].ytdVisitorCount += Number(pSub.ytdVisitorCount || 0);
          rawTeamAgg[officialTeam].ytdUnitPrice = pSub.ytdUnitPrice !== undefined ? pSub.ytdUnitPrice : null;

          part.venues?.forEach((venue: any) => {
            const venueName = venue.venue_name || '영업장';
            const vSub = venue.subtotal || {};

            const vRev = Number(vSub.todayActual || 0);
            const vVis = Number(vSub.visitorCount ?? 0);
            const vTicketQty = Number(vSub.ticketQuantity ?? vSub.todayQuantity ?? 0);
            const vUnitPrice = vSub.unitPrice !== undefined ? vSub.unitPrice : null;

            rawTeamAgg[officialTeam].venues.push({
              venueName,
              revenue: vRev,
              visitorCount: vVis,
              ticketQuantity: vTicketQty,
              unitPrice: vUnitPrice,
              spendPerGuest: vUnitPrice,
              todayLy: Number(vSub.todayLy || 0),
              todayGrowth: Number(vSub.todayGrowth || 0),
              mtdActual: Number(vSub.mtdActual || 0),
              mtdQuantity: Number(vSub.mtdQuantity || 0),
              mtdVisitorCount: Number(vSub.mtdVisitorCount || 0),
              mtdUnitPrice: vSub.mtdUnitPrice !== undefined ? vSub.mtdUnitPrice : null,
              ytdActual: Number(vSub.ytdActual || 0),
              ytdQuantity: Number(vSub.ytdQuantity || 0),
              ytdVisitorCount: Number(vSub.ytdVisitorCount || 0),
              ytdUnitPrice: vSub.ytdUnitPrice !== undefined ? vSub.ytdUnitPrice : null,
            });

            if (venue.ticket_groups && venue.ticket_groups.length > 0) {
              venue.ticket_groups.forEach((group: any) => {
                const gSub = group.subtotal || {};
                const gRev = Number(gSub.todayActual || 0);
                const gVis = Number(gSub.visitorCount ?? 0);
                const gTicketQty = Number(gSub.ticketQuantity ?? gSub.todayQuantity ?? 0);
                const gUnitPrice = gSub.unitPrice !== undefined ? gSub.unitPrice : null;

                gridRows.push({
                  teamName,
                  partName: officialTeam,
                  venueName,
                  ticketGroup: group.ticket_group || '일반',
                  revenue: gRev,
                  visitorCount: gVis,
                  ticketQuantity: gTicketQty,
                  unitPrice: gUnitPrice,
                  spendPerGuest: gUnitPrice,
                  todayLy: Number(gSub.todayLy || 0),
                  todayGrowth: Number(gSub.todayGrowth || 0),
                  mtdActual: Number(gSub.mtdActual || 0),
                  mtdQuantity: Number(gSub.mtdQuantity || 0),
                  mtdVisitorCount: Number(gSub.mtdVisitorCount || 0),
                  mtdUnitPrice: gSub.mtdUnitPrice !== undefined ? gSub.mtdUnitPrice : null,
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
                ticketQuantity: vTicketQty,
                unitPrice: vUnitPrice,
                spendPerGuest: vUnitPrice,
                todayLy: Number(vSub.todayLy || 0),
                todayGrowth: Number(vSub.todayGrowth || 0),
                mtdActual: Number(vSub.mtdActual || 0),
                mtdQuantity: Number(vSub.mtdQuantity || 0),
                mtdVisitorCount: Number(vSub.mtdVisitorCount || 0),
                mtdUnitPrice: vSub.mtdUnitPrice !== undefined ? vSub.mtdUnitPrice : null,
              });
            }
          });
        });
      });
    });

    // 3-1. GOODS 카테고리의 '미디어-기프트샵' 처리 (레저본부 미디어아트센터 직영 소속)
    // MariaDB 및 회계 상 미디어-기프트샵은 미디어아트센터 직영 업장임
    const alreadyHasGiftShopInGrid = gridRows.some((r) => r.venueName === '미디어-기프트샵');
    if (!alreadyHasGiftShopInGrid) {
      const goodsCategory = rawCategories.find((cat: any) => cat.category_code === 'GOODS');
      goodsCategory?.teams?.forEach((team: any) => {
        team.parts?.forEach((part: any) => {
          part.venues?.forEach((venue: any) => {
            if (venue.venue_name === '미디어-기프트샵') {
              const vSub = venue.subtotal || {};
              const vRev = Number(vSub.todayActual || 0);
              const vVis = Number(vSub.visitorCount ?? 0);
              const vTicketQty = Number(vSub.ticketQuantity ?? vSub.todayQuantity ?? 0);
              const vUnitPrice = vSub.unitPrice !== undefined ? vSub.unitPrice : null;

              rawTeamAgg['미디어아트센터'].revenue += vRev;
              rawTeamAgg['미디어아트센터'].visitors += vVis;
              rawTeamAgg['미디어아트센터'].visitorCount += vVis;
              rawTeamAgg['미디어아트센터'].ticketQuantity += vTicketQty;
              rawTeamAgg['미디어아트센터'].todayLy += Number(vSub.todayLy || 0);
              rawTeamAgg['미디어아트센터'].mtdActual += Number(vSub.mtdActual || 0);
              rawTeamAgg['미디어아트센터'].mtdQuantity += Number(vSub.mtdQuantity || 0);
              rawTeamAgg['미디어아트센터'].mtdVisitorCount += Number(vSub.mtdVisitorCount || 0);

              rawTeamAgg['미디어아트센터'].venues.push({
                venueName: '미디어-기프트샵',
                revenue: vRev,
                visitorCount: vVis,
                ticketQuantity: vTicketQty,
                unitPrice: vUnitPrice,
                spendPerGuest: vUnitPrice,
                todayLy: Number(vSub.todayLy || 0),
                todayGrowth: Number(vSub.todayGrowth || 0),
                mtdActual: Number(vSub.mtdActual || 0),
                mtdQuantity: Number(vSub.mtdQuantity || 0),
                mtdVisitorCount: Number(vSub.mtdVisitorCount || 0),
                mtdUnitPrice: vSub.mtdUnitPrice !== undefined ? vSub.mtdUnitPrice : null,
                ytdActual: Number(vSub.ytdActual || 0),
                ytdQuantity: Number(vSub.ytdQuantity || 0),
                ytdVisitorCount: Number(vSub.ytdVisitorCount || 0),
                ytdUnitPrice: vSub.ytdUnitPrice !== undefined ? vSub.ytdUnitPrice : null,
              });

              if (venue.ticket_groups && venue.ticket_groups.length > 0) {
                venue.ticket_groups.forEach((group: any) => {
                  const gSub = group.subtotal || {};
                  const gVis = Number(gSub.visitorCount ?? 0);
                  const gTicketQty = Number(gSub.ticketQuantity ?? gSub.todayQuantity ?? 0);
                  const gUnitPrice = gSub.unitPrice !== undefined ? gSub.unitPrice : null;
                  gridRows.push({
                    teamName: '레저본부',
                    partName: '미디어아트센터',
                    venueName: '미디어-기프트샵',
                    ticketGroup: group.ticket_group || '기프트/상품',
                    revenue: Number(gSub.todayActual || 0),
                    visitorCount: gVis,
                    ticketQuantity: gTicketQty,
                    unitPrice: gUnitPrice,
                    spendPerGuest: gUnitPrice,
                    todayLy: Number(gSub.todayLy || 0),
                    todayGrowth: Number(gSub.todayGrowth || 0),
                    mtdActual: Number(gSub.mtdActual || 0),
                    mtdQuantity: Number(gSub.mtdQuantity || 0),
                    mtdVisitorCount: Number(gSub.mtdVisitorCount || 0),
                    mtdUnitPrice: gSub.mtdUnitPrice !== undefined ? gSub.mtdUnitPrice : null,
                  });
                });
              } else {
                gridRows.push({
                  teamName: '레저본부',
                  partName: '미디어아트센터',
                  venueName: '미디어-기프트샵',
                  ticketGroup: '기프트/상품',
                  revenue: vRev,
                  visitorCount: vVis,
                  ticketQuantity: vTicketQty,
                  unitPrice: vUnitPrice,
                  spendPerGuest: vUnitPrice,
                  todayLy: Number(vSub.todayLy || 0),
                  todayGrowth: Number(vSub.todayGrowth || 0),
                  mtdActual: Number(vSub.mtdActual || 0),
                  mtdQuantity: Number(vSub.mtdQuantity || 0),
                  mtdVisitorCount: Number(vSub.mtdVisitorCount || 0),
                  mtdUnitPrice: vSub.mtdUnitPrice !== undefined ? vSub.mtdUnitPrice : null,
                });
              }
            }
          });
        });
      });
    }

    // 디지털지원팀 원장 행 추가 (매출 0원)
    gridRows.push({
      teamName: '레저본부',
      partName: '디지털지원',
      venueName: '디지털지원팀',
      ticketGroup: '지원업무',
      revenue: 0,
      visitorCount: 0,
      ticketQuantity: 0,
      unitPrice: null,
      spendPerGuest: null,
      todayLy: 0,
      todayGrowth: 0,
      mtdActual: 0,
      mtdQuantity: 0,
      mtdVisitorCount: 0,
      mtdUnitPrice: null,
    });

    if (!rawTeamAgg['디지털지원']) {
      rawTeamAgg['디지털지원'] = {
        revenue: 0,
        visitors: 0,
        visitorCount: 0,
        ticketQuantity: 0,
        unitPrice: null,
        todayLy: 0,
        todayGrowth: 0,
        mtdActual: 0,
        mtdQuantity: 0,
        mtdVisitorCount: 0,
        mtdUnitPrice: null,
        ytdActual: 0,
        ytdQuantity: 0,
        ytdVisitorCount: 0,
        ytdUnitPrice: null,
        venues: [],
      };
    }
    rawTeamAgg['디지털지원'].venues.push({
      venueName: '디지털지원팀',
      revenue: 0,
      visitorCount: 0,
      ticketQuantity: 0,
      unitPrice: null,
      spendPerGuest: null,
      todayLy: 0,
      todayGrowth: 0,
      mtdActual: 0,
      mtdQuantity: 0,
      mtdVisitorCount: 0,
      mtdUnitPrice: null,
      ytdActual: 0,
      ytdQuantity: 0,
      ytdVisitorCount: 0,
      ytdUnitPrice: null,
    });

    // 4대 공식 팀 순서 고정 배열 생성 (백엔드 SSOT 완제품 1:1 직접 바인딩)
    const OFFICIAL_ORDER = ['미디어아트센터', '액티비티', '목장', '디지털지원'];
    const parts = OFFICIAL_ORDER.map((tName) => {
      const agg = rawTeamAgg[tName] || { 
        revenue: 0, visitors: 0, visitorCount: 0, ticketQuantity: 0, unitPrice: null, 
        todayLy: 0, todayGrowth: 0, mtdActual: 0, mtdQuantity: 0, mtdVisitorCount: 0, mtdUnitPrice: null, 
        ytdActual: 0, ytdQuantity: 0, ytdVisitorCount: 0, ytdUnitPrice: null, venues: [] 
      };
      const pSpend = agg.unitPrice; // 백엔드 SSOT 공식 가중평균 객단가 그대로 바인딩
      const pUtil = 0;  // 객실 정원 기반 허위 가동률 연산 완전 배제 (0 처리)
      const pGrowth = agg.todayGrowth;

      return {
        teamName: '레저본부',
        partName: tName,
        revenue: agg.revenue,
        visitors: agg.visitorCount, // 진성 방문객 수 (게이트 통과)
        visitorCount: agg.visitorCount,
        ticketQuantity: agg.ticketQuantity,
        unitPrice: agg.unitPrice,
        spendPerGuest: pSpend,
        utilizationRate: pUtil,
        todayLy: agg.todayLy,
        todayGrowth: pGrowth,
        mtdActual: agg.mtdActual,
        mtdQuantity: agg.mtdQuantity,
        mtdVisitorCount: agg.mtdVisitorCount,
        mtdUnitPrice: agg.mtdUnitPrice,
        ytdActual: agg.ytdActual,
        ytdQuantity: agg.ytdQuantity,
        ytdVisitorCount: agg.ytdVisitorCount,
        ytdUnitPrice: agg.ytdUnitPrice,
        venues: agg.venues,
        isSupportTeam: tName === '디지털지원',
      };
    });

    // 백엔드 V6.2 레저본부 카테고리 전체 공식 소계 (Grand Total)
    const catSub = leisureCategories[0]?.subtotal || null;
    const categorySubtotal = catSub ? {
      todayActual: Number(catSub.todayActual || 0),
      todayLy: Number(catSub.todayLy || 0),
      todayGrowth: Number(catSub.todayGrowth || 0),
      ticketQuantity: Number(catSub.ticketQuantity ?? catSub.todayQuantity ?? 0),
      visitorCount: Number(catSub.visitorCount ?? 0),
      unitPrice: catSub.unitPrice !== undefined ? catSub.unitPrice : null,
      mtdActual: Number(catSub.mtdActual || 0),
      mtdQuantity: Number(catSub.mtdQuantity || 0),
      mtdVisitorCount: Number(catSub.mtdVisitorCount || 0),
      mtdUnitPrice: catSub.mtdUnitPrice !== undefined ? catSub.mtdUnitPrice : null,
      ytdActual: Number(catSub.ytdActual || 0),
      ytdQuantity: Number(catSub.ytdQuantity || 0),
      ytdVisitorCount: Number(catSub.ytdVisitorCount || 0),
      ytdUnitPrice: catSub.ytdUnitPrice !== undefined ? catSub.ytdUnitPrice : null,
    } : null;

    return NextResponse.json({
      success: true,
      targetDate: (startDate && endDate) ? `${startDate} ~ ${endDate}` : date,
      totalRoomCap,
      categorySubtotal,
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
