"use client";

import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Ticket, Users, Building2, TrendingUp, Calendar, 
  RefreshCw, AlertCircle, Layers, BarChart3, HelpCircle,
  ArrowUpRight, ArrowDownRight, Minus, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { secureFetcher } from '@/lib/secureFetcher';
import { useDate } from '@/contexts/DateContext';
import { getClosedBusinessYear, getLatestClosedMonthStr } from '@/lib/dateUtils';
import GlobalDatePicker from '@/components/GlobalDatePicker';
import type { 
  LeisureUsageRateResponse,
  LeisureYoyMatrixResponse,
  LeisureYoyYearData
} from '@/types/reports-v2';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

// Distinct modern color palette for facilities
const FACILITY_COLORS: Record<string, string> = {
  '놀이동산': '#3b82f6', // Blue
  '미디어아트센터': '#8b5cf6', // Violet
  '벨포레 목장': '#10b981', // Teal/Green
  '사계절썰매장': '#f59e0b', // Amber
  '마운틴카트': '#ef4444', // Red
  '마운틴카트(전체)': '#ef4444', // Red
  '마운틴카트(그랜드포렛)': '#ef4444', // Red
  '마운틴카트(미니포렛)': '#f97316', // Orange
  '벨포레 목장(체험)': '#14b8a6', // Teal
  '썸머랜드': '#06b6d4', // Cyan
  '원더풀': '#6366f1', // Indigo
  '회전그네': '#ec4899', // Pink
  '마리나 클럽': '#0284c7', // Sky Blue
  '미디어-뮤지엄카페': '#d97706', // Warm Amber
  '얼룩말카페': '#84cc16', // Lime
};

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'
];

export const SEVEN_KEY_FACILITIES = [
  { key: '놀이동산', label: '놀이동산', color: '#3b82f6' },
  { key: '벨포레 목장', label: '벨포레 목장', color: '#10b981' },
  { key: '벨포레 목장(체험)', label: '목장체험', color: '#14b8a6' },
  { key: '마운틴카트(전체)', label: '마운틴카트(전체)', color: '#ef4444' },
  { key: '마운틴카트(그랜드포렛)', label: '카트(그랜드)', color: '#ef4444' },
  { key: '마운틴카트(미니포렛)', label: '카트(미니)', color: '#f97316' },
  { key: '사계절썰매장', label: '사계절썰매장', color: '#f59e0b' },
  { key: '미디어아트센터', label: '미디어아트센터', color: '#8b5cf6' },
  { key: '마리나 클럽', label: '마리나 클럽', color: '#0284c7' },
];

