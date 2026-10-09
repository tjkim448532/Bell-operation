import { NextRequest, NextResponse } from 'next/server';
import { TableData } from '@/components/PerformanceTable';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const todayKST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    const date = searchParams.get('date') || todayKST;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateParams = (startDate && endDate)
      ? `startDate=${startDate}&endDate=${endDate}`
      : `date=${date}`;

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    let tableData: TableData | null = null;

    try {
      // 1. 백엔드 SSOT 일일 영업 실적 리포트 조회 (다중 구간 지원)
      const res = await fetch(`${backendBase}/api/v6/report/daily-sales?${dateParams}`, {
        headers: { 'x-m2m-token': token },
        next: { revalidate: 0 },
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const rawCategories: any[] = json?.data || [];

        // 레저본부 전용 SSOT 카테고리 추출 (The Bible v4.2: TICKET 카테고리가 곧 공식 '레저본부')
        const ticketCategory = rawCategories.find((cat: any) => cat.category_code === 'TICKET');

        const divisionsList: any[] = [];

        if (ticketCategory && ticketCategory.teams) {
          const partsList: any[] = [];
          let amusementTodayActual = 0;
          let amusementTodayLy = 0;
          let amusementMtdActual = 0;
          let amusementMtdLy = 0;
          let amusementYtdActual = 0;
          let amusementYtdLy = 0;

          // 레저본부 카테고리 내의 모든 팀에서 파트 및 세부 영업장 수집
          ticketCategory.teams.forEach((team: any) => {
            const teamName = team.team_name || '레저본부';
            if (teamName !== '레저본부' && teamName !== '미분류') return;

            team.parts?.forEach((part: any) => {
              const partName = part.part_name || '파트';
              const pSub = part.subtotal || {};

              // 외주업체(놀이동산)는 직영 3-Depth 표에서 제외하고, 본부 소계에서 차감
              if (partName === '놀이동산') {
                amusementTodayActual += Number(pSub.todayActual || 0);
                amusementTodayLy += Number(pSub.todayLy || 0);
                amusementMtdActual += Number(pSub.mtdActual || 0);
                amusementMtdLy += Number(pSub.mtdLy || 0);
                amusementYtdActual += Number(pSub.ytdActual || 0);
                amusementYtdLy += Number(pSub.ytdLy || 0);
                return;
              }

              const venuesList: any[] = [];

              part.venues?.forEach((venue: any) => {
                const vSub = venue.subtotal || {};
                venuesList.push({
                  venueName: venue.venue_name || '영업장',
                  metrics: {
                    today: {
                      actual: Number(vSub.todayActual || 0),
                      ly: Number(vSub.todayLy || 0),
                      growth: Number(vSub.todayGrowth || 0),
                    },
                    mtd: {
                      actual: Number(vSub.mtdActual || 0),
                      ly: Number(vSub.mtdLy || 0),
                      growth: Number(vSub.mtdGrowth || 0),
                    },
                    ytd: {
                      actual: Number(vSub.ytdActual || 0),
                      ly: Number(vSub.ytdLy || 0),
                      growth: Number(vSub.ytdGrowth || 0),
                    },
                  },
                });
              });

              partsList.push({
                partName: part.part_name || '파트',
                partSubtotal: {
                  today: {
                    actual: Number(pSub.todayActual || 0),
                    ly: Number(pSub.todayLy || 0),
                    growth: Number(pSub.todayGrowth || 0),
                  },
                  mtd: {
                    actual: Number(pSub.mtdActual || 0),
                    ly: Number(pSub.mtdLy || 0),
                    growth: Number(pSub.mtdGrowth || 0),
                  },
                  ytd: {
                    actual: Number(pSub.ytdActual || 0),
                    ly: Number(pSub.ytdLy || 0),
                    growth: Number(pSub.ytdGrowth || 0),
                  },
                },
                venues: venuesList,
              });
            });
          });

          // GOODS 카테고리 또는 미분류에 적재된 '미디어-기프트샵' 추출 및 미디어아트센터에 통합
          // (MariaDB 및 ERP 상 미디어-기프트샵은 미디어아트센터 직영 업장임)
          let mediaGiftShopVenue: any = null;
          for (const cat of rawCategories) {
            cat.teams?.forEach((t: any) => {
              t.parts?.forEach((p: any) => {
                p.venues?.forEach((v: any) => {
                  if (v.venue_name === '미디어-기프트샵') {
                    mediaGiftShopVenue = v;
                  }
                });
              });
            });
          }

          let giftTodayActual = 0;
          let giftTodayLy = 0;
          let giftMtdActual = 0;
          let giftMtdLy = 0;
          let giftYtdActual = 0;
          let giftYtdLy = 0;

          const mediaPart = partsList.find((p) => p.partName === '미디어아트센터');
          const alreadyHasGiftShop = mediaPart?.venues.some((v: any) => v.venueName === '미디어-기프트샵');

          if (mediaPart && mediaGiftShopVenue && !alreadyHasGiftShop) {
            const vSub = mediaGiftShopVenue.subtotal || {};
            giftTodayActual = Number(vSub.todayActual || 0);
            giftTodayLy = Number(vSub.todayLy || 0);
            giftMtdActual = Number(vSub.mtdActual || 0);
            giftMtdLy = Number(vSub.mtdLy || 0);
            giftYtdActual = Number(vSub.ytdActual || 0);
            giftYtdLy = Number(vSub.ytdLy || 0);

            mediaPart.venues.push({
              venueName: mediaGiftShopVenue.venue_name || '미디어-기프트샵',
              metrics: {
                today: {
                  actual: giftTodayActual,
                  ly: giftTodayLy,
                  growth: Number(vSub.todayGrowth || 0),
                },
                mtd: {
                  actual: giftMtdActual,
                  ly: giftMtdLy,
                  growth: Number(vSub.mtdGrowth || 0),
                },
                ytd: {
                  actual: giftYtdActual,
                  ly: giftYtdLy,
                  growth: Number(vSub.ytdGrowth || 0),
                },
              },
            });

            // 미디어아트센터 파트 소계에 미디어-기프트샵 실적 합산
            mediaPart.partSubtotal.today.actual += giftTodayActual;
            mediaPart.partSubtotal.today.ly += giftTodayLy;
            mediaPart.partSubtotal.today.growth = mediaPart.partSubtotal.today.ly > 0
              ? Number((((mediaPart.partSubtotal.today.actual - mediaPart.partSubtotal.today.ly) / mediaPart.partSubtotal.today.ly) * 100).toFixed(1))
              : 0;

            mediaPart.partSubtotal.mtd.actual += giftMtdActual;
            mediaPart.partSubtotal.mtd.ly += giftMtdLy;
            mediaPart.partSubtotal.mtd.growth = mediaPart.partSubtotal.mtd.ly > 0
              ? Number((((mediaPart.partSubtotal.mtd.actual - mediaPart.partSubtotal.mtd.ly) / mediaPart.partSubtotal.mtd.ly) * 100).toFixed(1))
              : 0;

            mediaPart.partSubtotal.ytd.actual += giftYtdActual;
            mediaPart.partSubtotal.ytd.ly += giftYtdLy;
            mediaPart.partSubtotal.ytd.growth = mediaPart.partSubtotal.ytd.ly > 0
              ? Number((((mediaPart.partSubtotal.ytd.actual - mediaPart.partSubtotal.ytd.ly) / mediaPart.partSubtotal.ytd.ly) * 100).toFixed(1))
              : 0;
          }

          // The Bible v4.2 마이너스 연산 원칙: 외주(놀이동산) 소계를 전체 본부 소계에서 차감하고, 누락된 직영 미디어-기프트샵 합산
          const catSub = ticketCategory.subtotal || {};
          const pureTodayActual = Math.max(0, Number(catSub.todayActual || 0) - amusementTodayActual + giftTodayActual);
          const pureTodayLy = Math.max(0, Number(catSub.todayLy || 0) - amusementTodayLy + giftTodayLy);
          const pureTodayGrowth = pureTodayLy > 0 ? Number((((pureTodayActual - pureTodayLy) / pureTodayLy) * 100).toFixed(1)) : 0;

          const pureMtdActual = Math.max(0, Number(catSub.mtdActual || 0) - amusementMtdActual + giftMtdActual);
          const pureMtdLy = Math.max(0, Number(catSub.mtdLy || 0) - amusementMtdLy + giftMtdLy);
          const pureMtdGrowth = pureMtdLy > 0 ? Number((((pureMtdActual - pureMtdLy) / pureMtdLy) * 100).toFixed(1)) : 0;

          const pureYtdActual = Math.max(0, Number(catSub.ytdActual || 0) - amusementYtdActual + giftYtdActual);
          const pureYtdLy = Math.max(0, Number(catSub.ytdLy || 0) - amusementYtdLy + giftYtdLy);
          const pureYtdGrowth = pureYtdLy > 0 ? Number((((pureYtdActual - pureYtdLy) / pureYtdLy) * 100).toFixed(1)) : 0;

          // 단 1개의 '레저본부' 대분류만 등록 (중복 분열 원천 차단)
          divisionsList.push({
            orgDivision: '레저본부',
            divisionSubtotal: {
              today: {
                actual: pureTodayActual,
                ly: pureTodayLy,
                growth: pureTodayGrowth,
              },
              mtd: {
                actual: pureMtdActual,
                ly: pureMtdLy,
                growth: pureMtdGrowth,
              },
              ytd: {
                actual: pureYtdActual,
                ly: pureYtdLy,
                growth: pureYtdGrowth,
              },
            },
            parts: partsList,
          });
        }

        if (divisionsList.length > 0) {
          tableData = { divisions: divisionsList };
        }
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson && (errJson.details?.includes('심야 절전 운영') || errJson.error?.includes('심야 절전 운영'))) {
          return NextResponse.json({
            success: false,
            isSleeping: true,
            error: "API Execution Failed",
            details: errJson.details || "🌙 현재 벨포레 데이터베이스는 심야 절전 운영 시간(20:00 ~ 08:00)입니다. 매일 아침 08:00에 정상 가동됩니다.",
            data: { divisions: [] }
          });
        }
      }
    } catch (apiErr) {
      console.warn('Backend live API failed or unreachable:', apiErr);
    }

    // 백엔드 미응답 또는 데이터 부재 시 임의의 가짜 숫자를 일절 생성하지 않고 정직한 빈 상태 반환 (ZERO-MOCK DATA POLICY)
    if (!tableData || tableData.divisions.length === 0) {
      return NextResponse.json({
        success: true,
        date,
        isEmpty: true,
        data: { divisions: [] },
      });
    }

    return NextResponse.json({
      success: true,
      date,
      data: tableData,
    });
  } catch (error: any) {
    console.error('Error in GET /api/performance:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
