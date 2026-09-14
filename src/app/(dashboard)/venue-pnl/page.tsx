"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  BarChart3, 
  DollarSign, 
  Users, 
  TrendingUp, 
  ArrowUpDown, 
  Layers, 
  Search, 
  Filter, 
  Loader2, 
  ShieldCheck,
  Sparkles,
  PieChart,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Store,
  Landmark,
  FileSpreadsheet
} from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { 
  RawExpenseRow, 
  VenuePnLItem, 
  calculateVenuePnL, 
  isOutsourcedVenue,
  LEISURE_OFFICIAL_TEAMS 
} from '@/lib/financeEngine';

export default function VenuePnLPage() {
  const { startDate, endDate, isMounted } = useDateFilter();
  const [loading, setLoading] = useState(true);
  const [revenueVenues, setRevenueVenues] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<RawExpenseRow[]>([]);
  
  // 2-Track 뷰 모드: 전체 / 직영 / 외주(놀이동산)
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'DIRECT' | 'OUTSOURCED'>('ALL');
  const [selectedPart, setSelectedPart] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 정렬 상태
  const [sortField, setSortField] = useState<
    'revenue' | 'totalExpense' | 'operatingProfit' | 'profitMargin' | 'visitorCount' | 'spendPerGuest'
  >('revenue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 1. 매출 및 지출 데이터 동시 조회
  useEffect(() => {
    if (!isMounted) return;

    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const yearMonth = startDate.substring(0, 7);
        const [revRes, expRes] = await Promise.all([
          fetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/expenses/monthly?yearMonth=${yearMonth}`)
        ]);

        const revJson = await revRes.json();
        const expJson = await expRes.json();

        if (ignore) return;

        // 매출 영업장 목록 정규화
        if (revJson.success && revJson.gridRows) {
          const map: Record<string, { venueName: string; partName: string; revenue: number; visitorCount: number }> = {};
          revJson.gridRows.forEach((r: any) => {
            const key = `${r.partName}__${r.venueName}`;
            if (!map[key]) {
              map[key] = {
                venueName: r.venueName,
                partName: r.partName,
                revenue: 0,
                visitorCount: 0,
              };
            }
            map[key].revenue += Number(r.revenue || 0);
            map[key].visitorCount += Number(r.visitorCount || 0);
          });
          setRevenueVenues(Object.values(map));
        }

        // 지출 전표 목록 적재
        if (expJson.success && expJson.expenses) {
          setExpenses(expJson.expenses);
        } else {
          setExpenses([]);
        }
      } catch (err) {
        console.error('Failed to load venue P&L data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();
    return () => { ignore = true; };
  }, [startDate, endDate, isMounted]);

  // 2. 영업장별 실시간 P&L 결합 연산 (외주 안분 제외 로직 내장)
  const venuePnLList: VenuePnLItem[] = useMemo(() => {
    if (revenueVenues.length === 0) return [];
    return calculateVenuePnL(revenueVenues, expenses);
  }, [revenueVenues, expenses]);

  // 3. 전체 / 직영 / 외주별 합계 연산
  const metrics = useMemo(() => {
    const all = { revenue: 0, directExp: 0, commonExp: 0, totalExp: 0, profit: 0, visitors: 0 };
    const direct = { revenue: 0, directExp: 0, commonExp: 0, totalExp: 0, profit: 0, visitors: 0, count: 0 };
    const outsourced = { revenue: 0, directExp: 0, commonExp: 0, totalExp: 0, profit: 0, visitors: 0, count: 0 };

    venuePnLList.forEach((v) => {
      all.revenue += v.revenue;
      all.directExp += v.directExpense;
      all.commonExp += v.commonExpense;
      all.totalExp += v.totalExpense;
      all.profit += v.operatingProfit;
      all.visitors += v.visitorCount;

      if (v.isOutsourced) {
        outsourced.revenue += v.revenue;
        outsourced.directExp += v.directExpense;
        outsourced.commonExp += v.commonExpense;
        outsourced.totalExp += v.totalExpense;
        outsourced.profit += v.operatingProfit;
        outsourced.visitors += v.visitorCount;
        outsourced.count += 1;
      } else {
        direct.revenue += v.revenue;
        direct.directExp += v.directExpense;
        direct.commonExp += v.commonExpense;
        direct.totalExp += v.totalExpense;
        direct.profit += v.operatingProfit;
        direct.visitors += v.visitorCount;
        direct.count += 1;
      }
    });

    const allMargin = all.revenue > 0 ? (all.profit / all.revenue) * 100 : 0;
    const directMargin = direct.revenue > 0 ? (direct.profit / direct.revenue) * 100 : 0;
    const outsourcedMargin = outsourced.revenue > 0 ? (outsourced.profit / outsourced.revenue) * 100 : 0;

    return {
      all: { ...all, margin: Number(allMargin.toFixed(1)) },
      direct: { ...direct, margin: Number(directMargin.toFixed(1)) },
      outsourced: { ...outsourced, margin: Number(outsourcedMargin.toFixed(1)) },
    };
  }, [venuePnLList]);

  // 4. 파트별 P&L 요약 집계
  const partSummaries = useMemo(() => {
    const map = new Map<string, {
      partName: string;
      revenue: number;
      totalExpense: number;
      operatingProfit: number;
      profitMargin: number;
      venueCount: number;
      hasOutsourced: boolean;
    }>();

    LEISURE_OFFICIAL_TEAMS.forEach((team) => {
      map.set(team, {
        partName: team,
        revenue: 0,
        totalExpense: 0,
        operatingProfit: 0,
        profitMargin: 0,
        venueCount: 0,
        hasOutsourced: team === '액티비티',
      });
    });

    venuePnLList.forEach((v) => {
      const existing = map.get(v.partName) || {
        partName: v.partName,
        revenue: 0,
        totalExpense: 0,
        operatingProfit: 0,
        profitMargin: 0,
        venueCount: 0,
        hasOutsourced: v.isOutsourced,
      };

      existing.revenue += v.revenue;
      existing.totalExpense += v.totalExpense;
      existing.operatingProfit += v.operatingProfit;
      existing.venueCount += 1;
      if (v.isOutsourced) existing.hasOutsourced = true;

      map.set(v.partName, existing);
    });

    return Array.from(map.values()).map((p) => ({
      ...p,
      profitMargin: p.revenue > 0 ? Number(((p.operatingProfit / p.revenue) * 100).toFixed(1)) : 0,
    }));
  }, [venuePnLList]);

  // 5. 파트 목록 (필터 드롭다운용)
  const availableParts = useMemo(() => {
    return ['ALL', ...Array.from(new Set(venuePnLList.map((v) => v.partName))).filter(Boolean)];
  }, [venuePnLList]);

  // 6. 2-Track 및 검색/정렬 필터링된 영업장 목록
  const filteredVenues = useMemo(() => {
    return venuePnLList
      .filter((v) => {
        // Track Filter
        if (trackFilter === 'DIRECT' && v.isOutsourced) return false;
        if (trackFilter === 'OUTSOURCED' && !v.isOutsourced) return false;

        // Part Filter
        if (selectedPart !== 'ALL' && v.partName !== selectedPart) return false;

        // Search Filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesName = v.venueName.toLowerCase().includes(term);
          const matchesPart = v.partName.toLowerCase().includes(term);
          if (!matchesName && !matchesPart) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [venuePnLList, trackFilter, selectedPart, searchTerm, sortField, sortOrder]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Global Date Selector */}
      <div className="relative bg-[#00AE95] rounded-b-2xl text-white py-5 px-6 sm:px-10 -mx-6 -mt-6 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/20 text-white text-3xs font-bold tracking-wider">
              <Landmark size={12} />
              <span>영업장별 P&L 실적</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              영업장 및 파트별 손익 현황
            </h1>
            <p className="text-white/90 text-xs max-w-2xl leading-relaxed">
              매장별 매출 대비 사용 비용과 영업손익을 대조하며, 외주업체(놀이동산)를 직영과 분리하여 분석합니다.
            </p>
          </div>

          <div className="self-start md:self-center">
            <GlobalDateSelector />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* 1. 3대 핵심 요약 카드: [전체 본부] / [직영 사업장] / [외주 (놀이동산)] */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: 전체 레져본부 통합 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">레져본부 전체 손익</span>
              <span className="text-3xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                총 {venuePnLList.length}개 매장
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-2xs text-slate-400 font-medium">통합 순매출 / 총비용</div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black font-mono text-slate-900">
                  {formatNumber(metrics.all.revenue)}
                </span>
                <span className="text-xs font-bold font-mono text-slate-500">
                  비용: {formatNumber(metrics.all.totalExp)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-3xs text-slate-400">영업손익 (순익)</div>
                <div className={`text-base font-black font-mono ${metrics.all.profit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                  {formatNumber(metrics.all.profit)}
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <div className="text-3xs text-slate-400">영업이익률</div>
                <div className={`text-sm font-black font-mono ${metrics.all.margin >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                  {formatPercent(metrics.all.margin)}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: 직영 사업장 (Direct) */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#00AE95]/30 shadow-xs space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#00AE95]/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Store size={14} className="text-[#00AE95]" />
                <span className="text-xs font-bold text-[#00826F] uppercase tracking-wider">직영 사업장 실적</span>
              </div>
              <span className="text-3xs font-extrabold px-2 py-0.5 rounded-md bg-[#E6F7F4] text-[#00AE95]">
                직영 {metrics.direct.count}개 매장
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-2xs text-slate-400 font-medium">직영 순매출 / 총비용</div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black font-mono text-slate-900">
                  {formatNumber(metrics.direct.revenue)}
                </span>
                <span className="text-xs font-bold font-mono text-slate-500">
                  비용: {formatNumber(metrics.direct.totalExp)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-3xs text-slate-400">직영 영업손익</div>
                <div className={`text-base font-black font-mono ${metrics.direct.profit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                  {formatNumber(metrics.direct.profit)}
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <div className="text-3xs text-slate-400">직영 이익률</div>
                <div className={`text-sm font-black font-mono ${metrics.direct.margin >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                  {formatPercent(metrics.direct.margin)}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: 외주 사업장 (놀이동산) */}
          <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Briefcase size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">외주 사업장 (놀이동산)</span>
              </div>
              <span className="text-3xs font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                외주 위탁
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-2xs text-slate-400 font-medium">외주 매출 / 직과비용</div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black font-mono text-slate-900">
                  {formatNumber(metrics.outsourced.revenue)}
                </span>
                <span className="text-xs font-bold font-mono text-slate-500">
                  비용: {formatNumber(metrics.outsourced.totalExp)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-3xs text-slate-400">외주 기여손익</div>
                <div className={`text-base font-black font-mono ${metrics.outsourced.profit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                  {formatNumber(metrics.outsourced.profit)}
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <div className="text-3xs text-slate-400">기여 마진율</div>
                <div className={`text-sm font-black font-mono ${metrics.outsourced.margin >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                  {formatPercent(metrics.outsourced.margin)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 파트별 P&L 요약 그리드 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00AE95]" />
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                레져본부 4대 파트별 손익 요약
              </h3>
            </div>
            <span className="text-3xs text-slate-400">
              ※ 본부 공통비는 직영 3대 파트에 매출 비례 안분 반영됨
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {partSummaries.map((p) => {
              const isSupport = p.partName === '디지털지원';
              return (
                <div 
                  key={p.partName}
                  className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-2.5 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 size={13} className="text-[#00AE95]" />
                      {p.partName}
                    </span>
                    {p.hasOutsourced && (
                      <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        외주 포함
                      </span>
                    )}
                    {isSupport && (
                      <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        지원부서
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-2xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>매출액:</span>
                      <span className="font-mono font-bold text-slate-900">{formatNumber(p.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>배분비용:</span>
                      <span className="font-mono font-bold text-slate-700">{formatNumber(p.totalExpense)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="font-bold text-slate-700">영업손익:</span>
                      <span className={`font-mono font-black ${p.operatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>
                        {formatNumber(p.operatingProfit)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-3xs text-slate-400 pt-0.5">
                    <span>이익률: <strong className={`font-mono ${p.profitMargin >= 0 ? 'text-[#00AE95]' : 'text-rose-600'}`}>{formatPercent(p.profitMargin)}</strong></span>
                    <span>운영매장: {p.venueCount}곳</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 영업장별 상세 P&L 테이블 및 2-Track 필터 바 */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden space-y-0">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/50">
            {/* Track Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setTrackFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  trackFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전체 영업장 ({venuePnLList.length})
              </button>
              <button
                onClick={() => setTrackFilter('DIRECT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  trackFilter === 'DIRECT'
                    ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store size={13} />
                <span>직영 사업장 ({metrics.direct.count})</span>
              </button>
              <button
                onClick={() => setTrackFilter('OUTSOURCED')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  trackFilter === 'OUTSOURCED'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase size={13} />
                <span>외주 사업장 (놀이동산)</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-44">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="영업장명 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00AE95]"
                />
              </div>

              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">전체 파트</option>
                {availableParts.filter((p) => p !== 'ALL').map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {(selectedPart !== 'ALL' || searchTerm || trackFilter !== 'ALL') && (
                <button
                  onClick={() => { setSelectedPart('ALL'); setSearchTerm(''); setTrackFilter('ALL'); }}
                  className="text-2xs text-slate-500 hover:text-slate-800 underline px-1 cursor-pointer"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 border-r border-slate-200">운영 형태</th>
                  <th className="py-3 px-4 border-r border-slate-200">영업장명</th>
                  <th className="py-3 px-4 border-r border-slate-200">소속 파트</th>
                  <th 
                    onClick={() => handleSort('revenue')}
                    className="py-3 px-4 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>순매출</span>
                      <ArrowUpDown size={11} className={sortField === 'revenue' ? 'text-[#00AE95]' : 'text-slate-300'} />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right border-r border-slate-200">직과 비용</th>
                  <th className="py-3 px-4 text-right border-r border-slate-200">공통비 안분</th>
                  <th 
                    onClick={() => handleSort('totalExpense')}
                    className="py-3 px-4 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>총비용</span>
                      <ArrowUpDown size={11} className={sortField === 'totalExpense' ? 'text-[#00AE95]' : 'text-slate-300'} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('operatingProfit')}
                    className="py-3 px-4 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>영업손익</span>
                      <ArrowUpDown size={11} className={sortField === 'operatingProfit' ? 'text-[#00AE95]' : 'text-slate-300'} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('profitMargin')}
                    className="py-3 px-4 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>이익률</span>
                      <ArrowUpDown size={11} className={sortField === 'profitMargin' ? 'text-[#00AE95]' : 'text-slate-300'} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('visitorCount')}
                    className="py-3 px-4 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>이용객 수</span>
                      <ArrowUpDown size={11} className={sortField === 'visitorCount' ? 'text-[#00AE95]' : 'text-slate-300'} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('spendPerGuest')}
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>객단가</span>
                      <ArrowUpDown size={11} className={sortField === 'spendPerGuest' ? 'text-[#00AE95]' : 'text-slate-300'} />
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-[#00AE95]" />
                        <span className="text-xs">영업장별 손익 데이터를 집계 중입니다...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredVenues.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Building2 size={32} className="text-slate-300" />
                        <span className="text-xs font-semibold text-slate-600">조회 조건에 일치하는 영업장이 없습니다.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVenues.map((v) => (
                    <tr 
                      key={`${v.partName}__${v.venueName}`}
                      className={`hover:bg-slate-50/80 transition-colors font-medium ${
                        v.isOutsourced ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Operation Type */}
                      <td className="py-3 px-4 border-r border-slate-200">
                        {v.isOutsourced ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            외주 위탁
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-extrabold bg-[#E6F7F4] text-[#00AE95] border border-[#00AE95]/20">
                            직영 사업
                          </span>
                        )}
                      </td>

                      {/* Venue Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${v.isOutsourced ? 'bg-amber-500' : 'bg-[#00AE95]'}`} />
                          <span>{v.venueName}</span>
                        </div>
                      </td>

                      {/* Part Name */}
                      <td className="py-3 px-4 text-slate-600 text-2xs border-r border-slate-200">
                        {v.partName}
                      </td>

                      {/* Net Revenue */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                        {formatNumber(v.revenue)}
                      </td>

                      {/* Direct Expense */}
                      <td className="py-3 px-4 text-right font-mono text-slate-700 border-r border-slate-200">
                        {formatNumber(v.directExpense)}
                      </td>

                      {/* Common Expense */}
                      <td className="py-3 px-4 text-right font-mono text-slate-500 text-2xs border-r border-slate-200">
                        {v.isOutsourced ? '-' : formatNumber(v.commonExpense)}
                      </td>

                      {/* Total Expense */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                        {formatNumber(v.totalExpense)}
                      </td>

                      {/* Operating Profit */}
                      <td className={`py-3 px-4 text-right font-mono font-black border-r border-slate-200 ${
                        v.operatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'
                      }`}>
                        {formatNumber(v.operatingProfit)}
                      </td>

                      {/* Margin % */}
                      <td className={`py-3 px-4 text-right font-mono font-bold border-r border-slate-200 ${
                        v.profitMargin >= 0 ? 'text-[#00AE95]' : 'text-rose-600'
                      }`}>
                        {v.revenue > 0 ? formatPercent(v.profitMargin) : '-'}
                      </td>

                      {/* Visitor Count */}
                      <td className="py-3 px-4 text-right font-mono text-slate-600 border-r border-slate-200">
                        {v.visitorCount > 0 ? `${formatNumber(v.visitorCount)}명` : '-'}
                      </td>

                      {/* Spend Per Guest */}
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {v.spendPerGuest > 0 ? `${formatNumber(v.spendPerGuest)}원` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Notes */}
          <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 text-3xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">※ 외주 운영 분리 기준:</span>
              <span>놀이동산은 외주(위탁운영) 사업장으로 본부 공통비 안분 대상에서 제외되며, 직영 실적과 분리 집계하여 직영 원가 왜곡을 방지합니다.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">※ 디지털지원팀:</span>
              <span>순수 지원부서로 티켓 매출이 발생하지 않으며, 자체 운영 비용 100%가 직과 집계됩니다.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
