"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Layers, 
  RefreshCw, 
  Loader2,
  FolderOpen,
  FolderClosed,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  BarChart3,
  Presentation,
  CheckCircle2
} from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { exportMonthlyPnLToSlides } from '@/lib/exportToSlides';

export interface MonthlyMetric {
  revenue: number;
  expense: number;
  profit: number;
}

export interface MonthlyTrendVenue {
  name: string;
  monthly: Record<string, MonthlyMetric>;
  total: MonthlyMetric;
  subVenues?: MonthlyTrendVenue[];
}

export interface MonthlyTrendDepartment {
  name: string;
  monthly: Record<string, MonthlyMetric>;
  total: MonthlyMetric;
  venues: MonthlyTrendVenue[];
}

export interface MonthlyTrendData {
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
};

export type ViewMode = 'compact' | 'all' | 'revenue' | 'expense' | 'profit';
export type UnitType = 'million' | 'thousand' | 'won';

export default function MonthlyRevenueExpenseAccordion() {
  const [data, setData] = useState<MonthlyTrendData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 아코디언 상태 (1단계 부서)
  const [openDepts, setOpenDepts] = useState<Record<string, boolean>>({
    '미디어아트센터': true,
    '액티비티': true,
    '목장': true,
    '디지털지원': true,
    '외주': false,
  });

  // 하위 세부 비목 아코디언 상태 (2단계 영업장/공통)
  const [openVenues, setOpenVenues] = useState<Record<string, boolean>>({
    '본부공통': true,
  });

  // 보기 모드: 'compact'(매출&비용 한눈에), 'all'(3단 P&L), 'revenue'(매출만), 'expense'(비용만), 'profit'(손익만)
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  // 단위 토글: 'million'(백만원), 'thousand'(천원), 'won'(원)
  const [unit, setUnit] = useState<UnitType>('million');

  // 구글 슬라이드 내보내기 상태
  const [isExportingSlides, setIsExportingSlides] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const handleExportSlides = async () => {
    if (!data) return;
    setIsExportingSlides(true);
    setExportSuccessMsg(null);
    try {
      const fileName = await exportMonthlyPnLToSlides({
        data,
        unit,
        viewMode,
      });
      setExportSuccessMsg(fileName);
      setTimeout(() => setExportSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error('Failed to export slides:', err);
      alert('구글 슬라이드 내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExportingSlides(false);
    }
  };

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

  const toggleVenue = (venueName: string) => {
    setOpenVenues((prev) => ({
      ...prev,
      [venueName]: !prev[venueName],
    }));
  };

  const handleExpandAll = () => {
    if (!data) return;
    const allOpen: Record<string, boolean> = {};
    const allVenuesOpen: Record<string, boolean> = {};
    data.departments.forEach((d) => {
      allOpen[d.name] = true;
      d.venues.forEach((v) => {
        if (v.subVenues && v.subVenues.length > 0) {
          allVenuesOpen[v.name] = true;
        }
      });
    });
    setOpenDepts(allOpen);
    setOpenVenues(allVenuesOpen);
  };

  const handleCollapseAll = () => {
    if (!data) return;
    const allClosed: Record<string, boolean> = {};
    const allVenuesClosed: Record<string, boolean> = {};
    data.departments.forEach((d) => {
      allClosed[d.name] = false;
      d.venues.forEach((v) => {
        if (v.subVenues && v.subVenues.length > 0) {
          allVenuesClosed[v.name] = false;
        }
      });
    });
    setOpenDepts(allClosed);
    setOpenVenues(allVenuesClosed);
  };

  // 단위별 숫자 포맷터
  const formatVal = (val: number, showSign = false): string => {
    if (val === 0) return '-';
    const sign = showSign && val > 0 ? '+' : '';
    if (unit === 'million') {
      const inM = val / 1000000;
      return `${sign}${inM.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    if (unit === 'thousand') {
      const inK = Math.round(val / 1000);
      return `${sign}${formatNumber(inK)}천`;
    }
    return `${sign}${formatNumber(val)}`;
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
          className="px-4 py-2 bg-[#00AE95] text-white text-xs font-bold rounded-xl hover:bg-[#009681] transition-colors cursor-pointer"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { months, monthLabels, grandTotal, departments } = data;

  return (
    <div className="space-y-5">
      {/* 1. 상단 경영진 4대 핵심 요약 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 누적 순매출 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">2026 직영 누적 매출</span>
            <div className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {formatNumber(grandTotal.directTotal.total.revenue)}
            <span className="text-xs font-medium text-slate-400 ml-1">원</span>
          </div>
          <p className="text-2xs text-slate-400">
            {monthLabels[0]} ~ {monthLabels[monthLabels.length - 1]} 누적 실적 (VAT 제외)
          </p>
        </div>

        {/* 누적 직접비용 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">2026 직영 누적 비용</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 tracking-tight">
            {formatNumber(grandTotal.directTotal.total.expense)}
            <span className="text-xs font-medium text-slate-400 ml-1">원</span>
          </div>
          <p className="text-2xs text-slate-400 flex items-center gap-1">
            <span>4대 부서 직접 발생 비용 원장 합계</span>
            <span className="text-amber-600 font-semibold">(감가상각비 제외)</span>
          </p>
        </div>

        {/* 누적 직영 영업이익 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">2026 직영 영업이익</span>
            <div className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${
            grandTotal.directTotal.total.profit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'
          }`}>
            {grandTotal.directTotal.total.profit >= 0 ? '+' : ''}
            {formatNumber(grandTotal.directTotal.total.profit)}
            <span className="text-xs font-medium text-slate-400 ml-1">원</span>
          </div>
          <p className="text-2xs text-[#00826F] font-bold">
            이익률 {grandTotal.directTotal.total.revenue > 0 
              ? formatPercent((grandTotal.directTotal.total.profit / grandTotal.directTotal.total.revenue) * 100) 
              : '0%'}
          </p>
        </div>

        {/* 전사 총합계 (공통/외주 포함) */}
        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">본부 전체 총합계 (공통포함)</span>
            <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${
            grandTotal.allTotal.total.profit >= 0 ? 'text-[#00AE95]' : 'text-slate-800'
          }`}>
            {grandTotal.allTotal.total.profit >= 0 ? '+' : ''}
            {formatNumber(grandTotal.allTotal.total.profit)}
            <span className="text-xs font-medium text-slate-400 ml-1">원</span>
          </div>
          <p className="text-2xs text-slate-500">
            매출 {formatNumber(grandTotal.allTotal.total.revenue)}원 / 비용 {formatNumber(grandTotal.allTotal.total.expense)}원 <span className="text-amber-600 font-semibold">(감가상각비 제외)</span>
          </p>
        </div>
      </div>

      {/* 2. 대화형 월별 아코디언 테이블 프레임 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-7 space-y-4">
        {/* 컨트롤러 툴바: 보기 모드 + 단위 선택기 + 아코디언 조작 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E6F7F4] text-[#00826F] text-2xs font-extrabold tracking-wide">
                2026 연간 P&L 테이블
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-2xs font-extrabold flex items-center gap-1">
                <span>🛡️ 감가상각비 제외 (실지출 기준)</span>
              </span>
              <span className="text-2xs text-slate-400 font-medium">
                {monthLabels[0]} ~ {monthLabels[monthLabels.length - 1]} ({months.length}개월)
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              레저본부 및 세부 영업장별 월별 매출·비용 추이
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 보기 모드 선택기 */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-2xs font-bold text-slate-600">
              <button
                onClick={() => setViewMode('compact')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'compact' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
                title="한 행에서 매출과 비용을 2줄로 동시에 비교"
              >
                매출 & 비용 한눈에
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
                title="매출, 비용, 영업손익을 3단 행으로 상세 비교"
              >
                3단 P&L
              </button>
              <button
                onClick={() => setViewMode('revenue')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'revenue' ? 'bg-white text-[#00826F] shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                매출만
              </button>
              <button
                onClick={() => setViewMode('expense')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'expense' ? 'bg-white text-rose-600 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                비용만
              </button>
              <button
                onClick={() => setViewMode('profit')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'profit' ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                손익만
              </button>
            </div>

            {/* 단위 환산 토글기 */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-2xs font-bold text-slate-600">
              <button
                onClick={() => setUnit('million')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  unit === 'million' ? 'bg-[#00AE95] text-white shadow-2xs' : 'hover:text-slate-900'
                }`}
                title="백만원 단위 표기 (경영진 권장)"
              >
                백만원 (M)
              </button>
              <button
                onClick={() => setUnit('thousand')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  unit === 'thousand' ? 'bg-[#00AE95] text-white shadow-2xs' : 'hover:text-slate-900'
                }`}
                title="천원 단위 표기"
              >
                천원
              </button>
              <button
                onClick={() => setUnit('won')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  unit === 'won' ? 'bg-[#00AE95] text-white shadow-2xs' : 'hover:text-slate-900'
                }`}
                title="원 단위 전체 표기"
              >
                원
              </button>
            </div>

            {/* 아코디언 조작 버튼 */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleExpandAll}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-bold rounded-lg transition-colors cursor-pointer"
                title="모든 세부 영업장 펼치기"
              >
                <FolderOpen size={13} />
                <span className="hidden sm:inline">모두 펼치기</span>
              </button>
              <button
                onClick={handleCollapseAll}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-bold rounded-lg transition-colors cursor-pointer"
                title="모든 세부 영업장 접기"
              >
                <FolderClosed size={13} />
                <span className="hidden sm:inline">모두 접기</span>
              </button>
              <button
                onClick={() => fetchData(true)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="데이터 새로고침"
              >
                <RefreshCw size={14} />
              </button>

              {/* 구글 슬라이드 내보내기 버튼 */}
              <button
                onClick={handleExportSlides}
                disabled={isExportingSlides}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00AE95] hover:bg-[#009681] text-white text-2xs font-bold rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
                title="2026 연간 P&L 테이블 구글 슬라이드/파워포인트 다운로드"
              >
                {isExportingSlides ? <Loader2 size={13} className="animate-spin" /> : <Presentation size={13} />}
                <span>구글 슬라이드로 내보내기</span>
              </button>
            </div>
          </div>
        </div>

        {/* 상단 지침 및 단위 안내 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs text-slate-500 font-medium bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5 flex-wrap">
            <HelpCircle size={13} className="text-amber-500 shrink-0" />
            <span>부가가치세(VAT) 제외 순매출 및 현금 발생 비용 기준</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-3xs border border-amber-300/80">
              ※ 회계상 비현금 감가상각비 제외
            </span>
            <span className="text-slate-400">
              (표기 단위: {unit === 'million' ? '백만원' : unit === 'thousand' ? '천원' : '원'})
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-800" /> 매출
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> 비용
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00AE95]" /> 흑자 손익
            </span>
          </div>
        </div>

        {/* 메인 스프레드시트 테이블 */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-3xs font-extrabold tracking-wider">
                {/* 1열: 부서 및 영업장 (고정 좌측 컬럼, 100% 불투명) */}
                <th className={`${
                  viewMode === 'all' 
                    ? 'w-[230px] min-w-[230px] max-w-[230px] sticky left-0 bg-slate-100 z-30 border-r border-slate-200' 
                    : 'w-[260px] min-w-[260px] max-w-[260px] sticky left-0 bg-slate-100 z-30 border-r-2 border-slate-300 shadow-[3px_0_8px_rgba(0,0,0,0.06)]'
                } px-3 py-3 whitespace-nowrap`}>
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span className="truncate">부서 및 세부 영업장</span>
                    <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">감가 제외</span>
                  </div>
                </th>
                {/* 2열: 구분 (viewMode === 'all'일 때 1열 바로 옆에 고정 고착) */}
                {viewMode === 'all' && (
                  <th className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-30 py-3 px-1 text-center bg-slate-100 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)] text-slate-700 text-3xs font-extrabold whitespace-nowrap">
                    구분
                  </th>
                )}
                {/* 월별 헤더 (1월 ~ 9월...) */}
                {monthLabels.map((label, idx) => (
                  <th key={months[idx]} className="py-3 px-2 text-right min-w-[76px] whitespace-nowrap">
                    {label}
                  </th>
                ))}
                {/* 총합 헤더 */}
                <th className="py-3 px-3 text-right min-w-[95px] bg-[#E6F7F4] text-[#00826F] font-black border-l-2 border-slate-300 whitespace-nowrap">
                  총합 (누적)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {/* ========================================================== */}
              {/* 1. 레저본부 직영 합계 (최상단 요약 강조 행)                */}
              {/* ========================================================== */}
              <tr className="bg-[#E6F7F4] font-bold border-b-2 border-[#00AE95]/40">
                <td 
                  rowSpan={viewMode === 'all' ? 3 : 1}
                  className={`${
                    viewMode === 'all'
                      ? 'w-[230px] min-w-[230px] max-w-[230px] sticky left-0 bg-[#E6F7F4] z-20 border-r border-slate-200'
                      : 'w-[260px] min-w-[260px] max-w-[260px] sticky left-0 bg-[#E6F7F4] z-20 border-r-2 border-slate-300 shadow-[3px_0_8px_rgba(0,0,0,0.06)]'
                  } px-3 py-2.5 align-middle whitespace-nowrap overflow-hidden`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00AE95] shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-slate-900 font-sans truncate">레저본부 직영 합계</span>
                    <span className="text-3xs font-extrabold px-1 py-0.5 rounded bg-[#00AE95] text-white shrink-0">
                      SSOT
                    </span>
                  </div>
                  <div className="text-3xs text-slate-500 font-normal font-sans mt-0.5 truncate" title="4대 직영 부서 (미디어아트센터 · 액티비티 · 목장 · 디지털지원+본부공통)">
                    4대 직영 부서 (미디어 · 액티 · 목장 · 디지털+공통)
                  </div>
                </td>

                {/* compact 모드: 한 칸에 매출과 비용 2줄 요약 */}
                {viewMode === 'compact' ? (
                  <>
                    {months.map((ym) => {
                      const m = grandTotal.directTotal.monthly[ym] || { revenue: 0, expense: 0, profit: 0 };
                      return (
                        <td key={ym} className="py-2 px-2 text-right min-w-[76px]">
                          <div className="font-bold text-slate-900">{formatVal(m.revenue)}</div>
                          <div className="text-2xs text-rose-600 font-semibold">{formatVal(m.expense)}</div>
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right bg-[#E6F7F4] border-l-2 border-slate-300 min-w-[95px]">
                      <div className="font-black text-slate-900 text-sm">{formatVal(grandTotal.directTotal.total.revenue)}</div>
                      <div className="text-2xs text-rose-600 font-bold">{formatVal(grandTotal.directTotal.total.expense)}</div>
                    </td>
                  </>
                ) : viewMode === 'all' ? (
                  <>
                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-bold text-[#00826F] bg-emerald-50 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                      매출
                    </td>
                    {months.map((ym) => (
                      <td key={ym} className="py-2 px-2 text-right font-bold text-slate-900 min-w-[76px]">
                        {formatVal(grandTotal.directTotal.monthly[ym]?.revenue || 0)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black text-slate-900 bg-[#E6F7F4] border-l-2 border-slate-300 min-w-[95px]">
                      {formatVal(grandTotal.directTotal.total.revenue)}
                    </td>
                  </>
                ) : viewMode === 'revenue' ? (
                  <>
                    {months.map((ym) => (
                      <td key={ym} className="py-2.5 px-2 text-right font-bold text-slate-900 min-w-[76px]">
                        {formatVal(grandTotal.directTotal.monthly[ym]?.revenue || 0)}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-[#E6F7F4] border-l-2 border-slate-300 min-w-[95px]">
                      {formatVal(grandTotal.directTotal.total.revenue)}
                    </td>
                  </>
                ) : viewMode === 'expense' ? (
                  <>
                    {months.map((ym) => (
                      <td key={ym} className="py-2.5 px-2 text-right font-bold text-rose-600 min-w-[76px]">
                        {formatVal(grandTotal.directTotal.monthly[ym]?.expense || 0)}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-black text-rose-600 bg-rose-50/70 border-l-2 border-slate-300 min-w-[95px]">
                      {formatVal(grandTotal.directTotal.total.expense)}
                    </td>
                  </>
                ) : (
                  <>
                    {months.map((ym) => {
                      const p = grandTotal.directTotal.monthly[ym]?.profit || 0;
                      return (
                        <td key={ym} className={`py-2.5 px-2 text-right font-black min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                          {formatVal(p, true)}
                        </td>
                      );
                    })}
                    <td className={`py-2.5 px-3 text-right font-black border-l-2 border-slate-300 min-w-[95px] ${
                      grandTotal.directTotal.total.profit >= 0 ? 'text-[#00AE95] bg-[#E6F7F4]' : 'text-rose-600 bg-rose-50'
                    }`}>
                      {formatVal(grandTotal.directTotal.total.profit, true)}
                    </td>
                  </>
                )}
              </tr>

              {/* viewMode === 'all' 서브행 (비용 & 손익) */}
              {viewMode === 'all' && (
                <>
                  <tr className="bg-[#E6F7F4]/60 border-b border-slate-100 font-bold">
                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-bold text-rose-600 bg-rose-50 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                      비용
                    </td>
                    {months.map((ym) => (
                      <td key={ym} className="py-2 px-2 text-right text-rose-600 font-bold min-w-[76px]">
                        {formatVal(grandTotal.directTotal.monthly[ym]?.expense || 0)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black text-rose-600 bg-[#E6F7F4] border-l-2 border-slate-300 min-w-[95px]">
                      {formatVal(grandTotal.directTotal.total.expense)}
                    </td>
                  </tr>
                  <tr className="bg-[#E6F7F4]/80 border-b-2 border-slate-200 font-black">
                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-black text-indigo-700 bg-indigo-50 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                      손익
                    </td>
                    {months.map((ym) => {
                      const p = grandTotal.directTotal.monthly[ym]?.profit || 0;
                      return (
                        <td key={ym} className={`py-2 px-2 text-right font-black min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                          {formatVal(p, true)}
                        </td>
                      );
                    })}
                    <td className={`py-2 px-3 text-right font-black border-l-2 border-slate-300 min-w-[95px] ${
                      grandTotal.directTotal.total.profit >= 0 ? 'text-[#00AE95] bg-[#E6F7F4]' : 'text-rose-600 bg-rose-50'
                    }`}>
                      {formatVal(grandTotal.directTotal.total.profit, true)}
                    </td>
                  </tr>
                </>
              )}

              {/* ========================================================== */}
              {/* 2. 각 부서별 아코디언 행 및 하위 세부 영업장               */}
              {/* ========================================================== */}
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
                      className="hover:bg-slate-50/90 cursor-pointer transition-colors bg-white border-t border-slate-200 font-bold"
                    >
                      <td 
                        rowSpan={viewMode === 'all' ? 3 : 1}
                        className={`${
                          viewMode === 'all'
                            ? 'w-[230px] min-w-[230px] max-w-[230px] sticky left-0 bg-white z-20 border-r border-slate-200'
                            : 'w-[260px] min-w-[260px] max-w-[260px] sticky left-0 bg-white z-20 border-r-2 border-slate-300 shadow-[3px_0_8px_rgba(0,0,0,0.06)]'
                        } px-3 py-2.5 align-middle hover:bg-slate-50 whitespace-nowrap overflow-hidden`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0">
                            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: colorInfo.dot }}
                          />
                          <span className="text-xs sm:text-sm text-slate-900 font-bold font-sans truncate">{dept.name}</span>
                          {isSupport && (
                            <span className="text-3xs font-extrabold px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
                              지원
                            </span>
                          )}
                          {isOutsourced && (
                            <span className="text-3xs font-extrabold px-1 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                              외주
                            </span>
                          )}
                          {isCommon && (
                            <span className="text-3xs font-extrabold px-1 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 shrink-0">
                              공통
                            </span>
                          )}
                          <span className="text-3xs text-slate-400 font-normal font-sans ml-auto shrink-0">
                            ({dept.venues.length})
                          </span>
                        </div>
                      </td>

                      {/* compact 모드: 매출과 비용 2줄 요약 */}
                      {viewMode === 'compact' ? (
                        <>
                          {months.map((ym) => {
                            const m = dept.monthly[ym] || { revenue: 0, expense: 0, profit: 0 };
                            return (
                              <td key={ym} className="py-2 px-2 text-right min-w-[76px]">
                                <div className="font-bold text-slate-800">{formatVal(m.revenue)}</div>
                                <div className="text-2xs text-rose-600">{formatVal(m.expense)}</div>
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-right bg-slate-50 border-l-2 border-slate-300 min-w-[95px]">
                            <div className="font-black text-slate-900">{formatVal(dept.total.revenue)}</div>
                            <div className="text-2xs text-rose-600 font-bold">{formatVal(dept.total.expense)}</div>
                          </td>
                        </>
                      ) : viewMode === 'all' ? (
                        <>
                          <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-bold text-[#00826F] bg-slate-50 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                            매출
                          </td>
                          {months.map((ym) => (
                            <td key={ym} className="py-2 px-2 text-right font-bold text-slate-800 min-w-[76px]">
                              {formatVal(dept.monthly[ym]?.revenue || 0)}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-black text-slate-900 bg-slate-50 border-l-2 border-slate-300 min-w-[95px]">
                            {formatVal(dept.total.revenue)}
                          </td>
                        </>
                      ) : viewMode === 'revenue' ? (
                        <>
                          {months.map((ym) => (
                            <td key={ym} className="py-2.5 px-2 text-right font-bold text-slate-800 min-w-[76px]">
                              {formatVal(dept.monthly[ym]?.revenue || 0)}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right font-black text-[#00826F] bg-slate-50 border-l-2 border-slate-300 min-w-[95px]">
                            {formatVal(dept.total.revenue)}
                          </td>
                        </>
                      ) : viewMode === 'expense' ? (
                        <>
                          {months.map((ym) => (
                            <td key={ym} className="py-2.5 px-2 text-right font-bold text-rose-600 min-w-[76px]">
                              {formatVal(dept.monthly[ym]?.expense || 0)}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right font-black text-rose-600 bg-slate-50 border-l-2 border-slate-300 min-w-[95px]">
                            {formatVal(dept.total.expense)}
                          </td>
                        </>
                      ) : (
                        <>
                          {months.map((ym) => {
                            const p = dept.monthly[ym]?.profit || 0;
                            return (
                              <td key={ym} className={`py-2.5 px-2 text-right font-black min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                                {formatVal(p, true)}
                              </td>
                            );
                          })}
                          <td className={`py-2.5 px-3 text-right font-black border-l-2 border-slate-300 min-w-[95px] ${
                            dept.total.profit >= 0 ? 'text-[#00AE95] bg-slate-50' : 'text-rose-600 bg-slate-50'
                          }`}>
                            {formatVal(dept.total.profit, true)}
                          </td>
                        </>
                      )}
                    </tr>

                    {/* viewMode === 'all' 서브행 (비용 & 손익) */}
                    {viewMode === 'all' && (
                      <>
                        <tr className="hover:bg-slate-50/90 cursor-pointer bg-white">
                          <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-bold text-rose-600 bg-rose-50/40 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                            비용
                          </td>
                          {months.map((ym) => (
                            <td key={ym} className="py-2 px-2 text-right text-rose-600 font-bold min-w-[76px]">
                              {formatVal(dept.monthly[ym]?.expense || 0)}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-black text-rose-600 bg-slate-50 border-l-2 border-slate-300 min-w-[95px]">
                            {formatVal(dept.total.expense)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/90 cursor-pointer bg-white border-b border-slate-200">
                          <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-black text-indigo-600 bg-indigo-50/40 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                            손익
                          </td>
                          {months.map((ym) => {
                            const p = dept.monthly[ym]?.profit || 0;
                            return (
                              <td key={ym} className={`py-2 px-2 text-right font-black min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                                {formatVal(p, true)}
                              </td>
                            );
                          })}
                          <td className={`py-2 px-3 text-right font-black border-l-2 border-slate-300 min-w-[95px] ${
                            dept.total.profit >= 0 ? 'text-[#00AE95] bg-slate-50' : 'text-rose-600 bg-slate-50'
                          }`}>
                            {formatVal(dept.total.profit, true)}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* 세부 영업장 행 (아코디언 열렸을 때) */}
                    {isOpen && dept.venues.map((venue) => {
                      const hasSubVenues = !!(venue.subVenues && venue.subVenues.length > 0);
                      const isVenueOpen = hasSubVenues && !!openVenues[venue.name];

                      return (
                        <React.Fragment key={venue.name}>
                          <tr className={`hover:bg-slate-100/70 transition-colors ${
                            hasSubVenues ? 'bg-slate-50 font-semibold cursor-pointer' : 'bg-slate-50/60'
                          }`}
                            onClick={() => {
                              if (hasSubVenues) toggleVenue(venue.name);
                            }}
                          >
                            <td 
                              rowSpan={viewMode === 'all' ? 3 : 1}
                              className={`${
                                viewMode === 'all'
                                  ? 'w-[230px] min-w-[230px] max-w-[230px] sticky left-0 bg-slate-50 z-20 border-r border-slate-200'
                                  : 'w-[260px] min-w-[260px] max-w-[260px] sticky left-0 bg-slate-50 z-20 border-r-2 border-slate-300 shadow-[3px_0_8px_rgba(0,0,0,0.06)]'
                              } pl-6 pr-3 py-2 align-middle whitespace-nowrap overflow-hidden`}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                {hasSubVenues ? (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleVenue(venue.name);
                                    }}
                                    className="text-slate-500 hover:text-slate-800 p-0.5 rounded cursor-pointer shrink-0"
                                    title={isVenueOpen ? '세부 비목 접기' : '세부 비목 펼치기'}
                                  >
                                    {isVenueOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                ) : (
                                  <span className="text-slate-300 font-bold shrink-0">└</span>
                                )}
                                <span className={`text-xs font-sans truncate ${hasSubVenues ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                                  {venue.name}
                                </span>
                                {venue.name === '본부공통' && (
                                  <span className="text-3xs font-extrabold px-1 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300 shrink-0">
                                    공통
                                  </span>
                                )}
                                {hasSubVenues && (
                                  <span className="text-3xs text-slate-400 font-normal ml-auto shrink-0">
                                    ({venue.subVenues?.length})
                                  </span>
                                )}
                              </div>
                            </td>

                            {viewMode === 'compact' ? (
                              <>
                                {months.map((ym) => {
                                  const m = venue.monthly[ym] || { revenue: 0, expense: 0, profit: 0 };
                                  return (
                                    <td key={ym} className="py-2 px-2 text-right min-w-[76px]">
                                      <div className="text-slate-700 font-medium">{formatVal(m.revenue)}</div>
                                      <div className="text-3xs text-rose-500">{formatVal(m.expense)}</div>
                                    </td>
                                  );
                                })}
                                <td className="py-2 px-3 text-right bg-slate-100/70 border-l-2 border-slate-300 min-w-[95px]">
                                  <div className="font-bold text-slate-800">{formatVal(venue.total.revenue)}</div>
                                  <div className="text-3xs text-rose-600 font-medium">{formatVal(venue.total.expense)}</div>
                                </td>
                              </>
                            ) : viewMode === 'all' ? (
                              <>
                                <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-1.5 px-1 text-center text-3xs text-slate-600 bg-slate-100/70 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                                  매출
                                </td>
                                {months.map((ym) => (
                                  <td key={ym} className="py-1.5 px-2 text-right text-slate-700 min-w-[76px]">
                                    {formatVal(venue.monthly[ym]?.revenue || 0)}
                                  </td>
                                ))}
                                <td className="py-1.5 px-3 text-right font-bold text-slate-800 bg-slate-100 border-l-2 border-slate-300 min-w-[95px]">
                                  {formatVal(venue.total.revenue)}
                                </td>
                              </>
                            ) : viewMode === 'revenue' ? (
                              <>
                                {months.map((ym) => (
                                  <td key={ym} className="py-2 px-2 text-right text-slate-700 min-w-[76px]">
                                    {formatVal(venue.monthly[ym]?.revenue || 0)}
                                  </td>
                                ))}
                                <td className="py-2 px-3 text-right font-bold text-slate-800 bg-slate-100 border-l-2 border-slate-300 min-w-[95px]">
                                  {formatVal(venue.total.revenue)}
                                </td>
                              </>
                            ) : viewMode === 'expense' ? (
                              <>
                                {months.map((ym) => (
                                  <td key={ym} className="py-2 px-2 text-right text-rose-600 min-w-[76px]">
                                    {formatVal(venue.monthly[ym]?.expense || 0)}
                                  </td>
                                ))}
                                <td className="py-2 px-3 text-right font-bold text-rose-600 bg-slate-100 border-l-2 border-slate-300 min-w-[95px]">
                                  {formatVal(venue.total.expense)}
                                </td>
                              </>
                            ) : (
                              <>
                                {months.map((ym) => {
                                  const p = venue.monthly[ym]?.profit || 0;
                                  return (
                                    <td key={ym} className={`py-2 px-2 text-right font-bold min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                                      {formatVal(p, true)}
                                    </td>
                                  );
                                })}
                                <td className={`py-2 px-3 text-right font-bold border-l-2 border-slate-300 min-w-[95px] ${
                                  venue.total.profit >= 0 ? 'text-[#00AE95] bg-slate-100' : 'text-rose-600 bg-slate-100'
                                }`}>
                                  {formatVal(venue.total.profit, true)}
                                </td>
                              </>
                            )}
                          </tr>

                          {/* viewMode === 'all' 서브행 (비용 & 손익) */}
                          {viewMode === 'all' && (
                            <>
                              <tr className="bg-slate-50/60 hover:bg-slate-100/70">
                                <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-1.5 px-1 text-center text-3xs text-rose-500 bg-rose-50/30 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                                  비용
                                </td>
                                {months.map((ym) => (
                                  <td key={ym} className="py-1.5 px-2 text-right text-rose-600 min-w-[76px]">
                                    {formatVal(venue.monthly[ym]?.expense || 0)}
                                  </td>
                                ))}
                                <td className="py-1.5 px-3 text-right font-bold text-rose-600 bg-slate-100 border-l-2 border-slate-300 min-w-[95px]">
                                  {formatVal(venue.total.expense)}
                                </td>
                              </tr>
                              <tr className="bg-slate-50/60 hover:bg-slate-100/70 border-b border-slate-100">
                                <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-1.5 px-1 text-center text-3xs text-indigo-600 bg-indigo-50/30 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                                  손익
                                </td>
                                {months.map((ym) => {
                                  const p = venue.monthly[ym]?.profit || 0;
                                  return (
                                    <td key={ym} className={`py-1.5 px-2 text-right font-bold min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                                      {formatVal(p, true)}
                                    </td>
                                  );
                                })}
                                <td className={`py-1.5 px-3 text-right font-bold border-l-2 border-slate-300 min-w-[95px] ${
                                  venue.total.profit >= 0 ? 'text-[#00AE95] bg-slate-100' : 'text-rose-600 bg-slate-100'
                                }`}>
                                  {formatVal(venue.total.profit, true)}
                                </td>
                              </tr>
                            </>
                          )}

                          {/* 3단계: 하위 세부 비목 (본부공통 펼쳤을 때) */}
                          {hasSubVenues && isVenueOpen && venue.subVenues!.map((subVenue) => (
                            <React.Fragment key={subVenue.name}>
                              <tr className="bg-slate-100/50 hover:bg-slate-100 transition-colors">
                                <td 
                                  rowSpan={viewMode === 'all' ? 3 : 1}
                                  className={`${
                                    viewMode === 'all'
                                      ? 'w-[230px] min-w-[230px] max-w-[230px] sticky left-0 bg-slate-100/95 z-20 border-r border-slate-200'
                                      : 'w-[260px] min-w-[260px] max-w-[260px] sticky left-0 bg-slate-100/95 z-20 border-r-2 border-slate-300 shadow-[3px_0_8px_rgba(0,0,0,0.06)]'
                                  } pl-10 pr-3 py-1.5 align-middle whitespace-nowrap overflow-hidden`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-slate-400 font-bold text-3xs shrink-0">↳</span>
                                    <span className="font-normal text-xs text-slate-600 font-sans truncate">{subVenue.name}</span>
                                  </div>
                                </td>

                                {viewMode === 'compact' ? (
                                  <>
                                    {months.map((ym) => {
                                      const m = subVenue.monthly[ym] || { revenue: 0, expense: 0, profit: 0 };
                                      return (
                                        <td key={ym} className="py-1.5 px-2 text-right min-w-[76px]">
                                          <div className="text-slate-500 font-normal">{formatVal(m.revenue)}</div>
                                          <div className="text-3xs text-rose-500 font-medium">{formatVal(m.expense)}</div>
                                        </td>
                                      );
                                    })}
                                    <td className="py-1.5 px-3 text-right bg-slate-200/50 border-l-2 border-slate-300 min-w-[95px]">
                                      <div className="font-medium text-slate-600">{formatVal(subVenue.total.revenue)}</div>
                                      <div className="text-3xs text-rose-600 font-semibold">{formatVal(subVenue.total.expense)}</div>
                                    </td>
                                  </>
                                ) : viewMode === 'all' ? (
                                  <>
                                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-1 px-1 text-center text-3xs text-slate-500 bg-slate-200/50 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                                      매출
                                    </td>
                                    {months.map((ym) => (
                                      <td key={ym} className="py-1 px-2 text-right text-slate-600 min-w-[76px]">
                                        {formatVal(subVenue.monthly[ym]?.revenue || 0)}
                                      </td>
                                    ))}
                                    <td className="py-1 px-3 text-right font-medium text-slate-700 bg-slate-200/40 border-l-2 border-slate-300 min-w-[95px]">
                                      {formatVal(subVenue.total.revenue)}
                                    </td>
                                  </>
                                ) : viewMode === 'revenue' ? (
                                  <>
                                    {months.map((ym) => (
                                      <td key={ym} className="py-1.5 px-2 text-right text-slate-600 min-w-[76px]">
                                        {formatVal(subVenue.monthly[ym]?.revenue || 0)}
                                      </td>
                                    ))}
                                    <td className="py-1.5 px-3 text-right font-medium text-slate-700 bg-slate-200/40 border-l-2 border-slate-300 min-w-[95px]">
                                      {formatVal(subVenue.total.revenue)}
                                    </td>
                                  </>
                                ) : viewMode === 'expense' ? (
                                  <>
                                    {months.map((ym) => (
                                      <td key={ym} className="py-1.5 px-2 text-right text-rose-500 font-medium min-w-[76px]">
                                        {formatVal(subVenue.monthly[ym]?.expense || 0)}
                                      </td>
                                    ))}
                                    <td className="py-1.5 px-3 text-right font-semibold text-rose-600 bg-slate-200/40 border-l-2 border-slate-300 min-w-[95px]">
                                      {formatVal(subVenue.total.expense)}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    {months.map((ym) => {
                                      const p = subVenue.monthly[ym]?.profit || 0;
                                      return (
                                        <td key={ym} className={`py-1.5 px-2 text-right font-medium min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-500'}`}>
                                          {formatVal(p, true)}
                                        </td>
                                      );
                                    })}
                                    <td className={`py-1.5 px-3 text-right font-semibold border-l-2 border-slate-300 min-w-[95px] ${
                                      subVenue.total.profit >= 0 ? 'text-[#00AE95] bg-slate-200/40' : 'text-rose-600 bg-slate-200/40'
                                    }`}>
                                      {formatVal(subVenue.total.profit, true)}
                                    </td>
                                  </>
                                )}
                              </tr>

                              {viewMode === 'all' && (
                                <>
                                  <tr className="bg-slate-100/50 hover:bg-slate-100">
                                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-1 px-1 text-center text-3xs text-rose-500 bg-rose-50/40 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                                      비용
                                    </td>
                                    {months.map((ym) => (
                                      <td key={ym} className="py-1 px-2 text-right text-rose-500 min-w-[76px]">
                                        {formatVal(subVenue.monthly[ym]?.expense || 0)}
                                      </td>
                                    ))}
                                    <td className="py-1 px-3 text-right font-semibold text-rose-600 bg-slate-200/40 border-l-2 border-slate-300 min-w-[95px]">
                                      {formatVal(subVenue.total.expense)}
                                    </td>
                                  </tr>
                                  <tr className="bg-slate-100/50 hover:bg-slate-100 border-b border-slate-200/60">
                                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-1 px-1 text-center text-3xs text-indigo-600 bg-indigo-50/40 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                                      손익
                                    </td>
                                    {months.map((ym) => {
                                      const p = subVenue.monthly[ym]?.profit || 0;
                                      return (
                                        <td key={ym} className={`py-1 px-2 text-right font-medium min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-500'}`}>
                                          {formatVal(p, true)}
                                        </td>
                                      );
                                    })}
                                    <td className={`py-1 px-3 text-right font-semibold border-l-2 border-slate-300 min-w-[95px] ${
                                      subVenue.total.profit >= 0 ? 'text-[#00AE95] bg-slate-200/40' : 'text-rose-600 bg-slate-200/40'
                                    }`}>
                                      {formatVal(subVenue.total.profit, true)}
                                    </td>
                                  </tr>
                                </>
                              )}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* ========================================================== */}
            {/* 3. 레저사업본부 전체 총합계 (푸터)                          */}
            {/* ========================================================== */}
            <tfoot>
              <tr className="bg-slate-200 font-black border-t-2 border-slate-400 text-slate-900">
                <td 
                  rowSpan={viewMode === 'all' ? 3 : 1}
                  className={`${
                    viewMode === 'all'
                      ? 'w-[230px] min-w-[230px] max-w-[230px] sticky left-0 bg-slate-200 z-20 border-r border-slate-300'
                      : 'w-[260px] min-w-[260px] max-w-[260px] sticky left-0 bg-slate-200 z-20 border-r-2 border-slate-300 shadow-[3px_0_8px_rgba(0,0,0,0.06)]'
                  } px-3 py-2.5 align-middle whitespace-nowrap overflow-hidden`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800 shrink-0" />
                    <span className="text-xs sm:text-sm font-black font-sans truncate">레저사업본부 전체 총합계</span>
                  </div>
                  <div className="text-3xs text-slate-500 font-normal font-sans mt-0.5 truncate" title="직영 + 외주 + 본부공통 전체 포함 (감가상각비 제외)">
                    직영 + 외주 + 공통 <span className="text-amber-700 font-bold">(감가 제외)</span>
                  </div>
                </td>

                {viewMode === 'compact' ? (
                  <>
                    {months.map((ym) => {
                      const m = grandTotal.allTotal.monthly[ym] || { revenue: 0, expense: 0, profit: 0 };
                      return (
                        <td key={ym} className="py-2.5 px-2 text-right min-w-[76px]">
                          <div className="font-black text-slate-900">{formatVal(m.revenue)}</div>
                          <div className="text-2xs text-rose-700 font-bold">{formatVal(m.expense)}</div>
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-right bg-slate-200 border-l-2 border-slate-400 min-w-[95px]">
                      <div className="font-black text-slate-900 text-sm">{formatVal(grandTotal.allTotal.total.revenue)}</div>
                      <div className="text-2xs text-rose-700 font-black">{formatVal(grandTotal.allTotal.total.expense)}</div>
                    </td>
                  </>
                ) : viewMode === 'all' ? (
                  <>
                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-black text-[#00826F] bg-emerald-100 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                      매출
                    </td>
                    {months.map((ym) => (
                      <td key={ym} className="py-2 px-2 text-right font-black text-slate-900 min-w-[76px]">
                        {formatVal(grandTotal.allTotal.monthly[ym]?.revenue || 0)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black text-slate-900 bg-slate-300/80 border-l-2 border-slate-400 min-w-[95px]">
                      {formatVal(grandTotal.allTotal.total.revenue)}
                    </td>
                  </>
                ) : viewMode === 'revenue' ? (
                  <>
                    {months.map((ym) => (
                      <td key={ym} className="py-3 px-2 text-right font-black text-slate-900 min-w-[76px]">
                        {formatVal(grandTotal.allTotal.monthly[ym]?.revenue || 0)}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-black text-slate-900 bg-slate-300/80 border-l-2 border-slate-400 min-w-[95px]">
                      {formatVal(grandTotal.allTotal.total.revenue)}
                    </td>
                  </>
                ) : viewMode === 'expense' ? (
                  <>
                    {months.map((ym) => (
                      <td key={ym} className="py-3 px-2 text-right font-black text-rose-700 min-w-[76px]">
                        {formatVal(grandTotal.allTotal.monthly[ym]?.expense || 0)}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-black text-rose-700 bg-slate-300/80 border-l-2 border-slate-400 min-w-[95px]">
                      {formatVal(grandTotal.allTotal.total.expense)}
                    </td>
                  </>
                ) : (
                  <>
                    {months.map((ym) => {
                      const p = grandTotal.allTotal.monthly[ym]?.profit || 0;
                      return (
                        <td key={ym} className={`py-3 px-2 text-right font-black min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                          {formatVal(p, true)}
                        </td>
                      );
                    })}
                    <td className={`py-3 px-3 text-right font-black border-l-2 border-slate-400 min-w-[95px] ${
                      grandTotal.allTotal.total.profit >= 0 ? 'text-[#00AE95] bg-slate-300/80' : 'text-rose-600 bg-slate-300/80'
                    }`}>
                      {formatVal(grandTotal.allTotal.total.profit, true)}
                    </td>
                  </>
                )}
              </tr>

              {viewMode === 'all' && (
                <>
                  <tr className="bg-slate-200 font-black">
                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-black text-rose-700 bg-rose-100 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                      비용
                    </td>
                    {months.map((ym) => (
                      <td key={ym} className="py-2 px-2 text-right font-black text-rose-700 min-w-[76px]">
                        {formatVal(grandTotal.allTotal.monthly[ym]?.expense || 0)}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-black text-rose-700 bg-slate-300/80 border-l-2 border-slate-400 min-w-[95px]">
                      {formatVal(grandTotal.allTotal.total.expense)}
                    </td>
                  </tr>
                  <tr className="bg-slate-200 font-black">
                    <td className="w-[50px] min-w-[50px] max-w-[50px] sticky left-[230px] z-20 py-2 px-1 text-center text-3xs font-black text-indigo-800 bg-indigo-100 border-r-2 border-slate-300 shadow-[3px_0_6px_rgba(0,0,0,0.06)]">
                      손익
                    </td>
                    {months.map((ym) => {
                      const p = grandTotal.allTotal.monthly[ym]?.profit || 0;
                      return (
                        <td key={ym} className={`py-2 px-2 text-right font-black min-w-[76px] ${p >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                          {formatVal(p, true)}
                        </td>
                      );
                    })}
                    <td className={`py-2 px-3 text-right font-black border-l-2 border-slate-400 min-w-[95px] ${
                      grandTotal.allTotal.total.profit >= 0 ? 'text-[#00AE95] bg-slate-300/80' : 'text-rose-600 bg-slate-300/80'
                    }`}>
                      {formatVal(grandTotal.allTotal.total.profit, true)}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>

        {/* 구글 슬라이드 내보내기 완료 토스트 알림 */}
        {exportSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">구글 슬라이드 / 파워포인트 파일이 다운로드되었습니다: </span>
                <span className="underline font-mono font-semibold">{exportSuccessMsg}</span>
                <span className="text-2xs text-slate-500 block sm:inline sm:ml-2">
                  (구글 드라이브 drive.google.com에 업로드하여 'Google 프레젠테이션'으로 즉시 열고 편집할 수 있습니다)
                </span>
              </div>
            </div>
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-3 py-1.5 bg-[#00AE95] hover:bg-[#009681] text-white font-bold rounded-lg text-2xs shrink-0 transition-colors shadow-xs"
            >
              구글 드라이브 열기 ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
