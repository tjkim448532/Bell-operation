"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Calendar, 
  Database, 
  DollarSign, 
  FileCheck2, 
  Scale, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Trash2,
  Kanban
} from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/formatters';
import ExpenseKanbanBoard from '@/components/ExpenseKanbanBoard';

interface AuditRecord {
  yearMonth: string;
  totalExcelSum: number;
  totalAllocatedSum: number;
  delta: number;
  isZeroVariance: boolean;
  status: 'VERIFIED' | 'DISCREPANCY';
  itemCount: number;
  verifiedAt: string;
  leisureRevenue: number;
  operatingProfit: number;
}

export default function ValidationAuditCenterPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('2026-07');
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/validation');
      const json = await res.json();
      if (json.success && json.records) {
        setRecords(json.records);
        if (json.records.length > 0) {
          setSelectedYearMonth((prev) => {
            const exists = json.records.some((r: any) => r.yearMonth === prev);
            return exists ? prev : json.records[0].yearMonth;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (yearMonth: string) => {
    const confirmed = window.confirm(
      `[${yearMonth}]월의 비용 및 검증 데이터를 정말 삭제하시겠습니까?\n\n※ 등록된 원천 전표와 배부 이력이 모두 영구 삭제됩니다.`
    );
    if (!confirmed) return;

    setDeletingMonth(yearMonth);
    setDeleteSuccessMsg(null);

    try {
      const res = await fetch(`/api/validation?yearMonth=${yearMonth}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setDeleteSuccessMsg(`[${yearMonth}]월 검증 기록 및 전표 데이터가 정상 삭제되었습니다.`);
        await fetchAuditData();
        setTimeout(() => setDeleteSuccessMsg(null), 4000);
      } else {
        alert(`삭제 실패: ${json.error || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      alert(`삭제 요청 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setDeletingMonth(null);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  // 전체 통계
  const totalMonths = records.length;
  const verifiedMonths = records.filter((r) => r.isZeroVariance).length;
  const passRate = totalMonths > 0 ? (verifiedMonths / totalMonths) * 100 : 0;
  const cumExcelSum = records.reduce((sum, r) => sum + r.totalExcelSum, 0);
  const cumAllocatedSum = records.reduce((sum, r) => sum + r.totalAllocatedSum, 0);
  const cumDelta = cumExcelSum - cumAllocatedSum;
  const cumRevenue = records.reduce((sum, r) => sum + r.leisureRevenue, 0);
  const cumProfit = records.reduce((sum, r) => sum + r.operatingProfit, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Hero Section */}
      <div className="w-full bg-[#00AE95] rounded-b-2xl text-white py-4 px-6 sm:px-8 shadow-sm relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/20 text-white text-3xs font-bold tracking-wider">
              <ShieldCheck size={12} />
              <span>비용 정합성 검증</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              데이터 검증센터 (Zero-Variance)
            </h1>
            <p className="text-white/90 text-xs max-w-2xl leading-relaxed">
              원천 전표 총액과 4대 부서 배부 비용의 1원 단위 일치 여부 검증 및 무결성 감사
            </p>
          </div>

          <button
            onClick={fetchAuditData}
            className="self-start md:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>데이터 새로고침</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Audit Pass Rate */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">검증 일치율</span>
              <div className="w-8 h-8 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#00AE95]">
              {formatPercent(passRate, 1)}
            </div>
            <p className="text-2xs text-slate-500 font-medium">
              총 {totalMonths}개월 중 {verifiedMonths}개월 검증 완료
            </p>
          </div>

          {/* 2. Cumulative Excel Sum */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">누적 원천 비용 총액</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Scale size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
              {formatNumber(cumExcelSum)}
            </div>
            <p className="text-2xs text-slate-500 font-medium">
              업로드된 엑셀 전표 원본 총합
            </p>
          </div>

          {/* 3. Cumulative Allocated Sum */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">누적 부서 배부 총액</span>
              <div className="w-8 h-8 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                <Database size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
              {formatNumber(cumAllocatedSum)}
            </div>
            <p className="text-2xs text-slate-500 font-medium">
              4대 부서 최종 배부 완료액
            </p>
          </div>

          {/* 4. Total Discrepancy Delta */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">누적 잔여 오차</span>
              <div className="w-8 h-8 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#00AE95]">
              {formatNumber(cumDelta)}
            </div>
            <p className="text-2xs text-[#00AE95] font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} />
              정상 일치 (오차 없음)
            </p>
          </div>
        </div>

        {/* Audit Explanation Banner */}
        <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-[#00AE95]" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              비용 배부 기준 및 정산 원칙
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-xl bg-[#E6F7F4]/40 border border-[#00AE95]/20 space-y-1.5">
              <div className="font-bold text-[#00826F] text-sm">1. 직과 100% 배정</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                특정 부서(미디어아트센터, 액티비티, 목장, 디지털지원) 명시 전표는 해당 부서 고유 실적으로 100% 반영합니다.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#E6F7F4]/40 border border-[#00AE95]/20 space-y-1.5">
              <div className="font-bold text-[#00826F] text-sm">2. 공통비 매출 비례 배부</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                본부 공통 경비는 각 부서의 매출 비율에 따라 객관적으로 분배합니다.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#E6F7F4]/40 border border-[#00AE95]/20 space-y-1.5">
              <div className="font-bold text-[#00826F] text-sm">3. 1원 절사오차 보정</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                계산 과정에서 발생하는 1~2원의 단수를 매출 1위 부서에 가산하여 원천 총액과 100% 일치시킵니다.
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Audit History Table */}
        <div className="space-y-3">
          {deleteSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                {deleteSuccessMsg}
              </span>
              <button 
                onClick={() => setDeleteSuccessMsg(null)} 
                className="text-xs text-emerald-600 hover:text-emerald-900 cursor-pointer"
              >
                닫기
              </button>
            </div>
          )}

          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                  <FileCheck2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    월별 정합성 대조 이력
                  </h3>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    행을 클릭하거나 [칸반 검증] 버튼을 누르면 하단에 해당 월의 전표 칸반 보드가 즉시 열립니다.
                  </p>
                </div>
              </div>
              <span className="text-2xs text-slate-500 font-medium">
                * 부가가치세 제외
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50/80 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 border-r border-slate-200">정산 월</th>
                    <th className="py-3.5 px-4 text-right border-r border-slate-200">원천 엑셀 총액</th>
                    <th className="py-3.5 px-4 text-right border-r border-slate-200">부서 배부 총액</th>
                    <th className="py-3.5 px-4 text-right border-r border-slate-200">단수 오차</th>
                    <th className="py-3.5 px-4 text-right border-r border-slate-200">레져 순매출</th>
                    <th className="py-3.5 px-4 text-right border-r border-slate-200">영업 손익</th>
                    <th className="py-3.5 px-4 text-center border-r border-slate-200">검증 상태</th>
                    <th className="py-3.5 px-4 text-center border-r border-slate-200">검증 일시</th>
                    <th className="py-3.5 px-4 text-center">칸반 검증 & 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileCheck2 size={36} className="text-slate-300" />
                          <span className="text-sm font-semibold text-slate-600">등록된 월별 검증 이력이 없습니다.</span>
                          <span className="text-xs text-slate-400">[비용 엑셀 등록] 메뉴에서 엑셀 전표를 등록하면 검증 결과가 자동 기록됩니다.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((rec, idx) => {
                      const isSelected = rec.yearMonth === selectedYearMonth;
                      return (
                        <tr 
                          key={idx} 
                          onClick={() => {
                            setSelectedYearMonth(rec.yearMonth);
                            const el = document.getElementById('expense-kanban-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`transition-colors font-medium cursor-pointer ${
                            isSelected 
                              ? 'bg-[#E6F7F4]/60' 
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className={isSelected ? "text-[#00AE95]" : "text-slate-400"} />
                              <span className="font-mono text-sm">{rec.yearMonth}</span>
                              {isSelected && (
                                <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-[#00AE95] text-white">
                                  선택됨
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-800 border-r border-slate-200">
                            {formatNumber(rec.totalExcelSum)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[#00AE95] font-bold border-r border-slate-200">
                            {formatNumber(rec.totalAllocatedSum)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[#00AE95] font-black border-r border-slate-200">
                            {formatNumber(rec.delta)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-900 border-r border-slate-200">
                            {formatNumber(rec.leisureRevenue)}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-mono font-bold border-r border-slate-200 ${
                            rec.operatingProfit >= 0 ? 'text-[#00AE95]' : 'text-rose-600'
                          }`}>
                            {formatNumber(rec.operatingProfit)}
                          </td>
                          <td className="py-3.5 px-4 text-center border-r border-slate-200">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-[#00AE95]/10 text-[#00AE95] border border-[#00AE95]/20">
                              <CheckCircle2 size={12} />
                              정상 일치
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs font-mono text-slate-400 border-r border-slate-200">
                            {rec.verifiedAt ? rec.verifiedAt.split('T')[0] : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedYearMonth(rec.yearMonth);
                                  const el = document.getElementById('expense-kanban-section');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-2xs font-bold text-white bg-[#00AE95] hover:bg-[#009681] shadow-xs transition-all cursor-pointer"
                                title="칸반 보드에서 검증 및 전표 수정"
                              >
                                <Kanban size={12} />
                                <span>칸반 검증</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(rec.yearMonth)}
                                disabled={deletingMonth === rec.yearMonth}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-2xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                                title="이 달의 데이터 삭제"
                              >
                                {deletingMonth === rec.yearMonth ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : (
                                  <Trash2 size={11} />
                                )}
                                <span>삭제</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 선택된 월 전표 칸반 보드 및 매핑 검증센터 */}
        <ExpenseKanbanBoard
          yearMonth={selectedYearMonth}
          onYearMonthChange={setSelectedYearMonth}
          availableMonths={records.map((r) => r.yearMonth)}
          onSaved={fetchAuditData}
          titlePrefix="데이터 검증센터"
        />
      </div>
    </div>
  );
}
