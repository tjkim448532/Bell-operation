"use client";

import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  SlidersHorizontal, 
  ChevronsUpDown,
  ChevronsDownUp,
  Building2,
  Layers,
  MapPin,
  Check
} from 'lucide-react';

export type Metric = {
  actual: number;
  ly: number;
  growth: number;
};

export type Subtotal = {
  today: Metric;
  mtd: Metric;
  ytd: Metric;
};

export interface Venue {
  venueName: string;
  metrics: Subtotal;
}

export interface Part {
  partName: string;
  partSubtotal: Subtotal;
  venues: Venue[];
}

export interface Division {
  orgDivision: string;
  divisionSubtotal: Subtotal;
  parts: Part[];
}

export interface TableData {
  divisions: Division[];
}

interface PerformanceTableProps {
  data: TableData;
  className?: string;
}

export default function PerformanceTable({ data, className = '' }: PerformanceTableProps) {
  // 1. 행 숨기기/보이기 상태 관리 (디폴트: 모두 펼쳐진 상태)
  const [collapsedDivisions, setCollapsedDivisions] = useState<Record<string, boolean>>({});
  const [collapsedParts, setCollapsedParts] = useState<Record<string, boolean>>({});

  // 2. 열 숨기기/보이기 상태 관리 (디폴트: Today, MTD, YTD 모두 켜짐)
  const [visibleColumns, setVisibleColumns] = useState<{
    today: boolean;
    mtd: boolean;
    ytd: boolean;
  }>({
    today: true,
    mtd: true,
    ytd: true,
  });

  const [showColumnMenu, setShowColumnMenu] = useState<boolean>(false);

  // 대분류 접기/펼치기 토글
  const toggleDivision = (divisionName: string) => {
    setCollapsedDivisions((prev) => ({
      ...prev,
      [divisionName]: !prev[divisionName],
    }));
  };

  // 파트 접기/펼치기 토글
  const togglePart = (partKey: string) => {
    setCollapsedParts((prev) => ({
      ...prev,
      [partKey]: !prev[partKey],
    }));
  };

  // 모두 펼치기
  const expandAll = () => {
    setCollapsedDivisions({});
    setCollapsedParts({});
  };

  // 모두 접기
  const collapseAll = () => {
    const allDivs: Record<string, boolean> = {};
    const allParts: Record<string, boolean> = {};
    data.divisions.forEach((div) => {
      allDivs[div.orgDivision] = true;
      div.parts.forEach((part) => {
        allParts[`${div.orgDivision}_${part.partName}`] = true;
      });
    });
    setCollapsedDivisions(allDivs);
    setCollapsedParts(allParts);
  };

  // 열 토글 핸들러
  const toggleColumnGroup = (groupKey: 'today' | 'mtd' | 'ytd') => {
    setVisibleColumns((prev) => {
      // 최소 1개는 켜져 있도록 보장
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (activeCount === 1 && prev[groupKey]) {
        return prev;
      }
      return {
        ...prev,
        [groupKey]: !prev[groupKey],
      };
    });
  };

  // 숫자 포맷 함수 (천 단위 콤마)
  const formatAmount = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Math.round(val).toLocaleString();
  };

  // 증감률(%) 서식 컴포넌트: 양수면 빨간색(▲), 음수면 파란색(▼)
  const renderGrowth = (growth: number | undefined | null) => {
    if (growth === undefined || growth === null || isNaN(growth)) {
      return <span className="text-slate-400 font-mono text-2xs">-</span>;
    }

    if (growth > 0) {
      return (
        <span className="text-rose-600 font-bold font-mono text-2xs flex items-center justify-end gap-0.5">
          <span>▲</span>
          <span>{growth.toFixed(1)}%</span>
        </span>
      );
    } else if (growth < 0) {
      return (
        <span className="text-blue-600 font-bold font-mono text-2xs flex items-center justify-end gap-0.5">
          <span>▼</span>
          <span>{Math.abs(growth).toFixed(1)}%</span>
        </span>
      );
    } else {
      return (
        <span className="text-slate-500 font-medium font-mono text-2xs">
          0.0%
        </span>
      );
    }
  };

  // 3개 컬럼 렌더링 헬퍼
  const renderMetricColumns = (metric: Metric | undefined, bgHighlight: boolean = false) => {
    const actual = metric?.actual ?? 0;
    const ly = metric?.ly ?? 0;
    const growth = metric?.growth ?? 0;

    return (
      <React.Fragment>
        <td className={`py-2 px-3 text-right font-mono text-xs border-r border-slate-200 ${
          bgHighlight ? 'font-bold text-slate-900' : 'text-slate-800'
        }`}>
          {formatAmount(actual)}
        </td>
        <td className="py-2 px-3 text-right font-mono text-xs text-slate-500 border-r border-slate-200">
          {formatAmount(ly)}
        </td>
        <td className="py-2 px-3 text-right border-r border-slate-200">
          {renderGrowth(growth)}
        </td>
      </React.Fragment>
    );
  };

  // 활성화된 컬럼 그룹 수 계산
  const visibleColCount = 
    (visibleColumns.today ? 3 : 0) + 
    (visibleColumns.mtd ? 3 : 0) + 
    (visibleColumns.ytd ? 3 : 0);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 테이블 상단 컨트롤 툴바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="모든 대분류 및 파트 펼치기"
          >
            <ChevronsUpDown size={14} className="text-slate-500" />
            <span>모두 펼치기</span>
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="모든 대분류 및 파트 접기"
          >
            <ChevronsDownUp size={14} className="text-slate-500" />
            <span>모두 접기</span>
          </button>
          <span className="text-3xs text-slate-400 hidden sm:inline ml-2">
            ※ 대분류와 파트 좌측의 화살표를 클릭하여 개별 접기/펼치기가 가능합니다.
          </span>
        </div>

        {/* 컬럼 설정 드롭다운 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColumnMenu((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#00AE95] text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <SlidersHorizontal size={14} className="text-[#00AE95]" />
            <span>컬럼 설정</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${showColumnMenu ? 'rotate-180' : ''}`} />
          </button>

          {showColumnMenu && (
            <div 
              className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-3 z-30 space-y-2 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                표시할 컬럼 그룹 선택
              </div>
              <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                <span>당일 실적 (Today)</span>
                <input
                  type="checkbox"
                  checked={visibleColumns.today}
                  onChange={() => toggleColumnGroup('today')}
                  className="rounded text-[#00AE95] focus:ring-[#00AE95] cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                <span>당월 누계 (MTD)</span>
                <input
                  type="checkbox"
                  checked={visibleColumns.mtd}
                  onChange={() => toggleColumnGroup('mtd')}
                  className="rounded text-[#00AE95] focus:ring-[#00AE95] cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                <span>올해 누계 (YTD)</span>
                <input
                  type="checkbox"
                  checked={visibleColumns.ytd}
                  onChange={() => toggleColumnGroup('ytd')}
                  className="rounded text-[#00AE95] focus:ring-[#00AE95] cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* 3-Depth 통합 스프레드시트 테이블 컨테이너 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[720px] custom-scrollbar">
          <table className="w-full text-left border-collapse border border-slate-200 text-xs">
            {/* Header (스크롤 시 상단 고정: sticky top-0) */}
            <thead className="sticky top-0 z-20 bg-slate-100 border-b-2 border-slate-300 shadow-xs">
              {/* Row 1: 대분류 헤더 & 컬럼 그룹 */}
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th 
                  rowSpan={2} 
                  className="py-3 px-4 border-r border-slate-300 min-w-[260px] sticky left-0 z-30 bg-slate-100 text-slate-800 text-xs font-black tracking-tight"
                >
                  조직 구분 (대분류 &gt; 파트 &gt; 영업장)
                </th>

                {visibleColumns.today && (
                  <th 
                    colSpan={3} 
                    className="py-2.5 px-3 text-center border-r border-slate-300 bg-sky-50/70 text-sky-950 font-bold text-xs"
                  >
                    당일 실적 (Today)
                  </th>
                )}

                {visibleColumns.mtd && (
                  <th 
                    colSpan={3} 
                    className="py-2.5 px-3 text-center border-r border-slate-300 bg-teal-50/70 text-teal-950 font-bold text-xs"
                  >
                    당월 누계 (MTD)
                  </th>
                )}

                {visibleColumns.ytd && (
                  <th 
                    colSpan={3} 
                    className="py-2.5 px-3 text-center border-r border-slate-300 bg-indigo-50/70 text-indigo-950 font-bold text-xs"
                  >
                    올해 누계 (YTD)
                  </th>
                )}
              </tr>

              {/* Row 2: 세부 하위 컬럼 헤더 */}
              <tr className="bg-slate-50 text-slate-600 text-2xs font-bold border-b border-slate-300">
                {visibleColumns.today && (
                  <React.Fragment>
                    <th className="py-2 px-3 text-right border-r border-slate-200 bg-sky-50/40 text-slate-700 min-w-[95px]">당해</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 bg-sky-50/40 text-slate-500 min-w-[95px]">전년</th>
                    <th className="py-2 px-3 text-right border-r border-slate-300 bg-sky-50/40 text-slate-700 min-w-[85px]">증감(%)</th>
                  </React.Fragment>
                )}

                {visibleColumns.mtd && (
                  <React.Fragment>
                    <th className="py-2 px-3 text-right border-r border-slate-200 bg-teal-50/40 text-slate-700 min-w-[105px]">당해</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 bg-teal-50/40 text-slate-500 min-w-[105px]">전년</th>
                    <th className="py-2 px-3 text-right border-r border-slate-300 bg-teal-50/40 text-slate-700 min-w-[85px]">증감(%)</th>
                  </React.Fragment>
                )}

                {visibleColumns.ytd && (
                  <React.Fragment>
                    <th className="py-2 px-3 text-right border-r border-slate-200 bg-indigo-50/40 text-slate-700 min-w-[115px]">당해</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 bg-indigo-50/40 text-slate-500 min-w-[115px]">전년</th>
                    <th className="py-2 px-3 text-right border-r border-slate-300 bg-indigo-50/40 text-slate-700 min-w-[85px]">증감(%)</th>
                  </React.Fragment>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {data.divisions.map((division) => {
                const isDivCollapsed = !!collapsedDivisions[division.orgDivision];

                return (
                  <React.Fragment key={division.orgDivision}>
                    {/* 1-Depth: 대분류(Division) 총계 행 */}
                    <tr className="bg-indigo-50/80 hover:bg-indigo-100/70 border-b border-indigo-200 transition-colors font-bold text-slate-900">
                      <td className="py-3 px-4 border-r border-indigo-200 sticky left-0 z-10 bg-indigo-50/95 backdrop-blur-xs">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleDivision(division.orgDivision)}
                            className="flex items-center gap-2 text-left group cursor-pointer"
                          >
                            <span className="p-0.5 rounded-md bg-indigo-200/80 text-indigo-800 group-hover:bg-indigo-300 transition-colors">
                              {isDivCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Building2 size={15} className="text-indigo-700" />
                              <span className="text-sm font-black text-indigo-950">
                                {division.orgDivision}
                              </span>
                              <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-900">
                                대분류 총계
                              </span>
                            </div>
                          </button>
                        </div>
                      </td>

                      {visibleColumns.today && renderMetricColumns(division.divisionSubtotal?.today, true)}
                      {visibleColumns.mtd && renderMetricColumns(division.divisionSubtotal?.mtd, true)}
                      {visibleColumns.ytd && renderMetricColumns(division.divisionSubtotal?.ytd, true)}
                    </tr>

                    {/* 2-Depth: 파트(Part) 행 목록 (대분류가 펼쳐져 있을 때만 표시) */}
                    {!isDivCollapsed && division.parts.map((part) => {
                      const partKey = `${division.orgDivision}_${part.partName}`;
                      const isPartCollapsed = !!collapsedParts[partKey];

                      return (
                        <React.Fragment key={partKey}>
                          {/* 파트 소계 행 */}
                          <tr className="bg-purple-50/50 hover:bg-purple-100/50 border-b border-purple-100 transition-colors font-semibold text-slate-800">
                            <td className="py-2.5 px-4 pl-8 border-r border-purple-100 sticky left-0 z-10 bg-purple-50/90 backdrop-blur-xs">
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => togglePart(partKey)}
                                  className="flex items-center gap-2 text-left group cursor-pointer"
                                >
                                  <span className="p-0.5 rounded-md bg-purple-200/70 text-purple-800 group-hover:bg-purple-300 transition-colors">
                                    {isPartCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Layers size={13} className="text-purple-600" />
                                    <span className="text-xs font-bold text-purple-950">
                                      {part.partName}
                                    </span>
                                    <span className="text-3xs font-medium px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800">
                                      소계 ({part.venues?.length || 0})
                                    </span>
                                  </div>
                                </button>
                              </div>
                            </td>

                            {visibleColumns.today && renderMetricColumns(part.partSubtotal?.today, true)}
                            {visibleColumns.mtd && renderMetricColumns(part.partSubtotal?.mtd, true)}
                            {visibleColumns.ytd && renderMetricColumns(part.partSubtotal?.ytd, true)}
                          </tr>

                          {/* 3-Depth: 영업장(Venue) 행 목록 (파트가 펼쳐져 있을 때만 표시) */}
                          {!isPartCollapsed && part.venues.map((venue, vIdx) => (
                            <tr 
                              key={`${partKey}_${venue.venueName}_${vIdx}`}
                              className="bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors text-slate-700"
                            >
                              <td className="py-2 px-4 pl-14 border-r border-slate-200 sticky left-0 z-10 bg-white">
                                <div className="flex items-center gap-2">
                                  <MapPin size={11} className="text-slate-400" />
                                  <span className="text-xs font-medium text-slate-800">
                                    {venue.venueName}
                                  </span>
                                </div>
                              </td>

                              {visibleColumns.today && renderMetricColumns(venue.metrics?.today, false)}
                              {visibleColumns.mtd && renderMetricColumns(venue.metrics?.mtd, false)}
                              {visibleColumns.ytd && renderMetricColumns(venue.metrics?.ytd, false)}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
