"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Printer, 
  Calendar, 
  Sparkles, 
  Filter, 
  Search, 
  DollarSign, 
  Receipt, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  ShoppingBag, 
  Fuel, 
  Utensils, 
  Shirt, 
  Palette, 
  Info,
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { formatNumber } from '@/lib/formatters';
import { 
  RawExpenseRow, 
  LEISURE_OFFICIAL_TEAMS, 
  FriendlyExpenseCategory,
  makeFriendlyCategory,
  getFriendlyCategoryGroup
} from '@/lib/financeEngine';
import { CATEGORY_META } from '@/lib/expenseMeta';

// 팀장 통제 가능 비용 (현장 책임 운영 비목)
const CONTROLLABLE_CATEGORIES: FriendlyExpenseCategory[] = [
  '아르바이트비 (알바비)',
  '직원 밥값과 간식비',
  '영업장에 필요한 물건 사기',
  '고장난 시설과 기구 고치기',
  '리조트 차량 기름값과 정비',
  '현수막·배너 만들기와 홍보비',
  '직원 유니폼과 피복비',
];

const COLORS = ['#00AE95', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899', '#64748B'];

// 한국인 주요 성씨 (개인정보 보호 마스킹 대상 식별용)
const KOREAN_SURNAMES = new Set([
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', 
  '황', '안', '송', '전', '홍', '유', '고', '문', '양', '손', '배', '백', '허', '남', '심', 
  '노', '하', '곽', '성', '차', '주', '우', '구', '라', '민', '진', '지', '엄', '채', '원', 
  '천', '방', '공', '현', '함', '변', '염', '여', '추', '도', '소', '석', '선', '설', '마', 
  '연', '위', '표', '명', '기', '반', '왕', '금', '옥', '육', '인', '맹', '제', '모', '탁'
]);

function maskKoreanName(name: string): string {
  if (!name || typeof name !== 'string') return name;
  const trimmed = name.trim();
  if (trimmed.length === 2) {
    return trimmed[0] + '*';
  } else if (trimmed.length === 3) {
    return trimmed[0] + '*' + trimmed[2];
  } else if (trimmed.length === 4) {
    return trimmed[0] + '**' + trimmed[3];
  }
  return trimmed;
}

// 거래처명 개인 실명 마스킹
function maskClientName(client?: string): string {
  if (!client || typeof client !== 'string') return '';
  const trimmed = client.trim();
  if (trimmed.includes('*')) return trimmed;

  if (trimmed.startsWith('기타직원/')) {
    return '기타직원/' + maskKoreanName(trimmed.replace('기타직원/', ''));
  }

  const nonPersonEndings = [
    '사', '점', '팀', '소', '홀', '몰', '마트', '군청', '시청', '공단', '재단', 
    '약국', '병원', '물류', '가스', '보험', '연금', '통신', '카드', '페이', '뱅크', 
    '증권', '호텔', '모텔', '펜션', '빌딩', '타워', '농원', '목장', '식당', '카페', 
    '헤어', '의원', '약방', '상회', '상사', '유통', '개발', '건설', '리', '푸드', 
    '베이커리', '코퍼레이션'
  ];
  for (const end of nonPersonEndings) {
    if (trimmed.endsWith(end)) return trimmed;
  }

  // 3글자 순수 한글 인명 (성씨로 시작하는 자연인)
  if (/^[가-힣]{3}$/.test(trimmed) && KOREAN_SURNAMES.has(trimmed[0])) {
    return maskKoreanName(trimmed);
  }

  return trimmed;
}

// 적요 및 세부내용 내 인명 마스킹
function maskMemoPersonNames(memo?: string): string {
  if (!memo || typeof memo !== 'string') return '';
  let str = memo;

  // 1. OOO외N명 or OOO 외 N명 (예: 김형도외5명 -> 김*도외5명, 사랑외3명 -> 사*외3명)
  str = str.replace(/([가-힣]{2,4})(\s*외\s*\d+명)/g, (_, name, suffix) => {
    return maskKoreanName(name) + suffix;
  });

  // 2. OOO퇴직급여, OOO퇴직금 (예: 윤은광퇴직급여 -> 윤*광퇴직급여)
  str = str.replace(/([가-힣]{2,4})(퇴직급여|퇴직금)/g, (_, name, suffix) => {
    return maskKoreanName(name) + suffix;
  });

  // 3. 직원급여/OOO or 일용직노임/OOO or 실습생급여(...)/OOO
  str = str.replace(/([\/_])([가-힣]{2,4})([_/\s\)]|$)/g, (match, prefix, name, suffix) => {
    if (name.length >= 2 && name.length <= 4 && KOREAN_SURNAMES.has(name[0])) {
      if (!['기타소득', '목장팀', '레저팀', '미디어', '마리나', '얼룩말', '사계절', '마운틴', '썸머랜드'].includes(name)) {
        return prefix + maskKoreanName(name) + suffix;
      }
    }
    return match;
  });

  // 4. 숙소임차료(...)OOO/36회
  str = str.replace(/(\))([가-힣]{2,4})(\/\d+회)/g, (_, prefix, name, suffix) => {
    return prefix + maskKoreanName(name) + suffix;
  });

  return str;
}

