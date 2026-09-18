"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Loader2, 
  ShieldCheck,
  Receipt,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { useDateFilter } from '@/context/DateFilterContext';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import DetailedExpenseReport from '@/components/DetailedExpenseReport';
import ExportGoogleSheetsModal from '@/components/ExportGoogleSheetsModal';
import { 
  RawExpenseRow, 
  allocateExpenses, 
  calculatePartKPIs, 
  LeisurePartKPISummary,
  AllocatedExpenseResult 
} from '@/lib/financeEngine';

export default function VenueExpenseAnalyticsPage() {
  const { startDate, endDate, isMounted } = useDateFilter();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<RawExpenseRow[]>([]);
  const [allocations, setAllocations] = useState<Map<string, AllocatedExpenseResult>>(new Map());
  const [partKPIs, setPartKPIs] = useState<LeisurePartKPISummary[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    if (!isMounted) return;

    let ignore = false;
    const fetchExpensesAndAllocations = async () => {
      setLoading(true);
      try {
        const yearMonth = startDate ? startDate.substring(0, 7) : '2026-08';
        const [revRes, expRes] = await Promise.all([
          fetch(`/api/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/expenses/monthly?startDate=${startDate}&endDate=${endDate}&yearMonth=${yearMonth}`),
        ]);

        const revJson = await revRes.json();
        const expJson = await expRes.json();

        if (ignore) return;

        const rawExpenses: RawExpenseRow[] = expJson.expenses || [];
        const partMetrics = revJson.parts || [];
        const roomGuests = revJson.totalRoomCap || 0;

        const { allocations: allocMap } = allocateExpenses(rawExpenses, partMetrics);
        const kpis = calculatePartKPIs(partMetrics, allocMap, roomGuests);

        setExpenses(rawExpenses);
        setAllocations(allocMap);
        setPartKPIs(kpis);
      } catch (err) {
        console.error('Failed to load venue expense analytics:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchExpensesAndAllocations();
    return () => { ignore = true; };
  }, [startDate, endDate, isMounted]);

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={36} className="animate-spin text-[#00AE95]" />
        <span className="text-sm font-semibold text-slate-500 tracking-tight">
          영업장별 상세 비용 및 인건비·복지비 분석 집계 중...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Hero Section */}
      <div className="w-full bg-[#00AE95] rounded-b-2xl text-white py-4 px-6 sm:px-8 shadow-sm relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/20 text-white text-3xs font-bold tracking-wider">
              <span>레져본부 · 비용 심층 분석</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              영업장별 상세 비용 분석
            </h1>
            <p className="text-white/90 text-xs max-w-2xl leading-relaxed">
              4대 부서의 인건비·복리후생비(복지비) 지출 비중 및 12개 세부 영업장별 실제 비용 원장 (외주 격리)
            </p>
          </div>

          <div className="shrink-0 self-start md:self-center flex items-center gap-2">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
              title="구글 스프레드시트 및 엑셀로 내보내기"
            >
              <FileSpreadsheet size={14} />
              <span>구글 시트 내보내기</span>
            </button>
            <GlobalDateSelector />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        <DetailedExpenseReport 
          expenses={expenses}
          allocations={allocations}
          partKPIs={partKPIs}
          title="부서 및 세부 영업장별 상세 비용 분석 리포트"
        />
      </div>

      {/* 구글 스프레드시트 / 엑셀 내보내기 모달 */}
      <ExportGoogleSheetsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultMonth={startDate ? startDate.substring(0, 7) : '2026-08'}
      />
    </div>
  );
}
