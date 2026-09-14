"use client";

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShieldCheck, 
  Layers, 
  BarChart3, 
  Bed, 
  Loader2,
  CheckCircle2, 
  CreditCard, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  Building2, 
  Maximize2, 
  Minimize2, 
  Presentation, 
  Award, 
  Sparkles 
} from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import Dashboard3DPieChart, { PieChartItem } from '@/components/Dashboard3DPieChart';
import HierarchicalRowspanTable, { HierarchicalRow } from '@/components/HierarchicalRowspanTable';
import MonthlyPnLTrendChart from '@/components/MonthlyPnLTrendChart';
import PerformanceTable, { TableData } from '@/components/PerformanceTable';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { 
  allocateExpenses, 
  calculatePartKPIs, 
  LeisurePartKPISummary, 
  RawExpenseRow, 
  ValidationMasterReport 
} from '@/lib/financeEngine';
import { exportLeisureDashboardToExcel } from '@/lib/excelExport';
import { exportDashboardToSlides } from '@/lib/exportToSlides';

const PART_COLORS: Record<string, string> = {
  '미디어아트센터': '#8b5cf6', // purple
  '액티비티': '#00AE95',      // brand-mint
  '목장': '#f59e0b',          // amber
  '디지털지원': '#6366f1',      // indigo
};

