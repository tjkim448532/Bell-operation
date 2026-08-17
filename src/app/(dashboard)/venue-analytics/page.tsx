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
  const { startMonth, endMonth } = useDateFilter();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [selectedDeptName, setSelectedDeptName] = useState<string>('all');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({
    '액티비티': true,
    '벨포레 목장': true,
    '미디어아트센터': true
  });
  const [dayType, setDayType] = useState<'total' | 'weekday' | 'weekend'>('total');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/venue-analytics?startMonth=${startMonth}&endMonth=${endMonth}`);
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
    loadData();
    return () => { ignore = true; };
  }, [startMonth, endMonth]);

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

  const dateRangeLabel = `${startMonth} ~ ${endMonth}`;

  const dayTypeLabel = {
    total: '전체 기간 실측',
    weekday: '주중 (월~금, 공휴일 제외) 실측',
    weekend: '주말 (토·일 & 법정 공휴일) 실측'
  }[dayType];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/50 min-h-screen">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              영업장별 분석 (방문객 & 객단가)
            </h1>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
              {dateRangeLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            레저본부 총매출에 포함된 핵심 부서 및 세부 매장의 실측 매출과 방문객, 1인당 객단가를 주중/주말(공휴일 포함) 기준으로 교차 분석합니다.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <GlobalDateSelector />
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Department Selector */}
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> 부서 선택:
          </span>
          <select
            value={selectedDeptName}
            onChange={(e) => setSelectedDeptName(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
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
        <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl shrink-0 self-start sm:self-auto gap-1 border border-gray-200/60">
          <button
            onClick={() => setDayType('total')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              dayType === 'total'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            전체 기간
          </button>
          <button
            onClick={() => setDayType('weekday')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              dayType === 'weekday'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:text-blue-600'
            }`}
          >
            주중 (월~금, 공휴일 제외)
          </button>
          <button
            onClick={() => setDayType('weekend')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              dayType === 'weekend'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-gray-500 hover:text-rose-600'
            }`}
          >
            주말 (토·일 & 공휴일)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-gray-600">레저본부 부서별 주중/주말 실적 데이터를 분석 중입니다...</p>
        </div>
      ) : (
        <>
          {/* Active Filter Mode Banner */}
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 px-5 py-3 rounded-2xl text-xs">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>현재 집계 모드: <span className="underline decoration-blue-500 font-black">{dayTypeLabel}</span></span>
            </div>
            <span className="text-blue-700/80 font-medium">
              * 벨포레 운영 정책: 법정 공휴일 및 대체 공휴일은 자동으로 주말 통계에 산입됩니다.
            </span>
          </div>

          {/* 3. 4대 핵심 KPI 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: 선택 부서 매출액 */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">
                  {selectedDeptName === 'all' ? '레저본부 매출' : `${selectedDeptName} 매출`}
                </span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">
                {formatCurrency(currentMetrics.revenue)}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">전년: {formatCurrency(currentMetrics.lyRevenue)}</span>
                {revenueGrowth !== null && (
                  <span className={`font-bold flex items-center ${Number(revenueGrowth) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(revenueGrowth) >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                    {revenueGrowth}%
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: 당해 방문객 수 */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">방문객 (이용객)</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">
                {currentMetrics.visitors > 0 ? `${formatNumber(currentMetrics.visitors)} 명` : '실측 대기 중'}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">선택 기간 실측</span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">실시간 집계</span>
              </div>
            </div>

            {/* Card 3: 전년 동기 방문객 수 */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">전년 동기 방문객</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">
                {currentMetrics.lyVisitors > 0 ? `${formatNumber(currentMetrics.lyVisitors)} 명` : '실측 대기 중'}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">작년 동일 기간</span>
                {visitorGrowth !== null && (
                  <span className={`font-bold flex items-center ${Number(visitorGrowth) >= 0 ? 'text-purple-600' : 'text-rose-600'}`}>
                    {Number(visitorGrowth) >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                    {visitorGrowth}%
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: 1인당 평균 객단가 */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600">1인당 평균 객단가</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {currentMetrics.spendPerGuest > 0 ? formatCurrency(currentMetrics.spendPerGuest) : '방문객 집계 시 산출'}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {currentMetrics.lySpendPerGuest > 0 ? `전년: ${formatCurrency(currentMetrics.lySpendPerGuest)}` : '매출 ÷ 방문객 수'}
                </span>
                {spendGrowth !== null && (
                  <span className={`font-bold flex items-center ${Number(spendGrowth) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {Number(spendGrowth) >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                    {spendGrowth}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. 레저본부 총매출 포함 부서 아코디언 카드 (선택된 DayType 적용) */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mr-4 shrink-0">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">레저본부 총매출 포함 부서 및 세부 매장 ({dayTypeLabel})</h2>
                  <p className="text-xs text-gray-500 mt-0.5">부서를 클릭하면 소속된 세부 매장의 매출과 방문객, 객단가를 확인할 수 있습니다.</p>
                </div>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">
                금액순 정렬
              </span>
            </div>

            <div className="space-y-3">
              {departments.map((dept) => {
                const isExpanded = !!expandedDepts[dept.departmentName];
                const isSelected = selectedDeptName === dept.departmentName;
                const m = dept[dayType];

                return (
                  <div 
                    key={dept.departmentName} 
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isSelected 
                        ? 'border-blue-300 bg-blue-50/30 ring-2 ring-blue-100' 
                        : 'border-gray-100 bg-gray-50/40 hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Department Header */}
                    <div 
                      onClick={() => {
                        toggleDept(dept.departmentName);
                        setSelectedDeptName(dept.departmentName);
                      }}
                      className="w-full flex justify-between items-center p-4 text-left cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <span className="text-gray-900 font-extrabold text-base truncate">{dept.departmentName}</span>
                        {dept.venues.length > 0 && (
                          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                            {dept.venues.length}개 매장
                          </span>
                        )}
                        {m.visitors > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-semibold">
                              이용객 {formatNumber(m.visitors)}명
                            </span>
                            {m.lyVisitors > 0 && (
                              <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-semibold">
                                전년 {formatNumber(m.lyVisitors)}명
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 shrink-0 pl-2">
                        {m.spendPerGuest > 0 && (
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                            객단가: {formatCurrency(m.spendPerGuest)}
                          </span>
                        )}
                        <span className="text-gray-900 font-black tracking-tight text-base">
                          {formatCurrency(m.revenue)}
                        </span>
                      </div>
                    </div>

                    {/* Sub Venues (세부 매장 목록) */}
                    {isExpanded && dept.venues.length > 0 && (
                      <div className="px-4 pb-4 pt-2 border-t border-blue-100/60 bg-white/70 space-y-2">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          소속 세부 매장 실적 ({dayTypeLabel})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {dept.venues.map((v) => {
                            const vm = v[dayType];
                            return (
                              <div 
                                key={v.venueName}
                                className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-800 truncate">📍 {v.venueName}</span>
                                  <span className="text-xs font-extrabold text-blue-900">{formatCurrency(vm.revenue)}</span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <span>방문객: {vm.visitors > 0 ? `${formatNumber(vm.visitors)}명` : '-'}</span>
                                    {vm.lyVisitors > 0 && (
                                      <span className="text-[10px] text-purple-600 font-medium">(전년 {formatNumber(vm.lyVisitors)}명)</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-blue-600">
                                      {vm.spendPerGuest > 0 ? `객단가: ${formatCurrency(vm.spendPerGuest)}` : ''}
                                    </span>
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
                <div className="text-center py-12 text-gray-400">
                  선택한 기간에 해당하는 레저본부 부서 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 5. Footer Integrity Badge */}
      <div className="text-right">
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200 shadow-2xs">
          * 무결성 검증 (Zero-Dummy): 주중/주말(공휴일 포함) 실측 일별 데이터 1:1 직접 바인딩
        </span>
      </div>
    </div>
  );
}
