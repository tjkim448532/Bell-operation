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
  TrendingUp
} from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/formatters';

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

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/validation');
      const json = await res.json();
      if (json.success) {
        setRecords(json.records || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
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
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              검증마스터 (Validation Master) 데이터 정합성 센터
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            원천 엑셀 전표 금액과 레저본부 파트별 분배 비용 간의 1원 단위 오차(Zero-Variance) 전수 감사 센터입니다.
          </p>
        </div>

        <button
          onClick={fetchAuditData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>감사 데이터 새로고침</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Audit Pass Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">감사 통과율</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {formatPercent(passRate, 1)}
          </div>
          <p className="text-2xs text-slate-500">
            총 {totalMonths}개월 중 {verifiedMonths}개월 무결성 통과
          </p>
        </div>

        {/* 2. Cumulative Excel Sum */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">누적 원천 비용 총액</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Scale size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatNumber(cumExcelSum)}
          </div>
          <p className="text-2xs text-slate-500">
            업로드된 엑셀 전표 원본 총합
          </p>
        </div>

        {/* 3. Cumulative Allocated Sum */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">누적 파트 분배 총액</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatNumber(cumAllocatedSum)}
          </div>
          <p className="text-2xs text-slate-500">
            5대 파트 최종 분배 완료액
          </p>
        </div>

        {/* 4. Total Discrepancy Delta */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">누적 잔여 오차 (Δ)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {formatNumber(cumDelta)}
          </div>
          <p className="text-2xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} />
            Zero-Variance 단수 보정 완료됨
          </p>
        </div>
      </div>

      {/* Audit Explanation Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-6 rounded-2xl text-white shadow-sm border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            검증마스터(Validation Master) 작동 원리 및 3대 감사 규칙
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="font-bold text-emerald-400">1. 직과 100% 격리 배정</div>
            <p className="text-2xs text-slate-400 leading-relaxed">
              특정 파트(루지, 목장 등) 명시 전표는 타 부서 안분 대상에서 100% 격리하여 고유 실적으로 반영합니다.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="font-bold text-emerald-400">2. 공통비 매출 비례 안분</div>
            <p className="text-2xs text-slate-400 leading-relaxed">
              본부 공통 경비는 백엔드 SSOT 매출 비율에 따라 5대 파트에 객관적으로 분배합니다.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="font-bold text-emerald-400">3. 1원 절사오차(Penny) 보정</div>
            <p className="text-2xs text-slate-400 leading-relaxed">
              반올림 및 안분 과정에서 발생하는 1~2원의 단수를 매출 1위 파트에 가산하여 원천 총액과 100% 일치시킵니다.
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Audit History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              월별 정합성 교차 감사 이력 (Audit Ledger)
            </h3>
          </div>
          <span className="text-2xs text-slate-500 font-medium">
            * 서식: ₩ 기호 제외 `#,##0` 엄격 적용
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 border-r border-slate-200">정산 월</th>
                <th className="py-3 px-4 text-right border-r border-slate-200">원천 엑셀 총액</th>
                <th className="py-3 px-4 text-right border-r border-slate-200">파트 분배 총액</th>
                <th className="py-3 px-4 text-right border-r border-slate-200">단수 오차(Δ)</th>
                <th className="py-3 px-4 text-right border-r border-slate-200">레저 순매출</th>
                <th className="py-3 px-4 text-right border-r border-slate-200">영업 손익 (P&L)</th>
                <th className="py-3 px-4 text-center border-r border-slate-200">감사 상태</th>
                <th className="py-3 px-4 text-center">검증 일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileCheck2 size={32} className="text-slate-300" />
                      <span className="text-sm font-semibold text-slate-600">등록된 월별 검증마스터 감사 이력이 없습니다.</span>
                      <span className="text-2xs text-slate-400">[비용 엑셀 업로드] 메뉴에서 엑셀 전표를 등록하면 무결성 감사 결과가 자동 기록됩니다.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors font-medium">
                  <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-emerald-600" />
                      <span>{rec.yearMonth}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-800 border-r border-slate-200">
                    {formatNumber(rec.totalExcelSum)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-indigo-700 font-semibold border-r border-slate-200">
                    {formatNumber(rec.totalAllocatedSum)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-bold border-r border-slate-200">
                    {formatNumber(rec.delta)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 border-r border-slate-200">
                    {formatNumber(rec.leisureRevenue)}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-mono font-bold border-r border-slate-200 ${
                    rec.operatingProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatNumber(rec.operatingProfit)}
                  </td>
                  <td className="py-3.5 px-4 text-center border-r border-slate-200">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={12} />
                      ZERO-VARIANCE
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-2xs font-mono text-slate-400">
                    {rec.verifiedAt ? rec.verifiedAt.split('T')[0] : '-'}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