const PALETTE = ['#00AE95', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const getPartColor = (partName: string, index = 0): string => {
  return PART_COLORS[partName] || PALETTE[index % PALETTE.length];
};

export default function LeisureDashboardPage() {
  const { startDate, endDate, isMounted } = useDateFilter();

  const [loading, setLoading] = useState(true);
  const [totalRoomGuests, setTotalRoomGuests] = useState(0);
  const [partKPIs, setPartKPIs] = useState<LeisurePartKPISummary[]>([]);
  const [gridRows, setGridRows] = useState<HierarchicalRow[]>([]);
  const [audit, setAudit] = useState<ValidationMasterReport | null>(null);
  const [rawPartsData, setRawPartsData] = useState<any[]>([]);
  const [dailyTrends, setDailyTrends] = useState<any[]>([]);
  const [performanceTableData, setPerformanceTableData] = useState<TableData | null>(null);

  // PPT 슬라이드 네비게이션 상태 (1: 총괄, 2: 4대 파트 손익/3D, 3: 12개 영업장 원장, 4: 31일 일별 추이)
  const [activeSlide, setActiveSlide] = useState<number>(1);
  const [isPresentMode, setIsPresentMode] = useState<boolean>(false);

  // 파트 드릴다운 상태
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  // 키보드 방향키 슬라이드 전환 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setActiveSlide((prev) => (prev < 4 ? prev + 1 : 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setActiveSlide((prev) => (prev > 1 ? prev - 1 : 4));
      } else if (e.key === 'Escape') {
        setIsPresentMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let ignore = false;
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const yearMonth = startDate ? startDate.substring(0, 7) : '2026-08';
        const queryDate = endDate || (startDate ? startDate : '2026-08-31');

        const [revRes, expRes, perfRes] = await Promise.all([
          fetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/expenses/monthly?yearMonth=${yearMonth}`),
          fetch(`/api/performance?date=${queryDate}`).catch(() => null)
        ]);

        const revJson = await revRes.json();
        const expJson = await expRes.json();

        if (ignore) return;

        if (revJson.success) {
          const roomGuests = revJson.totalRoomCap || 0;
          setTotalRoomGuests(roomGuests);
          setGridRows(revJson.gridRows || []);
          setRawPartsData(revJson.parts || []);
          setDailyTrends(revJson.dailyTrends || []);

          const rawExpenses: RawExpenseRow[] = expJson.expenses || [];
          const partMetrics = revJson.parts || [];

          // 비용 안분 및 검증마스터 실행
          const { allocations, audit: auditReport } = allocateExpenses(rawExpenses, partMetrics);
          setAudit(auditReport);

          // 파트별 손익, 객단가, 이용율 KPI 계산
          const kpis = calculatePartKPIs(partMetrics, allocations, roomGuests);
          setPartKPIs(kpis);
        }

        if (perfRes && perfRes.ok) {
          const perfJson = await perfRes.json().catch(() => null);
          if (perfJson && perfJson.success && perfJson.data) {
            setPerformanceTableData(perfJson.data);
          }
        }
      } catch (err) {
        console.error('Failed to load leisure dashboard data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchAllData();
    return () => { ignore = true; };
  }, [startDate, endDate, isMounted]);

  // 대시보드 전체 총합 산출 (NO SLICE SUMMATION)
  const totalLeisureRevenue = partKPIs.reduce((sum, p) => sum + p.revenue, 0);
  const totalAllocatedExpense = partKPIs.reduce((sum, p) => sum + p.allocatedExpense, 0);
  const totalOperatingProfit = totalLeisureRevenue - totalAllocatedExpense;
  const totalProfitMargin = totalLeisureRevenue > 0 ? (totalOperatingProfit / totalLeisureRevenue) * 100 : 0;
  const totalLeisureVisitors = partKPIs.reduce((sum, p) => sum + p.visitorCount, 0);
  const penetrationRate = totalRoomGuests > 0 ? (totalLeisureVisitors / totalRoomGuests) * 100 : 0;

  // 3D 파이 차트 데이터
  const revenuePieData: PieChartItem[] = partKPIs
    .filter((p) => !p.isSupportTeam && p.revenue > 0)
    .map((p, idx) => ({
      name: p.partName,
      value: p.revenue,
      color: getPartColor(p.partName, idx),
    }));

  const expensePieData: PieChartItem[] = partKPIs.map((p, idx) => ({
    name: p.partName,
    value: p.allocatedExpense,
    color: getPartColor(p.partName, idx),
  }));

  // 파트별 세부 영업장 맵
  const venuesByPart = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; visitors: number }[]> = {};
    gridRows.forEach((r) => {
      if (!map[r.partName]) map[r.partName] = [];
      const existing = map[r.partName].find((v) => v.name === r.venueName);
      if (existing) {
        existing.revenue += r.revenue;
        existing.visitors += r.visitorCount;
      } else {
        map[r.partName].push({
          name: r.venueName,
          revenue: r.revenue,
          visitors: r.visitorCount,
        });
      }
    });
    return map;
  }, [gridRows]);

  const togglePartDrilldown = (partName: string) => {
    setExpandedPart((prev) => (prev === partName ? null : partName));
  };

  const handleExportExcel = () => {
    exportLeisureDashboardToExcel({
      partKPIs,
      gridRows,
      audit,
      yearMonth: startDate ? startDate.substring(0, 7) : '2026-08',
      totalRoomGuests,
    });
  };

  const [isExportingSlides, setIsExportingSlides] = useState(false);
  const [slidesExportSuccess, setSlidesExportSuccess] = useState<string | null>(null);

  const handleExportSlides = async () => {
    setIsExportingSlides(true);
    setSlidesExportSuccess(null);
    try {
      const fileName = await exportDashboardToSlides({
        startDate,
        endDate,
        totalLeisureRevenue,
        totalAllocatedExpense,
        totalOperatingProfit,
        totalProfitMargin,
        totalLeisureVisitors,
        totalRoomGuests,
        penetrationRate,
        partKPIs,
        gridRows,
        dailyTrends,
        audit,
        performanceTableData: performanceTableData || undefined,
      });
      setSlidesExportSuccess(fileName);
      setTimeout(() => setSlidesExportSuccess(null), 8000);
    } catch (err: any) {
      console.error('Failed to export slides:', err);
      alert('구글 슬라이드 파일 생성 중 오류가 발생했습니다: ' + (err?.message || err));
    } finally {
      setIsExportingSlides(false);
    }
  };

  const slideTabs = [
    { id: 1, num: '01', title: '실적 총괄 요약' },
    { id: 2, num: '02', title: '4대 부서별 손익' },
    { id: 3, num: '03', title: '영업장별 상세 실적' },
    { id: 4, num: '04', title: '일별 매출 추이' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#00AE95]" />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">레져본부 실적 데이터를 불러오는 중입니다...</p>
          <p className="text-2xs text-slate-400 mt-1">정산 데이터 집계 중</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ${
      isPresentMode 
        ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-900 p-4 sm:p-8 flex flex-col justify-between custom-scrollbar' 
        : 'space-y-8 pb-12'
    }`}>
      {/* 1. 상단 배너 (슬림 & 담백한 헤더) */}
      {!isPresentMode && (
        <div className="w-full bg-[#00AE95] rounded-b-2xl relative overflow-hidden text-white py-5 px-6 sm:px-10 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white text-3xs font-bold tracking-wider">
                  벨포레 리조트
                </span>
                <span className="text-3xs font-bold text-white/90 tracking-wider">
                  레져본부
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>벨포레 레져본부 실적 및 손익 대시보드</span>
              </h1>
              <p className="text-xs text-white/90 mt-0.5">
                레져본부 4대 부서 월별 매출 및 비용 정산 현황
              </p>
            </div>

            {/* 도구 모음 */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <GlobalDateSelector />
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer backdrop-blur-xs shadow-xs"
                title="실적 엑셀 파일 다운로드"
              >
                <Download size={14} />
                <span>엑셀 다운로드</span>
              </button>
              <button
                onClick={() => setIsPresentMode(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#00AE95] hover:bg-slate-50 text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="전체화면 모드"
              >
                <Maximize2 size={14} />
                <span>전체화면</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        {/* 슬라이드 컨트롤 툴바 */}
        <div className={`p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 border ${
          isPresentMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200/80'
        }`}>
          {/* 슬라이드 탭 선택기 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E6F7F4] text-[#00826F] text-2xs font-bold mr-1 shrink-0">
              <Presentation size={14} />
              <span>보고서</span>
            </div>

            {slideTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSlide(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeSlide === tab.id
                    ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                    : isPresentMode
                      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className={`text-2xs font-mono px-1.5 py-0.5 rounded-md ${
                  activeSlide === tab.id ? 'bg-black/20 text-white' : 'bg-slate-200/70 text-slate-700'
                }`}>
                  {tab.num}
                </span>
                <span>{tab.title}</span>
              </button>
            ))}
          </div>

          {/* 슬라이드 조작 버튼 */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveSlide((prev) => (prev > 1 ? prev - 1 : 4))}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                title="이전 (←)"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-2xs font-bold font-mono px-2 text-slate-600">
                0{activeSlide} / 04
              </span>
              <button
                onClick={() => setActiveSlide((prev) => (prev < 4 ? prev + 1 : 1))}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                title="다음 (→)"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={handleExportSlides}
              disabled={isExportingSlides}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00AE95] hover:bg-[#009681] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="구글 슬라이드/파워포인트 파일 다운로드"
            >
              {isExportingSlides ? <Loader2 size={13} className="animate-spin" /> : <Presentation size={13} />}
              <span className="hidden sm:inline">슬라이드 내보내기</span>
            </button>

            {isPresentMode && (
              <button
                onClick={() => setIsPresentMode(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Minimize2 size={13} />
                <span>종료 (ESC)</span>
              </button>
            )}
          </div>
        </div>

        {/* 슬라이드 캔버스 프레임 */}
        <div className={`bg-white rounded-[24px] p-6 sm:p-8 shadow-xs border border-slate-200/80 relative overflow-hidden transition-all duration-300 ${
          isPresentMode ? 'max-w-6xl mx-auto w-full my-auto' : ''
        }`}>
          {/* 슬라이드 상단 헤더 */}
          <div className="border-b border-slate-200 pb-4 mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-2xs font-bold tracking-wider">
                  블랙스톤 벨포레
                </span>
                <span className="text-2xs font-bold text-[#00826F] tracking-wider">
                  레져본부
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>
                  {activeSlide === 1 && '레져본부 실적 및 손익 현황 요약'}
                  {activeSlide === 2 && '4대 부서별 손익 현황'}
                  {activeSlide === 3 && '영업장별 상세 실적'}
                  {activeSlide === 4 && '일별 매출 추이'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {activeSlide === 1 && '놀이동산 · 목장 · 미디어아트센터 · 액티비티 4대 부서 매출 및 비용 결산'}
                {activeSlide === 2 && '부서별 직접 비용 및 공통비 배부 결산 내역'}
                {activeSlide === 3 && '부서 ➔ 영업장 ➔ 티켓군별 상세 실적 내역'}
                {activeSlide === 4 && '조회 기간 내 일자별 순매출 추이 (부가가치세 제외)'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-slate-800 leading-none">
                  0{activeSlide} <span className="text-xs text-slate-400 font-normal">/ 04</span>
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* SLIDE 01: 실적 총괄 요약                                   */}
          {/* ========================================================== */}
          {activeSlide === 1 && (
            <div className="space-y-6">
              {/* 담백한 실적 요약 카드 */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#E6F7F4]/70 text-slate-800 border-l-4 border-l-[#00AE95] border border-[#00AE95]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00826F]">
                    주요 실적 요약
                  </span>
                  <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-[#00AE95] text-white">
                    전년 대비 +10.9%
                  </span>
                </div>
                <p className="text-sm sm:text-base font-normal text-slate-700 leading-relaxed">
                  {startDate ? `${startDate.substring(0, 4)}년 ${parseInt(startDate.substring(5, 7), 10)}월` : '2026년 8월'} 레져본부 총 순매출은 <strong className="text-[#00826F] font-bold">{formatNumber(totalLeisureRevenue)}원</strong>, 
                  총 이용객은 <strong className="text-slate-900 font-bold">{formatNumber(totalLeisureVisitors)}명</strong>이며, 
                  리조트 전체 투숙객은 <strong className="text-slate-900 font-bold">{formatNumber(totalRoomGuests)}명</strong>이었습니다.
                </p>
              </div>

              {/* 3 Core High-Impact KPI Slide Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. 총 순매출 */}
                <div className="bg-white rounded-[24px] p-6 sm:p-7 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-2 border border-slate-200/80">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">01. 레져 총 순매출</span>
                    <div className="w-8 h-8 rounded-xl bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center font-bold">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-800 relative z-10">
                    {formatNumber(totalLeisureRevenue)}
                  </div>
                  <p className="text-2xs text-slate-400 font-medium relative z-10">부가가치세(10%) 제외</p>
                </div>

                {/* 2. 분배 총비용 */}
                <div className="bg-white rounded-[24px] p-6 sm:p-7 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-2 border border-slate-200/80">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">02. 분배 총비용</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <CreditCard size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-800 relative z-10">
                    {formatNumber(totalAllocatedExpense)}
                  </div>
                  <p className="text-2xs text-slate-400 font-medium relative z-10">직접비용 + 공통비 배부액</p>
                </div>

                {/* 3. 영업 손익 */}
                <div className="bg-white rounded-[24px] p-6 sm:p-7 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-2 border border-slate-200/80">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">03. 영업 손익</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      totalOperatingProfit >= 0 ? 'bg-[#E6F7F4] text-[#00AE95]' : 'bg-rose-50 text-rose-600'
                    }`}>
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight relative z-10 ${
                    totalOperatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'
                  }`}>
                    {formatNumber(totalOperatingProfit)}
                  </div>
                  <div className="text-2xs font-semibold text-slate-500 flex items-center gap-1 relative z-10">
                    <span>영업이익률:</span>
                    <strong className={`font-mono ${totalOperatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                      {formatPercent(totalProfitMargin)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3-Depth 경영 실적 통합 테이블 (대분류 > 파트 > 영업장) */}
              {performanceTableData ? (
                <div className="space-y-3">
                  <PerformanceTable data={performanceTableData} />
                </div>
              ) : (
                <div className="p-16 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00AE95] mx-auto" />
                  <p className="text-xs text-slate-400">3-Depth 경영 실적 데이터를 집계 중입니다...</p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* SLIDE 02: 4대 파트 심층 P&L 및 3D 점유 비중                   */}
          {/* ========================================================== */}
          {activeSlide === 2 && (
            <div className="space-y-6">
              {/* 상단 3D 파이 차트 2종 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Dashboard3DPieChart 
                  data={revenuePieData} 
                  title="4대 부서 매출 비중" 
                  metricLabel="순매출액"
                />
                <Dashboard3DPieChart 
                  data={expensePieData} 
                  title="4대 부서 비용 배분 비중" 
                  metricLabel="분배비용"
                />
              </div>

              {/* 하단 파트별 손익 및 드릴다운 테이블 */}
              <div className="rounded-[28px] border border-slate-100 overflow-hidden shadow-xs bg-white">
                <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#00AE95]" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      부서별 손익 및 영업장별 상세 실적
                    </h3>
                  </div>
                  <span className="text-2xs text-slate-400 font-medium">
                    * 부서 행을 클릭하여 세부 영업장 확인
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">부서명 (클릭하여 상세 조회)</th>
                        <th className="py-3 px-4 text-right">순매출</th>
                        <th className="py-3 px-4 text-right">분배 총비용</th>
                        <th className="py-3 px-4 text-right">영업손익</th>
                        <th className="py-3 px-4 text-right">손익률</th>
                        <th className="py-3 px-4 text-right">이용객(명)</th>
                        <th className="py-3 px-4 text-right">객단가</th>
                        <th className="py-3 px-4 text-right">숙박객 이용률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {partKPIs.map((kpi, idx) => {
                        const isExpanded = expandedPart === kpi.partName;
                        const venues = venuesByPart[kpi.partName] || [];

                        return (
                          <Fragment key={idx}>
                            <tr 
                              onClick={() => togglePartDrilldown(kpi.partName)}
                              className={`cursor-pointer transition-colors ${
                                isExpanded ? 'bg-[#E6F7F4]/40' : 'hover:bg-slate-50/70'
                              }`}
                            >
                              <td className="py-3.5 px-4 font-bold text-slate-800">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="w-2.5 h-2.5 rounded-full" 
                                      style={{ backgroundColor: getPartColor(kpi.partName, idx) }}
                                    />
                                    <span>{kpi.partName}</span>
                                    <span className="text-2xs font-normal text-slate-400">
                                      ({venues.length}개 영업장)
                                    </span>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown size={15} className="text-[#00AE95]" />
                                  ) : (
                                    <ChevronRight size={15} className="text-slate-400" />
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-slate-800 font-bold">
                                {kpi.isSupportTeam ? <span className="text-slate-400 font-normal">-</span> : formatNumber(kpi.revenue)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-rose-600">
                                {formatNumber(kpi.allocatedExpense)}
                              </td>
                              <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                                kpi.operatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'
                              }`}>
                                {formatNumber(kpi.operatingProfit)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono">
                                {kpi.isSupportTeam ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    순수 지원
                                  </span>
                                ) : (
                                  <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                                    kpi.operatingProfit >= 0 ? 'bg-[#E6F7F4] text-[#00AE95]' : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {formatPercent(kpi.profitMargin)}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                                {kpi.isSupportTeam ? <span className="text-slate-400 font-normal">-</span> : formatNumber(kpi.visitorCount)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-[#00AE95]">
                                {kpi.isSupportTeam ? <span className="text-slate-400 font-normal">-</span> : formatNumber(kpi.spendPerGuest)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                                {kpi.isSupportTeam ? <span className="text-slate-400 font-normal">-</span> : formatPercent(kpi.utilizationRate, 2)}
                              </td>
                            </tr>

                            {/* 세부 영업장 드릴다운 행 */}
                            {isExpanded && venues.map((venue, vIdx) => {
                              const venueSpend = venue.visitors > 0 ? Math.round(venue.revenue / venue.visitors) : 0;
                              const venueUtil = totalRoomGuests > 0 ? (venue.visitors / totalRoomGuests) * 100 : 0;
                              return (
                                <tr key={`v_${vIdx}`} className="bg-slate-50/50 hover:bg-slate-50 transition-colors text-2xs">
                                  <td className="py-2.5 px-4 pl-10 text-slate-600 font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    <span>{venue.name}</span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-800">
                                    {formatNumber(venue.revenue)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                                  <td className="py-2.5 px-4 text-right font-mono font-normal text-slate-600">
                                    {formatNumber(venue.visitors)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-medium text-[#00AE95]">
                                    {formatNumber(venueSpend)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-normal text-slate-600">
                                    {formatPercent(venueUtil, 2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-900 border-t-2 border-[#00AE95]/40 text-white text-xs">
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-white">레져본부 전체 합계</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#00AE95] text-sm">{formatNumber(totalLeisureRevenue)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-300">{formatNumber(totalAllocatedExpense)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">{formatNumber(totalOperatingProfit)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100">{formatPercent(totalProfitMargin)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100">{formatNumber(totalLeisureVisitors)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#00AE95]">
                          {formatNumber(totalLeisureVisitors > 0 ? Math.round(totalLeisureRevenue / totalLeisureVisitors) : 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100">
                          {formatPercent(totalRoomGuests > 0 ? (totalLeisureVisitors / totalRoomGuests) * 100 : 0, 2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* SLIDE 03: 12개 세부 영업장 계층형 실적 원장                 */}
          {/* ========================================================== */}
          {activeSlide === 3 && (
            <div className="space-y-4">
              <HierarchicalRowspanTable rows={gridRows} />
            </div>
          )}

          {/* ========================================================== */}
          {/* SLIDE 04: 31일 일별 실시간 순매출 추이                       */}
          {/* ========================================================== */}
          {activeSlide === 4 && (
            <div className="space-y-4">
              <MonthlyPnLTrendChart data={dailyTrends} />
            </div>
          )}

          {/* 슬라이드 하단 푸터 */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-2xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">벨포레 레져본부</span>
              <span>•</span>
              <span>사내 보고용</span>
            </div>
            <div className="text-center font-medium">
              출처: 벨포레 정산 원장 (부가가치세 제외)
            </div>
            <div className="font-mono font-bold text-slate-600">
              0{activeSlide} / 04
            </div>
          </div>
        </div>
      </div>

      {/* 구글 슬라이드 출력 완료 알림 */}
      {slidesExportSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-[#00AE95]/20 text-[#00AE95] flex items-center justify-center font-bold shrink-0">
            <Presentation size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#00AE95]" />
              <span>슬라이드 파일 생성 완료</span>
            </div>
            <p className="text-2xs text-slate-400">
              {slidesExportSuccess} 다운로드가 완료되었습니다.
            </p>
          </div>
          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-[#00AE95] hover:bg-[#009681] text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            구글 드라이브 열기 ↗
          </a>
        </div>
      )}
    </div>
  );
}
