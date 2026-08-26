'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import { 
  Building2, Users, DollarSign, Calendar, TrendingUp, TrendingDown, 
  ChevronDown, ChevronRight, Award, Loader2, Filter, Clock
} from 'lucide-react';

interface MetricSet {
  revenue: number;
  lyRevenue: number;
  visitors: number;
  lyVisitors: number;
  spendPerGuest: number;
  lySpendPerGuest: number;
}

interface SubVenue {
  venueName: string;
  total: MetricSet;
  weekday: MetricSet;
  weekend: MetricSet;
}

interface DepartmentData {
  departmentName: string;
  teamName: string;
  categoryCode: string;
  total: MetricSet;
  weekday: MetricSet;
  weekend: MetricSet;
  venues: SubVenue[];
}

interface AnalyticsResponse {
  totalSummary: {
    total: MetricSet;
    weekday: MetricSet;
    weekend: MetricSet;
  };
  departments: DepartmentData[];
}

export default function VenueAnalyticsPage() {
  const { startDate, endDate, startMonth, endMonth } = useDateFilter();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [selectedDeptName, setSelectedDeptName] = useState<string>('all');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [dayType, setDayType] = useState<'total' | 'weekday' | 'weekend'>('total');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/venue-analytics?startDate=${startDate}&endDate=${endDate}&startMonth=${startMonth}&endMonth=${endMonth}`);
        const json = await res.json();
        if (!ignore && json.success) {
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch venue analytics:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (startDate && endDate) {
      loadData();
    }
    return () => { ignore = true; };
  }, [startDate, endDate]);

  const toggleDept = (deptName: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptName]: !prev[deptName] }));
  };

  const departments = useMemo(() => data?.departments || [], [data]);

  // Current Metrics for the 4 Top KPI Cards based on selected department and dayType
  const currentMetrics = useMemo(() => {
    const emptySet: MetricSet = {
      revenue: 0,
      lyRevenue: 0,
      visitors: 0,
      lyVisitors: 0,
      spendPerGuest: 0,
      lySpendPerGuest: 0
    };

    if (!data) return emptySet;

    if (selectedDeptName === 'all') {
      return data.totalSummary?.[dayType] || emptySet;
    }

    const dept = departments.find(d => d.departmentName === selectedDeptName);
    if (dept) {
      return dept[dayType] || emptySet;
    }

    return emptySet;
  }, [data, selectedDeptName, dayType, departments]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(val || 0);
  };

  const calcGrowth = (curr: number, prev: number) => {
    if (!prev || prev === 0) return null;
    return (((curr - prev) / prev) * 100).toFixed(1);
  };

  const revenueGrowth = calcGrowth(currentMetrics.revenue, currentMetrics.lyRevenue);
  const visitorGrowth = calcGrowth(currentMetrics.visitors, currentMetrics.lyVisitors);
  const spendGrowth = calcGrowth(currentMetrics.spendPerGuest, currentMetrics.lySpendPerGuest);

  const dateRangeLabel = `${startDate} ~ ${endDate}`;

  const dayTypeLabel = {
    total: '전체 기간 실측',
    weekday: '주중 (월~금, 공휴일 제외) 실측',
    weekend: '주말 (토·일 & 법정 공휴일) 실측'
  }[dayType];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100/80">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  영업장별 분석 (방문객 & 객단가)
                </h1>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                  {dateRangeLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                레저본부 총매출에 포함된 부서 및 세부 매장의 실측 매출, 방문객, 1인당 객단가를 주중/주말(공휴일 포함) 기준으로 교차 분석합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <GlobalDateSelector />
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Department Selector */}
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> 부서 선택:
          </span>
          <select
            value={selectedDeptName}
            onChange={(e) => setSelectedDeptName(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">🏢 전체 부서 통합 (레저본부)</option>
            {departments.map((d) => (
              <option key={d.departmentName} value={d.departmentName}>
                {d.departmentName} ({d.venues.length > 0 ? `${d.venues.length}개 매장` : '단독'})
              </option>
            ))}
          </select>
        </div>

        {/* Day Type Toggle Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto gap-1 border border-slate-200/60">
          <button
            onClick={() => setDayType('total')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              dayType === 'total'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            전체 기간
          </button>
          <button
            onClick={() => setDayType('weekday')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              dayType === 'weekday'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            주중 (월~금, 공휴일 제외)
          </button>
          <button
            onClick={() => setDayType('weekend')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              dayType === 'weekend'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-rose-600'
            }`}
          >
            주말 (토·일 & 공휴일)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">레저본부 부서별 주중/주말 실적 데이터를 분석 중입니다...</p>
        </div>
      ) : (
        <>
          {/* Active Filter Mode Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50/50 border border-blue-100 px-4 py-2.5 rounded-xl text-xs gap-1.5">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>현재 집계 모드: <span className="font-bold text-blue-700 underline underline-offset-2">{dayTypeLabel}</span></span>
            </div>
            <span className="text-slate-500 text-2xs sm:text-xs">
              * 벨포레 운영 정책: 법정 공휴일 및 대체 공휴일은 자동으로 주말 통계에 산입됩니다.
            </span>
          </div>

          {/* 3. 4대 핵심 KPI 카드 (Uniform Grid & Aligned Baselines) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: 선택 부서 매출액 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[140px] overflow-hidden">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 truncate mr-2">
                    {selectedDeptName === 'all' ? '레저본부 매출' : `${selectedDeptName} 매출`}
                  </span>
                  <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100/60 shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-slate-900 mt-2 tracking-tight tabular-nums truncate" title={formatCurrency(currentMetrics.revenue)}>
                  {formatCurrency(currentMetrics.revenue)}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums gap-1">
                <span className="text-slate-500 font-medium truncate" title={`전년: ${formatCurrency(currentMetrics.lyRevenue)}`}>
                  전년: {formatCurrency(currentMetrics.lyRevenue)}
                </span>
                {revenueGrowth !== null && (
                  <span className={`font-semibold shrink-0 flex items-center gap-0.5 ${Number(revenueGrowth) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(revenueGrowth) >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {revenueGrowth}%
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: 당해 방문객 수 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[140px] overflow-hidden">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 truncate mr-2">방문객 (이용객)</span>
                  <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100/60 shrink-0">
                    <Users className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-slate-900 mt-2 tracking-tight tabular-nums truncate">
                  {currentMetrics.visitors > 0 ? `${formatNumber(currentMetrics.visitors)} 명` : '실측 대기 중'}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums gap-1">
                <span className="text-slate-500 font-medium truncate">선택 기간 실측</span>
                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-2xs sm:text-xs border border-blue-100 shrink-0">
                  실시간 집계
                </span>
              </div>
            </div>

            {/* Card 3: 전년 동기 방문객 수 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[140px] overflow-hidden">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 truncate mr-2">전년 동기 방문객</span>
                  <span className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center border border-purple-100/60 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-slate-900 mt-2 tracking-tight tabular-nums truncate">
                  {currentMetrics.lyVisitors > 0 ? `${formatNumber(currentMetrics.lyVisitors)} 명` : '실측 대기 중'}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums gap-1">
                <span className="text-slate-500 font-medium truncate">작년 동일 기간</span>
                {visitorGrowth !== null && (
                  <span className={`font-semibold shrink-0 flex items-center gap-0.5 ${Number(visitorGrowth) >= 0 ? 'text-purple-600' : 'text-rose-600'}`}>
                    {Number(visitorGrowth) >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {visitorGrowth}%
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: 1인당 평균 객단가 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[140px] overflow-hidden">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700 truncate mr-2">1인당 평균 객단가</span>
                  <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100/60 shrink-0">
                    <Award className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-blue-600 mt-2 tracking-tight tabular-nums truncate" title={currentMetrics.spendPerGuest > 0 ? formatCurrency(currentMetrics.spendPerGuest) : undefined}>
                  {currentMetrics.spendPerGuest > 0 ? formatCurrency(currentMetrics.spendPerGuest) : '방문객 집계 시 산출'}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums gap-1">
                <span className="text-slate-500 font-medium truncate" title={currentMetrics.lySpendPerGuest > 0 ? `전년: ${formatCurrency(currentMetrics.lySpendPerGuest)}` : undefined}>
                  {currentMetrics.lySpendPerGuest > 0 ? `전년: ${formatCurrency(currentMetrics.lySpendPerGuest)}` : '매출 ÷ 방문객 수'}
                </span>
                {spendGrowth !== null && (
                  <span className={`font-semibold shrink-0 flex items-center gap-0.5 ${Number(spendGrowth) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {Number(spendGrowth) >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {spendGrowth}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. 레저본부 총매출 포함 부서 아코디언 카드 (선택된 DayType 적용) */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mr-3.5 shrink-0 border border-blue-100 text-blue-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    레저본부 총매출 포함 부서 및 세부 매장 ({dayTypeLabel})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">부서를 클릭하면 소속된 세부 매장의 매출과 방문객, 객단가를 상세히 확인할 수 있습니다.</p>
                </div>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-semibold border border-slate-200/60 self-start sm:self-auto">
                금액순 정렬
              </span>
            </div>

            <div className="space-y-3">
              {departments.map((dept) => {
                const isExpanded = expandedDepts[dept.departmentName] !== false;
                const isSelected = selectedDeptName === dept.departmentName;
                const m = dept[dayType];

                return (
                  <div 
                    key={dept.departmentName} 
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isSelected 
                        ? 'border-blue-400 bg-blue-50/20 ring-2 ring-blue-100 shadow-xs' 
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Department Header */}
                    <div 
                      onClick={() => {
                        toggleDept(dept.departmentName);
                        setSelectedDeptName(dept.departmentName);
                      }}
                      className="w-full flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-4.5 text-left cursor-pointer transition-colors gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/60">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <span className="text-slate-900 font-bold text-base sm:text-lg tracking-tight">{dept.departmentName}</span>
                        {dept.venues.length > 0 && (
                          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200/60 px-2.5 py-0.5 rounded-md font-medium shrink-0">
                            {dept.venues.length}개 매장
                          </span>
                        )}
                        {m.visitors > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 tabular-nums">
                            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-medium border border-slate-200/60">
                              이용객 {formatNumber(m.visitors)}명
                            </span>
                            {m.lyVisitors > 0 && (
                              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200/60 px-2.5 py-0.5 rounded-md font-medium">
                                전년 {formatNumber(m.lyVisitors)}명
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {m.spendPerGuest > 0 && (
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 tabular-nums">
                            객단가: {formatCurrency(m.spendPerGuest)}
                          </span>
                        )}
                        <span className="text-slate-900 font-bold tracking-tight text-lg sm:text-xl tabular-nums">
                          {formatCurrency(m.revenue)}
                        </span>
                      </div>
                    </div>

                    {/* Sub Venues (세부 매장 목록) */}
                    {isExpanded && dept.venues.length > 0 && (
                      <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            소속 세부 매장 실적 ({dayTypeLabel})
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {dept.venues.map((v) => {
                            const vm = v[dayType];
                            return (
                              <div 
                                key={v.venueName}
                                className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-blue-200 transition-all min-h-[100px]"
                              >
                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                  <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                    📍 {v.venueName}
                                  </span>
                                  <span className="text-sm sm:text-base font-bold text-blue-700 tabular-nums shrink-0">
                                    {formatCurrency(vm.revenue)}
                                  </span>
                                </div>
                                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 gap-2 tabular-nums">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-medium text-slate-700">
                                      방문객: {vm.visitors > 0 ? `${formatNumber(vm.visitors)}명` : '-'}
                                    </span>
                                    {vm.lyVisitors > 0 && (
                                      <span className="text-2xs text-purple-700 font-medium bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                                        전년 {formatNumber(vm.lyVisitors)}명
                                      </span>
                                    )}
                                  </div>
                                  <div className="shrink-0">
                                    {vm.spendPerGuest > 0 && (
                                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-2xs sm:text-xs">
                                        객단가: {formatCurrency(vm.spendPerGuest)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {departments.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-base font-semibold">
                  선택한 기간에 해당하는 레저본부 부서 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 5. Footer Integrity Badge */}
      <div className="text-right">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full border border-emerald-200 shadow-2xs">
          * 전사 공식 집계 데이터: 주중/주말(공휴일 포함) 일별 실적 연동 완료
        </span>
      </div>
    </div>
  );
}
