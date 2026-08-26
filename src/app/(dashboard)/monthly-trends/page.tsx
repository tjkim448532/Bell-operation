'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDateFilter } from '@/context/DateFilterContext';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart, 
  RefreshCw, ChevronDown, ChevronRight, BarChart3, 
  Sparkles, CheckCircle2, Eye, Filter
} from 'lucide-react';

interface MonthlyData {
  month: string;
  monthLabel: string;
  status: 'completed' | 'current' | 'future';
  revenue: number;
  expense: number;
  profit: number;
  profitMargin: number;
  expenseRatio: number;
  revenueByPart: Record<string, number>;
  expenseByTeam: Record<string, number>;
}

interface TrendsResponse {
  success: boolean;
  year: number;
  ytd: {
    revenue: number;
    expense: number;
    profit: number;
    profitMargin: number;
    expenseRatio: number;
  };
  months: MonthlyData[];
  activeTeams: string[];
}

export default function MonthlyTrendsPage() {
  const { startMonth } = useDateFilter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(() => {
    if (startMonth && startMonth.length >= 4) {
      const y = parseInt(startMonth.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  });

  useEffect(() => {
    if (startMonth && startMonth.length >= 4) {
      const y = parseInt(startMonth.slice(0, 4), 10);
      if (!isNaN(y) && y !== year) {
        setYear(y);
      }
    }
  }, [startMonth]);
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showRevenueDetails, setShowRevenueDetails] = useState<boolean>(true);
  const [showExpenseDetails, setShowExpenseDetails] = useState<boolean>(true);
  const [hideFutureMonths, setHideFutureMonths] = useState<boolean>(true); // 기본: 실측 월만 보기로 가독성 극대화
  const [unitMode, setUnitMode] = useState<'short' | 'full'>('short'); // short: 억/만, full: 원단위

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/monthly-trends?year=${year}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (e) {
      console.error('Failed to load monthly trends:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [year]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(val || 0));
  };

  const formatShort = (val: number) => {
    if (val === 0) return '-';
    if (unitMode === 'full') {
      return val.toLocaleString();
    }
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    let formatted = '';
    if (absVal >= 100000000) {
      formatted = `${(absVal / 100000000).toFixed(2)}억`;
    } else if (absVal >= 10000) {
      formatted = `${Math.round(absVal / 10000).toLocaleString()}만`;
    } else {
      formatted = `${absVal.toLocaleString()}원`;
    }
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatProfit = (val: number) => {
    if (val === 0) return '-';
    if (unitMode === 'full') {
      return (val > 0 ? `+${val.toLocaleString()}` : val.toLocaleString());
    }
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    let formatted = '';
    if (absVal >= 100000000) {
      formatted = `${(absVal / 100000000).toFixed(2)}억`;
    } else if (absVal >= 10000) {
      formatted = `${Math.round(absVal / 10000).toLocaleString()}만`;
    } else {
      formatted = `${absVal.toLocaleString()}원`;
    }
    return isNegative ? `-${formatted}` : `+${formatted}`;
  };

  const revenueParts = useMemo(() => {
    const set = new Set<string>();
    (data?.months || []).forEach(m => {
      Object.keys(m.revenueByPart || {}).forEach(p => set.add(p));
    });
    return Array.from(set);
  }, [data]);

  const expenseTeams = useMemo(() => {
    const set = new Set<string>();
    (data?.months || []).forEach(m => {
      Object.keys(m.expenseByTeam || {}).forEach(t => set.add(t));
    });
    return Array.from(set);
  }, [data]);

  // Months to display in table: filter out empty future months if hideFutureMonths is active
  const allMonths = data?.months || [];
  const displayMonths = hideFutureMonths
    ? allMonths.filter(m => m.status !== 'future' || m.revenue > 0 || m.expense > 0)
    : allMonths;

  const yearOptions = [currentYear, currentYear - 1];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8 min-h-screen bg-slate-50/50">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  월별 손익 분석 (손익계산서)
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  실시간 공식 연동
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                레저본부의 월별 실측 매출과 비용 집행 내역을 종합 비교하여, 연간 영업이익(공헌이익) 및 비용 집행률 추이를 모니터링합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Year Selector & Unit & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Unit Toggle */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center text-xs font-medium">
            <button
              onClick={() => setUnitMode('short')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                unitMode === 'short' ? 'bg-indigo-600 text-white shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              억/만 요약
            </button>
            <button
              onClick={() => setUnitMode('full')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                unitMode === 'full' ? 'bg-indigo-600 text-white shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              원단위 상세
            </button>
          </div>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>

          <button
            onClick={fetchTrends}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top 4 YTD KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: YTD Total Revenue */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 truncate mr-2">{year}년 총 누적 매출</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-slate-900 tracking-tight tabular-nums truncate" title={formatCurrency(data.ytd.revenue)}>
                  {formatCurrency(data.ytd.revenue)}
                </span>
              </div>
            </div>
            <p className="mt-3 pt-2 border-t border-slate-100 text-2xs sm:text-xs text-emerald-600 font-medium flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              전사 공식 실시간 집계 데이터
            </p>
          </div>

          {/* Card 2: YTD Total Expense */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 truncate mr-2">{year}년 총 누적 비용</span>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-slate-900 tracking-tight tabular-nums truncate" title={formatCurrency(data.ytd.expense)}>
                  {formatCurrency(data.ytd.expense)}
                </span>
              </div>
            </div>
            <p className="mt-3 pt-2 border-t border-slate-100 text-2xs sm:text-xs text-slate-400 font-medium truncate">
              레저본부 활성 부서 전체 지출 합계
            </p>
          </div>

          {/* Card 3: YTD Net Profit */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 truncate mr-2">{year}년 누적 공헌이익 (손익)</span>
                <span className={`p-2 rounded-xl shrink-0 ${data.ytd.profit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                  {data.ytd.profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className={`text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold tracking-tight tabular-nums truncate ${data.ytd.profit >= 0 ? 'text-indigo-600' : 'text-red-600'}`} title={formatCurrency(data.ytd.profit)}>
                  {formatCurrency(data.ytd.profit)}
                </span>
              </div>
            </div>
            <p className="mt-3 pt-2 border-t border-slate-100 text-2xs sm:text-xs text-slate-400 font-medium truncate">
              누적 영업이익률: <strong className="text-indigo-600 font-semibold">{data.ytd.profitMargin}%</strong>
            </p>
          </div>

          {/* Card 4: Expense Ratio */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 truncate mr-2">{year}년 평균 비용 집행률</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                  <PieChart className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-amber-600 tracking-tight tabular-nums truncate">
                  {data.ytd.expenseRatio}%
                </span>
              </div>
            </div>
            <p className="mt-3 pt-2 border-t border-slate-100 text-2xs sm:text-xs text-slate-400 font-medium truncate">
              매출 대비 총 지출 비중 (누계)
            </p>
          </div>
        </div>
      )}

      {/* 3. Monthly Visual Trend Overview */}
      {data && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {year}년 월별 매출 vs 비용 및 손익 추이
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> 월 매출
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400"></span> 월 비용
              </span>
              <span className="flex items-center gap-1.5 text-indigo-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> 월 손익
              </span>
            </div>
          </div>

          {/* Visual Bar Columns */}
          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-2.5 pt-3 border-t border-slate-100">
            {allMonths.map((m, idx) => {
              const maxVal = Math.max(...allMonths.map(d => Math.max(d.revenue, d.expense))) || 1;
              const revHeight = m.revenue > 0 ? Math.round((m.revenue / maxVal) * 100) : 0;
              const expHeight = m.expense > 0 ? Math.round((m.expense / maxVal) * 100) : 0;
              const hasData = m.revenue > 0 || m.expense > 0;

              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                  {/* Bars Container */}
                  <div className="h-32 w-full flex items-end justify-center gap-1 bg-slate-50/90 rounded-xl p-1 border border-slate-100 group-hover:border-indigo-200 transition-all">
                    {/* Revenue Bar */}
                    <div 
                      style={{ height: `${revHeight}%` }}
                      className={`w-1/2 rounded-md transition-all ${
                        m.revenue > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600 shadow-2xs' : 'bg-transparent'
                      }`}
                      title={`매출: ${formatCurrency(m.revenue)}`}
                    ></div>
                    {/* Expense Bar */}
                    <div 
                      style={{ height: `${expHeight}%` }}
                      className={`w-1/2 rounded-md transition-all ${
                        m.expense > 0 ? 'bg-rose-400 group-hover:bg-rose-500 shadow-2xs' : 'bg-transparent'
                      }`}
                      title={`비용: ${formatCurrency(m.expense)}`}
                    ></div>
                  </div>

                  {/* Month Label */}
                  <div className="text-center">
                    <span className={`text-xs block ${m.status === 'current' ? 'text-indigo-600 font-bold' : (hasData ? 'text-slate-700 font-medium' : 'text-slate-400 font-normal')}`}>
                      {m.monthLabel}
                    </span>
                    {m.status === 'current' && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-medium">
                        진행중
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Full Monthly P&L Matrix Table (가독성 대폭 강화) */}
      {data && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Table Controls Bar */}
          <div className="p-5 sm:px-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {year}년 월별 상세 손익 현황 (매출·비용 손익계산서)
                </h2>
                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                  {hideFutureMonths ? `실측 ${displayMonths.length}개월 표출` : '12개월 전체 표출'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                각 부서별 월별 실측 소계와 손익 현황을 가로 스크롤 없이 선명하게 조회합니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Future Months Toggle */}
              <button
                onClick={() => setHideFutureMonths(!hideFutureMonths)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                  hideFutureMonths 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {hideFutureMonths ? '12개월 전체 보기' : '실측 월만 모아보기'}
              </button>

              <button
                onClick={() => setShowRevenueDetails(!showRevenueDetails)}
                className="text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {showRevenueDetails ? '매출 세부 접기' : '매출 세부 펼치기'}
              </button>
              <button
                onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                className="text-xs font-medium text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                {showExpenseDetails ? '비용 세부 접기' : '비용 세부 펼치기'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse font-sans">
              <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3.5 px-5 text-left min-w-[190px] whitespace-nowrap sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-2xs font-semibold text-slate-700">
                    항목 / 부서명
                  </th>
                  {displayMonths.map((m, idx) => (
                    <th key={idx} className="py-3.5 px-3 sm:px-4 text-center min-w-[95px] whitespace-nowrap border-r border-slate-100">
                      <div className="text-slate-800 font-semibold text-xs">{m.monthLabel}</div>
                      {m.status === 'current' && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium inline-block mt-0.5">
                          진행중
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="py-3.5 px-5 text-center min-w-[130px] whitespace-nowrap bg-indigo-50/60 text-indigo-900 font-bold border-l border-indigo-100 z-10">
                    {year}년 누계 (YTD)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs sm:text-sm">
                {/* 1. Total Revenue Row */}
                <tr className="bg-emerald-50/30 font-semibold text-emerald-950 hover:bg-emerald-50/60 transition-colors">
                  <td className="py-3.5 px-5 text-left whitespace-nowrap sticky left-0 bg-emerald-50/90 z-10 border-r border-emerald-100 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        레저본부 총 매출
                      </span>
                      <button 
                        onClick={() => setShowRevenueDetails(!showRevenueDetails)}
                        className="p-1 hover:bg-emerald-200/50 rounded-md text-emerald-700 cursor-pointer"
                      >
                        {showRevenueDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  {displayMonths.map((m, idx) => (
                    <td key={idx} className="py-3.5 px-3 sm:px-4 text-center text-emerald-900 font-semibold tabular-nums border-r border-slate-100">
                      {formatShort(m.revenue)}
                    </td>
                  ))}
                  <td className="py-3.5 px-5 text-center bg-emerald-100/50 text-emerald-950 font-bold tabular-nums border-l border-emerald-200">
                    {formatShort(data.ytd.revenue)}
                  </td>
                </tr>

                {/* Sub-rows for Revenue Parts */}
                {showRevenueDetails && revenueParts.map((part, pIdx) => {
                  const ytdPartRev = (data?.ytd as any)?.revenueByPart?.[part] ?? 0;
                  return (
                    <tr key={pIdx} className="hover:bg-slate-50/80 transition-colors text-slate-600 text-xs">
                      <td className="py-2.5 px-5 pl-9 text-left whitespace-nowrap sticky left-0 bg-white z-10 font-medium text-slate-700 border-r border-slate-100 shadow-2xs">
                        ↳ {part}
                      </td>
                      {displayMonths.map((m, idx) => (
                        <td key={idx} className="py-2.5 px-3 sm:px-4 text-center tabular-nums text-slate-600 border-r border-slate-100">
                          {formatShort(m.revenueByPart[part] || 0)}
                        </td>
                      ))}
                      <td className="py-2.5 px-5 text-center bg-slate-50/80 font-semibold tabular-nums text-slate-800 border-l border-slate-200">
                        {formatShort(ytdPartRev)}
                      </td>
                    </tr>
                  );
                })}

                {/* 2. Total Expense Row */}
                <tr className="bg-rose-50/30 font-semibold text-rose-950 hover:bg-rose-50/60 transition-colors border-t border-rose-100">
                  <td className="py-3.5 px-5 text-left whitespace-nowrap sticky left-0 bg-rose-50/90 z-10 border-r border-rose-100 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        레저본부 총 비용 (지출)
                      </span>
                      <button 
                        onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                        className="p-1 hover:bg-rose-200/50 rounded-md text-rose-700 cursor-pointer"
                      >
                        {showExpenseDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  {displayMonths.map((m, idx) => (
                    <td key={idx} className="py-3.5 px-3 sm:px-4 text-center text-rose-900 font-semibold tabular-nums border-r border-slate-100">
                      {formatShort(m.expense)}
                    </td>
                  ))}
                  <td className="py-3.5 px-5 text-center bg-rose-100/50 text-rose-950 font-bold tabular-nums border-l border-rose-200">
                    {formatShort(data.ytd.expense)}
                  </td>
                </tr>

                {/* Sub-rows for Expense Teams */}
                {showExpenseDetails && expenseTeams.map((team, tIdx) => {
                  const ytdTeamExp = (data?.ytd as any)?.expenseByTeam?.[team] ?? 0;
                  return (
                    <tr key={tIdx} className="hover:bg-slate-50/80 transition-colors text-slate-600 text-xs">
                      <td className="py-2.5 px-5 pl-9 text-left whitespace-nowrap sticky left-0 bg-white z-10 font-medium text-slate-700 border-r border-slate-100 shadow-2xs">
                        ↳ {team}
                      </td>
                      {displayMonths.map((m, idx) => (
                        <td key={idx} className="py-2.5 px-3 sm:px-4 text-center tabular-nums text-slate-600 border-r border-slate-100">
                          {formatShort(m.expenseByTeam[team] || 0)}
                        </td>
                      ))}
                      <td className="py-2.5 px-5 text-center bg-slate-50/80 font-semibold tabular-nums text-slate-800 border-l border-slate-200">
                        {formatShort(ytdTeamExp)}
                      </td>
                    </tr>
                  );
                })}

                {/* 3. Monthly Net Profit Row */}
                <tr className="bg-indigo-50/40 font-semibold text-indigo-950 hover:bg-indigo-50/70 transition-colors border-t border-indigo-100">
                  <td className="py-3.5 px-5 text-left whitespace-nowrap sticky left-0 bg-indigo-50/90 z-10 border-r border-indigo-100 shadow-2xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      월별 손익 (매출 - 비용)
                    </span>
                  </td>
                  {displayMonths.map((m, idx) => (
                    <td 
                      key={idx} 
                      className={`py-3.5 px-3 sm:px-4 text-center font-semibold tabular-nums border-r border-slate-100 ${
                        m.profit >= 0 ? 'text-indigo-700' : 'text-rose-600'
                      }`}
                    >
                      {formatProfit(m.profit)}
                    </td>
                  ))}
                  <td className={`py-3.5 px-5 text-center bg-indigo-100/60 font-bold tabular-nums border-l border-indigo-200 ${
                    data.ytd.profit >= 0 ? 'text-indigo-950' : 'text-rose-700'
                  }`}>
                    {formatProfit(data.ytd.profit)}
                  </td>
                </tr>

                {/* 4. Expense Ratio Row */}
                <tr className="bg-slate-50/40 text-slate-700 font-medium text-xs hover:bg-slate-50/80 transition-colors border-t border-slate-100">
                  <td className="py-3 px-5 text-left whitespace-nowrap sticky left-0 bg-slate-50/95 z-10 border-r border-slate-100 shadow-2xs font-medium text-slate-600">
                    비용 집행률 (지출 / 매출)
                  </td>
                  {displayMonths.map((m, idx) => (
                    <td key={idx} className="py-3 px-3 sm:px-4 text-center tabular-nums text-slate-600 border-r border-slate-100">
                      {m.revenue > 0 ? `${m.expenseRatio}%` : '-'}
                    </td>
                  ))}
                  <td className="py-3 px-5 text-center bg-slate-100/70 text-slate-900 font-semibold tabular-nums border-l border-slate-200">
                    {data.ytd.expenseRatio}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
