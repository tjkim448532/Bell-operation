"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  RefreshCw, 
  Building2, 
  TableProperties,
  Presentation,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import PerformanceTable, { TableData } from '@/components/PerformanceTable';
import { formatNumber } from '@/lib/formatters';
import { exportDashboardToSlides, ExportSlidesData } from '@/lib/exportToSlides';

export default function PerformancePage() {
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-31');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExportingSlides, setIsExportingSlides] = useState<boolean>(false);
  const [slidesExportSuccess, setSlidesExportSuccess] = useState<string | null>(null);

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

  // 구글 슬라이드(PPTX) 내보내기 핸들러 (다른 슬라이더와 함께 전체 세트 내보내기)
  const handleExportSlides = async () => {
    if (!tableData) return;
    setIsExportingSlides(true);
    setSlidesExportSuccess(null);

    try {
      const [y, m] = selectedDate.split('-');
      const startDate = `${y}-${m}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

      // 백엔드 매출 데이터도 함께 조회하여 종합 5장 슬라이드 세트 구성
      const revRes = await fetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`).catch(() => null);
      const revJson = revRes ? await revRes.json().catch(() => null) : null;

      const division = tableData.divisions[0];
      const mtdActual = division?.divisionSubtotal?.mtd?.actual || 0;

      const exportPayload: ExportSlidesData = {
        startDate,
        endDate,
        totalLeisureRevenue: mtdActual,
        totalAllocatedExpense: revJson?.totalAllocatedExpense || 0,
        totalOperatingProfit: revJson?.totalOperatingProfit || 0,
        totalProfitMargin: revJson?.totalProfitMargin || 0,
        totalLeisureVisitors: revJson?.totalLeisureVisitors || 0,
        totalRoomGuests: revJson?.totalRoomGuests || 0,
        penetrationRate: revJson?.penetrationRate || 0,
        partKPIs: revJson?.parts || [],
        gridRows: revJson?.gridRows || [],
        dailyTrends: revJson?.dailyTrends || [],
        performanceTableData: tableData,
      };

      const fileName = await exportDashboardToSlides(exportPayload);
      setSlidesExportSuccess(fileName);
      setTimeout(() => setSlidesExportSuccess(null), 8000);
    } catch (err: any) {
      console.error('Failed to export slides:', err);
      alert('구글 슬라이드 내보내기 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsExportingSlides(false);
    }
  };

  // 상단 요약 지표 (1번째 대분류 기준)
  const summaryDivision = tableData?.divisions?.[0];
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
              대분류(본부) &gt; 파트 &gt; 영업장 계층 구조로 당월 누계(MTD) 및 올해 누계(YTD) 실적을 집중 조회합니다.
            </p>
          </div>

          {/* 일자 선택, 새로고침 및 구글 슬라이드 내보내기 버튼 */}
          <div className="flex flex-wrap items-center gap-2">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="데이터 새로고침"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>
            <button
              onClick={handleExportSlides}
              disabled={isExportingSlides || !tableData}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-50"
              title="3-Depth 경영 실적표 및 종합 분석 슬라이드를 구글 슬라이드(PPTX)로 내보내기"
            >
              {isExportingSlides ? <Loader2 size={13} className="animate-spin" /> : <Presentation size={13} />}
              <span>구글 슬라이드 내보내기</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* 2. 핵심 요약 카드 3종 (당일실적 제외, MTD/YTD 집중) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: 당월 누계 (MTD) */}
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

          {/* Card 2: 올해 누계 (YTD) */}
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

          {/* Card 3: 조직 규모 */}
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

      {/* 4. 구글 슬라이드 다운로드 완료 알림 토스트 */}
      {slidesExportSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md">
          <div className="w-10 h-10 rounded-xl bg-[#00AE95] text-white flex items-center justify-center shrink-0">
            <Presentation size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>구글 슬라이드 생성 완료</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-3xs font-extrabold">
                다운로드됨
              </span>
            </div>
            <p className="text-2xs text-slate-300 leading-relaxed">
              <strong>{slidesExportSuccess}</strong> 다운로드가 완료되었습니다. Google Drive에 업로드하여 Google 프레젠테이션으로 즉시 열 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
