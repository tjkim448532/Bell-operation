"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Presentation,
  Building2,
  Calculator,
  HelpCircle,
  Info,
  Sparkles 
} from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import Dashboard3DPieChart, { PieChartItem } from '@/components/Dashboard3DPieChart';
import { HierarchicalRow } from '@/components/HierarchicalRowspanTable';
import MonthlyRevenueExpenseAccordion from '@/components/MonthlyRevenueExpenseAccordion';
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

function LeisureDashboardContent() {
  const { startDate, endDate, isMounted } = useDateFilter();
  const searchParams = useSearchParams();
  const slideParam = searchParams.get('slide');

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
  const [activeSlide, setActiveSlide] = useState<number>(() => {
    if (slideParam) {
      const parsed = parseInt(slideParam, 10);
      if (parsed >= 1 && parsed <= 3) return parsed;
    }
    return 1;
  });
  const [isPresentMode, setIsPresentMode] = useState<boolean>(false);

  // URL query param ?slide=1|2|3 연동
  useEffect(() => {
    if (slideParam) {
      const parsed = parseInt(slideParam, 10);
      if (parsed >= 1 && parsed <= 3) {
        setActiveSlide(parsed);
      }
    }
  }, [slideParam]);

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
        const currentKstMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }).substring(0, 7);
        const todayKST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
        const yearMonth = startDate ? startDate.substring(0, 7) : currentKstMonth;
        const queryDate = endDate || (startDate ? startDate : todayKST);

        const perfQuery = (startDate && endDate)
          ? `startDate=${startDate}&endDate=${endDate}`
          : `date=${queryDate}`;

        const [revRes, expRes, perfRes] = await Promise.all([
          fetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`).catch(() => null),
          fetch(`/api/expenses/monthly?startDate=${startDate}&endDate=${endDate}&yearMonth=${yearMonth}`).catch(() => null),
          fetch(`/api/performance?${perfQuery}`).catch(() => null)
        ]);

        const revJson = revRes && revRes.ok ? await revRes.json().catch(() => null) : null;
        const expJson = expRes && expRes.ok ? await expRes.json().catch(() => null) : null;

        if (ignore) return;

        if (revJson?.isSleeping || revJson?.details?.includes('심야 절전 운영')) {
          setIsServerSleeping(true);
          setSleepDetails(revJson.details || '');
        } else {
          setIsServerSleeping(false);
        }

        if (revJson && revJson.success) {
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
        } else {
          setTotalRoomGuests(0);
          setGridRows([]);
          setRawPartsData([]);
          setDailyTrends([]);
          setRawExpenses([]);
          setAudit(null);
          setAllocationsMap(new Map());
          setPartKPIs([]);
        }

        if (perfRes && perfRes.ok) {
          const perfJson = await perfRes.json().catch(() => null);
          if (perfJson && perfJson.success && perfJson.data) {
            setPerformanceTableData(perfJson.data);
          } else {
            setPerformanceTableData(null);
          }
        } else {
          setPerformanceTableData(null);
        }
      } catch (err) {
        console.error('Failed to load leisure dashboard data:', err);
        if (!ignore) {
          setTotalRoomGuests(0);
          setGridRows([]);
          setRawPartsData([]);
          setDailyTrends([]);
          setRawExpenses([]);
          setAudit(null);
          setAllocationsMap(new Map());
          setPartKPIs([]);
          setPerformanceTableData(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchAllData();
    return () => { ignore = true; };
  }, [startDate, endDate, isMounted]);

  // 다중 월(누계) 조회 여부 판별
  const isMultiMonth = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate.substring(0, 7) !== endDate.substring(0, 7);
  }, [startDate, endDate]);

  // 대시보드 전체 총합 산출 (The Bible v4.2 NO SLICE SUMMATION: 백엔드 SSOT 완제품 소계 직접 바인딩)
  const divisionSub = performanceTableData?.divisions?.[0]?.divisionSubtotal;
  const officialLeisureRevenue = isMultiMonth
    ? (divisionSub?.ytd?.actual ?? 0)
    : (divisionSub?.mtd?.actual ?? 0);

  const totalLeisureRevenue = officialLeisureRevenue > 0 
    ? officialLeisureRevenue 
    : partKPIs.reduce((sum, p) => sum + p.revenue, 0);

  const totalAllocatedExpense = partKPIs.reduce((sum, p) => sum + p.allocatedExpense, 0);
  const totalOperatingProfit = totalLeisureRevenue - totalAllocatedExpense;
  const totalProfitMargin = totalLeisureRevenue > 0 ? (totalOperatingProfit / totalLeisureRevenue) * 100 : 0;
  const totalLeisureVisitors = partKPIs.reduce((sum, p) => sum + p.visitorCount, 0);
  const penetrationRate = 0; // 가짜 객실 대비 레저 이용률(허위 나눗셈) 원천 배제

  // 1회성 및 특이 대형 비용 집계 (퇴직금, 1회성 공사/선급금 등)
  const specialExpenseInfo = useMemo(() => {
    let severanceTotal = 0;
    let severanceCount = 0;
    const severanceItems: Array<{ amount: number; name: string }> = [];

    let otherOneOffTotal = 0;
    let otherOneOffCount = 0;

    rawExpenses.forEach((r) => {
      if (r.isDepreciation || r.accountName === '감가상각비') return;
      if (r.isOutsourced || r.assignedTeam === '외주') return;

      const amt = r.amount || 0;
      const acct = (r.accountName || '').trim();
      const memo = (r.memo || '').trim();

      if (acct.includes('퇴직') || memo.includes('퇴직')) {
        severanceTotal += amt;
        severanceCount++;
        const nameMatch = memo.match(/([가-힣]{2,4})\s*퇴직/);
        const personName = nameMatch && nameMatch[1] ? nameMatch[1] : '';
        severanceItems.push({ amount: amt, name: personName });
        return;
      }

      if (r.isOneOff || memo.includes('선급금') || memo.includes('보험청구') || memo.includes('화재') || memo.includes('기부금') || memo.includes('미정산금')) {
        otherOneOffTotal += amt;
        otherOneOffCount++;
      }
    });

    severanceItems.sort((a, b) => b.amount - a.amount);
    const topSeveranceNames = severanceItems.map((i) => i.name).filter(Boolean);
    const total = severanceTotal + otherOneOffTotal;

    let subText = '특이/1회성 비용 없음';
    if (total > 0) {
      const parts: string[] = [];
      if (severanceTotal > 0) {
        const namesStr = topSeveranceNames.length > 0
          ? `(${topSeveranceNames.slice(0, 2).join('·')}${topSeveranceNames.length > 2 ? ' 외' : ''})`
          : '';
        parts.push(`퇴직금 ${severanceCount}건${namesStr}`);
      }
      if (otherOneOffTotal > 0) {
        parts.push(`특이·1회성 ${otherOneOffCount}건`);
      }
      subText = parts.join(', ');
    }

    return { total, severanceTotal, otherOneOffTotal, subText };
  }, [rawExpenses]);

  // 기간 라벨 (단월 vs 누계)
  const periodLabel = useMemo(() => {
    if (!startDate || !endDate) {
      const curKst = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
      const [curY, curM] = curKst.split('-');
      return `${curY}년 ${parseInt(curM, 10)}월`;
    }
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
    const periodStr = isMultiMonth 
      ? `${startDate}_to_${endDate}` 
      : (startDate ? startDate.substring(0, 7) : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }).substring(0, 7));
    exportLeisureDashboardToExcel({
      targetPeriod: periodStr,
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
    { id: 3, num: '03', title: '월별 실적 추이' },
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
                  {activeSlide === 3 && '2026년 월별 매출·비용 및 손익 종합'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {activeSlide === 1 && '미디어아트센터 · 목장 · 액티비티 · 디지털지원 직영 부서 매출, 비용 안분 및 손익 결산 (외주 제외)'}
                {activeSlide === 2 && '파트별 인건비·복리후생비(복지비) 비교 및 세부 영업장별 실제 비용 원장'}
                {activeSlide === 3 && '1월부터 당월까지 레져본부 및 모든 영업장 부분별 월별 실적 아코디언 조회'}
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

              {/* 4 Core High-Impact KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* 4. 주요 1회성·특이비용 */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group space-y-2 border border-slate-200/80">
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">
                      04. 주요 1회성·특이비용
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <Sparkles size={18} />
                    </div>
                  </div>
                  <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight relative z-10 ${
                    specialExpenseInfo.total > 0 ? 'text-purple-600' : 'text-slate-400'
                  }`}>
                    {formatNumber(specialExpenseInfo.total)}
                  </div>
                  <p className="text-2xs text-slate-500 font-medium relative z-10 truncate" title={specialExpenseInfo.subText}>
                    {specialExpenseInfo.subText}
                  </p>
                </div>
              </div>

              {/* 직관적 손익 공식 및 산출 기준 안내 배너 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-50 border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#00AE95] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                      <Calculator size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <span>레져본부 실질 수익(영업손익) 공식 체계</span>
                        <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-[#E6F7F4] text-[#00826F] border border-[#00AE95]/20">
                          SSOT 확정 산식
                        </span>
                      </h4>
                      <p className="text-2xs text-slate-500 font-medium">
                        순매출에서 부서 고유 직접비용과 본부 공통비 안분액을 차감하여 레저본부의 순수 운영 수익을 산출합니다.
                      </p>
                    </div>
                  </div>

                  {/* 산식 수치 박스 */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      ① 순매출 {formatNumber(totalLeisureRevenue)}원
                    </span>
                    <span className="text-slate-400 font-sans font-black">－</span>
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 shadow-2xs">
                      ② 총비용 {formatNumber(totalAllocatedExpense)}원
                    </span>
                    <span className="text-slate-400 font-sans font-black">＝</span>
                    <span className={`px-3 py-1.5 rounded-xl shadow-2xs text-white ${
                      totalOperatingProfit >= 0 ? 'bg-[#00AE95]' : 'bg-rose-600'
                    }`}>
                      ③ 영업손익 {formatNumber(totalOperatingProfit)}원 ({formatPercent(totalProfitMargin)})
                    </span>
                  </div>
                </div>

                {/* 세부 기준 3대 원칙 칩 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-2xs text-slate-600 font-medium">
                  <div className="flex items-start gap-1.5 bg-white/70 p-2 rounded-xl border border-slate-100">
                    <CheckCircle2 size={13} className="text-[#00AE95] shrink-0 mt-0.5" />
                    <span><strong>순매출 기준:</strong> 부가세(10%) 제외 실질 공급가액 집계</span>
                  </div>
                  <div className="flex items-start gap-1.5 bg-white/70 p-2 rounded-xl border border-slate-100">
                    <CheckCircle2 size={13} className="text-[#00AE95] shrink-0 mt-0.5" />
                    <span><strong>외주·감가 제외:</strong> 외주(놀이동산) 및 비현금성 감가상각비 제외</span>
                  </div>
                  <div className="flex items-start gap-1.5 bg-white/70 p-2 rounded-xl border border-slate-100">
                    <CheckCircle2 size={13} className="text-[#00AE95] shrink-0 mt-0.5" />
                    <span><strong>디지털지원 투입:</strong> 전사 IT 인프라 지원비용 100% 정상 차감</span>
                  </div>
                </div>
              </div>

              {/* 4대 직영 부서별 실시간 손익 기여표 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      <Building2 size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                        4대 직영 부서별 실시간 손익 기여 현황
                      </h3>
                      <p className="text-2xs text-slate-400">
                        부서별 순매출, 직접비용, 공통비 안분액 및 최종 영업손익(수익) 1:1 대조
                      </p>
                    </div>
                  </div>
                  <div className="text-2xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                    기준 기간: {periodLabel}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 text-3xs uppercase tracking-wider">
                        <th className="py-2.5 px-4">직영 부서명</th>
                        <th className="py-2.5 px-3 text-right">순매출액 (①)</th>
                        <th className="py-2.5 px-3 text-right">직접비용 (A)</th>
                        <th className="py-2.5 px-3 text-right">공통비 배분 (B)</th>
                        <th className="py-2.5 px-3 text-right">분배 총비용 (②=A+B)</th>
                        <th className="py-2.5 px-3 text-right">영업손익 (③=①-②)</th>
                        <th className="py-2.5 px-3 text-right">영업이익률</th>
                        <th className="py-2.5 px-4 text-center">수익 기여 상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {partKPIs.map((part) => {
                        const isProfit = part.operatingProfit > 0;
                        const isLoss = part.operatingProfit < 0;
                        return (
                          <tr key={part.partName} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: getPartColor(part.partName) }} 
                              />
                              <span>{part.partName}</span>
                              {part.isSupportTeam && (
                                <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                                  순수 지원
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                              {formatNumber(part.revenue)}원
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {formatNumber(part.directExpense)}원
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">
                              {part.commonExpense > 0 ? `${formatNumber(part.commonExpense)}원` : '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                              {formatNumber(part.allocatedExpense)}원
                            </td>
                            <td className={`py-3 px-3 text-right font-mono font-black text-sm ${
                              isProfit ? 'text-[#00AE95]' : isLoss ? 'text-rose-600' : 'text-slate-600'
                            }`}>
                              {isProfit ? '+' : ''}{formatNumber(part.operatingProfit)}원
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold">
                              {part.isSupportTeam ? (
                                <span className="text-slate-400 font-normal">-</span>
                              ) : (
                                <span className={isProfit ? 'text-[#00AE95]' : isLoss ? 'text-rose-600' : 'text-slate-600'}>
                                  {formatPercent(part.profitMargin)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {part.isSupportTeam ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  전사 IT 및 본부공통 지원
                                </span>
                              ) : isProfit ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-[#E6F7F4] text-[#00826F] border border-[#00AE95]/30">
                                  ● 흑자 기여 부서
                                </span>
                              ) : isLoss ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                  ▲ 적자 운영 (수익 보강)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-slate-100 text-slate-600">
                                  손익분기 (BEP)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-800">
                        <td className="py-3.5 px-4 text-slate-900">
                          레저본부 직영 종합 합계
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900">
                          {formatNumber(totalLeisureRevenue)}원
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                          {formatNumber(partKPIs.reduce((sum, p) => sum + p.directExpense, 0))}원
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                          {formatNumber(partKPIs.reduce((sum, p) => sum + p.commonExpense, 0))}원
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-black text-rose-600">
                          {formatNumber(totalAllocatedExpense)}원
                        </td>
                        <td className={`py-3.5 px-3 text-right font-mono font-black text-base ${
                          totalOperatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'
                        }`}>
                          {totalOperatingProfit >= 0 ? '+' : ''}{formatNumber(totalOperatingProfit)}원
                        </td>
                        <td className={`py-3.5 px-3 text-right font-mono font-black ${
                          totalOperatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'
                        }`}>
                          {formatPercent(totalProfitMargin)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-3xs font-black ${
                            totalOperatingProfit >= 0 
                              ? 'bg-[#00AE95] text-white shadow-2xs' 
                              : 'bg-rose-600 text-white shadow-2xs'
                          }`}>
                            {totalOperatingProfit >= 0 ? '레저본부 총흑자' : '레저본부 총적자'}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
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
                  <PerformanceTable data={performanceTableData} periodLabel={periodLabel} />
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
          {/* TAB 03: 월별 실적 추이 (아코디언 매출 & 비용)                */}
          {/* ========================================================== */}
          {activeSlide === 3 && (
            <div className="space-y-4">
              <MonthlyRevenueExpenseAccordion />
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

export default function LeisureDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#00AE95]" />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">레져본부 실적 대시보드 로딩 중...</p>
        </div>
      </div>
    }>
      <LeisureDashboardContent />
    </Suspense>
  );
}
