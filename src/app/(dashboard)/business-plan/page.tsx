'use client';

import React, { useState, useEffect } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import { Target, TrendingUp, Users, DollarSign } from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';

export default function BusinessPlanPage() {
  const { startMonth } = useDateFilter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(() => {
    if (startMonth && startMonth.length >= 4) {
      const y = parseInt(startMonth.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return currentYear;
  });

  useEffect(() => {
    if (startMonth && startMonth.length >= 4) {
      const y = parseInt(startMonth.slice(0, 4), 10);
      if (!isNaN(y) && y !== year) {
        setYear(y);
      }
    }
  }, [startMonth, year]);

  const [data, setData] = useState<any[]>([]);
  const [validationMaster, setValidationMaster] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/business-plan?year=${year}`);
        const result = await res.json();
        if (!ignore) {
          if (result.success) {
            setData(Array.isArray(result.data) ? result.data : result.data?.rows || []);
            setValidationMaster(result.data?.ValidationMaster || result.data?.validationMaster || null);
          } else {
            setError(result.error || '데이터를 불러오는 중 오류가 발생했습니다.');
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
  }, [year]);

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
        <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">데이터가 없습니다</h3>
        <p className="text-slate-500">{year}년도 사업 계획 데이터가 존재하지 않습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            {year}년 연간사업 종합 분석
          </h2>
          <p className="text-sm text-slate-500 mt-1">백엔드 연산 완료 누적 실적 및 달성률 (Zero-Proxy)</p>
        </div>
        
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          주요 업장별 사업 계획 대비 달성률
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="facilityName" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, '달성률']}
                labelStyle={{ color: '#334155', fontWeight: 600, marginBottom: '4px' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="achievementRate" name="달성률 (%)" radius={[4, 4, 0, 0]}>
                {data.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.achievementRate >= 100 ? '#10b981' : (entry.achievementRate >= 80 ? '#6366f1' : '#f43f5e')} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-center">순위</th>
                <th className="py-3 px-4 text-left">본부</th>
                <th className="py-3 px-4 text-left">업장명</th>
                <th className="py-3 px-4 text-right">전년 실적 ({year-1})</th>
                <th className="py-3 px-4 text-right">사업 계획 ({year})</th>
                <th className="py-3 px-4 text-right">당해 실적 ({year})</th>
                <th className="py-3 px-4 text-right">달성률 (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-center text-slate-500 font-medium">
                    {row.no || (idx + 1)}
                  </td>
                  <td className="py-3 px-4 text-left text-slate-600">
                    {row.teamName}
                  </td>
                  <td className="py-3 px-4 text-left text-slate-800 font-semibold">
                    {row.facilityName}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                    {formatCurrency(row.actual2025 || 0)}
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-600 tabular-nums font-medium">
                    {formatCurrency(row.target2026 || 0)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 tabular-nums font-bold">
                    {formatCurrency(row.actual2026 || 0)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold">
                    <span className={row.achievementRate >= 100 ? 'text-emerald-600' : (row.achievementRate >= 80 ? 'text-indigo-600' : 'text-rose-600')}>
                      {row.achievementRate}%
                    </span>
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
