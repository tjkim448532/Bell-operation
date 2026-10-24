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
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Utensils,
  Layers,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDate } from '@/contexts/DateContext';
import GlobalDatePicker from '@/components/GlobalDatePicker';
import { formatNumber } from '@/lib/utils';
import type {
  VenueUsageRateResponse,
  VenueUsageItem,
  VenueTrendMetric,
} from '@/types/venue-usage';

type SortField = 'USAGE_RATE' | 'VISITORS' | 'SHARE' | 'REVENUE' | 'UNIT_PRICE';
type SortDirection = 'ASC' | 'DESC';

export default function VenueUsageRateDashboard() {
  const { startDate, endDate, isRange } = useDate();

  const [data, setData] = useState<VenueUsageRateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Sorting for main venues table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('USAGE_RATE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('DESC');

  // Trend Chart State
  const [trendMode, setTrendMode] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');
  const [selectedTrendTarget, setSelectedTrendTarget] = useState<string>('OVERALL');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qStart = startDate || '';
      const qEnd = isRange && endDate ? endDate : qStart;
      const query = qStart ? `startDate=${qStart}&endDate=${qEnd}` : '';
      const res = await fetch(`/api/venue-usage-rate?${query}`);
      if (!res.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
      }
      const json: VenueUsageRateResponse = await res.json();
      if (!json.success || !json.denominator) {
        throw new Error(json.error || '매장별 이용률 완제품 데이터를 불러오지 못했습니다.');
      }
      setData(json);
      if (Array.isArray(json.dailyTrends) && json.dailyTrends.length > 1) {
        setTrendMode('DAILY');
      } else {
        setTrendMode('MONTHLY');
      }
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

  // Filtered & Sorted Venues (100% Pure Consumer - no math, only filtering/sorting pre-calculated fields)
  const filteredVenues = useMemo(() => {
    if (!data?.venues) return [];
    let list = [...data.venues];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (v) =>
          v.venueName.toLowerCase().includes(q) ||
          v.categoryName.toLowerCase().includes(q) ||
          v.partName.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === 'USAGE_RATE') {
        valA = a.usageRatePct;
        valB = b.usageRatePct;
      } else if (sortField === 'VISITORS') {
        valA = a.visitors;
        valB = b.visitors;
      } else if (sortField === 'SHARE') {
        valA = a.visitorSharePct;
        valB = b.visitorSharePct;
      } else if (sortField === 'REVENUE') {
        valA = a.revenue;
        valB = b.revenue;
      } else if (sortField === 'UNIT_PRICE') {
        valA = a.unitPrice ?? 0;
        valB = b.unitPrice ?? 0;
      }

      if (valA === valB) {
        return b.visitors - a.visitors;
      }
      return sortDirection === 'DESC' ? valB - valA : valA - valB;
    });

    return list;
  }, [data?.venues, searchQuery, sortField, sortDirection]);

  // Horizontal Bar Chart Option (Direct binding to venues[])
  const barChartOption = useMemo(() => {
    if (!data?.venues || data.venues.length === 0) return {};
    const chartList = [...data.venues].reverse();
    const names = chartList.map((v) => v.venueName);
    const usageRates = chartList.map((v) => v.usageRatePct);
    const lyRates = chartList.map((v) => v.lyUsageRatePct ?? 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const item: VenueUsageItem | undefined = chartList[idx];
          if (!item) return '';
          return `
            <div style="font-family: Pretendard, sans-serif; padding: 6px; min-width: 210px;">
              <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px; color: #0f172a;">
                ${item.venueName} <span style="font-size: 11px; color: #64748b; font-weight: 500;">(${item.partName})</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                <span style="color: #64748b;">모수 대비 이용률:</span>
                <span style="font-weight: 800; color: #2563eb;">${item.usageRatePct}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                <span style="color: #64748b;">전년 이용률:</span>
                <span style="font-weight: 600; color: #64748b;">${item.lyUsageRatePct !== null ? `${item.lyUsageRatePct}%` : '-'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                <span style="color: #64748b;">이용객 / 기준모수:</span>
                <span style="font-weight: 700; color: #0f172a;">${formatNumber(item.visitors)}명 / ${formatNumber(item.denominator)}명</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                <span style="color: #64748b;">전체 이용객 내 비중:</span>
                <span style="font-weight: 700; color: #059669;">${item.visitorSharePct}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span style="color: #64748b;">매출액:</span>
                <span style="font-weight: 700; color: #0f172a;">${formatNumber(item.revenue)}원</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: ['당해 이용률(%)', '전년 이용률(%)'],
        top: 0,
        right: 10,
        textStyle: { fontSize: 12, fontWeight: 600, color: '#475569' },
      },
      grid: {
        top: 36,
        left: 16,
        right: 75,
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
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          color: '#1e293b',
          fontSize: 12,
          fontWeight: 700,
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
      },
      series: [
        {
          name: '당해 이용률(%)',
          type: 'bar',
          data: usageRates,
          barMaxWidth: 18,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: '#2563eb',
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const item = chartList[params.dataIndex];
              return item ? `${item.usageRatePct}% (${formatNumber(item.visitors)}명)` : `${params.value}%`;
            },
            fontSize: 11,
            fontWeight: 700,
            color: '#1e3a8a',
          },
        },
        {
          name: '전년 이용률(%)',
          type: 'bar',
          data: lyRates,
          barMaxWidth: 14,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: '#cbd5e1',
          },
        },
      ],
    };
  }, [data?.venues]);

  // Trend Chart Option (dailyTrends[] / monthlyTrends[] direct binding)
  const activeTrendList = useMemo(() => {
    if (!data) return [];
    if (trendMode === 'DAILY' && Array.isArray(data.dailyTrends) && data.dailyTrends.length > 0) {
      return data.dailyTrends;
    }
    return Array.isArray(data.monthlyTrends) ? data.monthlyTrends : [];
  }, [data, trendMode]);

  const trendVenueNames = useMemo(() => {
    if (!data?.venues) return [];
    return data.venues.map((v) => v.venueName);
  }, [data?.venues]);

  const trendChartOption = useMemo(() => {
    if (activeTrendList.length === 0) return {};

    const labels = activeTrendList.map((pt) => pt.date || pt.month || pt.label || '');
    const poolSeries = activeTrendList.map((pt) => pt.targetPoolVisitors);
    const rateSeries = activeTrendList.map((pt) => {
      if (selectedTrendTarget === 'OVERALL') {
        return pt.overallUsageRatePct;
      }
      const vEntry = pt.venues?.[selectedTrendTarget];
      if (typeof vEntry === 'number') return vEntry;
      if (vEntry && typeof vEntry === 'object') return (vEntry as VenueTrendMetric).usageRatePct;
      return 0;
    });

    const targetLabel =
      selectedTrendTarget === 'OVERALL' ? '종합 이용률(%)' : `${selectedTrendTarget} 이용률(%)`;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['기준 모수(명)', targetLabel],
        top: 0,
        right: 10,
        textStyle: { fontSize: 12, fontWeight: 600, color: '#475569' },
      },
      grid: {
        top: 40,
        left: 20,
        right: 20,
        bottom: 16,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#475569', fontSize: 11, fontWeight: 600 },
      },
      yAxis: [
        {
          type: 'value',
          name: '기준 모수(명)',
          axisLabel: { color: '#64748b', fontSize: 11 },
          splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '이용률(%)',
          axisLabel: { formatter: '{value}%', color: '#2563eb', fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '기준 모수(명)',
          type: 'bar',
          yAxisIndex: 0,
          data: poolSeries,
          barMaxWidth: 28,
          itemStyle: {
            color: '#e2e8f0',
            borderRadius: [6, 6, 0, 0],
          },
        },
        {
          name: targetLabel,
          type: 'line',
          yAxisIndex: 1,
          data: rateSeries,
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: '#2563eb' },
          itemStyle: { color: '#2563eb' },
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%',
            fontSize: 11,
            fontWeight: 700,
            color: '#1d4ed8',
          },
        },
      ],
    };
  }, [activeTrendList, selectedTrendTarget]);

  // Excel Export
  const handleExportExcel = () => {
    if (!data?.venues || data.venues.length === 0) return;

    const mainRows = filteredVenues.map((v, idx) => ({
      순위: idx + 1,
      영업장명: v.venueName,
      소속본부: v.teamName,
      파트: v.partName,
      '이용객수(명)': v.visitors,
      '전년이용객수(명)': v.lyVisitors,
      '이용객증감(명)': v.visitorsDiff,
      '이용객증감률(%)': v.visitorsGrowthPct !== null ? `${v.visitorsGrowthPct}%` : '-',
      '기준모수(명)': v.denominator,
      '공식이용률(%)': `${v.usageRatePct}%`,
      '전년이용률(%)': v.lyUsageRatePct !== null ? `${v.lyUsageRatePct}%` : '-',
      '이용률증감(%p)': v.usageRateDiffPctp !== null ? `${v.usageRateDiffPctp}%p` : '-',
      '전체이용객내점유비중(%)': `${v.visitorSharePct}%`,
      '숙박단독대비이용률(%)': `${v.usageRateRoomOnlyPct}%`,
      '전사방문객대비이용률(%)': `${v.usageRateTotalResortPct}%`,
      '매출액(원)': v.revenue,
      '객단가(원)': v.unitPrice ?? '-',
      '모수1인당지출(원)': v.spendPerPoolGuest,
    }));

    const wb = XLSX.utils.book_new();
    const wsMain = XLSX.utils.json_to_sheet(mainRows);
    XLSX.utils.book_append_sheet(wb, wsMain, '매장별이용률_SSOT');

    if (Array.isArray(data.fnbAndOtherVenues) && data.fnbAndOtherVenues.length > 0) {
      const fnbRows = data.fnbAndOtherVenues.map((f, idx) => ({
        순번: idx + 1,
        매장명: f.venueName,
        구분: f.categoryName,
        소속본부: f.teamName,
        '주문수량(건)': f.itemQuantity,
        '모수대비주문비율(%)': f.orderRatePerPoolPct !== null ? `${f.orderRatePerPoolPct}%` : '-',
        '매출액(원)': f.revenue,
        '모수1인당식음지출(원)': f.spendPerPoolGuest,
      }));
      const wsFnb = XLSX.utils.json_to_sheet(fnbRows);
      XLSX.utils.book_append_sheet(wb, wsFnb, '식음및부대_참고');
    }

    const fileName = `벨포레_매장별_이용률_${data.period.startDate}_${data.period.endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
      <ChevronDown className="inline-block w-3.5 h-3.5 ml-0.5 text-blue-600" />
    ) : (
      <ChevronUp className="inline-block w-3.5 h-3.5 ml-0.5 text-blue-600" />
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Date Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-3xl p-6 lg:p-8 shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              <Calculator className="w-3.5 h-3.5" />
              V6 SSOT 완제품 직결 (/api/v6/report/venue-usage-rate)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Zero-Proxy · 최대잔여법 100.0% 보정
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            매장별 이용률 계산 대시보드
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            숙박객(골프 중복 제외) + 데일리 워크인 고객을 통합 모수로 하여 각 영업장 이용 고객 비율을 산출합니다.
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

      {/* SSOT Formula Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 rounded-2xl p-5 border border-blue-200/80">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900 text-sm">
              📐 {data?.ssotFormula || '모수(targetPoolVisitors) = 숙박객(골프제외: room_total_guests - room_golf_synergy_guests) + 데일리 워크인(parking_walkin_visitors)'}
            </div>
            {data?.denominator && (
              <p className="text-slate-600">
                • <strong>모수 상세 산식 ({data.period.startDate === data.period.endDate ? data.period.targetDate : `${data.period.startDate} ~ ${data.period.endDate}`})</strong>: 전체 숙박객{' '}
                <strong>{formatNumber(data.denominator.roomTotalGuests)}명</strong>({formatNumber(data.denominator.roomSoldUnits)}실) − 숙박·골프 중복{' '}
                <strong>{formatNumber(data.denominator.roomGolfSynergyGuests)}명</strong>({formatNumber(data.denominator.roomGolfSynergyRooms)}실) ={' '}
                <strong className="text-indigo-700">숙박객(골프제외) {formatNumber(data.denominator.roomGuestsExGolf)}명 ({data.denominator.roomGuestsExGolfSharePct}%)</strong> +{' '}
                <strong className="text-emerald-700">데일리 워크인 {formatNumber(data.denominator.parkingWalkinVisitors)}명 ({data.denominator.walkinSharePct}%)</strong> ={' '}
                <strong className="text-blue-700 underline">최종 모수 {formatNumber(data.denominator.targetPoolVisitors)}명</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
          <p className="text-slate-600 font-bold text-sm">V6 매장별 이용률 완제품 데이터를 불러오는 중입니다...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <div className="font-bold text-sm">데이터 조회 실패 (Fail-Loudly)</div>
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
          {/* 1. 상단 4대 KPI 요약 카드 (denominator & summary 직결) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: 리조트 이용 모수 (denominator.targetPoolVisitors) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    리조트 이용 모수 (분모)
                  </span>
                  {data.denominator.targetPoolGrowthPct !== null && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        data.denominator.targetPoolGrowthPct >= 0
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      YoY {data.denominator.targetPoolGrowthPct > 0 ? '+' : ''}
                      {data.denominator.targetPoolGrowthPct}%
                    </span>
                  )}
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {formatNumber(data.denominator.targetPoolVisitors)}
                  <span className="text-base font-bold text-slate-600 ml-1">명</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <BedDouble className="w-3.5 h-3.5 text-indigo-500" /> 숙박객(골프제외):
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatNumber(data.denominator.roomGuestsExGolf)}명 ({data.denominator.roomGuestsExGolfSharePct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Car className="w-3.5 h-3.5 text-emerald-500" /> 데일리 워크인:
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatNumber(data.denominator.parkingWalkinVisitors)}명 ({data.denominator.walkinSharePct}%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                  전체 숙박 {formatNumber(data.denominator.roomTotalGuests)}명 중 골프 중복{' '}
                  {formatNumber(data.denominator.roomGolfSynergyGuests)}명 제외 (전년 모수{' '}
                  {formatNumber(data.denominator.lyTargetPoolVisitors)}명)
                </div>
              </div>
            </div>

            {/* KPI 2: 영업장 총 이용객 (연인원, summary.totalVenueVisitors) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-emerald-600" />
                    영업장 총 이용객 (연인원)
                  </span>
                  {data.summary.totalVenueVisitorsGrowthPct !== null && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        data.summary.totalVenueVisitorsGrowthPct >= 0
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      YoY {data.summary.totalVenueVisitorsGrowthPct > 0 ? '+' : ''}
                      {data.summary.totalVenueVisitorsGrowthPct}%
                    </span>
                  )}
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                  {formatNumber(data.summary.totalVenueVisitors)}
                  <span className="text-base font-bold text-slate-600 ml-1">명</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">전년 동기 이용객:</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatNumber(data.summary.lyTotalVenueVisitors)}명 (
                    {data.summary.totalVenueVisitorsDiff > 0 ? '+' : ''}
                    {formatNumber(data.summary.totalVenueVisitorsDiff)}명)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">영업장 합계 매출:</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatNumber(data.summary.totalVenueRevenue)}원
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: 종합 이용률 / 1인당 평균 이용 매장 수 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    종합 이용률 / 1인당 이용 매장
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    복수 매장 방문 반영
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-600 tracking-tight tabular-nums">
                    {data.summary.overallUsageRatePct}%
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    / 1인당 평균 {data.summary.avgVenuesPerGuest}개
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">전년 종합 이용률:</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {data.summary.lyOverallUsageRatePct !== null
                      ? `${data.summary.lyOverallUsageRatePct}%`
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">전년 대비 증감(%p):</span>
                  <span
                    className={`font-bold tabular-nums ${
                      (data.summary.overallUsageRateDiffPctp ?? 0) >= 0
                        ? 'text-rose-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {data.summary.overallUsageRateDiffPctp !== null
                      ? `${data.summary.overallUsageRateDiffPctp > 0 ? '+' : ''}${data.summary.overallUsageRateDiffPctp}%p`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: 최다 이용 영업장 (summary.topVenueName) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    최다 이용 영업장 (1위)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    TOP 1
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight truncate">
                  {data.summary.topVenueName || '-'}
                </div>
                <div className="mt-1 text-2xl font-black text-blue-600 tracking-tight tabular-nums">
                  이용률 {data.summary.topVenueUsageRatePct}%
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                <span className="text-slate-500">실측 이용 고객수:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatNumber(data.summary.topVenueVisitors)}명
                </span>
              </div>
            </div>
          </div>

          {/* 마운틴카트(전체) 통합 요약 카드 (mountainCartCombined 직결) */}
          {data.mountainCartCombined && (
            <div className="bg-slate-900 text-white rounded-3xl p-5 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base">{data.mountainCartCombined.venueName} 통합 실적</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-200 font-semibold">
                      그랜드포렛 + 미니포렛 합산 SSOT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    기준 모수 {formatNumber(data.mountainCartCombined.denominator)}명 대비 통합 카트 이용률
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 flex-wrap tabular-nums">
                <div>
                  <div className="text-[11px] text-slate-400">통합 이용객</div>
                  <div className="text-lg font-black text-white">
                    {formatNumber(data.mountainCartCombined.visitors)}명{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (전년 {formatNumber(data.mountainCartCombined.lyVisitors)}명)
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">통합 이용률</div>
                  <div className="text-lg font-black text-amber-400">
                    {data.mountainCartCombined.usageRatePct}%{' '}
                    {data.mountainCartCombined.usageRateDiffPctp !== null && (
                      <span className="text-xs font-bold text-emerald-400">
                        ({data.mountainCartCombined.usageRateDiffPctp > 0 ? '+' : ''}
                        {data.mountainCartCombined.usageRateDiffPctp}%p)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">통합 매출액</div>
                  <div className="text-lg font-black text-white">
                    {formatNumber(data.mountainCartCombined.revenue)}원
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. 영업장별 이용률 비교 바 차트 (venues[] 직결) */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  영업장별 이용률 비교 (당해 vs 전년)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  리조트 이용 모수({formatNumber(data.denominator.targetPoolVisitors)}명) 대비 각 영업장 이용률(%) 및 전년 동기 비교
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                단위: % (모수 대비 이용객 비율)
              </span>
            </div>

            <div className="h-[380px] w-full">
              <ReactECharts
                option={barChartOption}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>

          {/* 3. 메인 영업장별 이용률 상세 테이블 (venues[] 직결) */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-600" />
                  영업장별 이용률 정밀 분석표
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  전체 이용객 내 점유 비중(%)은 최대잔여법으로 합계 100.0% 보정이 완료된 백엔드 완제품 수치입니다.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="영업장명 또는 파트 검색..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  엑셀 다운로드
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold whitespace-nowrap">
                    <th className="py-3.5 px-3 text-center w-12">순위</th>
                    <th className="py-3.5 px-4">영업장명</th>
                    <th className="py-3.5 px-3">소속 / 파트</th>
                    <th
                      onClick={() => handleSort('VISITORS')}
                      className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                    >
                      이용객 수 {renderSortArrow('VISITORS')}
                    </th>
                    <th className="py-3.5 px-3 text-right">기준 모수</th>
                    <th
                      onClick={() => handleSort('USAGE_RATE')}
                      className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                    >
                      공식 이용률 (%) {renderSortArrow('USAGE_RATE')}
                    </th>
                    <th className="py-3.5 px-3 text-right">전년 이용률 / 증감</th>
                    <th
                      onClick={() => handleSort('SHARE')}
                      className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                    >
                      이용객 점유비중 {renderSortArrow('SHARE')}
                    </th>
                    <th className="py-3.5 px-3 text-right">숙박단독 / 전사대비</th>
                    <th
                      onClick={() => handleSort('REVENUE')}
                      className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                    >
                      매출액 (원) {renderSortArrow('REVENUE')}
                    </th>
                    <th
                      onClick={() => handleSort('UNIT_PRICE')}
                      className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                    >
                      객단가 / 모수당지출 {renderSortArrow('UNIT_PRICE')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredVenues.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-semibold">
                        조건에 맞는 영업장 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredVenues.map((v, index) => (
                      <tr
                        key={`${v.venueName}-${index}`}
                        className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                      >
                        <td className="py-3 px-3 text-center tabular-nums">
                          {index < 3 && v.visitors > 0 ? (
                            <span
                              className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-white font-black text-xs ${
                                index === 0
                                  ? 'bg-amber-400'
                                  : index === 1
                                  ? 'bg-slate-400'
                                  : 'bg-amber-700'
                              }`}
                            >
                              {index + 1}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">{index + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{v.venueName}</span>
                            {v.isExperienceSubVenue && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                체험 전환 {v.conversionFromRanchPct != null ? `${v.conversionFromRanchPct}%` : '-'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {v.teamName} · {v.partName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          <div className="font-bold text-slate-900">{formatNumber(v.visitors)}명</div>
                          <div className="text-[10px] text-slate-400">
                            전년 {formatNumber(v.lyVisitors)}명 (
                            {v.visitorsGrowthPct !== null
                              ? `${v.visitorsGrowthPct > 0 ? '+' : ''}${v.visitorsGrowthPct}%`
                              : '-'}
                            )
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-500">
                          {formatNumber(v.denominator)}명
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <span className="font-black text-blue-600 text-sm">{v.usageRatePct}%</span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          <div className="text-slate-700 font-semibold">
                            {v.lyUsageRatePct !== null ? `${v.lyUsageRatePct}%` : '-'}
                          </div>
                          {v.usageRateDiffPctp !== null && (
                            <div
                              className={`text-[10px] font-bold ${
                                v.usageRateDiffPctp > 0
                                  ? 'text-rose-600'
                                  : v.usageRateDiffPctp < 0
                                  ? 'text-blue-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {v.usageRateDiffPctp > 0 ? `+${v.usageRateDiffPctp}%p` : `${v.usageRateDiffPctp}%p`}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-700">
                          {v.visitorSharePct}%
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-[11px] text-slate-500">
                          <div>숙박대비 {v.usageRateRoomOnlyPct}%</div>
                          <div>전사대비 {v.usageRateTotalResortPct}%</div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                          {formatNumber(v.revenue)}원
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          <div className="font-semibold text-slate-800">
                            {v.unitPrice !== null ? `${formatNumber(v.unitPrice)}원` : '-'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            모수당 {formatNumber(v.spendPerPoolGuest)}원
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. 일별 / 월별 이용률 추이 차트 (dailyTrends[], monthlyTrends[] 직결) */}
          {activeTrendList.length > 0 && (
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    기간별 모수 및 이용률 추이
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    일별·월별 기준 모수(targetPoolVisitors)와 영업장 이용률(usageRatePct) 추이
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {Array.isArray(data.dailyTrends) && data.dailyTrends.length > 0 && (
                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                      <button
                        onClick={() => setTrendMode('DAILY')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          trendMode === 'DAILY'
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        일별 추이
                      </button>
                      <button
                        onClick={() => setTrendMode('MONTHLY')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          trendMode === 'MONTHLY'
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        월별 추이
                      </button>
                    </div>
                  )}

                  <select
                    value={selectedTrendTarget}
                    onChange={(e) => setSelectedTrendTarget(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OVERALL">종합 이용률 (전체 합산)</option>
                    {trendVenueNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-[340px] w-full">
                <ReactECharts
                  option={trendChartOption}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </div>
            </div>
          )}

          {/* 5. 식음(F&B)·카페·연회 참고 섹션 (fnbAndOtherVenues[] 직결) */}
          {Array.isArray(data.fnbAndOtherVenues) && data.fnbAndOtherVenues.length > 0 && (
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-amber-600" />
                    식음(F&B) · 카페 · 연회 참고 지표
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    식음/연회는 POS 특성상 입장 인원수가 아닌 메뉴/아이템 주문 수량(itemQuantity) 기준이므로 별도 참고 지표로 분리 표출합니다.
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  is_visitor_count = 0 (메뉴 주문 건수 기준)
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                      <th className="py-3 px-4 w-14 text-center">순번</th>
                      <th className="py-3 px-4">매장명</th>
                      <th className="py-3 px-4">카테고리 / 본부</th>
                      <th className="py-3 px-4 text-right">메뉴 주문 수량 (건)</th>
                      <th className="py-3 px-4 text-right">모수 대비 주문 건수 비율 (%)</th>
                      <th className="py-3 px-4 text-right">매출액 (원)</th>
                      <th className="py-3 px-4 text-right">모수 1인당 지출액 (원)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {data.fnbAndOtherVenues.map((f, idx) => (
                      <tr key={`${f.venueName}-${idx}`} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-semibold tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{f.venueName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {f.categoryName} · {f.teamName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                          {f.itemQuantity > 0 ? `${formatNumber(f.itemQuantity)}건` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-amber-700">
                          {f.orderRatePerPoolPct !== null ? `${f.orderRatePerPoolPct}%` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                          {formatNumber(f.revenue)}원
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-700">
                          {formatNumber(f.spendPerPoolGuest)}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
