'use client';

import React, { useState, useEffect } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import { Calculator, Wallet, Building2, TrendingDown } from 'lucide-react';


export default function TeamExpenseReport() {
  const { startDate, endDate } = useDateFilter();
  const [data, setData] = useState<any[]>([]);
  const [validationMaster, setValidationMaster] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      if (!startDate || !endDate) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/team-expenses?startDate=${startDate}&endDate=${endDate}`);
        if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`);
        const json = await res.json();
        
        if (!ignore) {
          if (json.success) {
            setData(Array.isArray(json.data) ? json.data : json.data?.rows || json.data?.data || []);
            setValidationMaster(json.data?.ValidationMaster || json.data?.validationMaster || null);
          } else {
            setError(json.error || '데이터를 불러오는 중 오류가 발생했습니다.');
          }
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err.message || '서버 통신 오류');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [startDate, endDate]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val || 0));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center shadow-sm">
        <span className="font-semibold">{error}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">데이터가 없습니다</h3>
        <p className="text-slate-500">선택한 기간에 해당하는 부서별 비용 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            부서별 인건비 및 비용 분석
          </h2>
          <p className="text-sm text-slate-500 mt-1">백엔드 공통비 안분 완료 데이터 (Zero-Proxy)</p>
        </div>
        
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-left">부서명</th>
                <th className="py-3 px-4 text-right">직접 비용 (인건비 포함)</th>
                <th className="py-3 px-4 text-right">공통 안분 비용</th>
                <th className="py-3 px-4 text-right">총 비용 (Grand Total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-left text-slate-800 font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {row.teamName}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 font-medium tabular-nums">
                    {formatCurrency(row.directExpense)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 font-medium tabular-nums">
                    {formatCurrency(row.allocatedCommonExpense)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600 font-bold tabular-nums flex items-center justify-end gap-1.5">
                    <TrendingDown className="w-4 h-4 opacity-70" />
                    {formatCurrency(row.totalExpense)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