function TeamReportContent() {
  const searchParams = useSearchParams();
  const initialMonth = searchParams.get('month') || '2026-09';
  const initialTeam = searchParams.get('team') || 'ALL';

  const [yearMonth, setYearMonth] = useState<string>(initialMonth);
  const [selectedTeam, setSelectedTeam] = useState<string>(
    initialTeam === '디지털지원' ? 'ALL' : initialTeam
  );
  // 팀장용 페이지: 개인정보 보호 및 상호 임금 유출 방지를 위해 영구 보안 모드 고정 (Fail-Safe Lock)
  const hideSalary = true;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [expenses, setExpenses] = useState<RawExpenseRow[]>([]);
  const [partMetrics, setPartMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. 해당 월 실시간 매출/방문객 & 비용 전표 동시 로드
  useEffect(() => {
    let isCancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const [y, m] = yearMonth.split('-');
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        const start = `${yearMonth}-01`;
        const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

        const [revRes, expRes] = await Promise.all([
          fetch(`/api/dashboard/revenue?startDate=${start}&endDate=${end}`).catch(() => null),
          fetch(`/api/expenses/monthly?yearMonth=${yearMonth}`).catch(() => null),
        ]);

        const revJson = revRes && revRes.ok ? await revRes.json().catch(() => null) : null;
        const expJson = expRes && expRes.ok ? await expRes.json().catch(() => null) : null;

        if (!isCancelled) {
          if (revJson && revJson.success && Array.isArray(revJson.parts)) {
            setPartMetrics(revJson.parts);
          } else {
            setPartMetrics([]);
          }

          if (expJson && expJson.success && Array.isArray(expJson.expenses)) {
            setExpenses(expJson.expenses);
          } else {
            setExpenses([]);
          }
        }
      } catch (err) {
        console.error('Failed to load team report data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [yearMonth]);

  // 2. 부서 필터링된 전표 및 정규화 (디지털지원 전면 제외)
  const teamExpenses = useMemo(() => {
    return expenses.filter((r) => {
      if (r.isDepreciation || r.accountName === '감가상각비') return false;
      if (r.assignedTeam === '외주' || r.isOutsourced) return false;
      // 디지털지원 관련 전표는 이 페이지에서 전면 제외
      if (r.assignedTeam === '디지털지원' || r.assignedTeam?.includes('디지털')) return false;
      if (selectedTeam === 'ALL') return true;
      return r.assignedTeam === selectedTeam;
    });
  }, [expenses, selectedTeam]);

  // 3. 부서 매출 및 방문객 집계 (디지털지원 전면 제외)
  const teamMetrics = useMemo(() => {
    if (selectedTeam === 'ALL') {
      const filteredParts = partMetrics.filter((p) => !p.partName?.includes('디지털'));
      const revenue = filteredParts.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0);
      const visitors = filteredParts.reduce((sum, p) => sum + (Number(p.visitorCount || p.visitors) || 0), 0);
      return { revenue, visitors };
    }
    const target = partMetrics.find((p) => p.partName === selectedTeam);
    return {
      revenue: Number(target?.revenue) || 0,
      visitors: Number(target?.visitorCount || target?.visitors) || 0,
    };
  }, [partMetrics, selectedTeam]);

  // 4. 통제 가능 비용 vs 정규직 급여·퇴직금 인건비 풀 vs 인프라 고정비 분리 분석
  const costAnalysis = useMemo(() => {
    let controllableSum = 0;
    let regularSalarySum = 0;
    let severanceSum = 0;
    let fixedOperatingSum = 0;
    const controllableBreakdown: Record<string, number> = {};
    CONTROLLABLE_CATEGORIES.forEach((c) => (controllableBreakdown[c] = 0));

    teamExpenses.forEach((r) => {
      const code = (r.accountCode || '').replace(/[^0-9]/g, '');
      const name = (r.accountName || '').trim();
      const m = (r.memo || '').trim();
      const cat = r.friendlyCategory || makeFriendlyCategory(r.accountCode, r.accountName, r.memo, r.clientName).category;
      const amt = Number(r.amount) || 0;

      // 1. 퇴직급여 판별 (계정코드 609, 806 또는 계정명/적요에 퇴직 포함)
      const isSeverance = code.startsWith('609') || code.startsWith('806') || name.includes('퇴직') || m.includes('퇴직');

      // 2. 정규직 급여 판별 (계정코드 603, 802, 803 또는 급여/상여)
      const isRegularSalary = !isSeverance && (cat === '정규직 직원 급여' || code.startsWith('603') || code.startsWith('802') || code.startsWith('803'));

      if (isSeverance) {
        severanceSum += amt;
      } else if (isRegularSalary) {
        regularSalarySum += amt;
      } else if (CONTROLLABLE_CATEGORIES.includes(cat as FriendlyExpenseCategory)) {
        controllableSum += amt;
        controllableBreakdown[cat] = (controllableBreakdown[cat] || 0) + amt;
      } else {
        fixedOperatingSum += amt;
      }
    });

    // 정규직 인건비 풀 (급여 + 퇴직금)
    const laborPoolTotal = regularSalarySum + severanceSum;

    // 부서 실제 총 비용 (통제비용 + 정규직 급여·퇴직금 + 인프라 고정비 100% 실측 합산 반영)
    const trueTotalExpense = controllableSum + laborPoolTotal + fixedOperatingSum;
    const totalTeamExpense = trueTotalExpense;

    // 통제 공헌이익 = 매출 - 통제 가능 비용
    const controllableProfit = teamMetrics.revenue - controllableSum;
    const controllableMargin = teamMetrics.revenue > 0 ? (controllableProfit / teamMetrics.revenue) * 100 : 0;

    // 실제 영업이익 = 순매출 - 담당영업장 전체 실제 비용(총비용)
    const operatingProfit = teamMetrics.revenue - trueTotalExpense;
    const operatingProfitMargin = teamMetrics.revenue > 0 ? (operatingProfit / teamMetrics.revenue) * 100 : 0;

    return {
      controllableSum,
      regularSalarySum,
      severanceSum,
      laborPoolTotal,
      fixedOperatingSum,
      totalTeamExpense,
      trueTotalExpense,
      controllableBreakdown,
      controllableProfit,
      controllableMargin,
      operatingProfit,
      operatingProfitMargin,
    };
  }, [teamExpenses, teamMetrics]);

  // 차트 데이터 (통제 가능 비목)
  const controllableChartData = useMemo(() => {
    return Object.entries(costAnalysis.controllableBreakdown)
      .filter(([_, amt]) => amt > 0)
      .map(([name, value]) => ({
        name,
        value,
        ratio: costAnalysis.controllableSum > 0 ? ((value / costAnalysis.controllableSum) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [costAnalysis]);

  // 전표 목록 (정규직 급여 및 퇴직금 블라인드 합산 전표 적용)
  const displayVouchers = useMemo(() => {
    const baseList = teamExpenses
      .filter((r) => {
        const code = (r.accountCode || '').replace(/[^0-9]/g, '');
        const name = (r.accountName || '').trim();
        const m = (r.memo || '').trim();
        const cat = r.friendlyCategory || makeFriendlyCategory(r.accountCode, r.accountName, r.memo, r.clientName).category;

        const isSeverance = code.startsWith('609') || code.startsWith('806') || name.includes('퇴직') || m.includes('퇴직');
        const isRegularSalary = !isSeverance && (cat === '정규직 직원 급여' || code.startsWith('603') || code.startsWith('802') || code.startsWith('803'));

        // 개인정보 보호 모드: 개별 직원의 실명이나 개인별 급여/퇴직금이 적힌 전표는 개별 행에서 제외
        if (hideSalary && (isRegularSalary || isSeverance)) return false;

        if (categoryFilter !== 'ALL' && cat !== categoryFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const cl = (r.clientName || '').toLowerCase();
          const ac = (r.accountName || '').toLowerCase();
          return m.toLowerCase().includes(q) || maskMemoPersonNames(m).toLowerCase().includes(q) || cl.includes(q) || maskClientName(cl).toLowerCase().includes(q) || ac.includes(q) || cat.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => (b.amount || 0) - (a.amount || 0));

    // 블라인드 모드일 때: 상단에 정규직 급여 및 퇴직금 총액 요약 전표를 자동 생성하여 포함
    if (hideSalary && categoryFilter === 'ALL' && !searchQuery.trim()) {
      const summaryRows: any[] = [];

      if (costAnalysis.regularSalarySum > 0) {
        summaryRows.push({
          date: `${yearMonth} 합산`,
          assignedTeam: selectedTeam === 'ALL' ? '본부 전체' : selectedTeam,
          friendlyCategory: '정규직 직원 급여',
          amount: costAnalysis.regularSalarySum,
          clientName: '정규직 인건비 풀 (총액 합산)',
          memo: '개인정보 보호를 위해 개별 임금 전표는 블라인드 처리되며, 부서 총액이 비용에 100% 정상 반영되었습니다.',
          isBlindSummary: true,
        });
      }

      if (costAnalysis.severanceSum > 0) {
        summaryRows.push({
          date: `${yearMonth} 합산`,
          assignedTeam: selectedTeam === 'ALL' ? '본부 전체' : selectedTeam,
          friendlyCategory: '직원 4대보험과 국민연금 (직원비용)',
          amount: costAnalysis.severanceSum,
          clientName: '퇴직급여/퇴직금 풀 (총액 합산)',
          memo: '개인정보 보호를 위해 수령인 실명은 블라인드 처리되며, 부서 총액이 비용에 100% 정상 반영되었습니다.',
          isBlindSummary: true,
        });
      }

      return [...summaryRows, ...baseList];
    }

    return baseList;
  }, [teamExpenses, hideSalary, categoryFilter, searchQuery, costAnalysis, yearMonth, selectedTeam]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 print:bg-white print:pb-0">
      {/* 1. Top Navigation & Brand Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#004D40] text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-[#00AE95] text-white tracking-wider uppercase">
                  Belleforet Leisure HQ
                </span>
                <span className="flex items-center gap-1 text-2xs font-semibold text-emerald-300">
                  <ShieldCheck size={13} />
                  <span>팀장 열람용 보안 SSOT 리포트</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                <span>벨포레 레저사업본부 팀장 운영 실적 & 비용 리포트</span>
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                정직원 개별 임금은 안전하게 블라인드 처리되며, 현장 팀장이 주도적으로 조절·절감할 수 있는 
                <strong> 통제 가능 비용(Controllable Cost)</strong> 중심의 자율 책임 경영 대시보드입니다.
              </p>
            </div>

            {/* Quick Actions & Selectors */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Month Selector */}
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15">
                <Calendar size={13} className="text-[#00AE95]" />
                <span className="text-2xs font-bold text-slate-300">정산월:</span>
                <select
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-1"
                >
                  {['2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01'].map((ym) => (
                    <option key={ym} value={ym} className="text-slate-900 bg-white">
                      {ym} ({Number(ym.split('-')[1])}월 결산)
                    </option>
                  ))}
                </select>
              </div>

              {/* Permanent Security Badge (팀장용 영구 보안) */}
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-2xs font-extrabold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-xs cursor-default select-none"
                title="팀장용 리포트: 개인정보 보호 및 상호 임금 유출 방지를 위해 개별 급여는 영구 마스킹 처리되며 부서 총액만 집계됩니다."
              >
                <ShieldCheck size={13} className="text-emerald-300" />
                <span>팀장 보안 모드 (임금·개인정보 영구 보호)</span>
              </div>

              {/* Print Button */}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-2xs font-bold transition-all cursor-pointer border border-white/20 shadow-xs"
              >
                <Printer size={12} />
                <span>리포트 인쇄 / PDF</span>
              </button>
            </div>
          </div>

          {/* Department Tabs */}
          <div className="flex items-center gap-1.5 mt-5 overflow-x-auto custom-scrollbar pb-1">
            {[
              { id: 'ALL', label: '전체 부서 요약', icon: '🏢' },
              { id: '미디어아트센터', label: '미디어아트센터', icon: '🎨' },
              { id: '액티비티', label: '액티비티팀', icon: '🏎️' },
              { id: '목장', label: '목장체험팀', icon: '🐑' },
            ].map((tab) => {
              const isActive = selectedTeam === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTeam(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#00AE95] text-white shadow-[0_4px_12px_rgba(0,174,149,0.35)]'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Information Banner */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center font-bold shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">
                  [{yearMonth}] {selectedTeam === 'ALL' ? '레저본부 전체' : selectedTeam} 경영 분석 리포트
                </span>
                <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  실측 데이터 동기화 완료
                </span>
              </div>
              <p className="text-2xs text-slate-500 mt-0.5">
                팀장간 상호 임금 노출 및 개인정보 유출을 방지하기 위해 개별 급여/퇴직금 전표와 실명은 영구 블라인드 처리되며, 부서 총액만 비용에 100% 정상 합산되어 실제 영업이익에 반영됩니다.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-3xs font-semibold text-slate-400">집계 전표 수</span>
            <div className="text-sm font-extrabold text-slate-800">{teamExpenses.length.toLocaleString()}건</div>
          </div>
        </div>

        {/* 2. Top KPI 4 Cards (Controllable Performance & Real Operating Profit) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: 순매출 (Net Revenue) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-[#00AE95]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">부서 실측 순매출</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={15} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatNumber(teamMetrics.revenue)}
              </span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            <div className="mt-2 text-2xs text-slate-500 flex items-center gap-1">
              <Users size={12} className="text-slate-400" />
              <span>진성 방문객: <strong>{teamMetrics.visitors.toLocaleString()}명</strong></span>
            </div>
          </div>

          {/* Card 2: 현장 통제 가능 비용 (Controllable Cost) */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold text-amber-800 uppercase tracking-wider">현장 통제 가능 비용</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Wrench size={15} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-900 tracking-tight">
                {formatNumber(costAnalysis.controllableSum)}
              </span>
              <span className="text-xs font-bold text-amber-700">원</span>
            </div>
            <div className="mt-2 text-2xs text-amber-800 flex items-center justify-between">
              <span>알바·식대·소모품·수선 등</span>
              <span className="font-extrabold">
                매출 대비 {teamMetrics.revenue > 0 ? ((costAnalysis.controllableSum / teamMetrics.revenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* Card 3: 통제 공헌이익 (Controllable Margin) */}
          <div className="bg-white rounded-2xl p-5 border border-[#00AE95]/30 bg-gradient-to-br from-white to-[#E6F7F4]/30 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold text-[#00826F] uppercase tracking-wider">현장 통제 공헌이익</span>
              <div className="w-7 h-7 rounded-lg bg-[#E6F7F4] text-[#00AE95] flex items-center justify-center">
                <TrendingUp size={15} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl font-black tracking-tight ${costAnalysis.controllableProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                {formatNumber(costAnalysis.controllableProfit)}
              </span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            <div className="mt-2 text-2xs text-[#00826F] flex items-center justify-between font-bold">
              <span>팀장 책임 공헌이익률</span>
              <span className="px-2 py-0.5 rounded-md bg-[#00AE95] text-white">
                {costAnalysis.controllableMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 4: 담당 영업장 실제 영업이익 (Actual Operating Profit) */}
          <div className={`bg-white rounded-2xl p-5 border shadow-xs ${
            costAnalysis.operatingProfit >= 0 
              ? 'border-indigo-200/90 bg-gradient-to-br from-white to-indigo-50/25' 
              : 'border-rose-200/90 bg-gradient-to-br from-white to-rose-50/25'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-2xs font-extrabold uppercase tracking-wider ${
                costAnalysis.operatingProfit >= 0 ? 'text-indigo-900' : 'text-rose-900'
              }`}>
                담당 영업장 실제 영업이익
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                costAnalysis.operatingProfit >= 0 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-rose-100 text-rose-700'
              }`}>
                <Building2 size={15} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl font-black tracking-tight ${
                costAnalysis.operatingProfit >= 0 ? 'text-indigo-950' : 'text-rose-600'
              }`}>
                {formatNumber(costAnalysis.operatingProfit)}
              </span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            <div className="mt-2 text-2xs flex items-center justify-between font-bold">
              <span className="text-slate-500 text-3xs font-medium truncate max-w-[130px]" title={`총비용 ${formatNumber(costAnalysis.trueTotalExpense)}원 차감 후`}>
                매출 - 총비용({formatNumber(costAnalysis.trueTotalExpense)}원)
              </span>
              <span className={`px-2 py-0.5 rounded-md text-white text-3xs font-black shrink-0 ${
                costAnalysis.operatingProfit >= 0 ? 'bg-indigo-600' : 'bg-rose-600'
              }`}>
                이익률 {costAnalysis.operatingProfitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

        </div>

        {/* 3. Detailed Cost Analysis Section (Charts & Breakdown) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Controllable Breakdown Bar & List (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <BarChart3 size={16} className="text-[#00AE95]" />
                  <span>현장 통제 가능 비용 7대 비목 상세 분석</span>
                </h3>
                <p className="text-3xs text-slate-500 mt-0.5">
                  팀장 및 현장 구성원의 절감 노력으로 직접 줄일 수 있는 핵심 운영비 내역입니다.
                </p>
              </div>
              <span className="text-xs font-black text-[#00AE95]">
                합계: {formatNumber(costAnalysis.controllableSum)}원
              </span>
            </div>

            {/* Breakdown List with Progress Bars */}
            <div className="space-y-3 pt-1">
              {CONTROLLABLE_CATEGORIES.map((cat, idx) => {
                const amt = costAnalysis.controllableBreakdown[cat] || 0;
                const ratio = costAnalysis.controllableSum > 0 ? (amt / costAnalysis.controllableSum) * 100 : 0;
                const meta = CATEGORY_META[cat] || { icon: '📦', color: 'text-slate-700', badgeBg: 'bg-slate-100 text-slate-800' };

                return (
                  <div key={cat} className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta.icon}</span>
                        <span className="text-xs font-bold text-slate-800">{cat}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-900">{formatNumber(amt)}원</span>
                        <span className="text-3xs text-slate-400 ml-1.5 font-semibold">({ratio.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden flex">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${Math.min(ratio, 100)}%`, 
                          backgroundColor: COLORS[idx % COLORS.length] 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Cost Structure Ratio & Uncontrollable / Privacy Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Visual Pie Chart */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <PieChartIcon size={16} className="text-[#00AE95]" />
                <span>통제 비용 비중 분포</span>
              </h3>
              
              {controllableChartData.length > 0 ? (
                <div className="h-56 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={controllableChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {controllableChartData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`${formatNumber(Number(val))}원`, '금액']}
                        contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Circle Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xs font-extrabold text-slate-400">통제비용</span>
                    <span className="text-xs font-black text-slate-800">
                      {formatNumber(costAnalysis.controllableSum)}원
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <span>해당 월의 통제비용 데이터가 없습니다.</span>
                </div>
              )}
            </div>

            {/* Fixed / Privacy Salary & Severance Overview Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 font-bold">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">정규직 인건비 & 고정 운영비 풀(Pool)</h4>
                    <span className="text-3xs text-slate-400">개인별 실명 마스킹 / 부서 총액 100% 비용 반영</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-3xs font-extrabold border border-emerald-500/30">
                  총액 투명 공개
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span>💼</span> 정규직 급여·상여 (총액)
                  </span>
                  <span className="font-extrabold text-white">
                    {formatNumber(costAnalysis.regularSalarySum)}원
                  </span>
                </div>
                
                {costAnalysis.severanceSum > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span>🏦</span> 퇴직급여·퇴직금 (총액)
                    </span>
                    <span className="font-extrabold text-white">
                      {formatNumber(costAnalysis.severanceSum)}원
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span>🏢</span> 부서 고정/인프라 운영비
                  </span>
                  <span className="font-extrabold text-white">
                    {formatNumber(costAnalysis.fixedOperatingSum)}원
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-black text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <span>📊</span> 부서 실제 총 비용 (Total Cost)
                  </span>
                  <span className="text-sm font-black">
                    {formatNumber(costAnalysis.trueTotalExpense)}원
                  </span>
                </div>
              </div>

              <p className="text-3xs text-slate-400 leading-relaxed">
                💡 <strong>보안 및 비용 원칙:</strong> 개인정보 보호를 위해 개별 직원의 실명 및 개인별 수령액은 비공개(블라인드) 처리되며, 
                부서 전체 운영 실적 측정을 위해 <strong>정규직 급여 및 퇴직금 총액({formatNumber(costAnalysis.laborPoolTotal)}원)</strong>이 
                부서 비용에 100% 정상 합산되어 실제 영업이익에 반영됩니다.
              </p>
            </div>

          </div>

        </div>

        {/* 4. Team Leader Actionable Management Guide (경영 개선 권고안) */}
        <div className="bg-gradient-to-r from-emerald-50 to-[#E6F7F4] rounded-3xl p-6 border border-emerald-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00AE95] text-white flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                [경영 개선 제안] 팀장이 주도하는 3대 현장 원가 혁신 방안
              </h3>
              <p className="text-2xs text-slate-600 mt-0.5">
                정직원 임금을 건드리지 않고도 팀장 레벨에서 즉각 수익성을 높일 수 있는 실천 지침입니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs space-y-1.5">
              <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                <span>⏱️</span> 1. 시간대별 알바 스케줄링 최적화
              </span>
              <p className="text-2xs text-slate-600 leading-relaxed">
                주말 피크(11시~15시)와 주중 비수기 근무 인원을 차등 배치하여 불필요한 알바비 지출을 최적화하십시오.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs space-y-1.5">
              <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                <span>🛍️</span> 2. 소모품·비품 현장 재고 실사
              </span>
              <p className="text-2xs text-slate-600 leading-relaxed">
                창고에 잠자고 있는 소모품을 먼저 전수 조사하여 매달 습관적으로 발주되는 
                소모품비(<strong>{formatNumber(costAnalysis.controllableBreakdown['영업장에 필요한 물건 사기'] || 0)}원</strong>)를 억제하십시오.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs space-y-1.5">
              <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                <span>🔧</span> 3. 일상 점검으로 대형 수선비 방어
              </span>
              <p className="text-2xs text-slate-600 leading-relaxed">
                어트랙션 및 시설물을 매일 아침 철저히 사전 점검하여, 고장 후 긴급 외주 수선으로 인한 
                수선비(<strong>{formatNumber(costAnalysis.controllableBreakdown['고장난 시설과 기구 고치기'] || 0)}원</strong>) 급증을 예방하십시오.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Transparent Voucher Table (With Strict Salary Blind / Masking) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Receipt size={16} className="text-[#00AE95]" />
                <span>현장 전표 열람실 (투명 감사 모드)</span>
              </h3>
              <p className="text-3xs text-slate-500 mt-0.5">
                {hideSalary 
                  ? '🛡️ 개인정보 보호를 위해 정규직 급여 전표는 목록에서 자동 제외되었습니다.' 
                  : '⚠️ 경영진 총괄 모드로 조회 중입니다.'}
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-2xs font-bold text-slate-700 bg-white outline-none cursor-pointer"
              >
                <option value="ALL">전체 항목 ({displayVouchers.length}건)</option>
                {CONTROLLABLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="적요, 거래처 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-2xs font-medium text-slate-800 bg-white outline-none focus:border-[#00AE95] w-48 sm:w-56"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">일자</th>
                  <th className="py-2.5 px-3">부서</th>
                  <th className="py-2.5 px-3">친화형 비목</th>
                  <th className="py-2.5 px-3 text-right">금액 (원)</th>
                  <th className="py-2.5 px-3">거래처명</th>
                  <th className="py-2.5 px-3">적요 / 세부내용</th>
                  <th className="py-2.5 px-3 text-center">통제 유형</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayVouchers.length > 0 ? (
                  displayVouchers.slice(0, 100).map((r, idx) => {
                    const cat = r.friendlyCategory || makeFriendlyCategory(r.accountCode, r.accountName, r.memo, r.clientName).category;
                    const isControllable = CONTROLLABLE_CATEGORIES.includes(cat as FriendlyExpenseCategory);
                    const meta = CATEGORY_META[cat] || { icon: '📦', badgeBg: 'bg-slate-100 text-slate-800' };

                    const isBlind = (r as any).isBlindSummary;

                    return (
                      <tr key={idx} className={isBlind ? "bg-emerald-50/70 border-y border-emerald-200/80 font-semibold" : "hover:bg-slate-50/80 transition-colors"}>
                        <td className="py-2.5 px-3 font-mono text-3xs text-slate-500 whitespace-nowrap">
                          {r.date || yearMonth}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`font-bold text-2xs ${isBlind ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {r.assignedTeam || '본부공통'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isBlind ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span>🔒</span>
                              <span>{cat} (블라인드)</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-bold ${meta.badgeBg}`}>
                              <span>{meta.icon}</span>
                              <span>{cat}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                          {formatNumber(r.amount)}원
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium text-2xs truncate max-w-[140px]" title={maskClientName(r.clientName)}>
                          {maskClientName(r.clientName) || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-2xs truncate max-w-[240px]" title={maskMemoPersonNames(r.memo)}>
                          {maskMemoPersonNames(r.memo) || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isBlind ? (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              인건비 풀 (보안)
                            </span>
                          ) : isControllable ? (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              현장 통제
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-medium bg-slate-100 text-slate-600">
                              기타 고정
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      조건에 부합하는 전표가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {displayVouchers.length > 100 && (
            <div className="text-center py-2 text-3xs text-slate-400">
              * 전체 {displayVouchers.length}건 중 금액 상위 100건을 우선 표시하고 있습니다.
            </div>
          )}
        </div>

      </main>

      {/* Print Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-3xs text-slate-400 pt-6">
        벨포레 리조트 레저사업본부 자율 책임 경영 시스템 · 본 리포트는 공식 재무 회계 원천 데이터(SSOT)에 의해 실시간 산출됩니다.
      </footer>
    </div>
  );
}

export default function TeamReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-[#00AE95] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold text-slate-500">팀장 운영 리포트 로딩 중...</span>
      </div>
    }>
      <TeamReportContent />
    </Suspense>
  );
}
