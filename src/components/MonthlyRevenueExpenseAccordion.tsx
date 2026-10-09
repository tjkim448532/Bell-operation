"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Activity, 
  Layers, 
  RefreshCw, 
  Loader2,
  FolderOpen,
  FolderClosed,
  HelpCircle
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface MonthlyMetric {
  revenue: number;
  expense: number;
  profit: number;
}

interface MonthlyTrendVenue {
  name: string;
  monthly: Record<string, MonthlyMetric>;
  total: MonthlyMetric;
}

interface MonthlyTrendDepartment {
  name: string;
  monthly: Record<string, MonthlyMetric>;
  total: MonthlyMetric;
  venues: MonthlyTrendVenue[];
}

interface MonthlyTrendData {
  months: string[];
  monthLabels: string[];
  grandTotal: {
    directTotal: {
      name: string;
      monthly: Record<string, MonthlyMetric>;
      total: MonthlyMetric;
    };
    allTotal: {
      name: string;
      monthly: Record<string, MonthlyMetric>;
      total: MonthlyMetric;
    };
  };
  departments: MonthlyTrendDepartment[];
}

const DEPT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  '미디어아트센터': { bg: 'bg-purple-50', text: 'text-purple-700', dot: '#8b5cf6' },
  '액티비티': { bg: 'bg-[#E6F7F4]', text: 'text-[#00826F]', dot: '#00AE95' },
  '목장': { bg: 'bg-amber-50', text: 'text-amber-700', dot: '#f59e0b' },
  '디지털지원': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: '#6366f1' },
  '외주': { bg: 'bg-orange-50', text: 'text-orange-700', dot: '#f97316' },
  '본부공통': { bg: 'bg-slate-100', text: 'text-slate-700', dot: '#64748b' },
};

type ViewMode = 'all' | 'revenue' | 'expense' | 'profit';

