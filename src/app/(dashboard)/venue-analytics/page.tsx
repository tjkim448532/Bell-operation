'use client';

import React, { useState, useEffect } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import { MapPin, Users, DollarSign, Activity } from 'lucide-react';


export default function VenueAnalyticsPage() {
  const { startDate, endDate } = useDateFilter();
  const [data, setData] = useState<any[]>([]);
  const [validationMaster, setValidationMaster] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      if (!startDate || !endDate) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/venue-analytics?startDate=${startDate}&endDate=${endDate}`);
        if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`);
        const json = await res.json();
        
        if (!ignore) {
          if (json.success) {
            setData(Array.isArray(json.data) ? json.data : json.data?.tree || json.data?.rows || []);
            setValidationMaster(json.data?.validationMaster || json.data?.ValidationMaster || null);
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
    }
    loadData();
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
        <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">데이터가 없습니다</h3>
        <p className="text-slate-500">선택한 기간에 해당하는 영업장별 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            영업장별 분석
          </h2>
          <p className="text-sm text-slate-500 mt-1">백엔드 연산 완료 영업장별 ARPA 및 방문객 현황 (Zero-Proxy)</p>
        </div>
        
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-left">영업장명</th>
                <th className="py-3 px-4 text-right">총 방문객 수</th>
                <th className="py-3 px-4 text-right">유료 방문객</th>
                <th className="py-3 px-4 text-right">무료 방문객</th>
                <th className="py-3 px-4 text-right">객단가 (ARPA)</th>
                <th className="py-3 px-4 text-right">총 매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-left text-slate-800 font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {row.venueName}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-800 tabular-nums font-semibold flex items-center justify-end gap-1.5">
                    <Users className="w-4 h-4 text-indigo-500 opacity-70" />
                    {formatCurrency(row.totalVisitors)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 tabular-nums">
                    {formatCurrency(row.paidVisitors)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 tabular-nums">
                    {formatCurrency(row.freeVisitors)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-semibold tabular-nums flex items-center justify-end gap-1">
                    <DollarSign className="w-4 h-4 opacity-70" />
                    {formatCurrency(row.arpa)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 font-bold tabular-nums">
                    {formatCurrency(row.revenue)}
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
