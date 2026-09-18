import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebaseAdmin';
import { RawExpenseRow } from '@/lib/financeEngine';

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
  } catch (e) {
    return null;
  }
}

async function fetchAllExpenses(): Promise<RawExpenseRow[]> {
  const expenses: RawExpenseRow[] = [];

  if (db) {
    try {
      const snapshot = await db.collection('expenses_v2').get();
      if (!snapshot.empty) {
        snapshot.forEach((doc: any) => {
          expenses.push(doc.data() as RawExpenseRow);
        });
        return expenses;
      }
    } catch (adminErr: any) {
      console.warn('Admin Firestore fetch failed, falling back to Client SDK:', adminErr.message);
    }
  }

  const clientDb = getClientDb();
  if (clientDb) {
    const { collection, getDocs } = require('firebase/firestore');
    const snap = await getDocs(collection(clientDb, 'expenses_v2'));
    snap.forEach((doc: any) => {
      expenses.push(doc.data() as RawExpenseRow);
    });
  }

  return expenses;
}

const OFFICIAL_TEAMS = ['미디어아트센터', '액티비티', '목장', '디지털지원', '본부공통', '외주'];
const MACRO_CATEGORIES = ['인건비', '복리후생비', '운영경비/소모품비', '지급수수료/임차료', '마케팅/판촉비', '감가상각비', '기타'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    const filterMonth = searchParams.get('month'); // e.g. '2026-08'

    const allExpenses = await fetchAllExpenses();

    // 월별 그룹핑 (YYYY-MM 정렬)
    const monthGroups: Record<string, RawExpenseRow[]> = {};
    allExpenses.forEach((row) => {
      const ym = row.yearMonth || (row.date ? row.date.substring(0, 7) : '기타');
      if (filterMonth && ym !== filterMonth) return;
      if (!monthGroups[ym]) monthGroups[ym] = [];
      monthGroups[ym].push(row);
    });

    const sortedMonths = Object.keys(monthGroups).sort();

    // JSON 요청인 경우 구조화된 데이터 반환 (클립보드 복사 및 UI 표시용)
    if (format === 'json') {
      const summaryByMonth = sortedMonths.map((ym) => {
        const rows = monthGroups[ym];
        const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        return {
          yearMonth: ym,
          monthLabel: `${Number(ym.split('-')[1])}월`,
          count: rows.length,
          totalAmount,
        };
      });

      return NextResponse.json({
        success: true,
        months: sortedMonths,
        summary: summaryByMonth,
        groupedExpenses: monthGroups,
      });
    }

    // 워크북 생성
    const wb = XLSX.utils.book_new();

    // 1. [연간 총괄 요약] 시트 생성
    const summaryData: any[][] = [];
    summaryData.push(['벨포레 리조트 레져본부 2026년 월별 비용 결산 총괄 요약']);
    summaryData.push(['(단위: 원, 부가가치세 제외)']);
    summaryData.push([]);

    // 테이블 1: 월별 부서별 집계 매트릭스
    summaryData.push(['[1] 4대 부서 및 부문별 월별 비용 집계']);
    const monthHeaders = sortedMonths.map((ym) => `${Number(ym.split('-')[1])}월`);
    summaryData.push(['부서/구분', ...monthHeaders, '누계 합계']);

    const teamMonthlyTotals: Record<string, Record<string, number>> = {};
    OFFICIAL_TEAMS.forEach((team) => {
      teamMonthlyTotals[team] = {};
      sortedMonths.forEach((ym) => {
        teamMonthlyTotals[team][ym] = 0;
      });
    });

    sortedMonths.forEach((ym) => {
      monthGroups[ym].forEach((row) => {
        const team = row.assignedTeam || '본부공통';
        const key = OFFICIAL_TEAMS.includes(team) ? team : '본부공통';
        teamMonthlyTotals[key][ym] += Number(row.amount) || 0;
      });
    });

    OFFICIAL_TEAMS.forEach((team) => {
      let teamRowSum = 0;
      const rowVals = sortedMonths.map((ym) => {
        const val = teamMonthlyTotals[team][ym] || 0;
        teamRowSum += val;
        return val;
      });
      summaryData.push([team, ...rowVals, teamRowSum]);
    });

    // 부서별 총 합계 행
    const teamTotalRow: (string | number)[] = ['부서 총 합계'];
    let grandTeamTotal = 0;
    sortedMonths.forEach((ym) => {
      const monthSum = OFFICIAL_TEAMS.reduce((s, t) => s + (teamMonthlyTotals[t][ym] || 0), 0);
      teamTotalRow.push(monthSum);
      grandTeamTotal += monthSum;
    });
    teamTotalRow.push(grandTeamTotal);
    summaryData.push(teamTotalRow);

    summaryData.push([]);
    summaryData.push([]);

    // 테이블 2: 월별 6대 비목별 집계 매트릭스
    summaryData.push(['[2] 6대 대분류 비목별 월별 비용 집계']);
    summaryData.push(['대분류 비목', ...monthHeaders, '누계 합계']);

    const macroMonthlyTotals: Record<string, Record<string, number>> = {};
    MACRO_CATEGORIES.forEach((macro) => {
      macroMonthlyTotals[macro] = {};
      sortedMonths.forEach((ym) => {
        macroMonthlyTotals[macro][ym] = 0;
      });
    });

    sortedMonths.forEach((ym) => {
      monthGroups[ym].forEach((row) => {
        const macro = row.macroCategory || row.assignedCategory || '기타';
        const key = MACRO_CATEGORIES.includes(macro) ? macro : '기타';
        macroMonthlyTotals[key][ym] += Number(row.amount) || 0;
      });
    });

    MACRO_CATEGORIES.forEach((macro) => {
      let macroRowSum = 0;
      const rowVals = sortedMonths.map((ym) => {
        const val = macroMonthlyTotals[macro][ym] || 0;
        macroRowSum += val;
        return val;
      });
      summaryData.push([macro, ...rowVals, macroRowSum]);
    });

    // 비목별 총 합계 행
    const macroTotalRow: (string | number)[] = ['비목 총 합계'];
    let grandMacroTotal = 0;
    sortedMonths.forEach((ym) => {
      const monthSum = MACRO_CATEGORIES.reduce((s, m) => s + (macroMonthlyTotals[m][ym] || 0), 0);
      macroTotalRow.push(monthSum);
      grandMacroTotal += monthSum;
    });
    macroTotalRow.push(grandMacroTotal);
    summaryData.push(macroTotalRow);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 18 },
      ...sortedMonths.map(() => ({ wch: 14 })),
      { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, '연간 총괄 요약');

    // 2. 월별 개별 탭 (`1월`, `2월`, `3월` ... `8월`) 생성
    sortedMonths.forEach((ym) => {
      const monthNum = Number(ym.split('-')[1]);
      const sheetName = `${monthNum}월`;
      const rows = monthGroups[ym];

      // 일자 오름차순 정렬
      rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      const sheetData: any[][] = [];

      // 헤더 정의
      const headers = [
        '일자',
        '정산월',
        '4대부서',
        '배정영업장',
        '회계계정코드',
        '회계계정과목',
        '대분류비목',
        '쉬운비용항목',
        '금액(원)',
        '거래처명',
        '적요 / 세부내용',
        '전표구분',
        '안분기간',
        '특이사항',
      ];
      sheetData.push(headers);

      let monthTotalAmount = 0;

      rows.forEach((r) => {
        const amt = Number(r.amount) || 0;
        monthTotalAmount += amt;

        const oneOffText = (r as any).isOneOff 
          ? ((r as any).oneOffLabel || '1회성특별비용') 
          : '정기운영비';

        const periodText = ((r as any).periodStart && (r as any).periodEnd)
          ? `${(r as any).periodStart} ~ ${(r as any).periodEnd}`
          : '-';

        const noteText = r.isDepreciation 
          ? '감가상각비(손익제외)' 
          : r.isOutsourced 
            ? '외주위탁' 
            : '일반직과';

        sheetData.push([
          r.date || '-',
          r.yearMonth || ym,
          r.assignedTeam || '본부공통',
          r.assignedVenue || '-',
          r.accountCode || '-',
          r.accountName || '미분류',
          r.macroCategory || r.assignedCategory || '기타',
          r.friendlyCategory || '미분류항목',
          amt,
          r.clientName || '-',
          r.memo || '-',
          oneOffText,
          periodText,
          noteText,
        ]);
      });

      // 최하단 합계 행 추가
      sheetData.push([
        `[${sheetName} 총 합계]`,
        `${rows.length}건`,
        '-',
        '-',
        '-',
        '-',
        '-',
        '총 합계',
        monthTotalAmount,
        '-',
        '-',
        '-',
        '-',
        '-',
      ]);

      const wsMonth = XLSX.utils.aoa_to_sheet(sheetData);

      // 열 너비 자동 지정
      wsMonth['!cols'] = [
        { wch: 12 }, // 일자
        { wch: 10 }, // 정산월
        { wch: 14 }, // 4대부서
        { wch: 16 }, // 배정영업장
        { wch: 13 }, // 계정코드
        { wch: 20 }, // 계정과목
        { wch: 16 }, // 대분류비목
        { wch: 24 }, // 쉬운비용항목
        { wch: 15 }, // 금액(원)
        { wch: 22 }, // 거래처명
        { wch: 34 }, // 적요
        { wch: 16 }, // 전표구분
        { wch: 22 }, // 안분기간
        { wch: 18 }, // 특이사항
      ];

      XLSX.utils.book_append_sheet(wb, wsMonth, sheetName);
    });

    // 엑셀 바이너리 버퍼 생성
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = encodeURIComponent(`벨포레_레져본부_월별_비용전표_정리(1월-8월).xlsx`);

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/expenses/export:', error);
    return NextResponse.json(
      { success: false, error: `비용 내보내기 중 오류 발생: ${error.message}` },
      { status: 500 }
    );
  }
}