export default function MonthlyRevenueExpenseAccordion() {
  const [data, setData] = useState<MonthlyTrendData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDepts, setOpenDepts] = useState<Record<string, boolean>>({
    '미디어아트센터': true,
    '액티비티': true,
    '목장': true,
    '디지털지원': false,
    '외주': false,
    '본부공통': false,
  });
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const fetchData = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/monthly-trend${refresh ? '?refresh=true' : ''}`);
      if (!res.ok) {
        throw new Error('월별 실적 데이터를 불러오는 데 실패했습니다.');
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '데이터 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleDept = (deptName: string) => {
    setOpenDepts((prev) => ({
      ...prev,
      [deptName]: !prev[deptName],
    }));
  };

  const handleExpandAll = () => {
    if (!data) return;
    const allOpen: Record<string, boolean> = {};
    data.departments.forEach((d) => {
      allOpen[d.name] = true;
    });
    setOpenDepts(allOpen);
  };

  const handleCollapseAll = () => {
    if (!data) return;
    const allClosed: Record<string, boolean> = {};
    data.departments.forEach((d) => {
      allClosed[d.name] = false;
    });
    setOpenDepts(allClosed);
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00AE95]" />
        <p className="text-sm font-bold text-slate-700">2026년 월별 매출 및 비용 추이를 집계 중입니다...</p>
        <p className="text-2xs text-slate-400">1월부터 당월까지 원천 실적 전수 대조</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-rose-200 shadow-xs text-center space-y-3">
        <div className="text-rose-600 font-bold text-sm">월별 실적 데이터 조회 실패</div>
        <p className="text-xs text-slate-500">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={() => fetchData(true)}
          className="px-4 py-2 bg-[#00AE95] text-white text-xs font-bold rounded-xl hover:bg-[#009681] transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { months, monthLabels, grandTotal, departments } = data;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-7 space-y-5">
      {/* 헤더 및 컨트롤러 툴바 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#E6F7F4] text-[#00826F] text-2xs font-extrabold">
              2026년 연간 시계열
            </span>
            <span className="text-2xs text-slate-400 font-medium">
              {monthLabels[0]} ~ {monthLabels[monthLabels.length - 1]} ({months.length}개월)
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span>레저본부 월별 매출·비용 및 손익 추이 (아코디언)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            부서 및 세부 영업장을 클릭하여 펼치면 1월부터 당월까지의 실적과 합계를 상세 비교할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 보기 모드 선택기 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-2xs font-bold text-slate-600">
            <button
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              종합 (매출·비용·손익)
            </button>
            <button
              onClick={() => setViewMode('revenue')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'revenue' ? 'bg-white text-[#00826F] shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              매출만
            </button>
            <button
              onClick={() => setViewMode('expense')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'expense' ? 'bg-white text-rose-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              비용만
            </button>
            <button
              onClick={() => setViewMode('profit')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'profit' ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              영업이익만
            </button>
          </div>

          {/* 아코디언 조작 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExpandAll}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-bold rounded-lg transition-colors"
              title="모든 영업장 펼치기"
            >
              <FolderOpen size={13} />
              <span>모두 펼치기</span>
            </button>
            <button
              onClick={handleCollapseAll}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-bold rounded-lg transition-colors"
              title="모든 영업장 접기"
            >
              <FolderClosed size={13} />
              <span>모두 접기</span>
            </button>
            <button
              onClick={() => fetchData(true)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 단위 및 안내 */}
      <div className="flex items-center justify-between text-2xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={12} className="text-slate-400" />
          <span>부가가치세(VAT) 10% 제외 순매출 및 실측 발생 비용 기준 (단위: 원)</span>
        </div>
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00AE95]" /> 매출
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> 비용
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> 영업손익
          </span>
        </div>
      </div>

      {/* 대화형 월별 아코디언 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-700 border-b border-slate-200 text-3xs uppercase font-extrabold tracking-wider">
              <th className="py-3 px-4 min-w-[200px] sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                부서 및 세부 영업장
              </th>
              {viewMode === 'all' && (
                <th className="py-3 px-2 w-16 text-center">
                  항목
                </th>
              )}
              {monthLabels.map((label, idx) => (
                <th key={months[idx]} className="py-3 px-3 text-right min-w-[105px]">
                  {label}
                </th>
              ))}
              <th className="py-3 px-4 text-right min-w-[125px] bg-[#E6F7F4]/50 text-[#00826F] font-black border-l border-slate-200">
                총합 (누적)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono">
            {/* 1. 레저본부 직영 합계 (최상단 요약 행) */}
            <tr className="bg-[#E6F7F4]/40 font-bold border-b-2 border-[#00AE95]/30">
              <td 
                rowSpan={viewMode === 'all' ? 3 : 1}
                className="py-3 px-4 font-sans font-black text-slate-900 sticky left-0 bg-[#E6F7F4]/90 z-10 shadow-[1px_0_0_0_#e2e8f0] align-top"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00AE95]" />
                  <span className="text-sm">레저본부 직영 합계</span>
                  <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-[#00AE95] text-white">
                    직영 SSOT
                  </span>
                </div>
                <div className="text-3xs text-slate-500 font-normal mt-1 font-sans">
                  미디어아트센터 · 액티비티 · 목장 · 디지털지원
                </div>
              </td>
              {viewMode === 'all' ? (
                <>
                  <td className="py-2 px-2 text-center text-3xs font-bold text-[#00826F] bg-emerald-50/50">매출</td>
                  {months.map((ym) => (
                    <td key={ym} className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatNumber(grandTotal.directTotal.monthly[ym]?.revenue || 0)}
                    </td>
                  ))}
                  <td className="py-2 px-4 text-right font-black text-[#00826F] bg-[#E6F7F4]/60 border-l border-slate-200">
                    {formatNumber(grandTotal.directTotal.total.revenue)}
                  </td>
                </>
              ) : viewMode === 'revenue' ? (
                <>
                  {months.map((ym) => (
                    <td key={ym} className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatNumber(grandTotal.directTotal.monthly[ym]?.revenue || 0)}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right font-black text-[#00826F] bg-[#E6F7F4]/60 border-l border-slate-200">
                    {formatNumber(grandTotal.directTotal.total.revenue)}
                  </td>
                </>
              ) : viewMode === 'expense' ? (
                <>
                  {months.map((ym) => (
                    <td key={ym} className="py-3 px-3 text-right font-bold text-rose-600">
                      {formatNumber(grandTotal.directTotal.monthly[ym]?.expense || 0)}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right font-black text-rose-600 bg-rose-50/40 border-l border-slate-200">
                    {formatNumber(grandTotal.directTotal.total.expense)}
                  </td>
                </>
              ) : (
                <>
                  {months.map((ym) => {
                    const p = grandTotal.directTotal.monthly[ym]?.profit || 0;
                    return (
                      <td key={ym} className={`py-3 px-3 text-right font-black ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                        {p >= 0 ? '+' : ''}{formatNumber(p)}
                      </td>
                    );
                  })}
                  <td className={`py-3 px-4 text-right font-black border-l border-slate-200 ${
                    grandTotal.directTotal.total.profit >= 0 ? 'text-[#00AE95] bg-[#E6F7F4]/60' : 'text-rose-600 bg-rose-50/40'
                  }`}>
                    {grandTotal.directTotal.total.profit >= 0 ? '+' : ''}{formatNumber(grandTotal.directTotal.total.profit)}
                  </td>
                </>
              )}
            </tr>

            {/* 직영 합계 세부 서브행 (viewMode === 'all') */}
            {viewMode === 'all' && (
              <>
                <tr className="bg-[#E6F7F4]/20 border-b border-slate-100">
                  <td className="py-2 px-2 text-center text-3xs font-bold text-rose-600 bg-rose-50/30">비용</td>
                  {months.map((ym) => (
                    <td key={ym} className="py-2 px-3 text-right text-rose-600 font-bold">
                      {formatNumber(grandTotal.directTotal.monthly[ym]?.expense || 0)}
                    </td>
                  ))}
                  <td className="py-2 px-4 text-right font-black text-rose-600 bg-[#E6F7F4]/40 border-l border-slate-200">
                    {formatNumber(grandTotal.directTotal.total.expense)}
                  </td>
                </tr>
                <tr className="bg-[#E6F7F4]/30 border-b-2 border-slate-200">
                  <td className="py-2 px-2 text-center text-3xs font-black text-indigo-700 bg-indigo-50/30">손익</td>
                  {months.map((ym) => {
                    const p = grandTotal.directTotal.monthly[ym]?.profit || 0;
                    return (
                      <td key={ym} className={`py-2 px-3 text-right font-black ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                        {p >= 0 ? '+' : ''}{formatNumber(p)}
                      </td>
                    );
                  })}
                  <td className={`py-2 px-4 text-right font-black border-l border-slate-200 ${
                    grandTotal.directTotal.total.profit >= 0 ? 'text-[#00AE95] bg-[#E6F7F4]/60' : 'text-rose-600 bg-rose-50/40'
                  }`}>
                    {grandTotal.directTotal.total.profit >= 0 ? '+' : ''}{formatNumber(grandTotal.directTotal.total.profit)}
                  </td>
                </tr>
              </>
            )}

            {/* 2. 각 부서별 아코디언 섹션 */}
            {departments.map((dept) => {
              const isOpen = !!openDepts[dept.name];
              const colorInfo = DEPT_COLORS[dept.name] || { bg: 'bg-slate-50', text: 'text-slate-700', dot: '#64748b' };
              const isSupport = dept.name === '디지털지원';
              const isOutsourced = dept.name === '외주';
              const isCommon = dept.name === '본부공통';

              return (
                <React.Fragment key={dept.name}>
                  {/* 부서 헤더 행 (클릭 시 아코디언 토글) */}
                  <tr 
                    onClick={() => toggleDept(dept.name)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors bg-white border-t border-slate-200 font-bold"
                  >
                    <td 
                      rowSpan={viewMode === 'all' ? 3 : 1}
                      className="py-3 px-4 font-sans font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0] align-top hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <button className="text-slate-400 hover:text-slate-700 p-0.5 rounded">
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: colorInfo.dot }}
                        />
                        <span className="text-xs sm:text-sm">{dept.name}</span>
                        {isSupport && (
                          <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                            지원
                          </span>
                        )}
                        {isOutsourced && (
                          <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">
                            외주위탁
                          </span>
                        )}
                        {isCommon && (
                          <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                            공통
                          </span>
                        )}
                        <span className="text-3xs text-slate-400 font-normal ml-auto">
                          ({dept.venues.length}개 업장)
                        </span>
                      </div>
                    </td>

                    {/* 종합 모드: 첫 번째 행은 매출 */}
                    {viewMode === 'all' ? (
                      <>
                        <td className="py-2 px-2 text-center text-3xs font-bold text-[#00826F] bg-slate-50/50">매출</td>
                        {months.map((ym) => (
                          <td key={ym} className="py-2 px-3 text-right font-bold text-slate-800">
                            {formatNumber(dept.monthly[ym]?.revenue || 0)}
                          </td>
                        ))}
                        <td className="py-2 px-4 text-right font-black text-slate-900 bg-slate-50/70 border-l border-slate-200">
                          {formatNumber(dept.total.revenue)}
                        </td>
                      </>
                    ) : viewMode === 'revenue' ? (
                      <>
                        {months.map((ym) => (
                          <td key={ym} className="py-3 px-3 text-right font-bold text-slate-800">
                            {formatNumber(dept.monthly[ym]?.revenue || 0)}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right font-black text-[#00826F] bg-slate-50/70 border-l border-slate-200">
                          {formatNumber(dept.total.revenue)}
                        </td>
                      </>
                    ) : viewMode === 'expense' ? (
                      <>
                        {months.map((ym) => (
                          <td key={ym} className="py-3 px-3 text-right font-bold text-rose-600">
                            {formatNumber(dept.monthly[ym]?.expense || 0)}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right font-black text-rose-600 bg-slate-50/70 border-l border-slate-200">
                          {formatNumber(dept.total.expense)}
                        </td>
                      </>
                    ) : (
                      <>
                        {months.map((ym) => {
                          const p = dept.monthly[ym]?.profit || 0;
                          return (
                            <td key={ym} className={`py-3 px-3 text-right font-black ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                              {p >= 0 ? '+' : ''}{formatNumber(p)}
                            </td>
                          );
                        })}
                        <td className={`py-3 px-4 text-right font-black border-l border-slate-200 ${
                          dept.total.profit >= 0 ? 'text-[#00AE95] bg-slate-50/70' : 'text-rose-600 bg-slate-50/70'
                        }`}>
                          {dept.total.profit >= 0 ? '+' : ''}{formatNumber(dept.total.profit)}
                        </td>
                      </>
                    )}
                  </tr>

                  {/* 부서 종합 모드 서브행: 비용 & 손익 */}
                  {viewMode === 'all' && (
                    <>
                      <tr className="hover:bg-slate-50 cursor-pointer bg-white">
                        <td className="py-2 px-2 text-center text-3xs font-bold text-rose-600 bg-rose-50/20">비용</td>
                        {months.map((ym) => (
                          <td key={ym} className="py-2 px-3 text-right text-rose-600 font-bold">
                            {formatNumber(dept.monthly[ym]?.expense || 0)}
                          </td>
                        ))}
                        <td className="py-2 px-4 text-right font-black text-rose-600 bg-slate-50/50 border-l border-slate-200">
                          {formatNumber(dept.total.expense)}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 cursor-pointer bg-white border-b border-slate-200">
                        <td className="py-2 px-2 text-center text-3xs font-black text-indigo-600 bg-indigo-50/20">손익</td>
                        {months.map((ym) => {
                          const p = dept.monthly[ym]?.profit || 0;
                          return (
                            <td key={ym} className={`py-2 px-3 text-right font-black ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                              {p >= 0 ? '+' : ''}{formatNumber(p)}
                            </td>
                          );
                        })}
                        <td className={`py-2 px-4 text-right font-black border-l border-slate-200 ${
                          dept.total.profit >= 0 ? 'text-[#00AE95] bg-slate-50/50' : 'text-rose-600 bg-slate-50/50'
                        }`}>
                          {dept.total.profit >= 0 ? '+' : ''}{formatNumber(dept.total.profit)}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 3. 아코디언 내부: 세부 영업장 목록 */}
                  {isOpen && dept.venues.map((venue) => (
                    <React.Fragment key={venue.name}>
                      <tr className="bg-slate-50/40 hover:bg-slate-100/60 transition-colors">
                        <td 
                          rowSpan={viewMode === 'all' ? 3 : 1}
                          className="py-2.5 px-4 pl-9 font-sans text-slate-700 sticky left-0 bg-slate-50/90 z-10 shadow-[1px_0_0_0_#e2e8f0] align-top"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-300 font-bold">└</span>
                            <span className="font-medium text-xs text-slate-800">{venue.name}</span>
                          </div>
                        </td>

                        {viewMode === 'all' ? (
                          <>
                            <td className="py-1.5 px-2 text-center text-3xs text-slate-500 bg-slate-100/40">매출</td>
                            {months.map((ym) => (
                              <td key={ym} className="py-1.5 px-3 text-right text-slate-700">
                                {formatNumber(venue.monthly[ym]?.revenue || 0)}
                              </td>
                            ))}
                            <td className="py-1.5 px-4 text-right font-bold text-slate-800 bg-slate-100/60 border-l border-slate-200">
                              {formatNumber(venue.total.revenue)}
                            </td>
                          </>
                        ) : viewMode === 'revenue' ? (
                          <>
                            {months.map((ym) => (
                              <td key={ym} className="py-2 px-3 text-right text-slate-700">
                                {formatNumber(venue.monthly[ym]?.revenue || 0)}
                              </td>
                            ))}
                            <td className="py-2 px-4 text-right font-bold text-slate-800 bg-slate-100/60 border-l border-slate-200">
                              {formatNumber(venue.total.revenue)}
                            </td>
                          </>
                        ) : viewMode === 'expense' ? (
                          <>
                            {months.map((ym) => (
                              <td key={ym} className="py-2 px-3 text-right text-rose-600">
                                {formatNumber(venue.monthly[ym]?.expense || 0)}
                              </td>
                            ))}
                            <td className="py-2 px-4 text-right font-bold text-rose-600 bg-slate-100/60 border-l border-slate-200">
                              {formatNumber(venue.total.expense)}
                            </td>
                          </>
                        ) : (
                          <>
                            {months.map((ym) => {
                              const p = venue.monthly[ym]?.profit || 0;
                              return (
                                <td key={ym} className={`py-2 px-3 text-right font-bold ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                                  {p >= 0 ? '+' : ''}{formatNumber(p)}
                                </td>
                              );
                            })}
                            <td className={`py-2 px-4 text-right font-bold border-l border-slate-200 ${
                              venue.total.profit >= 0 ? 'text-[#00AE95] bg-slate-100/60' : 'text-rose-600 bg-slate-100/60'
                            }`}>
                              {venue.total.profit >= 0 ? '+' : ''}{formatNumber(venue.total.profit)}
                            </td>
                          </>
                        )}
                      </tr>

                      {/* 세부 영업장 서브행 (viewMode === 'all') */}
                      {viewMode === 'all' && (
                        <>
                          <tr className="bg-slate-50/40 hover:bg-slate-100/60">
                            <td className="py-1.5 px-2 text-center text-3xs text-rose-500 bg-slate-100/30">비용</td>
                            {months.map((ym) => (
                              <td key={ym} className="py-1.5 px-3 text-right text-rose-600">
                                {formatNumber(venue.monthly[ym]?.expense || 0)}
                              </td>
                            ))}
                            <td className="py-1.5 px-4 text-right font-bold text-rose-600 bg-slate-100/50 border-l border-slate-200">
                              {formatNumber(venue.total.expense)}
                            </td>
                          </tr>
                          <tr className="bg-slate-50/40 hover:bg-slate-100/60 border-b border-slate-100">
                            <td className="py-1.5 px-2 text-center text-3xs text-indigo-600 bg-slate-100/40">손익</td>
                            {months.map((ym) => {
                              const p = venue.monthly[ym]?.profit || 0;
                              return (
                                <td key={ym} className={`py-1.5 px-3 text-right font-bold ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                                  {p >= 0 ? '+' : ''}{formatNumber(p)}
                                </td>
                              );
                            })}
                            <td className={`py-1.5 px-4 text-right font-bold border-l border-slate-200 ${
                              venue.total.profit >= 0 ? 'text-[#00AE95] bg-slate-100/50' : 'text-rose-600 bg-slate-100/50'
                            }`}>
                              {venue.total.profit >= 0 ? '+' : ''}{formatNumber(venue.total.profit)}
                            </td>
                          </tr>
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>

          {/* 4. 레저사업본부 전체 총합계 (푸터) */}
          <tfoot>
            <tr className="bg-slate-100/80 font-black border-t-2 border-slate-300 text-slate-900">
              <td 
                rowSpan={viewMode === 'all' ? 3 : 1}
                className="py-3 px-4 sticky left-0 bg-slate-200/90 z-10 shadow-[1px_0_0_0_#cbd5e1] font-sans text-sm align-top"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                  <span>레저사업본부 전체 총합계</span>
                </div>
                <div className="text-3xs text-slate-500 font-normal font-sans mt-0.5">
                  직영 + 외주 + 본부공통 전체 포함
                </div>
              </td>
              {viewMode === 'all' ? (
                <>
                  <td className="py-2 px-2 text-center text-3xs font-black text-[#00826F] bg-emerald-50">매출</td>
                  {months.map((ym) => (
                    <td key={ym} className="py-2 px-3 text-right font-black text-slate-900">
                      {formatNumber(grandTotal.allTotal.monthly[ym]?.revenue || 0)}
                    </td>
                  ))}
                  <td className="py-2 px-4 text-right font-black text-[#00826F] bg-slate-200/70 border-l border-slate-300">
                    {formatNumber(grandTotal.allTotal.total.revenue)}
                  </td>
                </>
              ) : viewMode === 'revenue' ? (
                <>
                  {months.map((ym) => (
                    <td key={ym} className="py-3 px-3 text-right font-black text-slate-900">
                      {formatNumber(grandTotal.allTotal.monthly[ym]?.revenue || 0)}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right font-black text-[#00826F] bg-slate-200/70 border-l border-slate-300">
                    {formatNumber(grandTotal.allTotal.total.revenue)}
                  </td>
                </>
              ) : viewMode === 'expense' ? (
                <>
                  {months.map((ym) => (
                    <td key={ym} className="py-3 px-3 text-right font-black text-rose-600">
                      {formatNumber(grandTotal.allTotal.monthly[ym]?.expense || 0)}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right font-black text-rose-600 bg-slate-200/70 border-l border-slate-300">
                    {formatNumber(grandTotal.allTotal.total.expense)}
                  </td>
                </>
              ) : (
                <>
                  {months.map((ym) => {
                    const p = grandTotal.allTotal.monthly[ym]?.profit || 0;
                    return (
                      <td key={ym} className={`py-3 px-3 text-right font-black ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                        {p >= 0 ? '+' : ''}{formatNumber(p)}
                      </td>
                    );
                  })}
                  <td className={`py-3 px-4 text-right font-black border-l border-slate-300 ${
                    grandTotal.allTotal.total.profit >= 0 ? 'text-[#00AE95] bg-slate-200/70' : 'text-rose-600 bg-slate-200/70'
                  }`}>
                    {grandTotal.allTotal.total.profit >= 0 ? '+' : ''}{formatNumber(grandTotal.allTotal.total.profit)}
                  </td>
                </>
              )}
            </tr>

            {viewMode === 'all' && (
              <>
                <tr className="bg-slate-100/80 font-black">
                  <td className="py-2 px-2 text-center text-3xs font-black text-rose-600 bg-rose-50">비용</td>
                  {months.map((ym) => (
                    <td key={ym} className="py-2 px-3 text-right font-black text-rose-600">
                      {formatNumber(grandTotal.allTotal.monthly[ym]?.expense || 0)}
                    </td>
                  ))}
                  <td className="py-2 px-4 text-right font-black text-rose-600 bg-slate-200/70 border-l border-slate-300">
                    {formatNumber(grandTotal.allTotal.total.expense)}
                  </td>
                </tr>
                <tr className="bg-slate-100/90 font-black">
                  <td className="py-2 px-2 text-center text-3xs font-black text-indigo-700 bg-indigo-50">손익</td>
                  {months.map((ym) => {
                    const p = grandTotal.allTotal.monthly[ym]?.profit || 0;
                    return (
                      <td key={ym} className={`py-2 px-3 text-right font-black ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                        {p >= 0 ? '+' : ''}{formatNumber(p)}
                      </td>
                    );
                  })}
                  <td className={`py-2 px-4 text-right font-black border-l border-slate-300 ${
                    grandTotal.allTotal.total.profit >= 0 ? 'text-[#00AE95] bg-slate-200/70' : 'text-rose-600 bg-slate-200/70'
                  }`}>
                    {grandTotal.allTotal.total.profit >= 0 ? '+' : ''}{formatNumber(grandTotal.allTotal.total.profit)}
                  </td>
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
