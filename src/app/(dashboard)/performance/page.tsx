"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  RefreshCw, 
  TrendingUp, 
  Building2, 
  Layers, 
  DollarSign, 
  TableProperties,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import PerformanceTable, { TableData } from '@/components/PerformanceTable';
import { formatNumber } from '@/lib/formatters';

export default function PerformancePage() {
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-31');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPerformanceData = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/performance?date=${date}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTableData(json.data);
      }
    } catch (err) {
      console.error('Failed to load performance table data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData(selectedDate);
  }, [selectedDate]);

  // 상단 요약 지표 (1번째 대분류 기준)
  const summaryDivision = tableData?.divisions?.[0];
  const todaySub = summaryDivision?.divisionSubtotal?.today;
  const mtdSub = summaryDivision?.divisionSubtotal?.mtd;
  const ytdSub = summaryDivision?.divisionSubtotal?.ytd;

  const totalPartCount = summaryDivision?.parts?.length || 0;
  const totalVenueCount = summaryDivision?.parts?.reduce(
    (sum, p) => sum + (p.venues?.length || 0), 0
  ) || 0;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. 상단 히어로 섹션 */}
      <div className="relative bg-[#00AE95] rounded-b-2xl text-white py-5 px-6 sm:px-10 -mx-6 -mt-6 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/20 text-white text-3xs font-bold tracking-wider">
              <TableProperties size={12} />
              <span>3-Depth 통합 경영 실적</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              3-Depth 경영 실적 테이블
            </h1>
            <p className="text-white/90 text-xs max-w-2xl leading-relaxed">
              대분류(본부) &gt; 파트 &gt; 영업장 계층 구조로 당일(Today), 당월(MTD), 연간(YTD) 실적을 한눈에 조회합니다.
            </p>
          </div>

          {/* 일자 선택 및 새로고침 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/95 rounded-xl px-3 py-1.5 shadow-xs">
              <Calendar size={13} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer font-mono"
              />
            </div>
            <button
              onClick={() => fetchPerformanceData(selectedDate)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* 2. 핵심 요약 카드 4종 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: 당일 실적 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">당일 실적 (Today)</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                D
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900">
              {formatNumber(todaySub?.actual || 0)}원
            </div>
            <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-100">
              <span className="text-slate-400">전년: {formatNumber(todaySub?.ly || 0)}</span>
              <span className={`font-mono font-bold flex items-center gap-0.5 ${
                (todaySub?.growth || 0) >= 0 ? 'text-rose-600' : 'text-blue-600'
              }`}>
                {(todaySub?.growth || 0) >= 0 ? '▲' : '▼'} {Math.abs(todaySub?.growth || 0).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 2: 당월 누계 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">당월 누계 (MTD)</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                M
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900">
              {formatNumber(mtdSub?.actual || 0)}원
            </div>
            <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-100">
              <span className="text-slate-400">전년: {formatNumber(mtdSub?.ly || 0)}</span>
              <span className={`font-mono font-bold flex items-center gap-0.5 ${
                (mtdSub?.growth || 0) >= 0 ? 'text-rose-600' : 'text-blue-600'
              }`}>
                {(mtdSub?.growth || 0) >= 0 ? '▲' : '▼'} {Math.abs(mtdSub?.growth || 0).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 3: 올해 누계 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">올해 누계 (YTD)</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                Y
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900">
              {formatNumber(ytdSub?.actual || 0)}원
            </div>
            <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-100">
              <span className="text-slate-400">전년: {formatNumber(ytdSub?.ly || 0)}</span>
              <span className={`font-mono font-bold flex items-center gap-0.5 ${
                (ytdSub?.growth || 0) >= 0 ? 'text-rose-600' : 'text-blue-600'
              }`}>
                {(ytdSub?.growth || 0) >= 0 ? '▲' : '▼'} {Math.abs(ytdSub?.growth || 0).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 4: 조직 단위 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">조직 규모</span>
              <div className="w-8 h-8 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                <Building2 size={18} />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-[#00AE95]">
              {totalPartCount}개 파트
            </div>
            <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-100">
              <span className="text-slate-500">산하 영업장 총 {totalVenueCount}개 매장</span>
              <span className="text-3xs font-semibold px-2 py-0.5 bg-[#E6F7F4] text-[#00826F] rounded-md">
                레져본부
              </span>
            </div>
          </div>
        </div>

        {/* 3. 3-Depth 경영 실적 통합 테이블 컴포넌트 */}
        {loading && !tableData ? (
          <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-[#00AE95] mx-auto" />
            <p className="text-xs text-slate-500 font-medium">경영 실적 데이터를 집계 중입니다...</p>
          </div>
        ) : tableData ? (
          <PerformanceTable data={tableData} />
        ) : (
          <div className="p-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            조회된 경영 실적 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
