"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShieldCheck, 
  Layers, 
  BarChart3, 
  Bed, 
  Loader2,
  CheckCircle2,
  CreditCard,
  Download,
  ChevronDown,
  ChevronRight,
  Building2,
  Calendar
} from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import Dashboard3DPieChart, { PieChartItem } from '@/components/Dashboard3DPieChart';
import HierarchicalRowspanTable, { HierarchicalRow } from '@/components/HierarchicalRowspanTable';
import MonthlyPnLTrendChart, { MonthlyTrendData } from '@/components/MonthlyPnLTrendChart';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { 
  allocateExpenses, 
  calculatePartKPIs, 
  LeisurePartKPISummary, 
  RawExpenseRow, 
  ValidationMasterReport 
} from '@/lib/financeEngine';
import { exportLeisureDashboardToExcel } from '@/lib/excelExport';

const PART_COLORS: Record<string, string> = {
  '액티비티': '#10b981', // emerald
  '목장': '#f59e0b',     // amber
  '마리나': '#0ea5e9',   // sky
  '미디어아트': '#8b5cf6', // purple
  '모토아레나': '#ef4444', // rose
};

export default function LeisureDashboardPage() {
  const { startDate, endDate, isMounted } = useDateFilter();

  const [loading, setLoading] = useState(true);
  const [totalRoomGuests, setTotalRoomGuests] = useState(300);
  const [partKPIs, setPartKPIs] = useState<LeisurePartKPISummary[]>([]);
  const [gridRows, setGridRows] = useState<HierarchicalRow[]>([]);
  const [audit, setAudit] = useState<ValidationMasterReport | null>(null);
  const [rawPartsData, setRawPartsData] = useState<any[]>([]);
  const [dailyTrends, setDailyTrends] = useState<any[]>([]);

  // 인터랙티브 파트 드릴다운 상태 (어떤 파트가 펼쳐졌는지)
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  // 활성 탭 (종합 분석 vs 월별 추이)
  const [activeTab, setActiveTab] = useState<'summary' | 'trend'>('summary');

  useEffect(() => {
    if (!isMounted) return;

    let ignore = false;
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const yearMonth = startDate ? startDate.substring(0, 7) : '2026-08';

        const [revRes, expRes] = await Promise.all([
          fetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/expenses/monthly?yearMonth=${yearMonth}`)
        ]);

        const revJson = await revRes.json();
        const expJson = await expRes.json();

        if (ignore) return;

        if (revJson.success) {
          const roomGuests = revJson.totalRoomCap || 300;
          setTotalRoomGuests(roomGuests);
          setGridRows(revJson.gridRows || []);
          setRawPartsData(revJson.parts || []);
          setDailyTrends(revJson.dailyTrends || []);

          const rawExpenses: RawExpenseRow[] = expJson.expenses || [];
          const partMetrics = revJson.parts || [];

          // 비용 안분 및 검증마스터 실행
          const { allocations, audit: auditReport } = allocateExpenses(rawExpenses, partMetrics);
          setAudit(auditReport);

          // 파트별 손익, 객단가, 이용율 KPI 계산
          const kpis = calculatePartKPIs(partMetrics, allocations, roomGuests);
          setPartKPIs(kpis);
        }
      } catch (err) {
        console.error('Failed to load leisure dashboard data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchAllData();
    return () => { ignore = true; };
  }, [startDate, endDate, isMounted]);

  // 대시보드 전체 총합 산출 (NO SLICE SUMMATION)
  const totalLeisureRevenue = partKPIs.reduce((sum, p) => sum + p.revenue, 0);
  const totalAllocatedExpense = partKPIs.reduce((sum, p) => sum + p.allocatedExpense, 0);
  const totalOperatingProfit = totalLeisureRevenue - totalAllocatedExpense;
  const totalProfitMargin = totalLeisureRevenue > 0 ? (totalOperatingProfit / totalLeisureRevenue) * 100 : 0;
  const totalLeisureVisitors = partKPIs.reduce((sum, p) => sum + p.visitorCount, 0);

  // 3D 파이 차트 데이터
  const revenuePieData: PieChartItem[] = partKPIs.map((p) => ({
    name: p.partName,
    value: p.revenue,
    color: PART_COLORS[p.partName] || '#64748b',
  }));

  const expensePieData: PieChartItem[] = partKPIs.map((p) => ({
    name: p.partName,
    value: p.allocatedExpense,
    color: PART_COLORS[p.partName] || '#64748b',
  }));

  // 파트별 세부 영업장 맵 (드릴다운용)
  const venuesByPart = useMemo(() => {
    const map: Record<string, { venueName: string; revenue: number; visitorCount: number; spendPerGuest: number }[]> = {};
    gridRows.forEach((r) => {
      if (!map[r.partName]) map[r.partName] = [];
      const existing = map[r.partName].find((v) => v.venueName === r.venueName);
      if (existing) {
        existing.revenue += r.revenue;
        existing.visitorCount += r.visitorCount;
        existing.spendPerGuest = existing.visitorCount > 0 ? Math.round(existing.revenue / existing.visitorCount) : 0;
      } else {
        map[r.partName].push({
          venueName: r.venueName,
          revenue: r.revenue,
          visitorCount: r.visitorCount,
          spendPerGuest: r.spendPerGuest,
        });
      }
    });
    return map;
  }, [gridRows]);

  // 엑셀 내보내기 핸들러
  const handleExportExcel = () => {
    exportLeisureDashboardToExcel({
      targetPeriod: `${startDate}_${endDate}`,
      partKPIs,
      gridRows,
      audit,
    });
  };

  const togglePartDrilldown = (partName: string) => {
    setExpandedPart(expandedPart === partName ? null : partName);
  };

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        <span className="text-xs font-semibold text-slate-500">레저본부 실적 및 손익 데이터 집계 중...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-2">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              레저사업본부 매출 및 손익(P&L) 통합 대시보드
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            실시간 V6 백엔드 매출·이용객 데이터와 월별 엑셀 비용 안분 분석 (검증마스터 적용)
          </p>
        </div>

        {/* Global Date Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-2">
          <GlobalDateSelector />
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Download size={14} />
            <span>엑셀 보고서 다운로드</span>
          </button>
        </div>
      </div>

      {/* Validation Master Status Banner */}
      {audit && (
        <div className={`px-4 py-3 rounded-xl border flex items-center justify-between ${
          audit.isZeroVariance 
            ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950' 
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className={audit.isZeroVariance ? 'text-emerald-600' : 'text-rose-600'} />
            <div className="text-xs font-bold">
              <span>검증마스터 감사: </span>
              <span className="font-extrabold text-emerald-700">
                {audit.isZeroVariance ? 'ZERO-VARIANCE 무결성 통과 (Δ = 0)' : '오차 발생 (점검 요망)'}
              </span>
              <span className="text-2xs text-slate-500 ml-2 font-normal">
                (원천 엑셀: <strong className="font-mono">{formatNumber(audit.totalExcelSum)}</strong> = 파트 분배합: <strong className="font-mono">{formatNumber(audit.totalAllocatedSum)}</strong>)
              </span>
            </div>
          </div>
          <span className="text-2xs font-semibold px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 shadow-2xs">
            100% 무결점 보증
          </span>
        </div>
      )}

      {/* 4 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">레저 총 순매출</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900">
            {formatNumber(totalLeisureRevenue)}
          </div>
          <p className="text-2xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" />
            부가세(10%) 제외 순매출 기준
          </p>
        </div>

        {/* 2. Total Allocated Expense */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">파트 분배 총비용</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900">
            {formatNumber(totalAllocatedExpense)}
          </div>
          <p className="text-2xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-rose-500" />
            직과비용 + 공통비 안분 완료
          </p>
        </div>

        {/* 3. Operating Profit (P&L) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">영업 손익 (P&L)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              totalOperatingProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
            totalOperatingProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatNumber(totalOperatingProfit)}
          </div>
          <div className="text-2xs font-semibold text-slate-600 flex items-center gap-1">
            <span>영업이익률:</span>
            <strong className={`font-mono ${totalOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatPercent(totalProfitMargin)}
            </strong>
          </div>
        </div>

        {/* 4. Total Resort Guests */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">전체 리조트 숙박객</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bed size={18} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900">
            {formatNumber(totalRoomGuests)} <span className="text-sm font-medium text-slate-500">명</span>
          </div>
          <div className="text-2xs font-semibold text-slate-600 flex items-center gap-1">
            <span>총 레저 이용객:</span>
            <strong className="font-mono text-indigo-700">{formatNumber(totalLeisureVisitors)}명</strong>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs (3D 비중 & 세부 분석 vs 월별 손익 추이) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={15} />
          <span>파트별 세부 실적 & 3D 비중 분석</span>
        </button>
        <button
          onClick={() => setActiveTab('trend')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'trend'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp size={15} />
          <span>일자별 매출 추이 분석 (백엔드 SSOT 실측)</span>
        </button>
      </div>

      {activeTab === 'trend' ? (
        /* Daily Trends Tab */
        <div className="space-y-6">
          <MonthlyPnLTrendChart data={dailyTrends} />
        </div>
      ) : (
        /* Main Summary Tab */
        <div className="space-y-6">
          {/* Middle Section: 3D Pie Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Dashboard3DPieChart 
              data={revenuePieData} 
              title="파트별 매출 점유 비중 (3D Pie Chart)" 
              metricLabel="매출액"
            />
            <Dashboard3DPieChart 
              data={expensePieData} 
              title="파트별 비용 분배 비중 (3D Pie Chart)" 
              metricLabel="분배비용"
            />
          </div>

          {/* Part-Level KPI Table with Interactive Venue Drill-down */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  레저본부 5대 파트별 핵심 KPI 및 손익(P&L) 분석
                </h3>
              </div>
              <span className="text-2xs text-slate-500 font-medium">
                * 파트명을 클릭하면 <strong>세부 영업장 목록으로 드릴다운(Drill-down)</strong>됩니다.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 border-r border-slate-200">레저 파트 (클릭하여 드릴다운)</th>
                    <th className="py-3 px-4 text-right border-r border-slate-200">파트 순매출</th>
                    <th className="py-3 px-4 text-right border-r border-slate-200">분배된 총비용</th>
                    <th className="py-3 px-4 text-right border-r border-slate-200">파트별 손익</th>
                    <th className="py-3 px-4 text-right border-r border-slate-200">이익률</th>
                    <th className="py-3 px-4 text-right border-r border-slate-200">이용객(명)</th>
                    <th className="py-3 px-4 text-right border-r border-slate-200">객단가</th>
                    <th className="py-3 px-4 text-right">숙박객 이용율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partKPIs.map((kpi, idx) => {
                    const isExpanded = expandedPart === kpi.partName;
                    const venues = venuesByPart[kpi.partName] || [];

                    return (
                      <React.Fragment key={idx}>
                        {/* Parent Part Row */}
                        <tr 
                          onClick={() => togglePartDrilldown(kpi.partName)}
                          className={`cursor-pointer transition-colors font-medium ${
                            isExpanded ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full" 
                                  style={{ backgroundColor: PART_COLORS[kpi.partName] || '#64748b' }}
                                />
                                <span>{kpi.partName}</span>
                                <span className="text-2xs font-normal text-slate-400">
                                  ({venues.length}개 영업장)
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronDown size={15} className="text-emerald-600" />
                              ) : (
                                <ChevronRight size={15} className="text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-900 border-r border-slate-200">
                            {formatNumber(kpi.revenue)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-rose-700 border-r border-slate-200">
                            {formatNumber(kpi.allocatedExpense)}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-mono font-bold border-r border-slate-200 ${
                            kpi.operatingProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {formatNumber(kpi.operatingProfit)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono border-r border-slate-200">
                            <span className={`px-2 py-0.5 rounded-md text-2xs font-semibold ${
                              kpi.operatingProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {formatPercent(kpi.profitMargin)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700 border-r border-slate-200">
                            {formatNumber(kpi.visitorCount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">
                            {formatNumber(kpi.spendPerGuest)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-700">
                            {formatPercent(kpi.utilizationRate, 2)}
                          </td>
                        </tr>

                        {/* Interactive Venue Drill-Down Sub-Rows */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0 bg-slate-50/80 border-b border-slate-200">
                              <div className="p-3 pl-8 space-y-2">
                                <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Building2 size={13} className="text-emerald-600" />
                                  <span>[{kpi.partName}] 소속 세부 영업장 드릴다운 실적</span>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-100/70 text-2xs font-semibold text-slate-600 border-b border-slate-200">
                                      <tr>
                                        <th className="py-2 px-3 text-left">영업장명</th>
                                        <th className="py-2 px-3 text-right">매출액</th>
                                        <th className="py-2 px-3 text-right">이용객(명)</th>
                                        <th className="py-2 px-3 text-right">객단가</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {venues.map((v, vIdx) => (
                                        <tr key={vIdx} className="hover:bg-slate-50/60">
                                          <td className="py-2 px-3 font-semibold text-slate-800 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            <span>{v.venueName}</span>
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                                            {formatNumber(v.revenue)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                                            {formatNumber(v.visitorCount)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                            {formatNumber(v.spendPerGuest)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold text-xs">
                  <tr>
                    <td className="py-3.5 px-4">합계 (Total)</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400">{formatNumber(totalLeisureRevenue)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-300">{formatNumber(totalAllocatedExpense)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-300">{formatNumber(totalOperatingProfit)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-200">{formatPercent(totalProfitMargin)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-200">{formatNumber(totalLeisureVisitors)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-300">
                      {formatNumber(totalLeisureVisitors > 0 ? Math.round(totalLeisureRevenue / totalLeisureVisitors) : 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-300">
                      {formatPercent(totalRoomGuests > 0 ? (totalLeisureVisitors / totalRoomGuests) * 100 : 0, 2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bottom Section: Hierarchical Rowspan Grid (대분류 > 영업장 > 상품/티켓 셀 병합) */}
          <HierarchicalRowspanTable rows={gridRows} />
        </div>
      )}
    </div>
  );
}
