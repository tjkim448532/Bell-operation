'use client';
import React, { useState, useEffect } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';


export default function MonthlyTrendsPage() {
  const { startMonth } = useDateFilter();
  const [year, setYear] = useState<number>(() => {
    if (startMonth && startMonth.length >= 4) {
      const y = parseInt(startMonth.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let ignore = false;
    const fetchTrends = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/monthly-trends?year=${year}`);
        if (!res.ok) {
          throw new Error(`서버 응답 오류 (${res.status})`);
        }
        const json = await res.json();
        if (!ignore) {
          if (json.success) {
            setData(json.data || []);
            setValidationMaster(json.data?.validationMaster || json.data?.ValidationMaster || null);
          } else {
            setError(json.error || '데이터를 불러오는 중 오류가 발생했습니다.');
          }
        }
      } catch (e: any) {
        if (!ignore) {
          setError(e.message || '서버 통신 오류');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    fetchTrends();
    return () => { ignore = true; };
  }, [year]);

  const formatShort = (val: number) => {
    if (!val) return '0';
    return (val / 1000000).toFixed(0) + 'M';
  };

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
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">데이터가 없습니다</h3>
        <p className="text-slate-500">{year}년도 월별 손익 데이터가 존재하지 않습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            {year}년 월별 손익 분석
          </h2>
          <p className="text-sm text-slate-500 mt-1">백엔드 연산 완료 누적 데이터 (Zero-Proxy)</p>
        </div>
        
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          월별 매출 및 누적 이익 추이
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} 
                tickFormatter={(val) => val.slice(4) + '월'} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} 
                tickFormatter={(val) => formatShort(val)} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} 
                tickFormatter={(val) => formatShort(val)} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value) + '원'}
                labelFormatter={(label) => label.slice(0, 4) + '년 ' + label.slice(4) + '월'}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="월 매출" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Line yAxisId="right" type="monotone" dataKey="ytdProfit" name="누적 이익 (YTD Profit)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-center">월</th>
                <th className="py-3 px-4 text-right">월 매출</th>
                <th className="py-3 px-4 text-right">누적 이익 (YTD Profit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-center text-slate-700 font-medium">
                    {row.month.slice(4)}월
                  </td>
                  <td className="py-3 px-4 text-right text-slate-800 font-semibold tabular-nums">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-bold tabular-nums">
                    {formatCurrency(row.ytdProfit)}
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
