"use client";

import { useState, useEffect } from 'react';
import GlobalDateSelector from '@/components/GlobalDateSelector';

export default function DailySalesPage() {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const [data, setData] = useState<{ summary: any, categories: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/daily-sales?date=${date}`);
        const result = await res.json();
        
        if (result.success && result.data) {
          setData({
            summary: result.data.summary || {},
            categories: result.data.categories || result.data.revenue || []
          });
        } else {
          setError(result.error || '데이터를 불러오지 못했습니다.');
          setData({ summary: {}, categories: [] });
        }
      } catch (err: any) {
        setError(err.message || '네트워크 오류가 발생했습니다.');
        setData({ summary: {}, categories: [] });
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [date]);

  const handleDateChange = (type: string, val: string) => {
    if (type === 'daily' || type === 'single') {
      setDate(val);
    }
  };

  const formatNumber = (num: any) => {
    if (!num || isNaN(Number(num))) return '0';
    return new Intl.NumberFormat('ko-KR').format(Number(num));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">일일 영업속보</h1>
          <p className="text-sm text-slate-400 mt-1">V6 Zero-Proxy API 데이터 기반</p>
        </div>
        <GlobalDateSelector 
          mode="single" 
          initialDate={date} 
          onChange={handleDateChange} 
        />
      </div>

      {loading ? (
        <div className="text-slate-400 animate-pulse text-center py-20">데이터를 불러오는 중입니다...</div>
      ) : (
        <div className="space-y-6">
          {error && (
             <div className="bg-rose-900/40 text-rose-300 p-4 rounded-xl border border-rose-800 text-sm font-medium">
               ⚠️ 백엔드 API 장애: {error}
             </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-slate-400 text-xs font-semibold mb-1">총 영업 매출 (Grand Total)</div>
              <div className="text-2xl font-bold text-emerald-400">{formatNumber(data?.summary?.totalRevenue)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-slate-400 text-xs font-semibold mb-1">방문객 수</div>
              <div className="text-2xl font-bold text-white">{formatNumber(data?.summary?.totalVisitors)}</div>
            </div>
          </div>

          {/* Categories Table - Zero Proxy Render */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
              <h2 className="text-sm font-bold text-slate-200">영업 카테고리별 실적 (Zero-Proxy)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/50 text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-bold border-b border-slate-800">카테고리</th>
                    <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">금일 실적</th>
                    <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">전년 동기</th>
                    <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">증감액</th>
                    <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">달성률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.categories && data.categories.length > 0 ? (
                    data.categories.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-200">{cat.categoryName || '미분류'}</td>
                        <td className="px-5 py-4 text-right">{formatNumber(cat.todayActual)}</td>
                        <td className="px-5 py-4 text-right">{formatNumber(cat.todayLy)}</td>
                        <td className="px-5 py-4 text-right text-emerald-400">{formatNumber(cat.growth)}</td>
                        <td className="px-5 py-4 text-right">{cat.achievementRate || '0'}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        데이터 대기 중 (허수 차단됨)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
