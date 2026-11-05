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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumber } from '@/lib/utils';
import type {
  MonthlyVisitorTargetsResponse,
  VisitorTargetRow,
  VenueUsageTargetRow,
} from '@/types/monthly-visitor-targets';

const MONTHS = Array.from({ length: 12 }, (_, idx) => idx + 1);

function formatCountCell(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return formatNumber(val);
}

function formatPctCell(val: number | null | undefined, digits = 2): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return `${Number(val).toFixed(digits)}%`;
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
        formatPctCell(row.annual.achievementRatePct, 2),
      ];
      for (const m of MONTHS) {
        const cell = row.monthly[String(m)];
        rData.push(
          formatCountCell(cell?.target),
          formatCountCell(cell?.actual),
          formatPctCell(cell?.achievementRatePct, 2)
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
        formatPctCell(row.annual.achievementRatePct, 0),
      ];
      for (const m of MONTHS) {
        const cell = row.monthly[String(m)];
        rData.push(
          formatPctCell(cell?.targetRatePct, 2),
          formatPctCell(cell?.actualRatePct, 2),
          formatPctCell(cell?.achievementRatePct, 2)
        );
      }
      usageSheetRows.push(rData);
    }

    const wsUsage = XLSX.utils.aoa_to_sheet(usageSheetRows);
    XLSX.utils.book_append_sheet(wb, wsUsage, '월별 이용률 목표');

    XLSX.writeFile(wb, `벨포레_레저본부_월별방문객_이용률목표_${data.year}.xlsx`);
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
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2.5">
                <span>월별 방문객 목표 & 레저본부 영업장별 이용률 목표</span>
                {data?.lastUpdated && (
                  <span className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    (최종 업데이트 : {data.lastUpdated})
                  </span>
                )}
              </h1>
            </div>

            {/* 우측 컨트롤: 뷰 전환 + 연도 선택 + 새로고침 + 엑셀 다운로드 */}
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
                <span>실측 실적(방문객·이용률): V6 정규 마트 실시간 연동</span>
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
                          {formatPctCell(row.annual.achievementRatePct, 2)}
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
                                {formatPctCell(cell?.achievementRatePct, 2)}
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
                        {formatPctCell(row.annual.achievementRatePct, 0)}
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
                              {formatPctCell(cell?.achievementRatePct, 2)}
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
