'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import { 
  Building2, Users, DollarSign, Calendar, TrendingUp, TrendingDown, 
  ArrowUpRight, Award, HelpCircle, Loader2, Sparkles, Filter, ChevronRight
} from 'lucide-react';

interface MetricDetail {
  revenue: number;
  lyRevenue: number;
  visitors: number;
  lyVisitors: number;
  spendPerGuest: number;
  lySpendPerGuest: number;
}

interface VenueData {
  venueName: string;
  teamName: string;
  categoryCode: string;
  total: MetricDetail;
  weekday: MetricDetail;
  weekend: MetricDetail;
  dailyTrends?: any[];
}

export default function VenueAnalyticsPage() {
  const { startMonth, endMonth } = useDateFilter();
  const [venues, setVenues] = useState<VenueData[]>([]);
  const [selectedVenueName, setSelectedVenueName] = useState<string>('all');
  const [dayType, setDayType] = useState<'total' | 'weekday' | 'weekend'>('total');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/venue-analytics?startMonth=${startMonth}&endMonth=${endMonth}`);
        const data = await res.json();
        if (!ignore && data.success && Array.isArray(data.venues)) {
          setVenues(data.venues);
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

  // Aggregate or Selected Venue Metrics
  const currentMetrics = useMemo(() => {
    if (venues.length === 0) {
      return {
        revenue: 0,
        lyRevenue: 0,
        visitors: 0,
        lyVisitors: 0,
        spendPerGuest: 0,
        lySpendPerGuest: 0,
      };
    }

    if (selectedVenueName !== 'all') {
      const v = venues.find(item => item.venueName === selectedVenueName);
      if (v) return v[dayType] || v.total;
    }

    // "All Venues" Aggregate
    let revenue = 0;
    let lyRevenue = 0;
    let visitors = 0;
    let lyVisitors = 0;

    venues.forEach(v => {
      const metric = v[dayType] || v.total;
      revenue += (metric.revenue || 0);
      lyRevenue += (metric.lyRevenue || 0);
      visitors += (metric.visitors || 0);
      lyVisitors += (metric.lyVisitors || 0);
    });

    const spendPerGuest = visitors > 0 ? Math.round(revenue / visitors) : 0;
    const lySpendPerGuest = lyVisitors > 0 ? Math.round(lyRevenue / lyVisitors) : 0;

    return { revenue, lyRevenue, visitors, lyVisitors, spendPerGuest, lySpendPerGuest };
  }, [venues, selectedVenueName, dayType]);

  // Weekday vs Weekend Comparison for Current Selection
  const comparisonMetrics = useMemo(() => {
    let weekday = { revenue: 0, visitors: 0, spendPerGuest: 0 };
    let weekend = { revenue: 0, visitors: 0, spendPerGuest: 0 };

    if (selectedVenueName !== 'all') {
      const v = venues.find(item => item.venueName === selectedVenueName);
      if (v) {
        weekday = { ...v.weekday };
        weekend = { ...v.weekend };
      }
    } else {
      venues.forEach(v => {
        weekday.revenue += (v.weekday?.revenue || 0);
        weekday.visitors += (v.weekday?.visitors || 0);
        weekend.revenue += (v.weekend?.revenue || 0);
        weekend.visitors += (v.weekend?.visitors || 0);
      });
      weekday.spendPerGuest = weekday.visitors > 0 ? Math.round(weekday.revenue / weekday.visitors) : 0;
      weekend.spendPerGuest = weekend.visitors > 0 ? Math.round(weekend.revenue / weekend.visitors) : 0;
    }

    return { weekday, weekend };
  }, [venues, selectedVenueName]);

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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/50 min-h-screen">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              영업장별 분석 (방문객 & 객단가)
            </h1>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
              {dateRangeLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            선택한 기간 및 영업장의 실측 매출, 당해/전년 방문객 수와 1인당 객단가를 주중/주말(공휴일 포함) 기준으로 교차 분석합니다.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <GlobalDateSelector />
        </div>
      </div>

      {/* 2. Filters Bar (Venue Selector & Day Type Toggle) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Venue Select Dropdown */}
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> 영업장 선택:
          </span>
          <select
            value={selectedVenueName}
            onChange={(e) => setSelectedVenueName(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          >
            <option value="all">🏢 전체 영업장 통합 (레저본부)</option>
            {venues.map((v) => (
              <option key={v.venueName} value={v.venueName}>
                {v.venueName} ({v.teamName || '레저'})
              </option>
            ))}
          </select>
        </div>

        {/* Day Type Segmented Buttons (공휴일 = 주말 산입) */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setDayType('total')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              dayType === 'total'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            전체 기간
          </button>
          <button
            onClick={() => setDayType('weekday')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              dayType === 'weekday'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            주중 (월~금, 공휴일 제외)
          </button>
          <button
            onClick={() => setDayType('weekend')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              dayType === 'weekend'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            주말 (토·일 & 법정공휴일)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-gray-600">영업장별 실적 및 방문객 데이터를 집계 중입니다...</p>
        </div>
      ) : (
        <>
          {/* 3. 4대 핵심 KPI 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: 영업장 매출액 */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">선택 기간 매출액</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">
                {formatCurrency(currentMetrics.revenue)}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">전년 동기: {formatCurrency(currentMetrics.lyRevenue)}</span>
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
                <span className="text-xs font-bold text-gray-500">당해 방문객 (이용객)</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">
                {currentMetrics.visitors > 0 ? `${formatNumber(currentMetrics.visitors)} 명` : '실측 대기 중'}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">선택 구분: {dayType === 'total' ? '전체' : dayType === 'weekday' ? '주중' : '주말(공휴일)'}</span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">실측 집계</span>
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
                <span className="text-xs font-bold text-indigo-600">1인당 평균 객단가</span>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-indigo-600 mt-2">
                {currentMetrics.spendPerGuest > 0 ? `${formatCurrency(currentMetrics.spendPerGuest)}` : '방문객 집계 시 산출'}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {currentMetrics.lySpendPerGuest > 0 ? `전년: ${formatCurrency(currentMetrics.lySpendPerGuest)}` : '매출 ÷ 방문객 수'}
                </span>
                {spendGrowth !== null && (
                  <span className={`font-bold flex items-center ${Number(spendGrowth) >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {Number(spendGrowth) >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                    {spendGrowth}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. 주중 vs 주말 (공휴일 포함) 분리 비교 패널 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                주중 vs 주말(공휴일 포함) 트래픽 및 객단가 비교
              </h2>
              <span className="text-xs text-gray-400">
                * 벨포레 운영 정책: 법정 공휴일 및 대체 공휴일은 자동으로 주말 통계에 산입됩니다.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 주중 카드 */}
              <div className="p-5 bg-indigo-50/40 rounded-xl border border-indigo-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-900">주중 (월~금, 공휴일 제외)</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">평일 트래픽</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 bg-white rounded-lg shadow-2xs">
                    <p className="text-[11px] text-gray-500 font-semibold">주중 매출</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(comparisonMetrics.weekday.revenue)}</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-2xs">
                    <p className="text-[11px] text-gray-500 font-semibold">주중 방문객</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {comparisonMetrics.weekday.visitors > 0 ? `${formatNumber(comparisonMetrics.weekday.visitors)}명` : '-'}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-2xs">
                    <p className="text-[11px] text-indigo-600 font-semibold">주중 객단가</p>
                    <p className="text-sm font-bold text-indigo-600 mt-1">
                      {comparisonMetrics.weekday.spendPerGuest > 0 ? formatCurrency(comparisonMetrics.weekday.spendPerGuest) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 주말(공휴일 포함) 카드 */}
              <div className="p-5 bg-rose-50/40 rounded-xl border border-rose-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-rose-900">주말 (토·일 & 법정 공휴일)</span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded">피크 트래픽</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 bg-white rounded-lg shadow-2xs">
                    <p className="text-[11px] text-gray-500 font-semibold">주말 매출</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(comparisonMetrics.weekend.revenue)}</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-2xs">
                    <p className="text-[11px] text-gray-500 font-semibold">주말 방문객</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {comparisonMetrics.weekend.visitors > 0 ? `${formatNumber(comparisonMetrics.weekend.visitors)}명` : '-'}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-2xs">
                    <p className="text-[11px] text-rose-600 font-semibold">주말 객단가</p>
                    <p className="text-sm font-bold text-rose-600 mt-1">
                      {comparisonMetrics.weekend.spendPerGuest > 0 ? formatCurrency(comparisonMetrics.weekend.spendPerGuest) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. 영업장별 객단가 및 매출 랭킹 비교 테이블 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">레저본부 산하 영업장별 실적 및 객단가 일람표</h2>
                <p className="text-xs text-gray-400 mt-0.5">선택 기간({dateRangeLabel}) 기준 영업장별 지표를 비교 분석합니다.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase bg-gray-50/50">
                    <th className="py-3 px-4">영업장명</th>
                    <th className="py-3 px-4">소속 부서</th>
                    <th className="py-3 px-4 text-right">매출액 (실적)</th>
                    <th className="py-3 px-4 text-right">전년 동기 매출</th>
                    <th className="py-3 px-4 text-right">당해 방문객</th>
                    <th className="py-3 px-4 text-right">전년 방문객</th>
                    <th className="py-3 px-4 text-right">1인당 객단가</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {venues.map((v) => {
                    const m = v[dayType] || v.total;
                    const isSelected = selectedVenueName === v.venueName;
                    return (
                      <tr 
                        key={v.venueName} 
                        onClick={() => setSelectedVenueName(isSelected ? 'all' : v.venueName)}
                        className={`hover:bg-indigo-50/30 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/60 font-semibold' : ''}`}
                      >
                        <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                          {isSelected && <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />}
                          {v.venueName}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500">{v.teamName || '레저본부'}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900">{formatCurrency(m.revenue)}</td>
                        <td className="py-3.5 px-4 text-right text-xs text-gray-400">{formatCurrency(m.lyRevenue)}</td>
                        <td className="py-3.5 px-4 text-right text-gray-700">
                          {m.visitors > 0 ? `${formatNumber(m.visitors)}명` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-gray-400">
                          {m.lyVisitors > 0 ? `${formatNumber(m.lyVisitors)}명` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-indigo-600">
                          {m.spendPerGuest > 0 ? formatCurrency(m.spendPerGuest) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {venues.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        선택 기간에 집계된 영업장 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 6. 무결성 보증 뱃지 */}
      <div className="text-right">
        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-200 shadow-2xs">
          * 무결성 검증 (Zero-Dummy): V5 백엔드 실측 매출 및 방문객 데이터 기반 1:1 연동 (공휴일=주말 규칙 적용)
        </span>
      </div>
    </div>
  );
}
