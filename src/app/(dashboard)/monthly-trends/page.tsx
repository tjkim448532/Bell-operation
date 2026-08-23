'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart, 
  Calendar, RefreshCw, ChevronDown, ChevronRight, BarChart3, 
  Layers, ArrowUpRight, ArrowDownRight, CheckCircle2, Sparkles
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
  const [year, setYear] = useState<number>(2026);
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showRevenueDetails, setShowRevenueDetails] = useState<boolean>(true);
  const [showExpenseDetails, setShowExpenseDetails] = useState<boolean>(true);

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
    if (val === 0) return '₩0';
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(val));
  };

  const formatShort = (val: number) => {
    if (val === 0) return '-';
    if (Math.abs(val) >= 100000000) {
      return `${(val / 100000000).toFixed(2)}억`;
    }
    if (Math.abs(val) >= 10000) {
      return `${Math.round(val / 10000).toLocaleString()}만`;
    }
    return val.toLocaleString();
  };

  const revenueParts = ['액티비티', '벨포레 목장', '미디어아트센터'];
  const expenseTeams = ['액티비티', '벨포레 목장', '미디어아트센터', '디지털지원', '본부팀'];

  // Months to display: completed or current (or future with data)
  const displayMonths = data?.months || [];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8 min-h-screen bg-slate-50/50">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
              <BarChart3 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              월별 매출·비용 손익 분석 (P&L)
            </h1>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-extrabold rounded-full border border-emerald-200/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              자동 확장 SSOT
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            레저본부의 매달 실측 매출(Track 3)과 비용 집행 내역을 월별로 비교 분석하고, 연간 공헌이익 추이를 모니터링합니다.
          </p>
        </div>

        {/* Year Selector & Refresh */}
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value={2026}>2026년</option>
            <option value={2025}>2025년</option>
          </select>

          <button
            onClick={fetchTrends}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top 4 YTD KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: YTD Total Revenue */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">{year}년 총 누적 매출</span>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {formatCurrency(data.ytd.revenue)}
              </span>
            </div>
            <p className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              MariaDB Track 3 통합 실측 SSOT
            </p>
          </div>

          {/* Card 2: YTD Total Expense */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">{year}년 총 누적 비용</span>
              <span className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                <CreditCard className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {formatCurrency(data.ytd.expense)}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400 font-medium">
              레저본부 활성 부서 전체 지출 합계
            </p>
          </div>

          {/* Card 3: YTD Net Profit */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">{year}년 누적 공헌이익 (손익)</span>
              <span className={`p-2.5 rounded-2xl ${data.ytd.profit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                {data.ytd.profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${data.ytd.profit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {formatCurrency(data.ytd.profit)}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400 font-medium">
              누적 영업이익률: <strong className="text-indigo-600 font-bold">{data.ytd.profitMargin}%</strong>
            </p>
          </div>

          {/* Card 4: Expense Ratio */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">{year}년 평균 비용 집행률</span>
              <span className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                <PieChart className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                {data.ytd.expenseRatio}%
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400 font-medium">
              매출 대비 총 지출 비중 (누계)
            </p>
          </div>
        </div>
      )}

      {/* 3. Monthly Visual Trend Overview */}
      {data && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {year}년 월별 매출 vs 비용 및 손익 추이
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded-md bg-emerald-500"></span> 월 매출
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-3 h-3 rounded-md bg-rose-400"></span> 월 비용
              </span>
              <span className="flex items-center gap-1.5 text-indigo-700">
                <span className="w-3 h-3 rounded-full bg-indigo-600"></span> 월 손익
              </span>
            </div>
          </div>

          {/* Simple Visual Bar Columns */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-4 border-t border-gray-100">
            {displayMonths.map((m, idx) => {
              const maxVal = Math.max(...displayMonths.map(d => Math.max(d.revenue, d.expense))) || 1;
              const revHeight = m.revenue > 0 ? Math.round((m.revenue / maxVal) * 100) : 0;
              const expHeight = m.expense > 0 ? Math.round((m.expense / maxVal) * 100) : 0;

              return (
                <div key={idx} className="flex flex-col items-center gap-2 group cursor-pointer">
                  {/* Bars Container */}
                  <div className="h-40 w-full flex items-end justify-center gap-1 bg-slate-50/80 rounded-2xl p-1.5 border border-gray-100 group-hover:border-indigo-200 transition-all">
                    {/* Revenue Bar */}
                    <div 
                      style={{ height: `${Math.max(revHeight, 4)}%` }}
                      className={`w-1/2 rounded-lg transition-all ${
                        m.revenue > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-transparent'
                      }`}
                      title={`매출: ${formatCurrency(m.revenue)}`}
                    ></div>
                    {/* Expense Bar */}
                    <div 
                      style={{ height: `${Math.max(expHeight, 4)}%` }}
                      className={`w-1/2 rounded-lg transition-all ${
                        m.expense > 0 ? 'bg-rose-400 group-hover:bg-rose-500' : 'bg-transparent'
                      }`}
                      title={`비용: ${formatCurrency(m.expense)}`}
                    ></div>
                  </div>

                  {/* Month Label */}
                  <div className="text-center">
                    <span className={`text-xs font-bold block ${m.status === 'current' ? 'text-indigo-600 font-black' : 'text-gray-700'}`}>
                      {m.monthLabel}
                    </span>
                    {m.status === 'current' && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-extrabold">
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

      {/* 4. Full Monthly P&L Matrix Table */}
      {data && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-6 sm:px-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                {year}년 월별 상세 손익 매트릭스 (P&L SSOT)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                각 부서별 월별 실측 소계와 손익 현황을 전사 테이블 형태로 조회합니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRevenueDetails(!showRevenueDetails)}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {showRevenueDetails ? '매출 세부 접기' : '매출 세부 펼치기'}
              </button>
              <button
                onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                {showExpenseDetails ? '비용 세부 접기' : '비용 세부 펼치기'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="py-4 px-6 text-left w-52 sticky left-0 bg-gray-50/95 backdrop-blur-xs z-10">
                    항목 / 부서명
                  </th>
                  {displayMonths.map((m, idx) => (
                    <th key={idx} className="py-4 px-3 sm:px-4 text-center min-w-[85px]">
                      <div>{m.monthLabel}</div>
                      {m.status === 'current' && (
                        <span className="text-[10px] text-indigo-600 font-normal">진행중</span>
                      )}
                    </th>
                  ))}
                  <th className="py-4 px-6 text-center w-36 bg-indigo-50/50 text-indigo-950 font-black">
                    {year}년 누계 (YTD)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* 1. Total Revenue Row */}
                <tr className="bg-emerald-50/40 font-black text-emerald-950">
                  <td className="py-4 px-6 text-left flex items-center justify-between sticky left-0 bg-emerald-50/95 backdrop-blur-xs z-10">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      레저본부 총 매출
                    </span>
                    <button 
                      onClick={() => setShowRevenueDetails(!showRevenueDetails)}
                      className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      {showRevenueDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </td>
                  {displayMonths.map((m, idx) => (
                    <td key={idx} className="py-4 px-3 sm:px-4 text-center text-emerald-800">
                      {formatShort(m.revenue)}
                    </td>
                  ))}
                  <td className="py-4 px-6 text-center bg-emerald-100/40 text-emerald-950 font-black text-sm">
                    {formatShort(data.ytd.revenue)}
                  </td>
                </tr>

                {/* Sub-rows for Revenue Parts */}
                {showRevenueDetails && revenueParts.map((part, pIdx) => {
                  const ytdPartRev = displayMonths.reduce((sum, m) => sum + (m.revenueByPart[part] || 0), 0);
                  return (
                    <tr key={pIdx} className="hover:bg-gray-50/50 transition-colors text-gray-700 text-xs">
                      <td className="py-3 px-6 pl-10 text-left sticky left-0 bg-white/95 backdrop-blur-xs z-10 font-medium">
                        ↳ {part}
                      </td>
                      {displayMonths.map((m, idx) => (
                        <td key={idx} className="py-3 px-3 sm:px-4 text-center">
                          {formatShort(m.revenueByPart[part] || 0)}
                        </td>
                      ))}
                      <td className="py-3 px-6 text-center bg-gray-50/60 font-bold text-gray-900">
                        {formatShort(ytdPartRev)}
                      </td>
                    </tr>
                  );
                })}

                {/* 2. Total Expense Row */}
                <tr className="bg-rose-50/40 font-black text-rose-950">
                  <td className="py-4 px-6 text-left flex items-center justify-between sticky left-0 bg-rose-50/95 backdrop-blur-xs z-10">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                      레저본부 총 비용 (지출)
                    </span>
                    <button 
                      onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                      className="text-rose-700 hover:text-rose-900 cursor-pointer"
                    >
                      {showExpenseDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </td>
                  {displayMonths.map((m, idx) => (
                    <td key={idx} className="py-4 px-3 sm:px-4 text-center text-rose-800">
                      {formatShort(m.expense)}
                    </td>
                  ))}
                  <td className="py-4 px-6 text-center bg-rose-100/40 text-rose-950 font-black text-sm">
                    {formatShort(data.ytd.expense)}
                  </td>
                </tr>

                {/* Sub-rows for Expense Teams */}
                {showExpenseDetails && expenseTeams.map((team, tIdx) => {
                  const ytdTeamExp = displayMonths.reduce((sum, m) => sum + (m.expenseByTeam[team] || 0), 0);
                  return (
                    <tr key={tIdx} className="hover:bg-gray-50/50 transition-colors text-gray-700 text-xs">
                      <td className="py-3 px-6 pl-10 text-left sticky left-0 bg-white/95 backdrop-blur-xs z-10 font-medium">
                        ↳ {team}
                      </td>
                      {displayMonths.map((m, idx) => (
                        <td key={idx} className="py-3 px-3 sm:px-4 text-center">
                          {formatShort(m.expenseByTeam[team] || 0)}
                        </td>
                      ))}
                      <td className="py-3 px-6 text-center bg-gray-50/60 font-bold text-gray-900">
                        {formatShort(ytdTeamExp)}
                      </td>
                    </tr>
                  );
                })}

                {/* 3. Monthly Net Profit Row */}
                <tr className="bg-indigo-50/60 font-black text-indigo-950">
                  <td className="py-4 px-6 text-left sticky left-0 bg-indigo-50/95 backdrop-blur-xs z-10">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      월별 손익 (매출 - 비용)
                    </span>
                  </td>
                  {displayMonths.map((m, idx) => (
                    <td 
                      key={idx} 
                      className={`py-4 px-3 sm:px-4 text-center font-black ${
                        m.profit >= 0 ? 'text-indigo-700' : 'text-red-600'
                      }`}
                    >
                      {formatShort(m.profit)}
                    </td>
                  ))}
                  <td className={`py-4 px-6 text-center bg-indigo-100/60 font-black text-sm ${data.ytd.profit >= 0 ? 'text-indigo-950' : 'text-red-700'}`}>
                    {formatShort(data.ytd.profit)}
                  </td>
                </tr>

                {/* 4. Expense Ratio Row */}
                <tr className="bg-amber-50/30 text-amber-950 font-bold text-xs">
                  <td className="py-3.5 px-6 text-left sticky left-0 bg-amber-50/95 backdrop-blur-xs z-10">
                    비용 집행률 (지출 / 매출)
                  </td>
                  {displayMonths.map((m, idx) => (
                    <td key={idx} className="py-3.5 px-3 sm:px-4 text-center text-amber-800">
                      {m.revenue > 0 ? `${m.expenseRatio}%` : '-'}
                    </td>
                  ))}
                  <td className="py-3.5 px-6 text-center bg-amber-100/40 text-amber-950 font-black">
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
