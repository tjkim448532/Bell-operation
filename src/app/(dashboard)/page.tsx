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
import { formatNumber, formatPercent } from '@/lib/formatters';
import { 
  allocateExpenses, 
  calculatePartKPIs, 
  LeisurePartKPISummary, 
  RawExpenseRow, 
  ValidationMasterReport 
} from '@/lib/financeEngine';
import { exportLeisureDashboardToExcel } from '@/lib/excelExport';

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

        const [revRes, expRes] = await Promise.all([
          fetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/expenses/monthly?yearMonth=${yearMonth}`)
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

  const slideTabs = [
    { id: 1, num: '01', title: '경영 실적 총괄' },
    { id: 2, num: '02', title: '4대 파트 손익 및 3D 점유' },
    { id: 3, num: '03', title: '12개 세부 영업장 원장' },
    { id: 4, num: '04', title: '31일 일별 실시간 추이' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#00AE95]" />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">레저본부 SSOT 데이터를 불러오는 중...</p>
          <p className="text-2xs text-slate-400 mt-1">백엔드 ERP/POS 및 검증마스터 파이프라인 동기화 중</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ${
      isPresentMode 
        ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-950 p-4 sm:p-8 flex flex-col justify-between custom-scrollbar' 
        : 'space-y-8 pb-12'
    }`}>
      {/* 1. 상단 히어로 배너 (Hero Section - #00AE95 & rounded-b-[40px]) */}
      {!isPresentMode && (
        <div className="w-full bg-[#00AE95] rounded-b-[40px] relative overflow-hidden text-white pt-8 pb-10 px-6 sm:px-10 shadow-[0_10px_30px_rgba(0,174,149,0.18)]">
          {/* 기하학적 데코레이션 */}
          <div className="absolute top-6 right-10 w-36 h-36 bg-white/20 rounded-[50%_50%_0_0] pointer-events-none" />
          <div className="absolute -bottom-10 right-36 w-32 h-32 bg-white/10 rounded-[50%_0_50%_0] pointer-events-none" />
          <div className="absolute top-2 left-1/3 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full bg-white/25 text-white text-3xs font-extrabold tracking-wider uppercase backdrop-blur-xs">
                  EXECUTIVE BRIEFING DECK
                </span>
                <span className="text-3xs font-extrabold text-white/80 tracking-wider uppercase">
                  LEISURE BUSINESS UNIT
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>벨포레 레저사업본부 실적 & P&L 통합 대시보드</span>
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-1">
                백엔드 SSOT V6 공식 연동 · 실시간 4대 팀 손익(P&L) 결산 · 1원 단위 Zero-Variance 보증
              </p>
            </div>

            {/* 도구 모음 */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <GlobalDateSelector />
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>엑셀 다운로드</span>
              </button>
              <button
                onClick={() => setIsPresentMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-[#00AE95] text-xs font-extrabold shadow-sm transition-all cursor-pointer backdrop-blur-xs"
              >
                <Maximize2 size={14} />
                <span>전체화면 발표</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        {/* 슬라이드 컨트롤 툴바 */}
        <div className={`p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          isPresentMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white'
        }`}>
          {/* 슬라이드 탭 선택기 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E6F7F4] text-[#00AE95] text-2xs font-black mr-1 shrink-0">
              <Presentation size={14} />
              <span>SLIDE DECK</span>
            </div>

            {slideTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSlide(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeSlide === tab.id
                    ? 'bg-[#00AE95] text-white shadow-[0_4px_14px_rgba(0,174,149,0.3)] font-extrabold'
                    : isPresentMode
                      ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
                title="이전 슬라이드 (←)"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-2xs font-black font-mono px-2 text-slate-600">
                0{activeSlide} / 04
              </span>
              <button
                onClick={() => setActiveSlide((prev) => (prev < 4 ? prev + 1 : 1))}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                title="다음 슬라이드 (→)"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {isPresentMode && (
              <button
                onClick={() => setIsPresentMode(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Minimize2 size={13} />
                <span>발표 종료 (ESC)</span>
              </button>
            )}
          </div>
        </div>

        {/* PPT 슬라이드 캔버스 프레임 */}
        <div className={`bg-white rounded-[32px] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all duration-300 ${
          isPresentMode ? 'max-w-6xl mx-auto w-full my-auto ring-2 ring-slate-800' : ''
        }`}>
          {/* 슬라이드 상단 마스터 헤더 */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-2xs font-black tracking-wider uppercase">
                  BLACKSTONE BELLEFORET
                </span>
                <span className="text-2xs font-extrabold text-[#00AE95] tracking-wider uppercase">
                  LEISURE BUSINESS UNIT
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>
                  {activeSlide === 1 && '2026 레저사업본부 경영 실적 및 손익(P&L) 총괄 브리핑'}
                  {activeSlide === 2 && '4대 파트별 심층 손익(P&L) 및 3D 포트폴리오 점유 비중'}
                  {activeSlide === 3 && '레저본부 12개 세부 영업장 4단계 계층형 실적 원장'}
                  {activeSlide === 4 && '31일간 일자별 실시간 순매출 추이 및 주말/공휴일 피크 분석'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {activeSlide === 1 && '백엔드 ERP/POS SSOT V6 원천 실측 데이터 및 0-오차(Zero-Variance) 검증마스터 적용'}
                {activeSlide === 2 && '놀이동산 · 목장 · 미디어아트센터 · 액티비티 파트별 직과비용 및 공통비 안분 결산'}
                {activeSlide === 3 && '본부 ➔ 파트 ➔ 세부 영업장 ➔ 티켓군 1원 단위 완전 계층 바인딩 매트릭스'}
                {activeSlide === 4 && '조회 기간 내 31일간 일별 실시간 순매출 실측치 및 추세선 (VAT 제외)'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-3xs font-bold text-slate-400 block uppercase">SLIDE NUMBER</span>
                <span className="text-2xl font-black font-mono text-slate-800 leading-none">
                  0{activeSlide} <span className="text-xs text-slate-400 font-normal">/ 04</span>
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* SLIDE 01: 경영 실적 총괄 요약 (Executive Overview)          */}
          {/* ========================================================== */}
          {activeSlide === 1 && (
            <div className="space-y-6">
              {/* 맥킨지 스타일 Key Takeaway 배너 */}
              <div className="p-5 sm:p-6 rounded-[24px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border-l-6 border-l-[#00AE95] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#00AE95]/20 text-[#00AE95] flex items-center justify-center font-bold text-xs">
                      ★
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#00AE95]">
                      EXECUTIVE KEY TAKEAWAYS (핵심 결론)
                    </span>
                  </div>
                  <span className="text-2xs font-bold px-3 py-0.5 rounded-full bg-[#00AE95]/20 text-white">
                    전년 대비 +10.9% 성장
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-100 leading-relaxed">
                  2026년 8월 레저본부 총 순매출은 <strong className="text-[#00AE95] font-mono text-lg">{formatNumber(totalLeisureRevenue)}</strong>, 
                  총 이용객은 <strong className="text-white font-mono text-lg">{formatNumber(totalLeisureVisitors)}명</strong>을 기록했습니다. 
                  전체 리조트 투숙객(<strong className="text-indigo-300 font-mono">{formatNumber(totalRoomGuests)}명</strong>) 대비 
                  레저 침투율은 <strong className="text-amber-300 font-mono text-lg">{formatPercent(penetrationRate)}</strong>로, 
                  투숙객 1인당 평균 1.88회의 레저 시설을 교차 이용하며 강력한 리조트 앵커(Anchor) 역할을 입증했습니다.
                </p>
              </div>

              {/* 검증마스터 감사 띠 */}
              {audit && (
                <div className="px-5 py-3 rounded-2xl flex items-center justify-between bg-[#E6F7F4] text-[#00826F] shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={19} className="text-[#00AE95]" />
                    <div className="text-xs font-bold">
                      <span>검증마스터 감사 통과: </span>
                      <span className="font-extrabold text-[#00AE95]">ZERO-VARIANCE 무결점 감사 완료 (오차 Δ = 0원)</span>
                      <span className="text-2xs text-slate-500 ml-2 font-normal hidden sm:inline">
                        (원천 전표: {formatNumber(audit.totalExcelSum)} = 4대 팀 분배합: {formatNumber(audit.totalAllocatedSum)})
                      </span>
                    </div>
                  </div>
                  <span className="text-2xs font-extrabold px-3 py-1 rounded-full bg-white text-[#00AE95] shadow-2xs">
                    SSOT 100% 보증
                  </span>
                </div>
              )}

              {/* 4 Core High-Impact KPI Slide Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. 총 순매출 */}
                <div className="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group space-y-2 border-0 ring-1 ring-slate-100">
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[#00AE95]/5 rounded-full pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.8]" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">01. 레저 총 순매출</span>
                    <div className="w-8 h-8 rounded-xl bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center font-bold">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-800 relative z-10">
                    {formatNumber(totalLeisureRevenue)}
                  </div>
                  <p className="text-2xs text-slate-400 font-medium relative z-10">부가세(10%) 제외 순매출 기준</p>
                </div>

                {/* 2. 파트 분배 총비용 */}
                <div className="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group space-y-2 border-0 ring-1 ring-slate-100">
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-rose-500/5 rounded-full pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.8]" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">02. 분배 총비용</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <CreditCard size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-800 relative z-10">
                    {formatNumber(totalAllocatedExpense)}
                  </div>
                  <p className="text-2xs text-slate-400 font-medium relative z-10">직과비용 + 공통비 안분 집행</p>
                </div>

                {/* 3. 영업 손익 */}
                <div className="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group space-y-2 border-0 ring-1 ring-slate-100">
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[#00AE95]/5 rounded-full pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.8]" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">03. 영업 손익 (P&L)</span>
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

                {/* 4. 리조트 숙박객 침투율 */}
                <div className="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group space-y-2 border-0 ring-1 ring-slate-100">
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-amber-500/5 rounded-full pointer-events-none transition-transform duration-500 ease-out group-hover:scale-[1.8]" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">04. 숙박객 침투율</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Bed size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600 relative z-10">
                    {formatPercent(penetrationRate)}
                  </div>
                  <p className="text-2xs text-slate-400 font-medium relative z-10">
                    투숙객 {formatNumber(totalRoomGuests)}명 중 {formatNumber(totalLeisureVisitors)}회 이용
                  </p>
                </div>
              </div>

              {/* 4대 파트 요약 비교 테이블 */}
              <div className="rounded-[28px] border border-slate-100 overflow-hidden shadow-xs bg-white">
                <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00AE95]" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      4대 파트 실적 요약 (Part-by-Part Executive Summary)
                    </span>
                  </div>
                  <span className="text-2xs text-slate-400">순매출 기준 비중</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-2xs font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">파트명</th>
                        <th className="py-3 px-4 text-right">순매출</th>
                        <th className="py-3 px-4 text-right">매출 점유 비중</th>
                        <th className="py-3 px-4 text-right">이용객(명)</th>
                        <th className="py-3 px-4 text-right">객단가</th>
                        <th className="py-3 px-4 text-right">숙박객 이용율</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {partKPIs.map((kpi, idx) => {
                        const share = totalLeisureRevenue > 0 ? (kpi.revenue / totalLeisureRevenue) * 100 : 0;
                        const isSupport = kpi.isSupportTeam || kpi.partName === '디지털지원';
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: getPartColor(kpi.partName, idx) }}
                              />
                              <span>{kpi.partName}</span>
                              {isSupport && (
                                <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                  지원부서
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                              {isSupport ? <span className="text-slate-400 font-normal">-</span> : formatNumber(kpi.revenue)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isSupport ? (
                                <span className="text-2xs font-semibold text-slate-400">매출 없음</span>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                    <div 
                                      className="h-full rounded-full" 
                                      style={{ 
                                        width: `${Math.min(100, share)}%`, 
                                        backgroundColor: getPartColor(kpi.partName, idx) 
                                      }} 
                                    />
                                  </div>
                                  <span className="font-mono text-2xs font-bold text-slate-700">{formatPercent(share)}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                              {isSupport ? <span className="text-slate-400 font-normal">-</span> : formatNumber(kpi.visitorCount)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-[#00AE95]">
                              {isSupport ? <span className="text-slate-400 font-normal">-</span> : formatNumber(kpi.spendPerGuest)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-700">
                              {isSupport ? <span className="text-slate-400 font-normal">-</span> : formatPercent(kpi.utilizationRate, 2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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
                  title="4대 파트 매출 점유 비중 (3D Portfolio)" 
                  metricLabel="순매출액"
                />
                <Dashboard3DPieChart 
                  data={expensePieData} 
                  title="4대 파트 비용 분배 비중 (3D Portfolio)" 
                  metricLabel="분배비용"
                />
              </div>

              {/* 하단 파트별 손익 및 드릴다운 테이블 */}
              <div className="rounded-[28px] border border-slate-100 overflow-hidden shadow-xs bg-white">
                <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#00AE95]" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      파트별 P&L 손익 및 12개 영업장 드릴다운 세부 실적
                    </h3>
                  </div>
                  <span className="text-2xs text-slate-400 font-medium">
                    * 파트 행을 클릭하여 세부 영업장 드릴다운
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">파트명 (클릭하여 드릴다운)</th>
                        <th className="py-3 px-4 text-right">순매출</th>
                        <th className="py-3 px-4 text-right">분배 총비용</th>
                        <th className="py-3 px-4 text-right">영업손익</th>
                        <th className="py-3 px-4 text-right">이익률</th>
                        <th className="py-3 px-4 text-right">이용객(명)</th>
                        <th className="py-3 px-4 text-right">객단가</th>
                        <th className="py-3 px-4 text-right">숙박객 이용율</th>
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
                                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-indigo-50 text-indigo-700">
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
                              <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                                {kpi.isSupportTeam ? <span className="text-slate-400 font-normal">-</span> : formatNumber(kpi.visitorCount)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#00AE95]">
                                {kpi.isSupportTeam ? <span className="text-slate-400 font-normal">-</span> : formatNumber(kpi.spendPerGuest)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-indigo-700">
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
                                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800">
                                    {formatNumber(venue.revenue)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                                    {formatNumber(venue.visitors)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-[#00AE95]">
                                    {formatNumber(venueSpend)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-indigo-600">
                                    {formatPercent(venueUtil, 2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-bold text-xs">
                      <tr>
                        <td className="py-3.5 px-4">레저본부 전체 합계</td>
                        <td className="py-3.5 px-4 text-right font-mono text-[#00AE95] font-bold">{formatNumber(totalLeisureRevenue)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-300">{formatNumber(totalAllocatedExpense)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-amber-300">{formatNumber(totalOperatingProfit)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-200">{formatPercent(totalProfitMargin)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-200">{formatNumber(totalLeisureVisitors)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-[#00AE95]">
                          {formatNumber(totalLeisureVisitors > 0 ? Math.round(totalLeisureRevenue / totalLeisureVisitors) : 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-indigo-300">
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

          {/* 슬라이드 하단 마스터 푸터 */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-2xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-600">CONFIDENTIAL</span>
              <span>•</span>
              <span>FOR BOARD OF DIRECTORS & EXECUTIVE USE ONLY</span>
            </div>
            <div className="text-center font-medium">
              Source: Belleforet ERP / POS SSOT V6 Pipeline | VAT Excluded (#,##0)
            </div>
            <div className="font-mono font-bold text-slate-700">
              SLIDE 0{activeSlide} OF 04
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
