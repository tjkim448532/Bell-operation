import { NextRequest, NextResponse } from 'next/server';
import { TableData } from '@/components/PerformanceTable';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2026-08-31';

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    let tableData: TableData | null = null;

    try {
      // 1. 백엔드 SSOT 일일 영업 실적 리포트 조회
      const res = await fetch(`${backendBase}/api/v6/report/daily-sales?date=${date}`, {
        headers: { 'x-m2m-token': token },
        next: { revalidate: 0 },
      });

      if (res.ok) {
        const json = await res.json();
        const rawCategories: any[] = json.data || [];

        // 레저본부 전용 필터링 (벨포레 특수 규정: 레저본부 및 미분류만 추출)
        const leisureCategories = rawCategories.filter((cat: any) => {
          const catCode = cat.category_code || '';
          return (
            catCode === 'TICKET' ||
            (cat.teams && cat.teams.some((t: any) => t.team_name === '레저본부' || t.team_name === '미분류'))
          );
        });

        const divisionsList: any[] = [];

        leisureCategories.forEach((cat: any) => {
          cat.teams?.forEach((team: any) => {
            const teamName = team.team_name || '레저본부';
            if (teamName !== '레저본부' && teamName !== '미분류') return;

            const tSub = team.subtotal || {};
            const partsList: any[] = [];
            let amusementTodayActual = 0;
            let amusementTodayLy = 0;
            let amusementMtdActual = 0;
            let amusementMtdLy = 0;
            let amusementYtdActual = 0;
            let amusementYtdLy = 0;

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

            // The Bible v4.2 마이너스 연산 원칙: 외주(놀이동산) 소계를 전체 본부 소계에서 차감
            const pureTodayActual = Math.max(0, Number(tSub.todayActual || 0) - amusementTodayActual);
            const pureTodayLy = Math.max(0, Number(tSub.todayLy || 0) - amusementTodayLy);
            const pureTodayGrowth = pureTodayLy > 0 ? Number((((pureTodayActual - pureTodayLy) / pureTodayLy) * 100).toFixed(1)) : 0;

            const pureMtdActual = Math.max(0, Number(tSub.mtdActual || 0) - amusementMtdActual);
            const pureMtdLy = Math.max(0, Number(tSub.mtdLy || 0) - amusementMtdLy);
            const pureMtdGrowth = pureMtdLy > 0 ? Number((((pureMtdActual - pureMtdLy) / pureMtdLy) * 100).toFixed(1)) : 0;

            const pureYtdActual = Math.max(0, Number(tSub.ytdActual || 0) - amusementYtdActual);
            const pureYtdLy = Math.max(0, Number(tSub.ytdLy || 0) - amusementYtdLy);
            const pureYtdGrowth = pureYtdLy > 0 ? Number((((pureYtdActual - pureYtdLy) / pureYtdLy) * 100).toFixed(1)) : 0;

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
          });
        });

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
