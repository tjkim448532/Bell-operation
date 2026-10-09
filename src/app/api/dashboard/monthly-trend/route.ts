import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { linkVenueAndTeam } from '@/lib/financeEngine';

export const dynamic = 'force-dynamic';

function getClientDb() {
  try {
    const { initializeApp, getApps, getApp } = require('firebase/app');
    const { getFirestore } = require('firebase/firestore');
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "bell-operation.firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bell-operation",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "bell-operation.firebasestorage.app",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "593133920835",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:593133920835:web:61f25b39170b2f62ce6af6",
    };
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
  } catch {
    return null;
  }
}

function getMonthRange(ym: string): [string, string] {
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return [`${ym}-01`, `${ym}-${String(lastDay).padStart(2, '0')}`];
}

// 5분 캐시 저장소 (메모리 캐싱으로 연속 호출 시 즉각 응답 < 50ms)
interface CacheEntry {
  timestamp: number;
  data: any;
}
let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!forceRefresh && memoryCache && (Date.now() - memoryCache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(memoryCache.data);
    }

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    // 1. Firestore에서 2026년 이후의 모든 비용 데이터 조회
    const rawExpenseRows: any[] = [];

    if (db) {
      try {
        const snap = await db.collection('expenses_v2')
          .where('yearMonth', '>=', '2026-01')
          .get();
        if (snap && !snap.empty) {
          snap.forEach((doc: any) => rawExpenseRows.push(doc.data()));
        }
      } catch (err: any) {
        console.warn('Admin Firestore failed in monthly-trend:', err.message);
      }
    }

    if (rawExpenseRows.length === 0) {
      const clientDb = getClientDb();
      if (clientDb) {
        try {
          const { collection, query, where, getDocs } = require('firebase/firestore');
          const q = query(collection(clientDb, 'expenses_v2'), where('yearMonth', '>=', '2026-01'));
          const snap = await getDocs(q);
          snap.forEach((doc: any) => rawExpenseRows.push(doc.data()));
        } catch (err: any) {
          console.warn('Client Firestore failed in monthly-trend:', err.message);
        }
      }
    }

    // 2. 존재하는 모든 월(Month) 추출 및 동적 정렬 (예: 2026-01 ~ 2026-09, 향후 추가 시 자동 확장)
    const monthsSet = new Set<string>();
    rawExpenseRows.forEach((r) => {
      if (r.yearMonth && r.yearMonth.startsWith('2026-')) {
        monthsSet.add(r.yearMonth);
      }
    });

    // 만약 DB에 데이터가 없더라도 최소한 현재 월까지 기본 목록 보장
    if (monthsSet.size === 0) {
      const currentMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }).substring(0, 7);
      monthsSet.add(currentMonth);
    }

    const months = Array.from(monthsSet).sort();
    const monthLabels = months.map((ym) => `${ym.substring(5)}월`);

    // 3. 각 월별 백엔드 V6 매출 데이터 병렬 조회 (SSOT)
    const revPromises = months.map(async (ym) => {
      const [start, end] = getMonthRange(ym);
      try {
        const res = await fetch(`${backendBase}/api/v6/report/daily-sales?startDate=${start}&endDate=${end}`, {
          headers: { 'x-m2m-token': token },
          next: { revalidate: 300 },
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          return { ym, data: json?.data || [] };
        }
      } catch (e) {
        console.warn(`Failed to fetch revenue for ${ym}:`, e);
      }
      return { ym, data: [] };
    });

    const revResponses = await Promise.all(revPromises);

    // 4. 공식 4대 직영 부서 + 외주 + 본부공통 정의
    const DEPARTMENTS = ['미디어아트센터', '액티비티', '목장', '디지털지원', '외주', '본부공통'];
    const departmentVenues: Record<string, string[]> = {
      '미디어아트센터': ['미디어아트센터', '미디어-뮤지엄카페', '미디어-기프트샵'],
      '액티비티': ['마운틴카트', '사계절썰매장', '마리나 클럽', '썸머랜드', '원더풀', '액티비티 (공통)'],
      '목장': ['벨포레 목장', '벨포레 목장(체험)', '얼룩말카페', '펫포레'],
      '디지털지원': ['디지털지원팀'],
      '외주': ['놀이동산 (외주)'],
      '본부공통': ['본부공통'],
    };

    // 결과 맵 초기화
    interface MetricItem {
      revenue: number;
      expense: number;
      profit: number;
    }
    interface VenueItem {
      name: string;
      monthly: Record<string, MetricItem>;
      total: MetricItem;
    }
    interface DeptItem {
      name: string;
      monthly: Record<string, MetricItem>;
      total: MetricItem;
      venues: Record<string, VenueItem>;
    }

    const deptMap: Record<string, DeptItem> = {};
    DEPARTMENTS.forEach((dept) => {
      deptMap[dept] = {
        name: dept,
        monthly: {},
        total: { revenue: 0, expense: 0, profit: 0 },
        venues: {},
      };
      months.forEach((ym) => {
        deptMap[dept].monthly[ym] = { revenue: 0, expense: 0, profit: 0 };
      });

      departmentVenues[dept].forEach((vName) => {
        deptMap[dept].venues[vName] = {
          name: vName,
          monthly: {},
          total: { revenue: 0, expense: 0, profit: 0 },
        };
        months.forEach((ym) => {
          deptMap[dept].venues[vName].monthly[ym] = { revenue: 0, expense: 0, profit: 0 };
        });
      });
    });

    // 5. 비용(Expense) 데이터 적재
    rawExpenseRows.forEach((r) => {
      const ym = r.yearMonth;
      if (!months.includes(ym)) return;

      // 1) 감가상각비(회계상 비현금성 상각액)는 현금 유출 실지출 집계에서 제외 (SSOT 재무 헌법 준수)
      const acct = (r.accountName || '').trim();
      const code = (r.accountCode || '').trim();
      const memo = (r.memo || '').trim();
      if (
        r.isDepreciation === true ||
        acct === '감가상각비' ||
        acct.includes('감가상각') ||
        code.startsWith('618') ||
        memo.includes('감가상각비')
      ) {
        return;
      }

      // 2) 외주 위탁업체 판별 (놀이동산 등 직영과 엄격 분리)
      const pName = (r.projectName || r.partName || r.project || '').trim();
      const rawDept = (r.rawDepartment || r.writeDept || r.dept || '').trim();
      const isOut = r.isOutsourced ||
        r.assignedTeam === '외주' ||
        ['놀이동산', '회전그네', '미니골프', '미니골프장', '미니포렛', '게임존'].includes(pName) ||
        (r.assignedVenue && r.assignedVenue.includes('놀이동산'));

      let team = isOut ? '외주' : (r.assignedTeam || '');
      let venue = isOut ? '놀이동산 (외주)' : (r.assignedVenue || '');

      if (!team || team === '미분류' || team === '공통') {
        const mapped = linkVenueAndTeam(pName, rawDept, memo);
        team = mapped.team;
        if (!venue) venue = mapped.venue;
      }

      if (!venue) {
        const mapped = linkVenueAndTeam(pName, rawDept, memo);
        venue = mapped.venue;
      }

      if (team === '본부공통') {
        venue = '본부공통';
      }

      const amt = Number(r.amount || 0);

      const targetDept = deptMap[team] || deptMap['본부공통'];
      targetDept.monthly[ym].expense += amt;
      targetDept.total.expense += amt;

      const finalVenue = venue || targetDept.name;
      if (!targetDept.venues[finalVenue]) {
        targetDept.venues[finalVenue] = {
          name: finalVenue,
          monthly: {},
          total: { revenue: 0, expense: 0, profit: 0 },
        };
        months.forEach((m) => {
          targetDept.venues[finalVenue].monthly[m] = { revenue: 0, expense: 0, profit: 0 };
        });
      }
      targetDept.venues[finalVenue].monthly[ym].expense += amt;
      targetDept.venues[finalVenue].total.expense += amt;
    });

    // 6. 매출(Revenue) 데이터 적재
    revResponses.forEach(({ ym, data }) => {
      const ticket = data.find((c: any) => c.category_code === 'TICKET');
      ticket?.teams?.forEach((t: any) => {
        t.parts?.forEach((p: any) => {
          const rawPart = p.part_name;
          const dept = (rawPart === '액티비티')
            ? '액티비티'
            : (rawPart === '미디어아트센터'
              ? '미디어아트센터'
              : (rawPart === '목장'
                ? '목장'
                : (rawPart === '놀이동산' ? '외주' : '기타')));

          if (!deptMap[dept]) return;

          p.venues?.forEach((v: any) => {
            let vName = v.venue_name || '영업장';
            if (dept === '외주' && !vName.includes('외주')) {
              vName = `${vName} (외주)`;
            }
            const rev = Number(v.subtotal?.todayActual || 0);

            deptMap[dept].monthly[ym].revenue += rev;
            deptMap[dept].total.revenue += rev;

            if (!deptMap[dept].venues[vName]) {
              deptMap[dept].venues[vName] = {
                name: vName,
                monthly: {},
                total: { revenue: 0, expense: 0, profit: 0 },
              };
              months.forEach((m) => {
                deptMap[dept].venues[vName].monthly[m] = { revenue: 0, expense: 0, profit: 0 };
              });
            }
            deptMap[dept].venues[vName].monthly[ym].revenue += rev;
            deptMap[dept].venues[vName].total.revenue += rev;
          });
        });
      });

      // GOODS 카테고리의 '미디어-기프트샵' 처리 (미디어아트센터 직영 소속)
      const goods = data.find((c: any) => c.category_code === 'GOODS');
      goods?.teams?.forEach((t: any) => {
        t.parts?.forEach((p: any) => {
          p.venues?.forEach((v: any) => {
            if (v.venue_name === '미디어-기프트샵') {
              const rev = Number(v.subtotal?.todayActual || 0);
              deptMap['미디어아트센터'].monthly[ym].revenue += rev;
              deptMap['미디어아트센터'].total.revenue += rev;

              if (!deptMap['미디어아트센터'].venues['미디어-기프트샵']) {
                deptMap['미디어아트센터'].venues['미디어-기프트샵'] = {
                  name: '미디어-기프트샵',
                  monthly: {},
                  total: { revenue: 0, expense: 0, profit: 0 },
                };
                months.forEach((m) => {
                  deptMap['미디어아트센터'].venues['미디어-기프트샵'].monthly[m] = { revenue: 0, expense: 0, profit: 0 };
                });
              }
              deptMap['미디어아트센터'].venues['미디어-기프트샵'].monthly[ym].revenue += rev;
              deptMap['미디어아트센터'].venues['미디어-기프트샵'].total.revenue += rev;
            }
          });
        });
      });
    });

    // 7. 각 레벨별 영업손익(Profit = Revenue - Expense) 계산
    DEPARTMENTS.forEach((dept) => {
      months.forEach((ym) => {
        deptMap[dept].monthly[ym].profit = deptMap[dept].monthly[ym].revenue - deptMap[dept].monthly[ym].expense;
      });
      deptMap[dept].total.profit = deptMap[dept].total.revenue - deptMap[dept].total.expense;

      Object.keys(deptMap[dept].venues).forEach((vName) => {
        const v = deptMap[dept].venues[vName];
        months.forEach((ym) => {
          v.monthly[ym].profit = v.monthly[ym].revenue - v.monthly[ym].expense;
        });
        v.total.profit = v.total.revenue - v.total.expense;
      });
    });

    // 8. 레저본부 총합계 계산 (직영 총합, 외주 총합, 공통 총합, 전체 총합)
    const createEmptyMetric = () => ({ revenue: 0, expense: 0, profit: 0 });
    const directTotal = {
      name: '레저본부 직영 합계',
      monthly: {} as Record<string, MetricItem>,
      total: createEmptyMetric(),
    };
    const allTotal = {
      name: '레저사업본부 전체 총합',
      monthly: {} as Record<string, MetricItem>,
      total: createEmptyMetric(),
    };

    const directDepts = ['미디어아트센터', '액티비티', '목장', '디지털지원'];

    months.forEach((ym) => {
      directTotal.monthly[ym] = createEmptyMetric();
      allTotal.monthly[ym] = createEmptyMetric();

      directDepts.forEach((d) => {
        directTotal.monthly[ym].revenue += deptMap[d].monthly[ym].revenue;
        directTotal.monthly[ym].expense += deptMap[d].monthly[ym].expense;
      });
      directTotal.monthly[ym].profit = directTotal.monthly[ym].revenue - directTotal.monthly[ym].expense;

      DEPARTMENTS.forEach((d) => {
        allTotal.monthly[ym].revenue += deptMap[d].monthly[ym].revenue;
        allTotal.monthly[ym].expense += deptMap[d].monthly[ym].expense;
      });
      allTotal.monthly[ym].profit = allTotal.monthly[ym].revenue - allTotal.monthly[ym].expense;
    });

    directTotal.total.revenue = Object.values(directTotal.monthly).reduce((s, m) => s + m.revenue, 0);
    directTotal.total.expense = Object.values(directTotal.monthly).reduce((s, m) => s + m.expense, 0);
    directTotal.total.profit = directTotal.total.revenue - directTotal.total.expense;

    allTotal.total.revenue = Object.values(allTotal.monthly).reduce((s, m) => s + m.revenue, 0);
    allTotal.total.expense = Object.values(allTotal.monthly).reduce((s, m) => s + m.expense, 0);
    allTotal.total.profit = allTotal.total.revenue - allTotal.total.expense;

    // 9. 직렬화 가능한 배열로 변환
    const departmentList = DEPARTMENTS.map((dept) => ({
      name: dept,
      monthly: deptMap[dept].monthly,
      total: deptMap[dept].total,
      venues: Object.values(deptMap[dept].venues),
    }));

    const responsePayload = {
      success: true,
      months,
      monthLabels,
      grandTotal: {
        directTotal,
        allTotal,
      },
      departments: departmentList,
    };

    // 메모리 캐시 저장
    memoryCache = {
      timestamp: Date.now(),
      data: responsePayload,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error in GET /api/dashboard/monthly-trend:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch monthly trend' },
      { status: 500 }
    );
  }
}
