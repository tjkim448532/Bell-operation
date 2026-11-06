"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  Users,
  BedDouble,
  Car,
  Target,
  RefreshCw,
  Download,
  AlertCircle,
  ShieldCheck,
  Calculator,
  Layers,
  Eye,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumber } from '@/lib/utils';
import type {
  MonthlyVisitorTargetsResponse,
  VisitorTargetRow,
  VenueUsageTargetRow,
  VenueAmountTargetRow,
} from '@/types/monthly-visitor-targets';

const MONTHS = Array.from({ length: 12 }, (_, idx) => idx + 1);
const TARGET_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1gCLq9cHL2Fl9SyIEGdFBn-wavdwqgjqo3JokDYViKEA/edit?usp=sharing';

function formatCountCell(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return formatNumber(val);
}

function formatPctCell(val: number | null | undefined, digits = 2): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return `${Number(val).toFixed(digits)}%`;
}

function formatAchievementStatus(val: number | null | undefined): '달성' | '미달' | '-' {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return val >= 100 ? '달성' : '미달';
}

function renderAchievementCell(val: number | null | undefined, digits = 2) {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return <span className="text-slate-400">-</span>;
  }
  const isAchieved = val >= 100;
  return (
    <div className="flex flex-col items-end leading-tight gap-0.5">
      <span className={isAchieved ? 'text-emerald-700 font-black' : 'text-rose-600 font-extrabold'}>
        {Number(val).toFixed(digits)}%
      </span>
      <span
        className={`inline-flex items-center px-1.5 py-0.2 rounded text-3xs font-extrabold border ${
          isAchieved
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-600 border-rose-200'
        }`}
      >
        {isAchieved ? '달성' : '미달'}
      </span>
    </div>
  );
}

function formatDeltaCell(actual: number | null | undefined, target: number | null | undefined): string | null {
  if (
    actual === null ||
    actual === undefined ||
    target === null ||
    target === undefined ||
    Number.isNaN(actual) ||
    Number.isNaN(target)
  ) {
    return null;
  }
  const diff = Math.round(actual - target);
  const sign = diff > 0 ? '+' : '';
  return `${sign}${formatNumber(diff)}`;
}

