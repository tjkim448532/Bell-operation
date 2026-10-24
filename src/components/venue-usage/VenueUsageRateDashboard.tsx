"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Calculator, 
  Users, 
  BedDouble, 
  Car, 
  TrendingUp, 
  Trophy, 
  Store, 
  Download, 
  Search, 
  HelpCircle, 
  AlertCircle, 
  RefreshCw,
  Percent,
  Coins,
  ShieldCheck,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDate } from '@/contexts/DateContext';
import GlobalDatePicker from '@/components/GlobalDatePicker';
import { formatNumber } from '@/lib/utils';
import type { VenueUsageRateResponse, VenueUsageFacility } from '@/types/venue-usage';

type CategoryFilter = 'ACTIVE_ONLY' | 'ALL' | 'TICKET' | 'MOTO' | 'FNB';
type SortField = 'USAGE_RATE' | 'VISITORS' | 'REVENUE' | 'UNIT_PRICE';
type SortDirection = 'ASC' | 'DESC';

export default function VenueUsageRateDashboard() {
  const { startDate, endDate, isRange } = useDate();

  const [data, setData] = useState<VenueUsageRateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ACTIVE_ONLY');
  const [sortField, setSortField] = useState<SortField>('USAGE_RATE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('DESC');

  // Fetch API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qStart = startDate || '2026-09-01';
      const qEnd = (isRange && endDate) ? endDate : qStart;
      const res = await fetch(`/api/venue-usage-rate?startDate=${qStart}&endDate=${qEnd}`);
      if (!res.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
      }
      const json: VenueUsageRateResponse = await res.json();
      if (!json.success) {
        throw new Error(json.error || '데이터를 불러오지 못했습니다.');
      }
      setData(json);
    } catch (err: any) {
      console.error('Failed to load venue usage rate data:', err);
      setError(err?.message || '매장별 이용률 데이터를 가져오지 못했습니다.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, isRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered & Sorted Facilities
  const filteredFacilities = useMemo(() => {
    if (!data?.facilities) return [];

    let list = [...data.facilities];

    // Category Filter
    if (categoryFilter === 'ACTIVE_ONLY') {
      list = list.filter((f) => f.visitors > 0);
    } else if (categoryFilter === 'TICKET') {
      list = list.filter((f) => f.categoryCode === 'TICKET' || f.categoryName.includes('레저'));
    } else if (categoryFilter === 'MOTO') {
      list = list.filter((f) => f.categoryCode === 'MOTO' || f.categoryName.includes('모토'));
    } else if (categoryFilter === 'FNB') {
      list = list.filter((f) => f.categoryCode === 'FNB' || f.categoryName.includes('식음'));
    }

    // Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      list = list.filter((f) => 
        f.facilityName.toLowerCase().includes(query) ||
        f.categoryName.toLowerCase().includes(query)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === 'USAGE_RATE') {
        valA = a.usageRate;
        valB = b.usageRate;
      } else if (sortField === 'VISITORS') {
        valA = a.visitors;
        valB = b.visitors;
      } else if (sortField === 'REVENUE') {
        valA = a.revenue;
        valB = b.revenue;
      } else if (sortField === 'UNIT_PRICE') {
        valA = a.unitPrice || 0;
        valB = b.unitPrice || 0;
      }

      if (valA === valB) {
        return b.visitors - a.visitors;
      }
      return sortDirection === 'DESC' ? valB - valA : valA - valB;
    });

    return list;
  }, [data?.facilities, categoryFilter, searchQuery, sortField, sortDirection]);

  // Top 10 for Chart
  const chartFacilities = useMemo(() => {
    if (!data?.facilities) return [];
    return data.facilities
      .filter((f) => f.visitors > 0)
      .slice(0, 10)
      .reverse(); // For ECharts vertical axis order
  }, [data?.facilities]);

  // ECharts Option
  const chartOption = useMemo(() => {
    if (chartFacilities.length === 0) return {};

    const names = chartFacilities.map((f) => f.facilityName);
    const rates = chartFacilities.map((f) => f.usageRate);
    const visitors = chartFacilities.map((f) => f.visitors);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!params || !params[0]) return '';
          const idx = params[0].dataIndex;
          const target = chartFacilities[idx];
          if (!target) return '';
          return `
            <div style="font-family: Pretendard, sans-serif; padding: 4px;">
              <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #1e293b;">
                ${target.facilityName} <span style="font-size: 11px; color: #64748b; font-weight: normal;">(${target.categoryName})</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                <span style="color: #64748b;">공식 이용률:</span>
                <span style="font-weight: 700; color: #2563eb;">${target.usageRate}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                <span style="color: #64748b;">이용 고객수:</span>
                <span style="font-weight: 600; color: #0f172a;">${formatNumber(target.visitors)}명</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px;">
                <span style="color: #64748b;">매출액:</span>
                <span style="font-weight: 600; color: #0f172a;">${formatNumber(target.revenue)}원</span>
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 20,
        left: 20,
        right: 50,
        bottom: 10,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
          color: '#64748b',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: '#f1f5f9', type: 'dashed' },
        },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          color: '#334155',
          fontSize: 12,
          fontWeight: 600,
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
      },
      series: [
        {
          name: '이용률(%)',
          type: 'bar',
          data: rates,
          barMaxWidth: 24,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#60a5fa' },
              ],
            },
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const idx = params.dataIndex;
              const v = visitors[idx];
              return `${params.value}% (${formatNumber(v)}명)`;
            },
            fontSize: 11,
            fontWeight: 700,
            color: '#1e3a8a',
          },
        },
      ],
    };
  }, [chartFacilities]);

  // Excel Export
  const handleExportExcel = () => {
    if (!data?.facilities || data.facilities.length === 0) return;

    const rows = filteredFacilities.map((f, idx) => ({
      순위: idx + 1,
      매장영업장명: f.facilityName,
      카테고리: f.categoryName,
      '실측이용객수(명)': f.visitors,
      '공식이용률(%)': `${f.usageRate}%`,
      '매출액(원)': f.revenue,
      '객단가(원)': f.unitPrice ? f.unitPrice : '-',
      '전년이용객수(명)': f.lyVisitors > 0 ? f.lyVisitors : '-',
      'YoY증감률(%)': f.visitorGrowth !== null ? `${f.visitorGrowth}%` : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '매장별이용률');

    const fileName = `벨포레_매장별_이용률_${data.period.startDate}_${data.period.endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'));
    } else {
      setSortField(field);
      setSortDirection('DESC');
    }
  };

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'DESC' ? (
      <ChevronDown className="inline-block w-3.5 h-3.5 ml-1 text-blue-600" />
    ) : (
      <ChevronUp className="inline-block w-3.5 h-3.5 ml-1 text-blue-600" />
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Date Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 lg:p-8 shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              <Calculator className="w-3.5 h-3.5" />
              모수 기반 공식 이용률 SSOT
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              실측 데이터 보증 (Zero-Mock)
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            매장별 이용률 계산 대시보드
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            숙박객(골프 제외) 및 데일리 워크인 고객을 통합 모수로 하여 각 영업장의 실질 고객 이용률을 정밀 산출합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <GlobalDatePicker />
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Formula & Rule Explain Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 rounded-2xl p-5 border border-blue-200/80">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <div className="font-bold text-slate-900 text-sm">
              📐 공식 산출 기준 및 분모·분자 정의 (SSOT)
            </div>
            <p>
              • <strong>통합 기준 모수 (분모)</strong> = <strong>숙박객(PMS 정규 체크인 투숙객)</strong> + <strong>데일리 워크인 고객(주차 게이트 당일 방문객)</strong>
            </p>
            <p>
              • <strong>골프 내장객 분리</strong>: 순수 골프 라운드 내장객은 일반 리조트 부대시설 모수에서 철저히 제외하여 모수 왜곡을 방지합니다.
            </p>
            <p>
              • <strong>영업장 이용률 (%)</strong> = <strong>(각 영업장 실측 이용 고객수 ÷ 총 기준 모수) × 100</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
          <p className="text-slate-600 font-bold text-sm">V6 마트에서 영업장별 이용률을 산출하는 중입니다...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <div className="font-bold text-sm">데이터 조회 실패</div>
            <div className="text-xs mt-1 text-rose-700">{error}</div>
            <button
              onClick={fetchData}
              className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {!isLoading && data && (
        <>
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: 총 기준 모수 (분모) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  총 기준 모수 (분모)
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  숙박 + 워크인
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {formatNumber(data.population.totalBase)}
                <span className="text-base font-bold text-slate-600 ml-1">명</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <BedDouble className="w-3.5 h-3.5 text-indigo-500" /> 투숙객:
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatNumber(data.population.roomGuests)}명 ({data.population.roomGuestsShare}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Car className="w-3.5 h-3.5 text-emerald-500" /> 데일리 워크인:
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatNumber(data.population.walkinGuests)}명 ({data.population.walkinGuestsShare}%)
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 text-right pt-0.5">
                  ⛳ 골프 {formatNumber(data.population.golfExcluded)}명 완전 격리
                </div>
              </div>
            </div>

            {/* Card 2: 최고 이용률 매장 (1위) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  최고 이용률 매장 (1위)
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  TOP 1
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight truncate">
                {data.summary.topFacility?.name || '-'}
              </div>
              <div className="mt-2 text-2xl font-black text-blue-600 tracking-tight tabular-nums">
                {data.summary.topFacility?.usageRate !== undefined ? `${data.summary.topFacility.usageRate}%` : '-'}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>실측 이용객:</span>
                <span className="font-bold text-slate-800">
                  {data.summary.topFacility ? `${formatNumber(data.summary.topFacility.visitors)}명` : '-'}
                </span>
              </div>
            </div>

            {/* Card 3: 레저/발권 매장 총 이용객 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-emerald-600" />
                  전체 영업장 총 이용객
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  연인원 합산
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {formatNumber(data.summary.totalFacilityVisitors)}
                <span className="text-base font-bold text-slate-600 ml-1">명</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>모수 대비 총 발권 배수:</span>
                <span className="font-bold text-emerald-700">
                  {data.population.totalBase > 0
                    ? `${(data.summary.totalFacilityVisitors / data.population.totalBase).toFixed(2)}배`
                    : '-'}
                </span>
              </div>
            </div>

            {/* Card 4: 부대시설 총 발생 매출 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-purple-600" />
                  부대시설 총 매출액
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                  조회 기간 실적
                </span>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {formatNumber(data.summary.totalRevenue)}
                <span className="text-base font-bold text-slate-600 ml-1">원</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>조회 기간:</span>
                <span className="font-bold text-slate-700">{data.period.label}</span>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  주요 매장 이용률 랭킹 TOP 10
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  모수 {formatNumber(data.population.totalBase)}명 대비 각 매장별 실측 고객 이용률(%)
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                실측 발권/탑승 인원 기준
              </span>
            </div>

            <div className="h-[380px] w-full">
              <ReactECharts
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>

          {/* Table & Controls Section */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-xs space-y-5">
            {/* Filter and Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setCategoryFilter('ACTIVE_ONLY')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === 'ACTIVE_ONLY'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  이용객 집계 매장 ({data.facilities.filter((f) => f.visitors > 0).length})
                </button>
                <button
                  onClick={() => setCategoryFilter('TICKET')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === 'TICKET'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  레저 & 어트랙션
                </button>
                <button
                  onClick={() => setCategoryFilter('MOTO')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === 'MOTO'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  모토아레나
                </button>
                <button
                  onClick={() => setCategoryFilter('FNB')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === 'FNB'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  식음 & F&B
                </button>
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  전체 영업장 ({data.facilities.length})
                </button>
              </div>

              {/* Search & Export */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="매장명 검색..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition whitespace-nowrap"
                  title="엑셀 다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                  엑셀 다운로드
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4 w-14 text-center">순위</th>
                    <th className="py-3 px-4">매장 / 영업장명</th>
                    <th className="py-3 px-3">카테고리</th>
                    <th
                      onClick={() => handleSort('VISITORS')}
                      className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                    >
                      실측 이용객 (명) {renderSortArrow('VISITORS')}
                    </th>
                    <th
                      onClick={() => handleSort('USAGE_RATE')}
                      className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none w-44"
                    >
                      공식 이용률 (%) {renderSortArrow('USAGE_RATE')}
                    </th>
                    <th
                      onClick={() => handleSort('REVENUE')}
                      className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                    >
                      매출액 (원) {renderSortArrow('REVENUE')}
                    </th>
                    <th
                      onClick={() => handleSort('UNIT_PRICE')}
                      className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                    >
                      객단가 (원) {renderSortArrow('UNIT_PRICE')}
                    </th>
                    <th className="py-3 px-4 text-right">전년 이용객</th>
                    <th className="py-3 px-4 text-right">YoY 증감</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredFacilities.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                        조건에 맞는 영업장 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredFacilities.map((f, index) => {
                      const maxRate = filteredFacilities[0]?.usageRate || 1;
                      const barWidth = maxRate > 0 ? Math.min(100, Math.round((f.usageRate / maxRate) * 100)) : 0;

                      return (
                        <tr
                          key={`${f.facilityName}-${index}`}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-center tabular-nums">
                            {index === 0 && f.visitors > 0 ? (
                              <span className="w-6 h-6 rounded-full inline-flex items-center justify-center bg-amber-400 text-white font-black text-xs shadow-xs">
                                1
                              </span>
                            ) : index === 1 && f.visitors > 0 ? (
                              <span className="w-6 h-6 rounded-full inline-flex items-center justify-center bg-slate-400 text-white font-bold text-xs">
                                2
                              </span>
                            ) : index === 2 && f.visitors > 0 ? (
                              <span className="w-6 h-6 rounded-full inline-flex items-center justify-center bg-amber-700 text-white font-bold text-xs">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-semibold">{index + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {f.facilityName}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {f.categoryName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900">
                            {f.visitors > 0 ? `${formatNumber(f.visitors)}명` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="font-black text-blue-600 text-sm w-12 text-right">
                                {f.usageRate}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900">
                            {f.revenue > 0 ? `${formatNumber(f.revenue)}원` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700">
                            {f.unitPrice ? `${formatNumber(f.unitPrice)}원` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-500">
                            {f.lyVisitors > 0 ? `${formatNumber(f.lyVisitors)}명` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            {f.visitorGrowth !== null ? (
                              <span
                                className={`font-bold ${
                                  f.visitorGrowth > 0
                                    ? 'text-rose-600'
                                    : f.visitorGrowth < 0
                                    ? 'text-blue-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {f.visitorGrowth > 0 ? `+${f.visitorGrowth}%` : `${f.visitorGrowth}%`}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Note footer */}
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2">
              <span>
                * F&B(식음) 및 잡화 매장은 판매 수량 집계 룰(is_visitor_count = 0)에 따라 이용객수가 표기되지 않으며, 매출액만 표시됩니다.
              </span>
              <span>
                기준 모수: {formatNumber(data.population.totalBase)}명 (숙박객 + 데일리 워크인)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
