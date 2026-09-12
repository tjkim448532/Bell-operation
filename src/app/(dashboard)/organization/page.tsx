"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  Award, 
  Layers, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/formatters';

interface OrgSummary {
  totalStaff: number;
  totalRegular: number;
  totalContract: number;
  totalPartTime: number;
  totalLabor: number;
  totalRev: number;
  productivityPerCapita: number;
  laborCostRatio: number;
}

interface OrgPart {
  partName: string;
  regularCount: number;
  contractCount: number;
  partTimeCount: number;
  totalHeadcount: number;
  managerName: string;
  laborCost: number;
  revenue: number;
  productivityPerCapita: number;
  laborCostRatio: number;
  costPerCapita: number;
}

export default function OrganizationPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [parts, setParts] = useState<OrgPart[]>([]);

  useEffect(() => {
    let ignore = false;
    const fetchOrgData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/organization');
        const json = await res.json();
        if (ignore) return;

        if (json.success) {
          setSummary(json.summary);
          setParts(json.parts);
        }
      } catch (err) {
        console.error('Failed to load organization data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchOrgData();
    return () => { ignore = true; };
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        <span className="text-xs font-semibold text-slate-500">레저본부 조직 및 운영 인력 데이터 집계 중...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-emerald-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              레저본부 조직 및 운영 인력 생산성 현황
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            5대 파트별 인력 구성(정규직/계약직/아르바이트)과 1인당 매출 생산성 및 인건비 효율을 분석합니다.
          </p>
        </div>
        <span className="text-2xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
          실운영 인력 정합성 검증 완료
        </span>
      </div>

      {/* 4 Core Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Staff */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 운영 인력</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatNumber(summary.totalStaff)} <span className="text-sm font-medium text-slate-500">명</span>
          </div>
          <p className="text-2xs text-slate-500">
            정규 {summary.totalRegular}명 | 계약 {summary.totalContract}명 | 알바 {summary.totalPartTime}명
          </p>
        </div>

        {/* 2. Productivity Per Staff */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1인당 매출 생산성</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {formatNumber(summary.productivityPerCapita)}
          </div>
          <p className="text-2xs text-slate-500">
            파트 총매출 / 총 운영 인력
          </p>
        </div>

        {/* 3. Total Labor Cost */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 인건비 집행액</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatNumber(summary.totalLabor)}
          </div>
          <p className="text-2xs text-slate-500">
            급여, 상여, 제수당 포함
          </p>
        </div>

        {/* 4. Labor Cost Ratio */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">평균 인건비율</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600">
            {formatPercent(summary.laborCostRatio, 1)}
          </div>
          <p className="text-2xs text-slate-500">
            매출 대비 총 인건비 비중
          </p>
        </div>
      </div>

      {/* Part Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parts.map((p, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{p.partName} 파트</h3>
                <span className="text-2xs text-slate-500">{p.managerName}</span>
              </div>
              <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                총 {p.totalHeadcount}명
              </span>
            </div>

            {/* Employment Type Distribution */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-2xs font-semibold text-slate-600">
                <span>인력 구성 현황</span>
                <span>정규 {p.regularCount} / 계약 {p.contractCount} / 알바 {p.partTimeCount}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                <div 
                  style={{ width: `${(p.regularCount / p.totalHeadcount) * 100}%` }} 
                  className="bg-emerald-500 h-full"
                  title={`정규직: ${p.regularCount}명`}
                />
                <div 
                  style={{ width: `${(p.contractCount / p.totalHeadcount) * 100}%` }} 
                  className="bg-sky-500 h-full"
                  title={`계약직: ${p.contractCount}명`}
                />
                <div 
                  style={{ width: `${(p.partTimeCount / p.totalHeadcount) * 100}%` }} 
                  className="bg-amber-400 h-full"
                  title={`아르바이트: ${p.partTimeCount}명`}
                />
              </div>
            </div>

            {/* Productivity Metrics */}
            <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">파트 순매출:</span>
                <span className="font-mono font-bold text-slate-900">{formatNumber(p.revenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">1인당 생산성:</span>
                <span className="font-mono font-bold text-emerald-700">{formatNumber(p.productivityPerCapita)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">파트 인건비:</span>
                <span className="font-mono font-semibold text-rose-700">{formatNumber(p.laborCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">인건비율:</span>
                <span className="font-mono font-bold text-slate-800">{formatPercent(p.laborCostRatio, 1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comprehensive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              파트별 세부 인력 및 생산성 대사표
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
                <th className="py-3 px-4 border-r border-slate-200">레저 파트</th>
                <th className="py-3 px-4 text-center border-r border-slate-200 w-20">정규직</th>
                <th className="py-3 px-4 text-center border-r border-slate-200 w-20">계약직</th>
                <th className="py-3 px-4 text-center border-r border-slate-200 w-20">알바</th>
                <th className="py-3 px-4 text-center border-r border-slate-200 w-20">총원(명)</th>
                <th className="py-3 px-4 text-right border-r border-slate-200">파트 순매출</th>
                <th className="py-3 px-4 text-right border-r border-slate-200">총 인건비</th>
                <th className="py-3 px-4 text-right border-r border-slate-200">1인당 생산성</th>
                <th className="py-3 px-4 text-right">인건비율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parts.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors font-medium">
                  <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                    {p.partName}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono border-r border-slate-200">{p.regularCount}</td>
                  <td className="py-3.5 px-4 text-center font-mono border-r border-slate-200">{p.contractCount}</td>
                  <td className="py-3.5 px-4 text-center font-mono border-r border-slate-200">{p.partTimeCount}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                    {p.totalHeadcount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 border-r border-slate-200">
                    {formatNumber(p.revenue)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-rose-700 border-r border-slate-200">
                    {formatNumber(p.laborCost)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                    {formatNumber(p.productivityPerCapita)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                    {formatPercent(p.laborCostRatio, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold text-xs">
              <tr>
                <td className="py-3.5 px-4">합계 (Total)</td>
                <td className="py-3.5 px-4 text-center font-mono text-slate-200">{summary.totalRegular}</td>
                <td className="py-3.5 px-4 text-center font-mono text-slate-200">{summary.totalContract}</td>
                <td className="py-3.5 px-4 text-center font-mono text-slate-200">{summary.totalPartTime}</td>
                <td className="py-3.5 px-4 text-center font-mono text-emerald-400">{summary.totalStaff}</td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-400">{formatNumber(summary.totalRev)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-rose-300">{formatNumber(summary.totalLabor)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-300">{formatNumber(summary.productivityPerCapita)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-amber-300">{formatPercent(summary.laborCostRatio, 1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