export default function MonthlyVisitorTargetDashboard() {
  const searchParams = useSearchParams();
  const isTeamMode = searchParams.get('mode') === 'team';
  const withMode = useCallback(
    (path: string) => {
      if (!isTeamMode) return path;
      return path.includes('?') ? `${path}&mode=team` : `${path}?mode=team`;
    },
    [isTeamMode]
  );

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [data, setData] = useState<MonthlyVisitorTargetsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 표시 옵션: 방문객 표 (3행 전체 보기 vs 시트 원본 2행 보기)
  const [showRoomVisitorRow, setShowRoomVisitorRow] = useState<boolean>(true);
  // 표시 옵션: 영업장 이용률 표 (시트 4대 핵심 영업장 vs 레저본부 전체 영업장)
  const [showAllLeisureVenues, setShowAllLeisureVenues] = useState<boolean>(false);
  // 표시 옵션: 영업장 이용률 셀 하단에 월별 방문객 수(명) 보조 표기
  const [showVenueVisitorCounts, setShowVenueVisitorCounts] = useState<boolean>(false);
  // 표시 옵션: 매출 목표 표에서 과부족 차액(실적 - 목표) 함께 보기
  const [showRevenueDelta, setShowRevenueDelta] = useState<boolean>(true);

  const fetchMonthlyTargets = useCallback(async (yr: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/monthly-visitor-targets?year=${yr}`);
      if (!res.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
      }
      const json: MonthlyVisitorTargetsResponse = await res.json();
      if (!json.success) {
        throw new Error(json.error || '월별 방문객 및 이용률 목표 데이터를 불러오지 못했습니다.');
      }
      setData(json);
    } catch (err: any) {
      console.error('Failed to fetch monthly visitor targets:', err);
      setError(err?.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthlyTargets(selectedYear);
  }, [selectedYear, fetchMonthlyTargets]);

  const displayedVisitorRows = useMemo<VisitorTargetRow[]>(() => {
    if (!data?.visitorTargets) return [];
    if (showRoomVisitorRow) return data.visitorTargets;
    return data.visitorTargets.filter((r) => r.rowKey !== 'ROOM_VISITORS');
  }, [data?.visitorTargets, showRoomVisitorRow]);

  const displayedVenueRows = useMemo<VenueUsageTargetRow[]>(() => {
    if (!data?.venueUsageTargets) return [];
    if (showAllLeisureVenues) return data.venueUsageTargets;
    return data.venueUsageTargets.filter((r) => r.isCoreSheetVenue);
  }, [data?.venueUsageTargets, showAllLeisureVenues]);

  const revenueRows = useMemo<VenueAmountTargetRow[]>(
    () => (Array.isArray(data?.venueRevenueTargets) ? data.venueRevenueTargets : []),
    [data?.venueRevenueTargets]
  );

  const revenueTotalRow = useMemo<VenueAmountTargetRow | null>(
    () =>
      revenueRows.find((r) => r.isSummaryRow || r.venueKey === 'TOTAL' || r.venueName === '합계') ||
      null,
    [revenueRows]
  );

  const revenueVenueOnlyRows = useMemo<VenueAmountTargetRow[]>(
    () => revenueRows.filter((r) => !r.isSummaryRow && r.venueKey !== 'TOTAL'),
    [revenueRows]
  );

  const monthlyRevenueScoreboard = useMemo(() => {
    let achievedMonths = 0;
    let evaluatedMonths = 0;
    const byMonth: Record<
      number,
      {
        target: number | null;
        actual: number | null;
        achievementRatePct: number | null;
        status: '달성' | '미달' | '대기';
        achievedVenues: number;
        evaluatedVenues: number;
      }
    > = {};

    for (const m of MONTHS) {
      const mKey = String(m);
      const totalCell = revenueTotalRow?.monthly?.[mKey];
      const rate = totalCell?.achievementRatePct ?? null;
      let status: '달성' | '미달' | '대기' = '대기';
      if (rate !== null && !Number.isNaN(rate)) {
        evaluatedMonths++;
        if (rate >= 100) {
          status = '달성';
          achievedMonths++;
        } else {
          status = '미달';
        }
      }

      let achievedVenues = 0;
      let evaluatedVenues = 0;
      for (const vRow of revenueVenueOnlyRows) {
        const vRate = vRow.monthly?.[mKey]?.achievementRatePct;
        if (vRate !== null && vRate !== undefined && !Number.isNaN(vRate)) {
          evaluatedVenues++;
          if (vRate >= 100) achievedVenues++;
        }
      }

      byMonth[m] = {
        target: totalCell?.target ?? null,
        actual: totalCell?.actual ?? null,
        achievementRatePct: rate,
        status,
        achievedVenues,
        evaluatedVenues,
      };
    }

    let annualAchievedVenues = 0;
    let annualEvaluatedVenues = 0;
    for (const vRow of revenueVenueOnlyRows) {
      const vRate = vRow.annual?.achievementRatePct;
      if (vRate !== null && vRate !== undefined && !Number.isNaN(vRate)) {
        annualEvaluatedVenues++;
        if (vRate >= 100) annualAchievedVenues++;
      }
    }

    return {
      achievedMonths,
      evaluatedMonths,
      annualAchievedVenues,
      annualEvaluatedVenues,
      byMonth,
    };
  }, [revenueTotalRow, revenueVenueOnlyRows]);

  const unitPriceRows = useMemo<VenueAmountTargetRow[]>(
    () => (Array.isArray(data?.venueUnitPriceTargets) ? data.venueUnitPriceTargets : []),
    [data?.venueUnitPriceTargets]
  );

  const leisureTotalRow = useMemo(
    () => data?.visitorTargets?.find((r) => r.rowKey === 'LEISURE_TOTAL') || null,
    [data?.visitorTargets]
  );
  const roomVisitorRow = useMemo(
    () => data?.visitorTargets?.find((r) => r.rowKey === 'ROOM_VISITORS') || null,
    [data?.visitorTargets]
  );
  const walkinDigitalRow = useMemo(
    () => data?.visitorTargets?.find((r) => r.rowKey === 'WALKIN_DIGITAL') || null,
    [data?.visitorTargets]
  );

  // 엑셀 다운로드 핸들러 (Zero-Proxy: 백엔드 응답값 그대로 시트 출력)
  const handleExportExcel = useCallback(() => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: 월별 방문객 목표
    const headerRow1: string[] = ['구분', '전체', '', ''];
    const headerRow2: string[] = ['', '목표', '실적', '달성률'];
    for (const m of MONTHS) {
      headerRow1.push(`${m}월`, '', '');
      headerRow2.push('목표', '실적', '달성률');
    }

    const visitorSheetRows: any[][] = [
      [`월별 방문객 목표 (${data.year}년 / 최종 업데이트: ${data.lastUpdated || '-'})`],
      ['모수 공식: 숙박 방문객(골프제외) + 나들이 방문객(디지털지원 할당) = 레저본부 방문객'],
      [],
      headerRow1,
      headerRow2,
    ];

    for (const row of data.visitorTargets) {
      const rData: any[] = [
        `${row.label} (${row.subLabel})`,
        formatCountCell(row.annual.target),
        formatCountCell(row.annual.actual),
        `${formatPctCell(row.annual.achievementRatePct, 2)} (${formatAchievementStatus(row.annual.achievementRatePct)})`,
      ];
      for (const m of MONTHS) {
        const cell = row.monthly[String(m)];
        rData.push(
          formatCountCell(cell?.target),
          formatCountCell(cell?.actual),
          cell?.achievementRatePct !== null && cell?.achievementRatePct !== undefined
            ? `${formatPctCell(cell.achievementRatePct, 2)} (${formatAchievementStatus(cell.achievementRatePct)})`
            : '-'
        );
      }
      visitorSheetRows.push(rData);
    }

    const wsVisitors = XLSX.utils.aoa_to_sheet(visitorSheetRows);
    XLSX.utils.book_append_sheet(wb, wsVisitors, '월별 방문객 목표');

    // Sheet 2: 월별 이용률 목표
    const uHeaderRow1: string[] = ['업장', '전체', '', ''];
    const uHeaderRow2: string[] = ['', '목표(평균)', '실적', '달성률'];
    for (const m of MONTHS) {
      uHeaderRow1.push(`${m}월`, '', '');
      uHeaderRow2.push('목표', '실적', '달성률');
    }

    const usageSheetRows: any[][] = [
      [`월별 이용률 목표 (${data.year}년 / 최종 업데이트: ${data.lastUpdated || '-'})`],
      [],
      uHeaderRow1,
      uHeaderRow2,
    ];

    for (const row of data.venueUsageTargets) {
      const rData: any[] = [
        row.venueName,
        formatPctCell(row.annual.targetRatePct, 2),
        formatPctCell(row.annual.actualRatePct, 2),
        row.annual.achievementRatePct !== null
          ? `${formatPctCell(row.annual.achievementRatePct, 0)} (${formatAchievementStatus(row.annual.achievementRatePct)})`
          : '-',
      ];
      for (const m of MONTHS) {
        const cell = row.monthly[String(m)];
        rData.push(
          formatPctCell(cell?.targetRatePct, 2),
          formatPctCell(cell?.actualRatePct, 2),
          cell?.achievementRatePct !== null && cell?.achievementRatePct !== undefined
            ? `${formatPctCell(cell.achievementRatePct, 2)} (${formatAchievementStatus(cell.achievementRatePct)})`
            : '-'
        );
      }
      usageSheetRows.push(rData);
    }

    const wsUsage = XLSX.utils.aoa_to_sheet(usageSheetRows);
    XLSX.utils.book_append_sheet(wb, wsUsage, '월별 이용률 목표');

    // Sheet 3: 월별 매출 목표(부가세포함)
    if (Array.isArray(data.venueRevenueTargets) && data.venueRevenueTargets.length > 0) {
      const rHeaderRow1: string[] = ['업장', '전체', '', ''];
      const rHeaderRow2: string[] = ['', '목표', '실적', '달성률(달성여부)'];
      for (const m of MONTHS) {
        rHeaderRow1.push(`${m}월`, '', '');
        rHeaderRow2.push('목표', '실적', '달성률(달성여부)');
      }

      const revSheetRows: any[][] = [
        [`월별 매출 목표(부가세포함) (${data.year}년 / 최종 업데이트: ${data.lastUpdated || '-'})`],
        ['미디어 아트 센터 총 매출 합: 미디어 아트 센터 + 카페 + 기념품 | 목장 총 매출 합: 목장 + 목장체험 + 얼룩말카페'],
        [],
        rHeaderRow1,
        rHeaderRow2,
      ];

      for (const row of data.venueRevenueTargets) {
        const rData: any[] = [
          row.venueName,
          formatCountCell(row.annual.target),
          formatCountCell(row.annual.actual),
          row.annual.achievementRatePct !== null
            ? `${formatPctCell(row.annual.achievementRatePct, 2)} (${formatAchievementStatus(row.annual.achievementRatePct)})`
            : '-',
        ];
        for (const m of MONTHS) {
          const cell = row.monthly[String(m)];
          rData.push(
            formatCountCell(cell?.target),
            formatCountCell(cell?.actual),
            cell?.achievementRatePct !== null && cell?.achievementRatePct !== undefined
              ? `${formatPctCell(cell.achievementRatePct, 2)} (${formatAchievementStatus(cell.achievementRatePct)})`
              : '-'
          );
        }
        revSheetRows.push(rData);
      }

      const wsRev = XLSX.utils.aoa_to_sheet(revSheetRows);
      XLSX.utils.book_append_sheet(wb, wsRev, '월별 매출 목표');
    }

    // Sheet 4: 목표 객단가
    if (Array.isArray(data.venueUnitPriceTargets) && data.venueUnitPriceTargets.length > 0) {
      const upHeaderRow1: string[] = ['업장', '전체', '', ''];
      const upHeaderRow2: string[] = ['', '목표', '실적', '달성률(달성여부)'];
      for (const m of MONTHS) {
        upHeaderRow1.push(`${m}월`, '', '');
        upHeaderRow2.push('목표', '실적', '달성률(달성여부)');
      }

      const upSheetRows: any[][] = [
        [`목표 객단가 (${data.year}년 / 최종 업데이트: ${data.lastUpdated || '-'})`],
        [],
        upHeaderRow1,
        upHeaderRow2,
      ];

      for (const row of data.venueUnitPriceTargets) {
        const rData: any[] = [
          row.venueName,
          formatCountCell(row.annual.target),
          formatCountCell(row.annual.actual),
          row.annual.achievementRatePct !== null
            ? `${formatPctCell(row.annual.achievementRatePct, 2)} (${formatAchievementStatus(row.annual.achievementRatePct)})`
            : '-',
        ];
        for (const m of MONTHS) {
          const cell = row.monthly[String(m)];
          rData.push(
            formatCountCell(cell?.target),
            formatCountCell(cell?.actual),
            cell?.achievementRatePct !== null && cell?.achievementRatePct !== undefined
              ? `${formatPctCell(cell.achievementRatePct, 2)} (${formatAchievementStatus(cell.achievementRatePct)})`
              : '-'
          );
        }
        upSheetRows.push(rData);
      }

      const wsUp = XLSX.utils.aoa_to_sheet(upSheetRows);
      XLSX.utils.book_append_sheet(wb, wsUp, '목표 객단가');
    }

    XLSX.writeFile(wb, `벨포레_레저본부_월별목표_실적대조표_${data.year}.xlsx`);
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* ==================================================================== */}
      {/* 1. 상단 헤더 & 뷰 전환 탭 바 */}
      {/* ==================================================================== */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E6F7F4] text-[#00826F] text-xs font-extrabold">
                  <Target size={14} />
                  <span>레저본부 월별 목표·실적 대조표</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 text-xs font-bold">
                  <span>숙박방문객 + 나들이방문객 = 레저본부 방문객</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                  <span>디지털지원 할당 = 나들이 방문객</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex flex-wrap items-center gap-2.5">
                <span>월별 방문객 목표 & 레저본부 영업장별 이용률 목표</span>
                {data?.lastUpdated && (
                  <span className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    (최종 업데이트 : {data.lastUpdated})
                  </span>
                )}
              </h1>
            </div>

            {/* 우측 컨트롤: 뷰 전환 + 시트 바로가기 + 연도 선택 + 새로고침 + 엑셀 다운로드 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <Link
                  href={withMode('/venue-usage-rate')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
                >
                  <Calculator size={13} />
                  <span>일별·기간별 이용률</span>
                </Link>
                <Link
                  href={withMode('/monthly-visitor-targets')}
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#00AE95] text-white shadow-2xs flex items-center gap-1.5"
                >
                  <Calendar size={13} />
                  <span>월별 방문객·이용률 목표</span>
                </Link>
              </div>

              <a
                href={data?.sheetUrl || TARGET_GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                <ExternalLink size={13} />
                <span>목표 원본 구글시트</span>
              </a>

              <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                {[2026, 2025, 2024].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                      selectedYear === yr
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {yr}년
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => fetchMonthlyTargets(selectedYear)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#00AE95]' : ''} />
                <span>새로고침</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!data || isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00AE95] text-white text-xs font-extrabold hover:bg-[#009b84] transition-colors shadow-2xs disabled:opacity-50"
              >
                <Download size={14} />
                <span>엑셀 다운로드</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* ==================================================================== */}
        {/* 2. 방문객 모수 공식 요약 카드 (숙박 방문객 + 나들이 방문객 = 레저본부 방문객) */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* 숙박 방문객 */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <BedDouble size={18} />
                </div>
                <div>
                  <div className="text-2xs font-bold text-blue-700">
                    숙박 방문객 (골프제외 순수 숙박)
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                    {formatCountCell(roomVisitorRow?.annual?.actual)}
                    <span className="text-xs font-bold text-slate-500 ml-0.5">명</span>
                  </div>
                </div>
              </div>

              <div className="text-xl font-black text-slate-400">+</div>

              {/* 나들이 방문객 (= 디지털지원 할당) */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Car size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xs font-extrabold text-indigo-800">
                      나들이 방문객
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-3xs font-black">
                      = 디지털지원 할당
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                    {formatCountCell(walkinDigitalRow?.annual?.actual)}
                    <span className="text-xs font-bold text-slate-500 ml-0.5">명</span>
                  </div>
                </div>
              </div>

              <div className="text-xl font-black text-[#00AE95]">=</div>

              {/* 레저본부 방문객 (모수 합계) */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#E6F7F4] border border-[#00AE95]/40">
                <div className="w-9 h-9 rounded-xl bg-[#00AE95] text-white flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-2xs font-extrabold text-[#00826F]">
                    레저본부 방문객 ({selectedYear}년 누적 실적 모수)
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                    {formatCountCell(leisureTotalRow?.annual?.actual)}
                    <span className="text-xs font-bold text-slate-600 ml-0.5">명</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 백엔드 연동 상태 배지 (Zero-Mock / Fail-Stop 고지) */}
            <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-end gap-1.5 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>목표(구글시트 SSOT) + 실적·달성률(백엔드 V6 마트) 1:1 직결</span>
              </div>
              {data && !data.isTargetEndpointReady && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-2xs font-bold">
                  <AlertCircle size={13} className="text-amber-600 shrink-0" />
                  <span>
                    월별 목표·달성률: 백엔드 목표치 API 배포 대기 중 (미제공 항목 &apos;-&apos; 표기)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 에러 또는 로딩 상태 */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <div className="text-sm font-bold">{error}</div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 3. [표 1] 월별 방문객 목표 (1월 ~ 12월 + 전체) */}
        {/* ==================================================================== */}
        <section className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                월별 방문객 목표
              </h2>
              <span className="text-xs font-extrabold text-rose-600">
                (최종 업데이트 : {data?.lastUpdated || '-'})
              </span>
              <span className="text-2xs font-semibold text-slate-500">
                * 숙박 방문객 + 나들이 방문객(디지털지원 할당) = 레저본부 방문객
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRoomVisitorRow((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  showRoomVisitorRow
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Eye size={13} />
                <span>
                  {showRoomVisitorRow
                    ? '3행 모두 보기 (숙박+나들이=레저본부)'
                    : '시트 원본 2행 보기 (레저본부·디지털지원)'}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* 1단 헤더: 구분 | 전체 | 1월 ~ 12월 */}
                <tr className="border-b border-slate-300">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-10 bg-[#FFF2CC] text-slate-900 font-black px-4 py-2.5 text-center border-r border-slate-300 min-w-[190px]"
                  >
                    구분
                  </th>
                  <th
                    colSpan={3}
                    className="bg-[#FFF2CC] text-slate-900 font-black px-3 py-2 text-center border-r-2 border-slate-400"
                  >
                    전체
                  </th>
                  {MONTHS.map((m) => {
                    const isOdd = m % 2 === 1;
                    return (
                      <th
                        key={`v-h1-${m}`}
                        colSpan={3}
                        className={`${
                          isOdd ? 'bg-[#E2EFDA]' : 'bg-[#FFF2CC]'
                        } text-slate-900 font-black px-3 py-2 text-center border-r border-slate-300`}
                      >
                        {m}월
                      </th>
                    );
                  })}
                </tr>

                {/* 2단 헤더: 목표 | 실적 | 달성률 */}
                <tr className="border-b-2 border-slate-400">
                  <th className="bg-[#FFF9E6] text-slate-800 font-extrabold px-3 py-1.5 text-center border-r border-slate-300 min-w-[78px]">
                    목표
                  </th>
                  <th className="bg-[#FFF9E6] text-slate-900 font-black px-3 py-1.5 text-center border-r border-slate-300 min-w-[78px]">
                    실적
                  </th>
                  <th className="bg-[#FFF9E6] text-slate-800 font-extrabold px-3 py-1.5 text-center border-r-2 border-slate-400 min-w-[72px]">
                    달성률
                  </th>
                  {MONTHS.map((m) => {
                    const isOdd = m % 2 === 1;
                    const subBg = isOdd ? 'bg-[#F2F8EE]' : 'bg-[#FFF9E6]';
                    return (
                      <React.Fragment key={`v-h2-${m}`}>
                        <th
                          className={`${subBg} text-slate-700 font-bold px-2.5 py-1.5 text-center border-r border-slate-200 min-w-[72px]`}
                        >
                          목표
                        </th>
                        <th
                          className={`${subBg} text-slate-900 font-extrabold px-2.5 py-1.5 text-center border-r border-slate-200 min-w-[72px]`}
                        >
                          실적
                        </th>
                        <th
                          className={`${subBg} text-slate-700 font-bold px-2.5 py-1.5 text-center border-r border-slate-300 min-w-[68px]`}
                        >
                          달성률
                        </th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={40}
                      className="py-10 text-center text-slate-500 font-bold"
                    >
                      월별 방문객 데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : displayedVisitorRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={40}
                      className="py-10 text-center text-slate-500 font-bold"
                    >
                      표시할 방문객 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  displayedVisitorRows.map((row) => {
                    const isMainTotal = row.rowKey === 'LEISURE_TOTAL';
                    const isWalkin = row.rowKey === 'WALKIN_DIGITAL';
                    return (
                      <tr
                        key={row.rowKey}
                        className={`hover:bg-slate-50/90 transition-colors ${
                          isMainTotal ? 'bg-emerald-50/20 font-bold' : 'bg-white'
                        }`}
                      >
                        {/* 구분 (Sticky Left) */}
                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-slate-300 text-center">
                          <div className="font-black text-slate-900 text-xs">
                            {row.label}
                          </div>
                          <div
                            className={`text-3xs font-bold mt-0.5 ${
                              isMainTotal
                                ? 'text-[#00826F]'
                                : isWalkin
                                  ? 'text-indigo-600'
                                  : 'text-blue-600'
                            }`}
                          >
                            {row.subLabel}
                          </div>
                        </td>

                        {/* 전체: 목표 | 실적 | 달성률 */}
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800 bg-amber-50/30 border-r border-slate-200">
                          {formatCountCell(row.annual.target)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-950 bg-amber-50/50 border-r border-slate-200">
                          {formatCountCell(row.annual.actual)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900 bg-amber-50/30 border-r-2 border-slate-400">
                          {renderAchievementCell(row.annual.achievementRatePct, 2)}
                        </td>

                        {/* 1월 ~ 12월: 목표 | 실적 | 달성률 */}
                        {MONTHS.map((m) => {
                          const cell = row.monthly[String(m)];
                          return (
                            <React.Fragment key={`${row.rowKey}-m-${m}`}>
                              <td className="px-2.5 py-2.5 text-right font-mono text-slate-600 border-r border-slate-200">
                                {formatCountCell(cell?.target)}
                              </td>
                              <td className="px-2.5 py-2.5 text-right font-mono font-extrabold text-slate-900 border-r border-slate-200">
                                {formatCountCell(cell?.actual)}
                              </td>
                              <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-slate-700 border-r border-slate-300">
                                {renderAchievementCell(cell?.achievementRatePct, 2)}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 4. [표 2] 월별 이용률 목표 - 레저본부 영업장별 (1월 ~ 12월 + 전체) */}
        {/* ==================================================================== */}
        <section className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                월별 이용률 목표
              </h2>
              <span className="text-xs font-extrabold text-rose-600">
                (최종 업데이트 : {data?.lastUpdated || '-'})
              </span>
              <span className="text-2xs font-semibold text-slate-500">
                * 레저본부 방문객(숙박+나들이) 모수 대비 각 영업장 이용객 비율(%)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowVenueVisitorCounts((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  showVenueVisitorCounts
                    ? 'bg-[#00AE95] text-white border-[#00AE95]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Users size={13} />
                <span>
                  {showVenueVisitorCounts ? '이용객 수(명) 함께 표시 중' : '이용객 수(명) 함께 보기'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowAllLeisureVenues((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  showAllLeisureVenues
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Layers size={13} />
                <span>
                  {showAllLeisureVenues
                    ? `레저본부 전체 영업장 보기 (${data?.venueUsageTargets?.length || 0}개)`
                    : '시트 4대 핵심 영업장 보기 (미디어아트·목장·썰매·카트)'}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* 1단 헤더: 업장 | 전체 | 1월 ~ 12월 */}
                <tr className="border-b border-slate-300">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-10 bg-[#FFF2CC] text-slate-900 font-black px-4 py-2.5 text-center border-r border-slate-300 min-w-[190px]"
                  >
                    업장
                  </th>
                  <th
                    colSpan={3}
                    className="bg-[#FFF2CC] text-slate-900 font-black px-3 py-2 text-center border-r-2 border-slate-400"
                  >
                    전체
                  </th>
                  {MONTHS.map((m) => {
                    const isOdd = m % 2 === 1;
                    return (
                      <th
                        key={`u-h1-${m}`}
                        colSpan={3}
                        className={`${
                          isOdd ? 'bg-[#E2EFDA]' : 'bg-[#FFF2CC]'
                        } text-slate-900 font-black px-3 py-2 text-center border-r border-slate-300`}
                      >
                        {m}월
                      </th>
                    );
                  })}
                </tr>

                {/* 2단 헤더: 목표(평균) | 실적 | 달성률 */}
                <tr className="border-b-2 border-slate-400">
                  <th className="bg-[#FFF9E6] text-slate-800 font-extrabold px-3 py-1.5 text-center border-r border-slate-300 min-w-[78px]">
                    목표(평균)
                  </th>
                  <th className="bg-[#FFF9E6] text-slate-900 font-black px-3 py-1.5 text-center border-r border-slate-300 min-w-[78px]">
                    실적
                  </th>
                  <th className="bg-[#FFF9E6] text-slate-800 font-extrabold px-3 py-1.5 text-center border-r-2 border-slate-400 min-w-[72px]">
                    달성률
                  </th>
                  {MONTHS.map((m) => {
                    const isOdd = m % 2 === 1;
                    const subBg = isOdd ? 'bg-[#F2F8EE]' : 'bg-[#FFF9E6]';
                    return (
                      <React.Fragment key={`u-h2-${m}`}>
                        <th
                          className={`${subBg} text-slate-700 font-bold px-2.5 py-1.5 text-center border-r border-slate-200 min-w-[72px]`}
                        >
                          목표
                        </th>
                        <th
                          className={`${subBg} text-slate-900 font-extrabold px-2.5 py-1.5 text-center border-r border-slate-200 min-w-[72px]`}
                        >
                          실적
                        </th>
                        <th
                          className={`${subBg} text-slate-700 font-bold px-2.5 py-1.5 text-center border-r border-slate-300 min-w-[68px]`}
                        >
                          달성률
                        </th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={40}
                      className="py-10 text-center text-slate-500 font-bold"
                    >
                      영업장별 월별 이용률 데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : displayedVenueRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={40}
                      className="py-10 text-center text-slate-500 font-bold"
                    >
                      표시할 레저본부 영업장 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  displayedVenueRows.map((row) => (
                    <tr
                      key={row.venueKey}
                      className="hover:bg-slate-50/90 transition-colors bg-white"
                    >
                      {/* 업장명 (Sticky Left) */}
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-slate-300 text-center">
                        <div className="font-black text-slate-900 text-xs">
                          {row.venueName}
                        </div>
                        {row.rawVenueName !== row.venueName && (
                          <div className="text-3xs font-semibold text-slate-400 mt-0.5">
                            {row.rawVenueName}
                          </div>
                        )}
                      </td>

                      {/* 전체: 목표(평균) | 실적 | 달성률 */}
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800 bg-amber-50/30 border-r border-slate-200">
                        {formatPctCell(row.annual.targetRatePct, 2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-slate-950 bg-amber-50/50 border-r border-slate-200">
                        <div>{formatPctCell(row.annual.actualRatePct, 2)}</div>
                        {showVenueVisitorCounts && row.annual.visitors !== null && (
                          <div className="text-3xs font-semibold text-slate-500 mt-0.5">
                            ({formatCountCell(row.annual.visitors)}명)
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900 bg-amber-50/30 border-r-2 border-slate-400">
                        {renderAchievementCell(row.annual.achievementRatePct, 0)}
                      </td>

                      {/* 1월 ~ 12월: 목표 | 실적 | 달성률 */}
                      {MONTHS.map((m) => {
                        const cell = row.monthly[String(m)];
                        return (
                          <React.Fragment key={`${row.venueKey}-m-${m}`}>
                            <td className="px-2.5 py-2.5 text-right font-mono text-slate-600 border-r border-slate-200">
                              {formatPctCell(cell?.targetRatePct, 2)}
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-mono font-extrabold text-slate-900 border-r border-slate-200">
                              <div>{formatPctCell(cell?.actualRatePct, 2)}</div>
                              {showVenueVisitorCounts && cell?.visitors !== null && cell?.visitors !== undefined && (
                                <div className="text-3xs font-medium text-slate-500 mt-0.5">
                                  ({formatCountCell(cell.visitors)}명)
                                </div>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-slate-700 border-r border-slate-300">
                              {renderAchievementCell(cell?.achievementRatePct, 2)}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 5. [표 3] 월별 매출 목표 (부가세포함) & 달별 달성 여부 스코어보드 */}
        {/* ==================================================================== */}
        {revenueRows.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2 bg-slate-50/70">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  월별 매출 목표(부가세포함) & 달별 달성 현황
                </h2>
                <span className="text-xs font-extrabold text-rose-600">
                  (최종 업데이트 : {data?.lastUpdated || '-'})
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-2xs font-extrabold">
                  연간 달성 월: {monthlyRevenueScoreboard.achievedMonths} /{' '}
                  {monthlyRevenueScoreboard.evaluatedMonths}개월
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-2xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowRevenueDelta((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-2xs font-extrabold border transition-colors ${
                    showRevenueDelta
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Calculator size={12} />
                  <span>
                    {showRevenueDelta
                      ? '과부족 차액(Δ 실적-목표) 표시 중'
                      : '과부족 차액(Δ 실적-목표) 함께 보기'}
                  </span>
                </button>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-900 border border-cyan-200">
                  미디어 아트 센터 총 매출 합 : 미디어 아트 센터 + 카페 + 기념품
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                  목장 총 매출 합 : 목장 + 목장체험 + 얼룩말카페
                </span>
              </div>
            </div>

            {/* 1월 ~ 12월 달별 매출 목표 달성 여부 스코어보드 */}
            {revenueTotalRow && (
              <div className="px-5 py-3.5 bg-slate-50/40 border-b border-slate-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-13 gap-2">
                  {/* 전체(연간) 요약 카드 */}
                  <div className="rounded-xl border-2 border-slate-300 bg-amber-50/50 p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-slate-900">전체 합계</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-3xs font-black border ${
                          (revenueTotalRow.annual.achievementRatePct ?? 0) >= 100
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-700 border-rose-300'
                        }`}
                      >
                        {formatAchievementStatus(revenueTotalRow.annual.achievementRatePct)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <div className="text-sm font-black font-mono text-slate-900">
                        {formatPctCell(revenueTotalRow.annual.achievementRatePct, 2)}
                      </div>
                      <div className="text-3xs font-bold text-slate-500 mt-0.5">
                        달성 업장: {monthlyRevenueScoreboard.annualAchievedVenues}/
                        {monthlyRevenueScoreboard.annualEvaluatedVenues}개
                      </div>
                    </div>
                  </div>

                  {/* 1월 ~ 12월 달별 달성 카드 */}
                  {MONTHS.map((m) => {
                    const mStat = monthlyRevenueScoreboard.byMonth[m];
                    const isAchieved = mStat?.status === '달성';
                    const isMissed = mStat?.status === '미달';
                    return (
                      <div
                        key={`rev-score-${m}`}
                        className={`rounded-xl border p-2.5 flex flex-col justify-between transition-colors ${
                          isAchieved
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : isMissed
                              ? 'bg-rose-50/40 border-rose-200'
                              : 'bg-white border-slate-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-slate-800">{m}월</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-3xs font-black border ${
                              isAchieved
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : isMissed
                                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {mStat?.status || '대기'}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <div
                            className={`text-sm font-black font-mono ${
                              isAchieved
                                ? 'text-emerald-800'
                                : isMissed
                                  ? 'text-rose-700'
                                  : 'text-slate-400'
                            }`}
                          >
                            {formatPctCell(mStat?.achievementRatePct, 1)}
                          </div>
                          <div className="text-3xs font-bold text-slate-500 mt-0.5">
                            {mStat?.evaluatedVenues > 0
                              ? `${mStat.achievedVenues}/${mStat.evaluatedVenues}개 업장 달성`
                              : '실적 집계 대기'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-10 bg-[#FFF2CC] text-slate-900 font-black px-4 py-2.5 text-center border-r border-slate-300 min-w-[190px]"
                    >
                      업장
                    </th>
                    <th
                      colSpan={3}
                      className="bg-[#FFF2CC] text-slate-900 font-black px-3 py-2 text-center border-r-2 border-slate-400"
                    >
                      전체
                    </th>
                    {MONTHS.map((m) => {
                      const isOdd = m % 2 === 1;
                      return (
                        <th
                          key={`rev-h1-${m}`}
                          colSpan={3}
                          className={`${
                            isOdd ? 'bg-[#E2EFDA]' : 'bg-[#FFF2CC]'
                          } text-slate-900 font-black px-3 py-2 text-center border-r border-slate-300`}
                        >
                          {m}월
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="border-b-2 border-slate-400">
                    <th className="bg-[#FFF9E6] text-slate-800 font-extrabold px-3 py-1.5 text-center border-r border-slate-300 min-w-[92px]">
                      목표
                    </th>
                    <th className="bg-[#FFF9E6] text-slate-900 font-black px-3 py-1.5 text-center border-r border-slate-300 min-w-[92px]">
                      실적
                    </th>
                    <th className="bg-[#FFF9E6] text-slate-800 font-extrabold px-3 py-1.5 text-center border-r-2 border-slate-400 min-w-[76px]">
                      달성률
                    </th>
                    {MONTHS.map((m) => {
                      const isOdd = m % 2 === 1;
                      const subBg = isOdd ? 'bg-[#F2F8EE]' : 'bg-[#FFF9E6]';
                      return (
                        <React.Fragment key={`rev-h2-${m}`}>
                          <th
                            className={`${subBg} text-slate-700 font-bold px-2.5 py-1.5 text-center border-r border-slate-200 min-w-[86px]`}
                          >
                            목표
                          </th>
                          <th
                            className={`${subBg} text-slate-900 font-extrabold px-2.5 py-1.5 text-center border-r border-slate-200 min-w-[86px]`}
                          >
                            실적
                          </th>
                          <th
                            className={`${subBg} text-slate-700 font-bold px-2.5 py-1.5 text-center border-r border-slate-300 min-w-[72px]`}
                          >
                            달성률
                          </th>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {revenueRows.map((row) => {
                    const annualDelta = formatDeltaCell(row.annual.actual, row.annual.target);
                    const annualDiffVal =
                      row.annual.actual !== null && row.annual.target !== null
                        ? row.annual.actual - row.annual.target
                        : null;
                    return (
                      <tr
                        key={row.venueKey}
                        className={`hover:bg-slate-50/90 transition-colors ${
                          row.isSummaryRow
                            ? 'bg-amber-50/50 font-black border-t-2 border-slate-300'
                            : 'bg-white'
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-slate-300 text-center font-black text-slate-900">
                          {row.venueName}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800 bg-amber-50/30 border-r border-slate-200">
                          {formatCountCell(row.annual.target)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-950 bg-amber-50/50 border-r border-slate-200">
                          <div>{formatCountCell(row.annual.actual)}</div>
                          {showRevenueDelta && annualDelta && (
                            <div
                              className={`text-3xs font-bold mt-0.5 ${
                                (annualDiffVal ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              ({annualDelta})
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900 bg-amber-50/30 border-r-2 border-slate-400">
                          {renderAchievementCell(row.annual.achievementRatePct, 2)}
                        </td>
                        {MONTHS.map((m) => {
                          const cell = row.monthly[String(m)];
                          const mDelta = formatDeltaCell(cell?.actual, cell?.target);
                          const mDiffVal =
                            cell?.actual !== null &&
                            cell?.actual !== undefined &&
                            cell?.target !== null &&
                            cell?.target !== undefined
                              ? cell.actual - cell.target
                              : null;
                          return (
                            <React.Fragment key={`rev-${row.venueKey}-m-${m}`}>
                              <td className="px-2.5 py-2.5 text-right font-mono text-slate-600 border-r border-slate-200">
                                {formatCountCell(cell?.target)}
                              </td>
                              <td className="px-2.5 py-2.5 text-right font-mono font-extrabold text-slate-900 border-r border-slate-200">
                                <div>{formatCountCell(cell?.actual)}</div>
                                {showRevenueDelta && mDelta && (
                                  <div
                                    className={`text-3xs font-bold mt-0.5 ${
                                      (mDiffVal ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                    }`}
                                  >
                                    ({mDelta})
                                  </div>
                                )}
                              </td>
                              <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-slate-700 border-r border-slate-300">
                                {renderAchievementCell(cell?.achievementRatePct, 2)}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* 하단 달별 달성 현황 요약 행 */}
                  {revenueTotalRow && (
                    <tr className="bg-slate-900 text-white border-t-2 border-slate-400">
                      <td className="sticky left-0 z-10 bg-slate-900 px-4 py-2.5 border-r border-slate-700 text-center font-black text-amber-300 text-xs">
                        달별 달성 여부 요약
                      </td>
                      <td
                        colSpan={3}
                        className="px-3 py-2.5 text-center border-r-2 border-slate-600 bg-slate-800/90"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-black ${
                              (revenueTotalRow.annual.achievementRatePct ?? 0) >= 100
                                ? 'bg-emerald-500 text-white'
                                : 'bg-rose-500 text-white'
                            }`}
                          >
                            전체 {formatAchievementStatus(revenueTotalRow.annual.achievementRatePct)}
                          </span>
                          <span className="text-2xs font-bold text-slate-300">
                            ({monthlyRevenueScoreboard.annualAchievedVenues}/
                            {monthlyRevenueScoreboard.annualEvaluatedVenues}개 업장 달성)
                          </span>
                        </div>
                      </td>
                      {MONTHS.map((m) => {
                        const mStat = monthlyRevenueScoreboard.byMonth[m];
                        const isAchieved = mStat?.status === '달성';
                        const isMissed = mStat?.status === '미달';
                        return (
                          <td
                            key={`rev-summary-m-${m}`}
                            colSpan={3}
                            className="px-2.5 py-2.5 text-center border-r border-slate-700"
                          >
                            {mStat?.status === '대기' ? (
                              <span className="text-2xs font-bold text-slate-400">집계 대기</span>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-2xs font-black ${
                                    isAchieved
                                      ? 'bg-emerald-500 text-white'
                                      : isMissed
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {m}월 {mStat.status}
                                </span>
                                <span className="text-2xs font-bold text-slate-300">
                                  ({mStat.achievedVenues}/{mStat.evaluatedVenues}개 업장)
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* 6. [표 4] 목표 객단가 (백엔드 제공 시 자동 렌더링) */}
        {/* ==================================================================== */}
        {unitPriceRows.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-baseline gap-2.5 bg-slate-50/70">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {selectedYear}년 목표 객단가
              </h2>
              <span className="text-xs font-extrabold text-rose-600">
                (최종 업데이트 : {data?.lastUpdated || '-'})
              </span>
              <span className="text-2xs font-semibold text-slate-500">
                * 목표(구글시트) vs 실적·달성률(백엔드 V6 마트)
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-10 bg-[#FFF2CC] text-slate-900 font-black px-4 py-2.5 text-center border-r border-slate-300 min-w-[190px]"
                    >
                      업장
                    </th>
                    <th
                      colSpan={3}
                      className="bg-[#FFF2CC] text-slate-900 font-black px-3 py-2 text-center border-r-2 border-slate-400"
                    >
                      전체
                    </th>
                    {MONTHS.map((m) => {
                      const isOdd = m % 2 === 1;
                      return (
                        <th
                          key={`up-h1-${m}`}
                          colSpan={3}
                          className={`${
                            isOdd ? 'bg-[#E2EFDA]' : 'bg-[#FFF2CC]'
                          } text-slate-900 font-black px-3 py-2 text-center border-r border-slate-300`}
                        >
                          {m}월
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="border-b-2 border-slate-400">
                    <th className="bg-[#FFF9E6] text-slate-800 font-extrabold px-3 py-1.5 text-center border-r border-slate-300 min-w-[78px]">
                      목표
                    </th>
                    <th className="bg-[#FFF9E6] text-slate-900 font-black px-3 py-1.5 text-center border-r border-slate-300 min-w-[78px]">
                      실적
                    </th>
                    <th className="bg-[#FFF9E6] text-slate-800 font-extrabold px-3 py-1.5 text-center border-r-2 border-slate-400 min-w-[72px]">
                      달성률
                    </th>
                    {MONTHS.map((m) => {
                      const isOdd = m % 2 === 1;
                      const subBg = isOdd ? 'bg-[#F2F8EE]' : 'bg-[#FFF9E6]';
                      return (
                        <React.Fragment key={`up-h2-${m}`}>
                          <th
                            className={`${subBg} text-slate-700 font-bold px-2.5 py-1.5 text-center border-r border-slate-200 min-w-[72px]`}
                          >
                            목표
                          </th>
                          <th
                            className={`${subBg} text-slate-900 font-extrabold px-2.5 py-1.5 text-center border-r border-slate-200 min-w-[72px]`}
                          >
                            실적
                          </th>
                          <th
                            className={`${subBg} text-slate-700 font-bold px-2.5 py-1.5 text-center border-r border-slate-300 min-w-[68px]`}
                          >
                            달성률
                          </th>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {unitPriceRows.map((row) => (
                    <tr
                      key={row.venueKey}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        row.isSummaryRow ? 'bg-amber-50/40 font-black' : 'bg-white'
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-slate-300 text-center font-black text-slate-900">
                        {row.venueName}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800 bg-amber-50/30 border-r border-slate-200">
                        {formatCountCell(row.annual.target)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-slate-950 bg-amber-50/50 border-r border-slate-200">
                        {formatCountCell(row.annual.actual)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900 bg-amber-50/30 border-r-2 border-slate-400">
                        {renderAchievementCell(row.annual.achievementRatePct, 2)}
                      </td>
                      {MONTHS.map((m) => {
                        const cell = row.monthly[String(m)];
                        return (
                          <React.Fragment key={`up-${row.venueKey}-m-${m}`}>
                            <td className="px-2.5 py-2.5 text-right font-mono text-slate-600 border-r border-slate-200">
                              {formatCountCell(cell?.target)}
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-mono font-extrabold text-slate-900 border-r border-slate-200">
                              {formatCountCell(cell?.actual)}
                            </td>
                            <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-slate-700 border-r border-slate-300">
                              {renderAchievementCell(cell?.achievementRatePct, 2)}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 하단 일별·기간별 상세 분석 바로가기 안내 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-2xs">
          <div className="text-xs text-slate-600 font-semibold">
            특정 일자 또는 기간별 상세 영업장 이용률, 객단가, 전년 동기 대비 증감(%p) 분석은{' '}
            <strong className="text-slate-900 font-extrabold">
              일별·기간별 매장 이용률 & 숙박모수 페이지
            </strong>
            에서 확인하실 수 있습니다.
          </div>
          <Link
            href={withMode('/venue-usage-rate')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800 transition-colors shrink-0"
          >
            <span>일별·기간별 이용률 상세 보기</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
