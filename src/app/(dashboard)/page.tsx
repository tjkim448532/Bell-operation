"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Loader2,
  CheckCircle2, 
  CreditCard, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  Maximize2, 
  Minimize2, 
  Presentation 
} from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import Dashboard3DPieChart, { PieChartItem } from '@/components/Dashboard3DPieChart';
import { HierarchicalRow } from '@/components/HierarchicalRowspanTable';
import MonthlyPnLTrendChart from '@/components/MonthlyPnLTrendChart';
import PerformanceTable, { TableData } from '@/components/PerformanceTable';
import DetailedExpenseReport from '@/components/DetailedExpenseReport';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { 
  allocateExpenses, 
  calculatePartKPIs, 
  LeisurePartKPISummary, 
  RawExpenseRow, 
  AllocatedExpenseResult,
  ValidationMasterReport 
} from '@/lib/financeEngine';
import { exportLeisureDashboardToExcel } from '@/lib/excelExport';
import { exportDashboardToSlides } from '@/lib/exportToSlides';
import ServerSleepNotice from '@/components/ServerSleepNotice';

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
  const [rawExpenses, setRawExpenses] = useState<RawExpenseRow[]>([]);
  const [allocationsMap, setAllocationsMap] = useState<Map<string, AllocatedExpenseResult>>(new Map());
  const [isServerSleeping, setIsServerSleeping] = useState(false);
  const [sleepDetails, setSleepDetails] = useState('');

  // 3대 핵심 탭 네비게이션 상태 (1: 경영 실적 & 손익 총괄, 2: 부서·영업장별 상세 비용, 3: 일별 매출 추이)
  const [activeSlide, setActiveSlide] = useState<number>(1);
  const [isPresentMode, setIsPresentMode] = useState<boolean>(false);

  // 키보드 방향키 슬라이드 전환 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setActiveSlide((prev) => (prev < 3 ? prev + 1 : 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setActiveSlide((prev) => (prev > 1 ? prev - 1 : 3));
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
          fetch(`/api/expenses/monthly?startDate=${startDate}&endDate=${endDate}&yearMonth=${yearMonth}`),
          fetch(`/api/performance?date=${queryDate}`).catch(() => null)
        ]);

        const revJson = await revRes.json();
        const expJson = await expRes.json();

        if (ignore) return;

        if (revJson.isSleeping || revJson.details?.includes('심야 절전 운영')) {
          setIsServerSleeping(true);
          setSleepDetails(revJson.details || '');
        } else {
          setIsServerSleeping(false);
        }

        if (revJson.success) {
          const roomGuests = revJson.totalRoomCap || 0;
          setTotalRoomGuests(roomGuests);
          setGridRows(revJson.gridRows || []);
          setRawPartsData(revJson.parts || []);
          setDailyTrends(revJson.dailyTrends || []);

          const rawExpenses: RawExpenseRow[] = expJson.expenses || [];
          const partMetrics = revJson.parts || [];

          setRawExpenses(rawExpenses);

          // 비용 안분 및 검증마스터 실행
          const { allocations, audit: auditReport } = allocateExpenses(rawExpenses, partMetrics);
          setAudit(auditReport);
          setAllocationsMap(allocations);

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

  // 다중 월(누계) 조회 여부 판별
  const isMultiMonth = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate.substring(0, 7) !== endDate.substring(0, 7);
  }, [startDate, endDate]);

  // 기간 라벨 (단월 vs 누계)
  const periodLabel = useMemo(() => {
    if (!startDate || !endDate) return '2026년 8월';
    const sYear = startDate.substring(0, 4);
    const sMonth = parseInt(startDate.substring(5, 7), 10);
    const eYear = endDate.substring(0, 4);
    const eMonth = parseInt(endDate.substring(5, 7), 10);

    if (sYear === eYear) {
      if (sMonth === eMonth) {
        return `${sYear}년 ${sMonth}월`;
      }
      return `${sYear}년 ${sMonth}~${eMonth}월 누계`;
    }
    return `${sYear}년 ${sMonth}월 ~ ${eYear}년 ${eMonth}월 누계`;
  }, [startDate, endDate]);

  // 전년 대비 성장률 (단월이면 MTD 성장률, 누계이면 YTD 성장률)
  const displayGrowth = useMemo(() => {
    const subtotal = performanceTableData?.divisions?.[0]?.divisionSubtotal;
    if (!subtotal) return null;
    if (isMultiMonth && typeof subtotal.ytd?.growth === 'number') {
      return {
        label: '올해 누계(YTD) 전년 대비',
        growth: subtotal.ytd.growth,
      };
    }
    if (typeof subtotal.mtd?.growth === 'number') {
      return {
        label: '전년 대비',
        growth: subtotal.mtd.growth,
      };
    }
    return null;
  }, [performanceTableData, isMultiMonth]);

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

  const handleExportExcel = () => {
    exportLeisureDashboardToExcel({
      targetPeriod: startDate ? startDate.substring(0, 7) : '2026-08',
      partKPIs,
      gridRows,
      audit,
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
        rawExpenses,
        allocations: allocationsMap,
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
    { id: 1, num: '01', title: '경영 실적 & 손익 총괄' },
    { id: 2, num: '02', title: '부서·영업장별 상세 비용' },
    { id: 3, num: '03', title: '일별 매출 추이' },
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
        <div className="w-full bg-[#00AE95] rounded-b-2xl relative overflow-hidden text-white py-4 px-6 sm:px-8 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white text-3xs font-bold tracking-wider">
                  벨포레 리조트 · 레져본부
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>벨포레 레져본부 경영 실적 및 손익 대시보드</span>
              </h1>
              <p className="text-xs text-white/90 mt-0.5">
                레져본부 직영 4대 부서 실적 결산 및 비용 안분 현황 (외주 제외)
              </p>
            </div>

            {/* 도구 모음 */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <GlobalDateSelector />
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer backdrop-blur-xs shadow-xs"
                title="실적 엑셀 파일 다운로드"
              >
                <Download size={14} />
                <span>엑셀 다운로드</span>
              </button>
              <button
                onClick={() => setIsPresentMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[#00AE95] hover:bg-slate-50 text-xs font-bold shadow-sm transition-all cursor-pointer"
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
                onClick={() => setActiveSlide((prev) => (prev > 1 ? prev - 1 : 3))}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                title="이전 (←)"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-2xs font-bold font-mono px-2 text-slate-600">
                0{activeSlide} / 03
              </span>
              <button
                onClick={() => setActiveSlide((prev) => (prev < 3 ? prev + 1 : 1))}
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

        {/* 심야 절전 운영 안내 배너 (20:00 ~ 08:00) */}
        {isServerSleeping && (
          <ServerSleepNotice details={sleepDetails} className="mb-6" />
        )}

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
                  {activeSlide === 1 && '레져본부 경영 실적 및 손익 총괄'}
                  {activeSlide === 2 && '부서 및 세부 영업장별 상세 비용'}
                  {activeSlide === 3 && '일별 실시간 순매출 추이'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {activeSlide === 1 && '미디어아트센터 · 목장 · 액티비티 · 디지털지원 직영 부서 매출, 비용 안분 및 손익 결산 (외주 제외)'}
                {activeSlide === 2 && '파트별 인건비·복리후생비(복지비) 비교 및 세부 영업장별 실제 비용 원장'}
                {activeSlide === 3 && '조회 기간 내 일자별 순매출 추이 (부가가치세 제외)'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-slate-800 leading-none">
                  0{activeSlide} <span className="text-xs text-slate-400 font-normal">/ 03</span>
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* TAB 01: 경영 실적 & 손익 총괄 (요약 + KPI + 3D차트 + 3-Depth) */}
          {/* ========================================================== */}
          {activeSlide === 1 && (
            <div className="space-y-6">
              {/* 담백한 실적 요약 카드 */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#E6F7F4]/70 text-slate-800 border-l-4 border-l-[#00AE95] border border-[#00AE95]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00826F]">
                    주요 실적 요약 (외주업체 제외 직영 기준)
                  </span>
                  {displayGrowth && (
                    <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-[#00AE95] text-white shadow-2xs">
                      {displayGrowth.label} {displayGrowth.growth > 0 ? `+${displayGrowth.growth}%` : `${displayGrowth.growth}%`}
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-normal text-slate-700 leading-relaxed">
                  <strong className="text-[#00826F] font-bold">{periodLabel}</strong> 레져본부(직영) 총 순매출은 <strong className="text-[#00826F] font-bold">{formatNumber(totalLeisureRevenue)}원</strong>이며, 
                  리조트 전체 투숙객은 <strong className="text-slate-900 font-bold">{formatNumber(totalRoomGuests)}명</strong>이었습니다.
                </p>
              </div>

              {/* 3 Core High-Impact KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. 총 순매출 */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group space-y-2 border border-slate-200/80">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">
                      01. {isMultiMonth ? '레져 누계 총 순매출' : '레져 총 순매출'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center font-bold">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-800 relative z-10">
                    {formatNumber(totalLeisureRevenue)}
                  </div>
                  <p className="text-2xs text-slate-400 font-medium relative z-10">
                    {isMultiMonth ? `${periodLabel} 실적 (부가가치세 제외)` : '부가가치세(10%) 제외'}
                  </p>
                </div>

                {/* 2. 분배 총비용 */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group space-y-2 border border-slate-200/80">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">
                      02. {isMultiMonth ? '분배 누계 총비용' : '분배 총비용'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <CreditCard size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-800 relative z-10">
                    {formatNumber(totalAllocatedExpense)}
                  </div>
                  <p className="text-2xs text-slate-400 font-medium relative z-10">
                    {isMultiMonth ? `${periodLabel} 직접비용 + 공통비` : '직접비용 + 공통비 배부액'}
                  </p>
                </div>

                {/* 3. 영업 손익 */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group space-y-2 border border-slate-200/80">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">
                      03. {isMultiMonth ? '누계 영업 손익' : '영업 손익'}
                    </span>
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
                    <span>{isMultiMonth ? '누계 영업이익률:' : '영업이익률:'}</span>
                    <strong className={`font-mono ${totalOperatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                      {formatPercent(totalProfitMargin)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3D 파이 차트 2종 (매출 비중 & 비용 배분 비중) */}
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
          {/* TAB 02: 부서 및 세부 영업장별 상세 비용 (인건비/복지비)      */}
          {/* ========================================================== */}
          {activeSlide === 2 && (
            <div className="space-y-4">
              <DetailedExpenseReport 
                expenses={rawExpenses} 
                allocations={allocationsMap} 
                partKPIs={partKPIs} 
              />
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 03: 일별 실시간 순매출 추이                             */}
          {/* ========================================================== */}
          {activeSlide === 3 && (
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
              0{activeSlide} / 03
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