export default function LeisureUsageRate() {
  const { startDate, endDate, isRange } = useDate();

  const [usageData, setUsageData] = useState<LeisureUsageRateResponse | null>(null);
  const [yoyData, setYoyData] = useState<LeisureYoyMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Matrix View Mode: 'ALL_FACILITIES' (7개 영업장 컬럼 비교 - 기본값) vs 'SINGLE_FACILITY' (단일 영업장 정밀 분석)
  const [matrixViewMode, setMatrixViewMode] = useState<'ALL_FACILITIES' | 'SINGLE_FACILITY'>('ALL_FACILITIES');

  // 백엔드 API 응답 기반 가용 연도 목록 (2024년 ~ 최신영업연도 동적 생성)
  const availableYears = useMemo(() => {
    if (yoyData?.years && yoyData.years.length > 0) {
      return [...yoyData.years].sort();
    }
    const currentY = getClosedBusinessYear();
    const fallback: string[] = [];
    for (let y = 2024; y <= Math.max(currentY, 2026); y++) {
      fallback.push(String(y));
    }
    return fallback;
  }, [yoyData?.years]);

  // 최신 연도 (2026년, 2027년 도래 시 2027년)
  const latestYear = useMemo(() => {
    return availableYears[availableYears.length - 1] || '2026';
  }, [availableYears]);

  // 직전 연도 (2025년, 2027년 도래 시 2026년)
  const prevYear = useMemo(() => {
    return availableYears.length >= 2 ? availableYears[availableYears.length - 2] : availableYears[0];
  }, [availableYears]);

  // Matrix Selected Years: Multi-select support for dynamic years. Default to latest 2 years
  const [selectedMatrixYears, setSelectedMatrixYears] = useState<string[]>(['2025', '2026']);

  // 데이터 로드 시 기본 선택 연도를 최신 2개년([prevYear, latestYear])으로 자동 동기화
  useEffect(() => {
    if (availableYears.length >= 2) {
      setSelectedMatrixYears((prev) => {
        const valid = prev.filter((y) => availableYears.includes(y));
        return valid.length > 0 ? valid : [prevYear, latestYear];
      });
    }
  }, [availableYears, prevYear, latestYear]);

  // 선택된 연도 정렬 및 비교 대상 2개년 판별 (예: 2개년 선택 시 [yrA, yrB], 최신 2개년 비교)
  const sortedSelectedYears = useMemo(() => {
    return [...selectedMatrixYears].sort();
  }, [selectedMatrixYears]);

  const compareYearB = useMemo(() => {
    return sortedSelectedYears[sortedSelectedYears.length - 1] || latestYear;
  }, [sortedSelectedYears, latestYear]);

  const compareYearA = useMemo(() => {
    return sortedSelectedYears.length >= 2
      ? sortedSelectedYears[sortedSelectedYears.length - 2]
      : prevYear;
  }, [sortedSelectedYears, prevYear]);

  const handleToggleMatrixYear = (yr: string) => {
    if (selectedMatrixYears.includes(yr)) {
      if (selectedMatrixYears.length === 1) return; // 최소 1개년 유지
      setSelectedMatrixYears(selectedMatrixYears.filter((y) => y !== yr));
    } else {
      const next = [...selectedMatrixYears, yr];
      next.sort();
      setSelectedMatrixYears(next);
    }
  };

  // Selected Facility for YoY Matrix & Chart
  const [selectedFacility, setSelectedFacility] = useState<string>('놀이동산');
  
  // Selected View Key: 'PERIOD_TOTAL' or specific month 'YYYY-MM'
  const [selectedViewKey, setSelectedViewKey] = useState<string>('PERIOD_TOTAL');

  // Chart View Mode: 'YOY' (Selected Facility 24 vs 25 vs 26) | 'ALL_TIMELINE' (All Facilities Monthly Timeline)
  const [chartMode, setChartMode] = useState<'YOY' | 'ALL_TIMELINE'>('YOY');

  // Timeline Chart State
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedFacilities, setSelectedFacilities] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentYear = getClosedBusinessYear();
      const [resUsage, resYoy] = await Promise.all([
        secureFetcher(`${API_BASE}/api/v6/report/leisure-usage-rate`),
        secureFetcher(`${API_BASE}/api/v6/report/leisure-yoy-matrix?startYear=2024&endYear=${currentYear}`),
      ]);

      const payloadUsage: LeisureUsageRateResponse = resUsage?.data ?? resUsage;
      const payloadYoy: LeisureYoyMatrixResponse = resYoy?.data ?? resYoy;

      if (payloadUsage?.success && payloadYoy?.success) {
        // [Mountain Cart Consolidation SSOT]
        // 2024: 레거시 '마운틴카트' / 2025·2026: '마운틴카트(그랜드포렛)' + '마운틴카트(미니포렛)'
        // 백엔드 leisure-usage-rate의 '마운틴카트(전체)' 완제품 실측치로 yoyData.pivotData 통합 생성
        const cartTotalSeries = payloadUsage.series?.find((s) => s.facilityName === '마운틴카트(전체)');
        const years = payloadYoy.years && payloadYoy.years.length > 0 ? [...payloadYoy.years].sort() : ['2024', '2025', '2026'];

        if (cartTotalSeries && payloadYoy.pivotData) {
          const cartTotalPivotRows = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const mPad = String(m).padStart(2, '0');
            const row: any = { month: m };
            years.forEach((yr) => {
              const mKey = `${yr}-${mPad}`;
              const pt = cartTotalSeries.data.find((d) => d.month === mKey);
              if (pt) {
                row[yr] = {
                  usageRate: pt.usageRate,
                  visitors: pt.visitors,
                  roomGuests: pt.totalRoomGuests,
                };
              } else {
                row[yr] = { usageRate: 0, visitors: 0, roomGuests: 0 };
              }
            });
            return row;
          });

          // '마운틴카트(전체)' 및 '마운틴카트' 모두에 통합 pivotData 연결
          payloadYoy.pivotData['마운틴카트(전체)'] = cartTotalPivotRows;
          payloadYoy.pivotData['마운틴카트'] = cartTotalPivotRows;

          // facilityPeriodCumulative 보강
          if (payloadYoy.facilityPeriodCumulative) {
            const cartCum: Record<string, { visitors: number; roomGuests: number; usageRate: number }> = {};
            years.forEach((yr) => {
              const grand = payloadYoy.facilityPeriodCumulative?.['마운틴카트(그랜드포렛)']?.[yr];
              const mini = payloadYoy.facilityPeriodCumulative?.['마운틴카트(미니포렛)']?.[yr];
              const legacy = payloadYoy.facilityPeriodCumulative?.['마운틴카트']?.[yr];

              const vGrand = grand?.visitors || 0;
              const vMini = mini?.visitors || 0;
              const vLegacy = legacy?.visitors || 0;
              const roomG = grand?.roomGuests || mini?.roomGuests || legacy?.roomGuests || 0;
              const totalV = (vGrand + vMini) > 0 ? (vGrand + vMini) : vLegacy;
              const rate = roomG > 0 ? Math.round((totalV / roomG) * 1000) / 10 : 0;
              cartCum[yr] = { visitors: totalV, roomGuests: roomG, usageRate: rate };
            });
            payloadYoy.facilityPeriodCumulative['마운틴카트(전체)'] = cartCum;
            payloadYoy.facilityPeriodCumulative['마운틴카트'] = cartCum;
          }

          // facilities 목록 정리: '마운틴카트'를 '마운틴카트(전체)'로 대체하고 그랜드/미니 유지
          if (payloadYoy.facilities) {
            const facSet = new Set(payloadYoy.facilities);
            facSet.delete('마운틴카트');
            facSet.add('마운틴카트(전체)');
            payloadYoy.facilities = Array.from(facSet).sort();
          }
        }

        setUsageData(payloadUsage);
        setYoyData(payloadYoy);

        // Set default facility if available
        if (payloadYoy.facilities && payloadYoy.facilities.length > 0) {
          if (!payloadYoy.facilities.includes(selectedFacility)) {
            if ((selectedFacility === '마운틴카트' || selectedFacility === '마운틴카트(전체)') && payloadYoy.facilities.includes('마운틴카트(전체)')) {
              setSelectedFacility('마운틴카트(전체)');
            } else {
              setSelectedFacility(payloadYoy.facilities[0]);
            }
          }
        }

        // Initially select top 4 facilities for timeline view
        const initialSelected = new Set<string>();
        payloadUsage.series?.slice(0, 5).forEach((s) => initialSelected.add(s.facilityName));
        setSelectedFacilities(initialSelected);
      } else {
        setError(payloadUsage?.error || payloadYoy?.error || '레저본부 이용률 데이터를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Error fetching leisure usage data:', err);
      setError(
        err?.message || 
        '데이터 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When date range changes via GlobalDatePicker, reset selectedViewKey to PERIOD_TOTAL if range mode, or matching month
  useEffect(() => {
    if (isRange) {
      setSelectedViewKey('PERIOD_TOTAL');
    } else {
      const m = startDate ? startDate.slice(0, 7) : '';
      setSelectedViewKey(m);
    }
  }, [startDate, endDate, isRange]);

  // Available months list sorted descending (newest first)
  const availableMonthsDescending = useMemo(() => {
    if (!usageData?.months) return [];
    return [...usageData.months].reverse();
  }, [usageData?.months]);

  const latestAvailableMonth = useMemo(() => {
    if (!usageData?.months || usageData.months.length === 0) return '';
    return usageData.months[usageData.months.length - 1];
  }, [usageData?.months]);

  // List of facilities from YoY response ensuring '벨포레 목장(체험)' is always included if present
  const facilityList = useMemo(() => {
    return yoyData?.facilities ? [...yoyData.facilities] : [];
  }, [yoyData]);

  // Compute selected period string range
  const startMonthStr = useMemo(() => {
    return startDate ? startDate.slice(0, 7) : (latestAvailableMonth || getLatestClosedMonthStr());
  }, [startDate, latestAvailableMonth]);

  const endMonthStr = useMemo(() => {
    if (isRange && endDate) return endDate.slice(0, 7);
    return startMonthStr;
  }, [isRange, endDate, startMonthStr]);

  // All months in usageData that fall into [startMonthStr, endMonthStr]
  const selectedPeriodMonths = useMemo(() => {
    if (!usageData?.months) return [];
    if (!isRange) {
      return usageData.months.includes(startMonthStr) ? [startMonthStr] : [latestAvailableMonth];
    }
    const filtered = usageData.months.filter((m) => m >= startMonthStr && m <= endMonthStr);
    return filtered.length > 0 ? filtered : [latestAvailableMonth];
  }, [usageData?.months, isRange, startMonthStr, endMonthStr, latestAvailableMonth]);

  // Month numbers (1~12) within selected period
  const selectedPeriodMonthNumbers = useMemo(() => {
    return new Set(selectedPeriodMonths.map((m) => parseInt(m.split('-')[1], 10)));
  }, [selectedPeriodMonths]);

  // Determine current active display mode: either 'PERIOD_TOTAL' or specific 'YYYY-MM'
  const isPeriodTotalMode = useMemo(() => {
    if (selectedViewKey === 'PERIOD_TOTAL' && isRange && selectedPeriodMonths.length > 1) {
      return true;
    }
    return false;
  }, [selectedViewKey, isRange, selectedPeriodMonths.length]);

  const activeSingleMonth = useMemo(() => {
    if (selectedViewKey !== 'PERIOD_TOTAL' && usageData?.months?.includes(selectedViewKey)) {
      return selectedViewKey;
    }
    // Default to the latest month of the selected period
    if (selectedPeriodMonths.length > 0) {
      return selectedPeriodMonths[selectedPeriodMonths.length - 1];
    }
    return latestAvailableMonth;
  }, [selectedViewKey, usageData?.months, selectedPeriodMonths, latestAvailableMonth]);

  // KPI Summary Card Metrics (Zero bug fix & supports Period Cumulative as well as Single Month)
  const currentSummary = useMemo(() => {
    if (!usageData?.series) return null;

    const isCartTotal = selectedFacility === '마운틴카트' || selectedFacility === '마운틴카트(전체)';
    const targetFacilityName = isCartTotal ? '마운틴카트(전체)' : selectedFacility;

    if (isPeriodTotalMode) {
      // 1. Calculate Period Cumulative across selectedPeriodMonths
      const selSeries = usageData.series.find((s) => s.facilityName === targetFacilityName)
        || usageData.series.find((s) => s.facilityName === selectedFacility);
      let selVisitors = 0;
      let selDenominator = 0;
      for (const m of selectedPeriodMonths) {
        const pt = selSeries?.data.find((d) => d.month === m);
        if (pt) {
          selVisitors += pt.visitors;
          selDenominator += pt.totalRoomGuests;
        }
      }
      const selRate = selDenominator > 0 ? Math.round((selVisitors / selDenominator) * 1000) / 10 : 0;

      // Top venue across selected period (전 영업장 공식 실측치 공정 평가)
      let topVenue = { name: '-', visitors: 0, usageRate: 0 };
      for (const s of usageData.series) {
        let vTotal = 0;
        let dTotal = 0;
        for (const m of selectedPeriodMonths) {
          const pt = s.data.find((d) => d.month === m);
          if (pt) {
            vTotal += pt.visitors;
            dTotal += pt.totalRoomGuests;
          }
        }
        const avgRate = dTotal > 0 ? Math.round((vTotal / dTotal) * 1000) / 10 : 0;
        if (avgRate > topVenue.usageRate) {
          topVenue = { name: s.facilityName, visitors: vTotal, usageRate: avgRate };
        }
      }

      return {
        isPeriod: true,
        label: `${startMonthStr} ~ ${endMonthStr} (${selectedPeriodMonths.length}개월 누적)`,
        roomGuests: selDenominator,
        selectedVenue: {
          name: isCartTotal ? '마운틴카트(전체)' : selectedFacility,
          usageRate: selRate,
          visitors: selVisitors,
        },
        topVenue,
      };
    } else {
      // 2. Single Month Metrics
      const m = activeSingleMonth;
      const selSeries = usageData.series.find((s) => s.facilityName === targetFacilityName)
        || usageData.series.find((s) => s.facilityName === selectedFacility);
      const selPoint = selSeries?.data.find((d) => d.month === m);
      const selRate = selPoint?.usageRate ?? 0;
      const selVisitors = selPoint?.visitors ?? 0;
      const roomGuests = selPoint?.totalRoomGuests ?? 0;

      let topVenue = { name: '-', usageRate: 0, visitors: 0 };
      for (const s of usageData.series) {
        const pt = s.data.find((d) => d.month === m);
        if (pt && pt.usageRate > topVenue.usageRate) {
          topVenue = {
            name: s.facilityName,
            usageRate: pt.usageRate,
            visitors: pt.visitors,
          };
        }
      }

      return {
        isPeriod: false,
        label: `${m} 기준 실적`,
        roomGuests,
        selectedVenue: {
          name: isCartTotal ? '마운틴카트(전체)' : selectedFacility,
          usageRate: selRate,
          visitors: selVisitors,
        },
        topVenue,
      };
    }
  }, [usageData, isPeriodTotalMode, selectedPeriodMonths, selectedFacility, startMonthStr, endMonthStr, activeSingleMonth]);

  // Months 1 to 12 labels
  const monthLabels = useMemo(() => [
    '1월', '2월', '3월', '4월', '5월', '6월', 
    '7월', '8월', '9월', '10월', '11월', '12월'
  ], []);

  // YoY Chart Option (for selected facility: 2024 vs 2025 vs 2026 across 1~12월)
  const yoyChartOption = useMemo(() => {
    const isCart = selectedFacility === '마운틴카트' || selectedFacility === '마운틴카트(전체)';
    const pivotKey = (isCart && !yoyData?.pivotData?.[selectedFacility])
      ? (yoyData?.pivotData?.['마운틴카트(전체)'] ? '마운틴카트(전체)' : '마운틴카트')
      : selectedFacility;

    if (!yoyData?.pivotData || !yoyData.pivotData[pivotKey]) return {};

    const rows = yoyData.pivotData[pivotKey];
    const years = availableYears;

    const baseColors = ['#94a3b8', '#3b82f6', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#f59e0b'];
    const colors: Record<string, string> = {
      '2024': '#94a3b8', // Slate
      '2025': '#3b82f6', // Blue
      '2026': '#10b981', // Emerald
      '2027': '#06b6d4', // Cyan
      '2028': '#8b5cf6', // Violet
    };

    const series = years.map((yr, idx) => {
      const isCurrentYear = yr === latestYear;
      const dataPoints = rows.map((r) => {
        const item = r[yr] as LeisureYoyYearData | undefined;
        // Don't show line drop to 0 for unarrived future months in latestYear
        if (yr === latestYear && item && item.roomGuests === 0 && item.visitors === 0) {
          return null;
        }
        return {
          value: item ? item.usageRate : 0,
          visitors: item?.visitors || 0,
          roomGuests: item?.roomGuests || 0,
        };
      });

      const seriesColor = colors[yr] || baseColors[idx % baseColors.length];

      return {
        name: `${yr}년`,
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbolSize: isCurrentYear ? 8 : 6,
        lineStyle: {
          width: isCurrentYear ? 3.5 : 2,
          type: yr === availableYears[0] ? 'dashed' : 'solid',
          color: seriesColor,
        },
        itemStyle: {
          color: seriesColor,
        },
        connectNulls: false,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: isCurrentYear ? 4.5 : 3,
          },
        },
        data: dataPoints,
      };
    });

    const displayFac = isCart ? '마운틴카트(전체)' : (selectedFacility === '벨포레 목장(체험)' ? '목장체험' : selectedFacility);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          const monthLabel = params[0].axisValue;
          let html = `<div style="font-weight: bold; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.15); color: #38bdf8;">
            🎡 ${displayFac} · ${monthLabel} 연도별 비교
            ${selectedFacility === '벨포레 목장(체험)' ? '<span style="font-size: 10px; color: #a7f3d0; margin-left: 6px;">(목장입장객 대비 체험전환율)</span>' : ''}
          </div>`;

          params.forEach((item) => {
            if (item.value === null || item.value === undefined) return;
            const isLatest = item.seriesName.includes(latestYear);
            const usageVal = Number(item.data?.value || 0).toFixed(1);
            const visitorsVal = Number(item.data?.visitors || 0).toLocaleString();
            const roomGuestsVal = Number(item.data?.roomGuests || 0).toLocaleString();

            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 4px; font-size: 11.5px; ${isLatest ? 'font-weight: 700; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 2px 4px; border-radius: 4px;' : ''}">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${item.color};"></span>
                  ${item.seriesName}
                </span>
                <span style="text-align: right;">
                  <b style="font-size: 12px; font-family: monospace;">${usageVal}%</b>
                  <span style="opacity: 0.75; margin-left: 6px; font-size: 10.5px;">(${visitorsVal}명 / ${roomGuestsVal}명)</span>
                </span>
              </div>
            `;
          });
          return html;
        },
      },
      legend: {
        data: years.map((y) => `${y}년`),
        top: 0,
        right: '2%',
        textStyle: { color: '#64748b', fontWeight: 'bold', fontSize: 12 },
      },
      grid: {
        top: 35,
        left: '2%',
        right: '3%',
        bottom: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: monthLabels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 12, fontWeight: 500 },
      },
      yAxis: {
        type: 'value',
        name: '이용률 (%)',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: '{value}%',
        },
      },
      series,
    };
  }, [yoyData, selectedFacility, monthLabels]);

  // Overall Timeline Chart Option
  const timelineFilteredMonths = useMemo(() => {
    if (!usageData?.months) return [];
    if (selectedYear === 'ALL') return usageData.months;
    return usageData.months.filter((m) => m.startsWith(selectedYear));
  }, [usageData?.months, selectedYear]);

  const timelineChartOption = useMemo(() => {
    if (!usageData || timelineFilteredMonths.length === 0) return {};

    const seriesList: any[] = [];
    let colorIdx = 0;

    usageData.series.forEach((s) => {
      if (!selectedFacilities.has(s.facilityName)) return;

      const isSubtotal = s.facilityName === '레저본부 전체(소계)';
      const color = FACILITY_COLORS[s.facilityName] || DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length];
      if (!FACILITY_COLORS[s.facilityName]) colorIdx++;

      const dataMap = new Map(s.data.map((d) => [d.month, d]));
      const seriesValues = timelineFilteredMonths.map((m) => {
        const point = dataMap.get(m);
        return {
          value: point ? point.usageRate : 0,
          visitors: point?.visitors || 0,
          roomGuests: point?.totalRoomGuests || 0,
        };
      });

      seriesList.push({
        name: s.facilityName,
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbolSize: isSubtotal ? 8 : 6,
        lineStyle: {
          width: isSubtotal ? 4 : 2,
          type: 'solid',
          color: color,
        },
        itemStyle: { color: color },
        emphasis: {
          focus: 'series',
          lineStyle: { width: isSubtotal ? 5 : 3.5 },
        },
        data: seriesValues,
      });
    });

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      grid: {
        top: 25,
        left: '2%',
        right: '3%',
        bottom: timelineFilteredMonths.length > 12 ? '15%' : '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: timelineFilteredMonths,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { 
          color: '#64748b', 
          fontSize: 11,
          formatter: (val: string) => {
            const parts = val.split('-');
            return `${parts[0].slice(2)}년 ${parseInt(parts[1], 10)}월`;
          }
        },
      },
      yAxis: {
        type: 'value',
        name: '이용률 (%)',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
      },
      dataZoom: timelineFilteredMonths.length > 12 ? [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 0,
          height: 20,
          borderColor: 'transparent',
          fillerColor: 'rgba(16, 185, 129, 0.15)',
          handleStyle: { color: '#10b981' },
          start: 0,
          end: 100,
        },
      ] : [],
      series: seriesList,
    };
  }, [usageData, timelineFilteredMonths, selectedFacilities]);

  // Cumulative numbers for the selected period across availableYears in the matrix table
  const periodCumulative = useMemo(() => {
    const isCart = selectedFacility === '마운틴카트' || selectedFacility === '마운틴카트(전체)';
    const pivotKey = (isCart && !yoyData?.pivotData?.[selectedFacility])
      ? (yoyData?.pivotData?.['마운틴카트(전체)'] ? '마운틴카트(전체)' : '마운틴카트')
      : selectedFacility;

    if (!yoyData?.pivotData || !yoyData.pivotData[pivotKey]) return null;

    const rows = yoyData.pivotData[pivotKey];
    const targetRows = rows.filter((r) => selectedPeriodMonthNumbers.has(r.month));

    const result: Record<string, { visitors: number; roomGuests: number; usageRate: number }> = {};
    availableYears.forEach((yr) => {
      result[yr] = { visitors: 0, roomGuests: 0, usageRate: 0 };
    });

    availableYears.forEach((yr) => {
      let v = 0;
      let g = 0;
      targetRows.forEach((r) => {
        const item = r[yr] as LeisureYoyYearData | undefined;
        if (item) {
          v += item.visitors;
          g += item.roomGuests;
        }
      });
      const usageRate = g > 0 
        ? Math.round((v / g) * 1000) / 10 
        : 0;
      result[yr] = { visitors: v, roomGuests: g, usageRate };
    });

    return result;
  }, [yoyData, selectedFacility, selectedPeriodMonthNumbers, availableYears]);

  const periodYoYDiff = useMemo(() => {
    if (!periodCumulative) return null;
    const cB = periodCumulative[compareYearB];
    const cA = periodCumulative[compareYearA];
    if (cB && cA && cB.roomGuests > 0 && cA.roomGuests > 0) {
      return Math.round((cB.usageRate - cA.usageRate) * 10) / 10;
    }
    return null;
  }, [periodCumulative, compareYearB, compareYearA]);

  // 7개 주요 영업장 선택 구간 누적 연산 (각 영업장 및 선택 연도별 실측 집계)
  const sevenFacilitiesCumulative = useMemo(() => {
    if (!yoyData?.pivotData) return {};
    const result: Record<string, Record<string, { visitors: number; roomGuests: number; usageRate: number }>> = {};

    SEVEN_KEY_FACILITIES.forEach(({ key }) => {
      const rows = yoyData.pivotData[key] || [];
      const targetRows = rows.filter((r) => selectedPeriodMonthNumbers.has(r.month));
      result[key] = {};

      selectedMatrixYears.forEach((yr) => {
        let v = 0;
        let g = 0;
        targetRows.forEach((r) => {
          const item = r[yr] as LeisureYoyYearData | undefined;
          if (item) {
            v += item.visitors;
            g += item.roomGuests;
          }
        });
        const usageRate = g > 0
          ? Math.round((v / g) * 1000) / 10
          : 0;
        result[key][yr] = { visitors: v, roomGuests: g, usageRate };
      });
    });

    return result;
  }, [yoyData, selectedPeriodMonthNumbers, selectedMatrixYears]);

  // 엑셀 출력: 선택된 영업장에 관계없이 전 영업장의 최신 2개년(prevYear vs latestYear) 및 전체 연도 이용률 비교 워크북 생성
  const handleExportExcel = () => {
    if (!yoyData || !yoyData.facilities || yoyData.facilities.length === 0) {
      alert('출력할 레저 영업장 이용률 데이터가 아직 로드되지 않았습니다.');
      return;
    }

    const expYearA = prevYear;
    const expYearB = latestYear;

    const wb = XLSX.utils.book_new();
    const nowStr = new Date().toLocaleString('ko-KR');

    // -------------------------------------------------------------------------
    // Sheet 1: 전영업장_월별이용률대조 (1월~12월 expYearA vs expYearB vs 증감%p 비교)
    // -------------------------------------------------------------------------
    const sheet1Rows: any[][] = [
      [`[벨포레 리조트] 레저본부 전 영업장 ${expYearA}년 vs ${expYearB}년 월별 이용률 YoY 정밀 비교표`],
      [`추출일시: ${nowStr} | 모수 기준: 벨포레 물리 고정 1,080실 숙박객 (목장체험은 입장객 기준)`],
      [`단위: 이용률(%), YoY 증감(%p) | 비교 구간: ${expYearB}년 vs ${expYearA}년 | 데이터 출처: V6 정밀 데이터 마트 (leisure-yoy-matrix)`],
      [],
      [
        'No',
        '영업장명',
        '실적 구분',
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월',
        '누적 이용률(%)'
      ]
    ];

    yoyData.facilities.forEach((fac, idx) => {
      const rows = yoyData.pivotData?.[fac] || [];
      const cum = yoyData.facilityPeriodCumulative?.[fac];
      const cumA = cum?.[expYearA]?.usageRate;
      const cumB = cum?.[expYearB]?.usageRate;
      let cumDiffStr = '-';
      if (cumA !== undefined && cumB !== undefined) {
        const d = Math.round((cumB - cumA) * 10) / 10;
        cumDiffStr = d >= 0 ? `+${d.toFixed(1)}%p` : `${d.toFixed(1)}%p`;
      }

      // Prev Year row
      const rowA: any[] = [
        idx + 1,
        fac,
        `${expYearA}년 실적 (%)`
      ];
      // Latest Year row
      const rowB: any[] = [
        '',
        '',
        `${expYearB}년 실적 (%)`
      ];
      // YoY Diff row
      const rowDiff: any[] = [
        '',
        '',
        `YoY 증감 (${expYearB.slice(2)} vs ${expYearA.slice(2)})`
      ];

      for (let m = 1; m <= 12; m++) {
        const mRow = rows.find((r) => r.month === m);
        const dA = mRow?.[expYearA] as LeisureYoyYearData | undefined;
        const dB = mRow?.[expYearB] as LeisureYoyYearData | undefined;

        const hasA = dA && (dA.roomGuests > 0 || dA.visitors > 0);
        const hasB = dB && (dB.roomGuests > 0 || dB.visitors > 0);

        const valA = hasA ? dA.usageRate : null;
        const valB = hasB ? dB.usageRate : null;

        rowA.push(valA !== null ? `${valA.toFixed(1)}%` : '-');
        rowB.push(valB !== null ? `${valB.toFixed(1)}%` : (m >= 11 ? '미도래' : '-'));

        if (valA !== null && valB !== null) {
          const diff = Math.round((valB - valA) * 10) / 10;
          rowDiff.push(diff >= 0 ? `+${diff.toFixed(1)}%p` : `${diff.toFixed(1)}%p`);
        } else {
          rowDiff.push('-');
        }
      }

      rowA.push(cumA !== undefined ? `${cumA.toFixed(1)}%` : '-');
      rowB.push(cumB !== undefined ? `${cumB.toFixed(1)}%` : '-');
      rowDiff.push(cumDiffStr);

      sheet1Rows.push(rowA);
      sheet1Rows.push(rowB);
      sheet1Rows.push(rowDiff);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    ws1['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 18 },
      ...Array(12).fill({ wch: 11 }),
      { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, '전영업장_월별이용률대조');

    // -------------------------------------------------------------------------
    // Sheet 2: 전영업장_누적종합비교 (영업장별 1행 종합 서머리)
    // -------------------------------------------------------------------------
    const sheet2Rows: any[][] = [
      [`[벨포레 리조트] 레저본부 전 영업장 ${expYearA}년 vs ${expYearB}년 누적 실적 및 이용률 종합 비교`],
      [`추출일시: ${nowStr} | 모수 기준: 벨포레 물리 고정 1,080실 숙박객 (목장체험은 입장객 기준)`],
      ['단위: 명, 이용률(%), 증감(%p) | 데이터 출처: V6 정밀 데이터 마트 (mat_v6_data_mart)'],
      [],
      [
        'No',
        '영업장명',
        `${expYearA}년 누적 이용객(명)`,
        `${expYearA}년 객실투숙객(명)`,
        `${expYearA}년 누적 이용률(%)`,
        `${expYearB}년 누적 이용객(명)`,
        `${expYearB}년 객실투숙객(명)`,
        `${expYearB}년 누적 이용률(%)`,
        '이용률 증감(%p)',
        '이용객수 증감(명)',
        '성장 추세'
      ]
    ];

    yoyData.facilities.forEach((fac, idx) => {
      const cum = yoyData.facilityPeriodCumulative?.[fac];
      const cA = cum?.[expYearA];
      const cB = cum?.[expYearB];

      const vA = cA?.visitors ?? 0;
      const rA = cA?.roomGuests ?? 0;
      const uA = cA?.usageRate ?? 0;

      const vB = cB?.visitors ?? 0;
      const rB = cB?.roomGuests ?? 0;
      const uB = cB?.usageRate ?? 0;

      const rateDiff = (cA && cB) ? Math.round((uB - uA) * 10) / 10 : 0;
      const visDiff = vB - vA;
      const trend = rateDiff > 0 ? '▲ 상승' : rateDiff < 0 ? '▼ 하락' : '- 유지';

      sheet2Rows.push([
        idx + 1,
        fac,
        vA,
        rA,
        `${uA.toFixed(1)}%`,
        vB,
        rB,
        `${uB.toFixed(1)}%`,
        rateDiff >= 0 ? `+${rateDiff.toFixed(1)}%p` : `${rateDiff.toFixed(1)}%p`,
        visDiff >= 0 ? `+${visDiff.toLocaleString()}` : visDiff.toLocaleString(),
        trend
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    ws2['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, '전영업장_누적종합비교');

    // -------------------------------------------------------------------------
    // Sheet 3: 월별_전영업장_상세내역 (Raw Data - 전체 가용 연도 동적 확장)
    // -------------------------------------------------------------------------
    const sheet3Rows: any[][] = [
      [`[벨포레 리조트] 레저본부 영업장별 1~12월 상세 로우 데이터 (${availableYears[0]} ~ ${latestYear})`],
      [`추출일시: ${nowStr}`],
      [],
      [
        '영업장명',
        '월',
        ...availableYears.flatMap((yr) => [
          `${yr}년 이용객(명)`,
          `${yr}년 객실투숙객(명)`,
          `${yr}년 이용률(%)`
        ]),
        `YoY 증감 (${latestYear.slice(2)}vs${prevYear.slice(2)} %p)`
      ]
    ];

    yoyData.facilities.forEach((fac) => {
      const rows = yoyData.pivotData?.[fac] || [];
      for (let m = 1; m <= 12; m++) {
        const mRow = rows.find((r) => r.month === m);
        const rowData: any[] = [fac, `${m}월`];

        availableYears.forEach((yr) => {
          const d = mRow?.[yr] as LeisureYoyYearData | undefined;
          const hasData = d && (d.visitors > 0 || d.roomGuests > 0);
          rowData.push(d?.visitors ?? 0);
          rowData.push(d?.roomGuests ?? 0);
          rowData.push(hasData && d ? `${d.usageRate.toFixed(1)}%` : (yr === latestYear && m >= 11 ? '미도래' : '-'));
        });

        const dPrev = mRow?.[prevYear] as LeisureYoyYearData | undefined;
        const dLatest = mRow?.[latestYear] as LeisureYoyYearData | undefined;
        let diffStr = '-';
        if (dPrev && dLatest && (dPrev.visitors > 0 || dPrev.roomGuests > 0) && (dLatest.visitors > 0 || dLatest.roomGuests > 0)) {
          const diff = Math.round((dLatest.usageRate - dPrev.usageRate) * 10) / 10;
          diffStr = diff >= 0 ? `+${diff.toFixed(1)}%p` : `${diff.toFixed(1)}%p`;
        }
        rowData.push(diffStr);
        sheet3Rows.push(rowData);
      }
    });

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
    ws3['!cols'] = [
      { wch: 18 },
      { wch: 8 },
      ...availableYears.flatMap(() => [{ wch: 18 }, { wch: 20 }, { wch: 16 }]),
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, ws3, '월별_전영업장_상세내역');

    // Download file
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `벨포레_레저본부_전영업장_이용률_비교_${dateTag}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          <p className="text-sm font-medium text-slate-500">레저본부 영업장별 이용률 매트릭스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !yoyData || !yoyData.pivotData) {
    return (
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg text-rose-900">데이터 로드 실패</h3>
              <p className="text-sm text-rose-600 mt-1 max-w-2xl leading-relaxed">
                {error || 'API 응답이 없습니다.'}
              </p>
              <div className="mt-3 text-xs bg-rose-100/70 text-rose-800 px-3 py-2 rounded-xl inline-block font-mono">
                Endpoint: GET /api/v6/report/leisure-yoy-matrix
              </div>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shrink-0"
          >
            <RefreshCw size={16} /> 다시 시도
          </button>
        </div>
      </div>
    );
  }

  const isCart = selectedFacility === '마운틴카트' || selectedFacility === '마운틴카트(전체)';
  const currentPivotKey = (isCart && !yoyData.pivotData[selectedFacility])
    ? (yoyData.pivotData['마운틴카트(전체)'] ? '마운틴카트(전체)' : '마운틴카트')
    : selectedFacility;
  const currentPivotRows = yoyData.pivotData[currentPivotKey] || [];

  return (
    <div className="w-full max-w-[1920px] mx-auto p-8 space-y-8 pb-12">
      
      {/* 1. Header Banner with GlobalDatePicker */}
      <div className="bg-gradient-to-r from-emerald-800 via-[#00ae95] to-slate-900 rounded-[32px] p-8 xl:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute right-32 -bottom-20 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex justify-between items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <Ticket size={22} className="text-emerald-200" />
              <span className="font-semibold tracking-wider text-sm text-emerald-100 uppercase whitespace-nowrap">
                BELLE FORET LEISURE DIVISION · USAGE RATE
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3 flex-wrap break-keep">
              <span className="whitespace-nowrap">레저본부 영업장별 숙박객 대비 이용률 비교</span>
              <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-medium whitespace-nowrap">
                24 · 25 · 26 연도별 YoY 정밀 매트릭스
              </span>
            </h1>
            <p className="text-sm text-white/80 mt-2 break-keep max-w-4xl leading-relaxed">
              관리자 설정 기준 정원(16평 2.5명, 35평 4명, 51평 6명 등)으로 산출한 전체 숙박객 대비 각 놀이시설 이용객(진성 방문객)의 월별 이용률(%)을 연도별로 비교합니다. (※ 단, '벨포레 목장(체험)'은 전체 숙박객이 아닌 '목장 입장객'을 기준으로 실질 체험 전환율을 산출합니다.)
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Global Date Picker Integration */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/20">
              <GlobalDatePicker showPresets={false} />
            </div>

            <button
              onClick={fetchData}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-2xl backdrop-blur-md transition-all border border-white/20 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw size={15} /> 새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {currentSummary && (
        <div className="space-y-4">
          
          {/* 🌟 [CORE CONTROL] 상단 영업장 선택기 & 실적 집계 범위 컨트롤 바 (사용자 요청 이미지 100% 일치) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: 영업장 선택 드롭다운 (알약형 에메랄드 테두리) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                영업장 선택:
              </span>
              <div className="relative inline-flex items-center">
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white border-2 border-emerald-500 text-slate-900 font-extrabold rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-2xs cursor-pointer pr-11 appearance-none transition-colors"
                >
                  {facilityList.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac === '벨포레 목장(체험)' ? '목장체험 (벨포레 목장 체험)' : fac}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-emerald-600">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              {/* 빠른 선택 칩 버튼들 */}
              <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-xs text-slate-400 font-medium">빠른선택:</span>
                {['놀이동산', '벨포레 목장', '사계절썰매장', '미디어아트센터', '마운틴카트(전체)'].map((fac) => {
                  const isSelected = selectedFacility === fac || (fac === '마운틴카트(전체)' && selectedFacility === '마운틴카트');
                  return (
                    <button
                      key={fac}
                      type="button"
                      onClick={() => setSelectedFacility(fac)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {fac}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: 실적 집계 범위 선택 */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Calendar size={16} className="text-emerald-600" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                실적 집계 범위:
              </span>
              <select
                value={selectedViewKey}
                onChange={(e) => setSelectedViewKey(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 cursor-pointer outline-none transition-colors"
              >
                {isRange && selectedPeriodMonths.length > 1 && (
                  <option value="PERIOD_TOTAL">
                    ⭐ 선택 기간 전체 누적 ({startMonthStr} ~ {endMonthStr}, {selectedPeriodMonths.length}개월 합산)
                  </option>
                )}
                {availableMonthsDescending.map((m) => {
                  const isWithin = selectedPeriodMonths.includes(m);
                  return (
                    <option key={m} value={m}>
                      {m.split('-')[0]}년 {parseInt(m.split('-')[1], 10)}월 실적 ({m}) {isWithin && isRange ? '• 선택구간' : ''}
                    </option>
                  );
                })}
              </select>

              {isPeriodTotalMode && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {selectedPeriodMonths.length}개월 누적 집계
                </span>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            
            {/* Card 1: Selected Facility Usage Rate */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap truncate max-w-[180px]">
                    [{currentSummary.selectedVenue.name === '벨포레 목장(체험)' ? '목장체험' : currentSummary.selectedVenue.name}] {currentSummary.selectedVenue.name === '벨포레 목장(체험)' ? (isPeriodTotalMode ? '기간 체험 전환율' : '당월 체험 전환율') : (isPeriodTotalMode ? '기간 누적 이용률' : '당월 이용률')}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
                    <Ticket size={20} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 relative z-10 whitespace-nowrap">
                  <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums font-financial">
                    {currentSummary.selectedVenue.usageRate.toFixed(1)}
                  </span>
                  <span className="text-sm font-bold text-[#00ae95]">%</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-auto pt-2 font-medium relative z-10 whitespace-nowrap truncate">
                {currentSummary.label}
              </div>
            </div>

            {/* Card 2: Selected Facility Visitors */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap truncate max-w-[180px]">
                    [{currentSummary.selectedVenue.name === '벨포레 목장(체험)' ? '목장체험' : currentSummary.selectedVenue.name}] {isPeriodTotalMode ? '기간 누적 이용객' : '당월 이용객'}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
                    <Users size={20} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums font-financial">
                    {currentSummary.selectedVenue.visitors.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">명</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-auto pt-2 font-medium whitespace-nowrap">
                진성 티켓 이용객 (is_visitor_count = 1)
              </div>
            </div>

            {/* Card 3: Total Room Guests or Farm Visitors (Denominator) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">
                    {currentSummary.selectedVenue.name === '벨포레 목장(체험)'
                      ? (isPeriodTotalMode ? '기간 목장 입장객 (체험 모수)' : '당월 목장 입장객 (체험 모수)')
                      : (isPeriodTotalMode ? '기간 리조트 총 숙박객 (분모)' : '당월 리조트 총 숙박객 (분모)')}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums font-financial">
                    {currentSummary.roomGuests.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">명</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-auto pt-2 font-medium whitespace-nowrap">
                {currentSummary.selectedVenue.name === '벨포레 목장(체험)'
                  ? '목장 입장객 대비 실질 체험 전환율 산출 기준'
                  : '관리자 설정 기준 정원(16평 2.5명, 35평 4명, 51평 6명 등) 반영'}
              </div>
            </div>

            {/* Card 4: Top Venue for that Period/Month */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">
                    {isPeriodTotalMode ? '기간 최고 이용률 영업장' : '당월 최고 이용률 영업장'}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 whitespace-nowrap">
                  <span className="text-xl font-bold text-slate-900 truncate max-w-[140px]">
                    {currentSummary.topVenue.name}
                  </span>
                  <span className="text-2xl lg:text-3xl font-bold text-[#00ae95] tabular-nums font-financial">
                    {currentSummary.topVenue.usageRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-auto pt-2 font-medium whitespace-nowrap">
                {currentSummary.topVenue.visitors.toLocaleString()}명 이용 (침투율 1위)
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. Interactive Chart Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 lg:p-8 shadow-xs space-y-6">
        
        {/* Chart Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              {chartMode === 'YOY' 
                ? `[${(selectedFacility === '마운틴카트' || selectedFacility === '마운틴카트(전체)') ? '마운틴카트(전체)' : (selectedFacility === '벨포레 목장(체험)' ? '목장체험' : selectedFacility)}] 연도별(24·25·26) 월별 ${selectedFacility === '벨포레 목장(체험)' ? '체험 전환율' : '이용률'} 비교 추이`
                : '레저본부 전 영업장 시계열 추이'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {chartMode === 'YOY' 
                ? '동일 월(1~12월) 기준 2024년, 2025년, 2026년 이용률(%)을 직접 비교합니다.'
                : '월별 전체 시계열 상에서 영업장별 침투율을 비교합니다.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs">
              <button
                onClick={() => setChartMode('YOY')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                  chartMode === 'YOY'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                연도별(YoY) 비교
              </button>
              <button
                onClick={() => setChartMode('ALL_TIMELINE')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                  chartMode === 'ALL_TIMELINE'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                전체 시계열 추이
              </button>
            </div>

            {chartMode === 'ALL_TIMELINE' && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {['ALL', ...[...availableYears].reverse()].map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                      selectedYear === year
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {year === 'ALL' ? '전체' : `${year}년`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ECharts Chart Container */}
        <div className="w-full h-[380px] lg:h-[420px]">
          <ReactECharts 
            option={chartMode === 'YOY' ? yoyChartOption : timelineChartOption} 
            style={{ height: '100%', width: '100%' }} 
            notMerge={true} 
          />
        </div>

      </div>

      {/* 4. ⭐ 연도별 영업장 이용률 정밀 매트릭스 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header: Dropdown & Title */}
        <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              연도별 영업장 이용률 정밀 매트릭스
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {matrixViewMode === 'ALL_FACILITIES' ? (
                <>
                  7개 핵심 영업장이 컬럼(열)으로 배치되어 있으며, 연도(24년, 25년, 26년)를 클릭하여 원하는 기간을 한눈에 대조할 수 있습니다.
                </>
              ) : (
                <>
                  드롭다운에서 원하는 영업장을 선택하면 1월부터 12월까지의 연도별(24년, 25년, 26년) 이용률과 YoY 증감이 표출됩니다.
                </>
              )}
              {isRange && selectedPeriodMonths.length > 1 && (
                <span className="ml-2 font-bold text-emerald-700">
                  (조회 기간: {startMonthStr} ~ {endMonthStr} 형광 표시)
                </span>
              )}
            </p>
          </div>

          {/* Facility Dropdown Selector & Excel Export Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              title="선택된 영업장에 관계없이 전 영업장의 2025년 vs 2026년 이용률 비교 엑셀을 다운로드합니다"
            >
              <FileSpreadsheet size={16} />
              <span>전 영업장 이용률 엑셀 다운로드</span>
            </button>

            {/* Layout Mode Toggle */}
            <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setMatrixViewMode('ALL_FACILITIES')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  matrixViewMode === 'ALL_FACILITIES'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 7대 영업장 컬럼 비교
              </button>
              <button
                type="button"
                onClick={() => setMatrixViewMode('SINGLE_FACILITY')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  matrixViewMode === 'SINGLE_FACILITY'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔍 단일 영업장 정밀 분석
              </button>
            </div>
          </div>
        </div>

        {/* 🏢 ALL_FACILITIES Mode: Year Selection Pills & Presets */}
        {matrixViewMode === 'ALL_FACILITIES' ? (
          <div className="px-6 lg:px-8 py-3.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                비교 연도 선택:
              </span>
              <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                {availableYears.map((yr) => {
                  const isSelected = selectedMatrixYears.includes(yr);
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleToggleMatrixYear(yr)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <span>{yr}년</span>
                      {isSelected && <span className="text-[10px] opacity-90">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Quick Year Presets (동적 슬라이딩 프리셋) */}
              <div className="flex items-center gap-1 text-[11px] ml-1">
                <button
                  type="button"
                  onClick={() => setSelectedMatrixYears([prevYear, latestYear])}
                  className={`px-2.5 py-1 rounded-xl font-bold border transition-colors cursor-pointer ${
                    selectedMatrixYears.length === 2 && selectedMatrixYears.includes(prevYear) && selectedMatrixYears.includes(latestYear)
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  최근 2개년 ({prevYear.slice(2)} vs {latestYear.slice(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMatrixYears([...availableYears])}
                  className={`px-2.5 py-1 rounded-xl font-bold border transition-colors cursor-pointer ${
                    selectedMatrixYears.length === availableYears.length
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  전체 ({availableYears[0].slice(2)}~{latestYear.slice(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMatrixYears([latestYear])}
                  className={`px-2.5 py-1 rounded-xl font-bold border transition-colors cursor-pointer ${
                    selectedMatrixYears.length === 1 && selectedMatrixYears[0] === latestYear
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {latestYear}년 단일
                </button>
              </div>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              💡 {selectedMatrixYears.length === 1 
                ? '선택 연도 1개 표시' 
                : selectedMatrixYears.length === 2 
                ? `2개년 대조 (${compareYearB}년 셀에 ${compareYearA}년 대비 증감 %p 표시)` 
                : `${selectedMatrixYears.length}개년 전체 대조 표시`}
            </span>
          </div>
        ) : (
          /* 🔍 SINGLE_FACILITY Mode: Facility Quick Chips & Dropdown */
          <div className="px-6 lg:px-8 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-1">빠른 선택:</span>
              {SEVEN_KEY_FACILITIES.map(({ key, label }) => {
                const isSelected = selectedFacility === key || (key === '마운틴카트(전체)' && selectedFacility === '마운틴카트');
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedFacility(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                영업장 선택:
              </span>
              <div className="relative">
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-emerald-500/80 text-emerald-900 font-bold rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-xs cursor-pointer pr-10 appearance-none"
                >
                  {facilityList.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac === '벨포레 목장(체험)' ? '목장체험 (벨포레 목장 체험)' : fac}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-emerald-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Matrix Table */}
        {matrixViewMode === 'ALL_FACILITIES' ? (
          /* 🏢 7대 영업장 열 × 월 행 매트릭스 */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
              <thead>
                {/* 1단 헤더: 영업장명 */}
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <th
                    rowSpan={selectedMatrixYears.length > 1 ? 2 : 1}
                    className="py-3.5 px-4 text-center sticky left-0 bg-slate-100 z-20 w-24 border-r border-slate-200 font-extrabold text-slate-800"
                  >
                    월 (Month)
                  </th>
                  {SEVEN_KEY_FACILITIES.map((fac) => (
                    <th
                      key={fac.key}
                      colSpan={selectedMatrixYears.length}
                      className="py-3 px-3 text-center border-l border-slate-200 bg-slate-50"
                    >
                      <div className="flex items-center justify-center gap-1.5 font-bold text-slate-800 text-xs sm:text-sm">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fac.color }} />
                        <span>{fac.label}</span>
                      </div>
                      {fac.key === '벨포레 목장(체험)' && (
                        <span className="text-[10px] text-emerald-700 font-normal block mt-0.5">
                          (목장입장객 대비)
                        </span>
                      )}
                      {selectedMatrixYears.length === 1 && (
                        <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                          {selectedMatrixYears[0]}년 실적
                        </span>
                      )}
                    </th>
                  ))}
                </tr>

                {/* 2단 헤더: 선택 연도 (연도가 2개 이상일 때만 출력) */}
                {selectedMatrixYears.length > 1 && (
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                    {SEVEN_KEY_FACILITIES.map((fac) =>
                      selectedMatrixYears.map((yr, idx) => (
                        <th
                          key={`${fac.key}-${yr}`}
                          className={`py-2 px-2.5 text-center ${
                            idx === 0 ? 'border-l border-slate-200' : 'border-l border-slate-100'
                          } ${yr === latestYear ? 'bg-emerald-50/50 text-emerald-900 font-extrabold' : ''}`}
                        >
                          {yr.slice(2)}년 실적
                        </th>
                      ))
                    )}
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => {
                  const isMonthInSelectedRange = selectedPeriodMonthNumbers.has(monthNum);

                  return (
                    <tr
                      key={monthNum}
                      className={`transition-colors ${
                        isMonthInSelectedRange
                          ? 'bg-emerald-50/40 font-semibold'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Sticky Month Cell */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-800 bg-slate-50/90 sticky left-0 z-10 border-r border-slate-200 text-sm">
                        <div className="flex items-center justify-center gap-1">
                          <span>{monthNum}월</span>
                          {isMonthInSelectedRange && (
                            <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              조회
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7 Facilities × Selected Years Cells */}
                      {SEVEN_KEY_FACILITIES.map((fac) => {
                        const rows = yoyData?.pivotData?.[fac.key] || [];
                        const mRow = rows.find((r) => r.month === monthNum);
                        const dataA = mRow ? (mRow[compareYearA] as LeisureYoyYearData | undefined) : undefined;
                        const dataB = mRow ? (mRow[compareYearB] as LeisureYoyYearData | undefined) : undefined;

                        let yoyDiff: number | null = null;
                        if (
                          dataA &&
                          dataB &&
                          (dataA.visitors > 0 || dataA.roomGuests > 0) &&
                          (dataB.visitors > 0 || dataB.roomGuests > 0)
                        ) {
                          yoyDiff = Math.round((dataB.usageRate - dataA.usageRate) * 10) / 10;
                        }

                        return selectedMatrixYears.map((yr, idx) => {
                          const item = mRow ? (mRow[yr] as LeisureYoyYearData | undefined) : undefined;
                          const hasData = item && (item.visitors > 0 || item.roomGuests > 0);
                          const isLatest = yr === latestYear;
                          const isCompareTarget = yr === compareYearB && selectedMatrixYears.includes(compareYearA);

                          return (
                            <td
                              key={`${fac.key}-${monthNum}-${yr}`}
                              className={`py-3 px-2.5 text-center ${
                                idx === 0 ? 'border-l border-slate-200' : 'border-l border-slate-100'
                              } ${isLatest ? 'bg-emerald-50/20' : ''}`}
                            >
                              {hasData && item ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <div className="flex items-center gap-1 justify-center flex-wrap">
                                    <span
                                      className={`font-mono text-xs sm:text-sm font-bold ${
                                        isLatest
                                          ? 'text-emerald-700 font-extrabold'
                                          : yr === prevYear
                                          ? 'text-blue-700'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      {item.usageRate.toFixed(1)}%
                                    </span>
                                    {/* compareYearB 셀에 compareYearA 대비 증감 %p 인라인 표기 */}
                                    {isCompareTarget && yoyDiff !== null && (
                                      <span
                                        className={`text-[10px] font-bold px-1 rounded-sm leading-tight ${
                                          yoyDiff >= 0
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-rose-100 text-rose-700'
                                        }`}
                                      >
                                        {yoyDiff > 0 ? '+' : ''}
                                        {yoyDiff.toFixed(1)}%p
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 tabular-nums">
                                    {item.visitors.toLocaleString()}명
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-mono text-xs">
                                  {isLatest ? '미도래' : '-'}
                                </span>
                              )}
                            </td>
                          );
                        });
                      })}
                    </tr>
                  );
                })}

                {/* 누적 합산 요약 행 */}
                {periodCumulative && selectedPeriodMonthNumbers.size > 1 && (
                  <tr className="bg-emerald-100/70 border-t-2 border-emerald-300 font-bold text-xs text-emerald-950">
                    <td className="py-4 px-4 text-center font-black text-xs sm:text-sm bg-emerald-200/60 sticky left-0 z-10 border-r border-emerald-300">
                      <div>누적 합계</div>
                      <div className="text-[10px] font-semibold text-emerald-800">
                        ({startMonthStr.slice(5)}월~{endMonthStr.slice(5)}월)
                      </div>
                    </td>

                    {SEVEN_KEY_FACILITIES.map((fac) => {
                      const cumA = sevenFacilitiesCumulative[fac.key]?.[compareYearA];
                      const cumB = sevenFacilitiesCumulative[fac.key]?.[compareYearB];
                      let diff: number | null = null;
                      if (cumA && cumB && cumA.roomGuests > 0 && cumB.roomGuests > 0) {
                        diff = Math.round((cumB.usageRate - cumA.usageRate) * 10) / 10;
                      }

                      return selectedMatrixYears.map((yr, idx) => {
                        const cum = sevenFacilitiesCumulative[fac.key]?.[yr];
                        const isLatest = yr === latestYear;
                        const isCompareTarget = yr === compareYearB && selectedMatrixYears.includes(compareYearA);

                        return (
                          <td
                            key={`cum-${fac.key}-${yr}`}
                            className={`py-3.5 px-2 text-center border-l ${
                              idx === 0 ? 'border-emerald-300' : 'border-emerald-200'
                            } ${isLatest ? 'bg-emerald-200/50' : ''}`}
                          >
                            {cum && (cum.visitors > 0 || cum.roomGuests > 0) ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <div className="flex items-center gap-1 justify-center flex-wrap">
                                  <span className="font-mono text-xs sm:text-sm font-black text-emerald-950">
                                    {cum.usageRate.toFixed(1)}%
                                  </span>
                                  {isCompareTarget && diff !== null && (
                                    <span
                                      className={`text-[10px] font-bold px-1 rounded-sm leading-tight ${
                                        diff >= 0
                                          ? 'bg-emerald-300 text-emerald-950'
                                          : 'bg-rose-200 text-rose-900'
                                      }`}
                                    >
                                      {diff > 0 ? '+' : ''}
                                      {diff.toFixed(1)}%p
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-emerald-900/80 font-medium tabular-nums">
                                  {cum.visitors.toLocaleString()}명
                                </span>
                              </div>
                            ) : (
                              <span className="text-emerald-700/60 font-mono text-xs">-</span>
                            )}
                          </td>
                        );
                      });
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* 🔍 SINGLE_FACILITY Mode: 기존 단일 영업장 테이블 */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6 text-center w-32">월 (Month)</th>
                  {availableYears.map((yr) => (
                    <th 
                      key={yr} 
                      className={`py-4 px-6 text-center ${
                        yr === latestYear 
                          ? 'bg-emerald-50/40 text-emerald-900 border-x border-emerald-100/80 font-extrabold' 
                          : ''
                      }`}
                    >
                      {yr}년 실적 {yr === latestYear ? '(최신)' : ''}
                    </th>
                  ))}
                  <th className="py-4 px-6 text-center">
                    YoY 증감 ({latestYear.slice(2)}년 vs {prevYear.slice(2)}년)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {currentPivotRows.map((row) => {
                  const monthNum = row.month;
                  const isMonthInSelectedRange = selectedPeriodMonthNumbers.has(monthNum);

                  const dPrev = row[prevYear] as LeisureYoyYearData | undefined;
                  const dLatest = row[latestYear] as LeisureYoyYearData | undefined;

                  const hasLatestData = dLatest && (dLatest.roomGuests > 0 || dLatest.visitors > 0);
                  const hasPrevData = dPrev && (dPrev.roomGuests > 0 || dPrev.visitors > 0);

                  let yoyDiff: number | null = null;
                  if (hasLatestData && hasPrevData && dLatest && dPrev) {
                    yoyDiff = Math.round((dLatest.usageRate - dPrev.usageRate) * 10) / 10;
                  }

                  return (
                    <tr 
                      key={monthNum}
                      className={`transition-colors ${
                        isMonthInSelectedRange 
                          ? 'bg-emerald-50/40 font-semibold' 
                          : 'hover:bg-slate-50/80 opacity-75'
                      }`}
                    >
                      <td className="py-4 px-6 text-center font-extrabold text-slate-800 bg-slate-50/30 text-sm">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{monthNum}월</span>
                          {isMonthInSelectedRange && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              조회구간
                            </span>
                          )}
                        </div>
                      </td>

                      {availableYears.map((yr) => {
                        const d = row[yr] as LeisureYoyYearData | undefined;
                        const hasData = d && (d.roomGuests > 0 || d.visitors > 0);
                        const isLatest = yr === latestYear;

                        return (
                          <td 
                            key={yr} 
                            className={`py-4 px-6 text-center ${
                              isLatest ? 'bg-emerald-50/30 border-x border-emerald-100/60' : ''
                            }`}
                          >
                            {hasData && d ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span 
                                  className={`font-mono text-sm font-bold ${
                                    isLatest 
                                      ? 'text-base font-extrabold text-emerald-700' 
                                      : yr === prevYear
                                      ? 'text-blue-700'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {d.usageRate.toFixed(1)}%
                                </span>
                                <span className="text-[11px] text-slate-400 tabular-nums">
                                  {d.visitors.toLocaleString()}명 / {d.roomGuests.toLocaleString()}명
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">
                                {isLatest ? '미도래' : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-4 px-6 text-center">
                        {yoyDiff !== null ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono">
                            {yoyDiff > 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                                <ArrowUpRight size={14} className="stroke-[2.5]" />
                                +{yoyDiff.toFixed(1)}%p
                              </span>
                            ) : yoyDiff < 0 ? (
                              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-xl">
                                <ArrowDownRight size={14} className="stroke-[2.5]" />
                                {yoyDiff.toFixed(1)}%p
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                                <Minus size={14} />
                                0.0%p
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* 누적 합산 요약 행 */}
                {periodCumulative && selectedPeriodMonthNumbers.size > 1 && (
                  <tr className="bg-emerald-100/70 border-t-2 border-emerald-300 font-bold text-xs text-emerald-950">
                    <td className="py-4 px-6 text-center font-black text-sm bg-emerald-200/50">
                      <div>선택 구간 누적</div>
                      <div className="text-[11px] font-semibold text-emerald-800">
                        ({startMonthStr.slice(5)}월 ~ {endMonthStr.slice(5)}월)
                      </div>
                    </td>

                    {availableYears.map((yr) => {
                      const cum = periodCumulative[yr];
                      const isLatest = yr === latestYear;
                      return (
                        <td 
                          key={`single-cum-${yr}`} 
                          className={`py-4 px-6 text-center ${
                            isLatest ? 'bg-emerald-200/70 border-x border-emerald-300' : ''
                          }`}
                        >
                          {cum && (cum.visitors > 0 || cum.roomGuests > 0) ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span 
                                className={`font-mono font-black ${
                                  isLatest ? 'text-base text-emerald-950' : 'text-sm text-slate-800'
                                }`}
                              >
                                {cum.usageRate.toFixed(1)}%
                              </span>
                              <span className="text-[11px] text-emerald-900 font-bold tabular-nums">
                                {cum.visitors.toLocaleString()}명 / {cum.roomGuests.toLocaleString()}명
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-4 px-6 text-center">
                      {periodYoYDiff !== null ? (
                        <div className="inline-flex items-center gap-1 font-mono font-black text-xs">
                          {periodYoYDiff > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-900 bg-white/90 px-3 py-1.5 rounded-xl shadow-xs border border-emerald-200">
                              <ArrowUpRight size={15} className="stroke-[3]" />
                              +{periodYoYDiff.toFixed(1)}%p
                            </span>
                          ) : periodYoYDiff < 0 ? (
                            <span className="inline-flex items-center gap-1 text-rose-900 bg-white/90 px-3 py-1.5 rounded-xl shadow-xs border border-rose-200">
                              <ArrowDownRight size={15} className="stroke-[3]" />
                              {periodYoYDiff.toFixed(1)}%p
                            </span>
                          ) : (
                            <span className="text-slate-700 bg-white px-3 py-1.5 rounded-xl">0.0%p</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Note */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle size={14} className="text-slate-400" />
            <span>
              각 셀 표기: <b>[{selectedFacility === '벨포레 목장(체험)' ? '체험 전환율 %' : '이용률 %'}]</b> 상단, <b>({selectedFacility === '벨포레 목장(체험)' ? '체험 이용객수 / 목장 입장객수' : '시설 이용객수 / 전체 객실정원 숙박객수'})</b> 하단
              {selectedFacility === '벨포레 목장(체험)' && (
                <span className="text-emerald-700 ml-1.5 font-bold">
                  (※ '목장체험'은 전체 숙박객이 아닌 '목장 입장객'을 분모로 한 실질 체험 전환율입니다)
                </span>
              )}
            </span>
          </div>
          <span className="text-slate-400">
            데이터 소스: 리조트 공식 집계 데이터
          </span>
        </div>

      </div>

    </div>
  );
}
