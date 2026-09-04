'use client';

import { useState, useEffect } from 'react';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import RevenueGrid from '@/components/dashboard/RevenueGrid';

import { useDateFilter } from '@/context/DateFilterContext';

export default function DailySalesPage() {
  const { startDate, endDate } = useDateFilter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const url = (startDate && endDate) 
          ? `/api/v6/dashboard/revenue-by-org?startDate=${startDate}&endDate=${endDate}`
          : `/api/v6/dashboard/revenue-by-org?startDate=${startDate || ''}&endDate=${startDate || ''}`;
        
        const res = await fetch(url);
        const result = await res.json();
        
        if (result.data && result.data.divisions) {
          setData(result.data);
        } else {
          setError(result.error || result.message || '데이터를 불러오지 못했습니다.');
          setData(null);
        }
      } catch (err: any) {
        setError(err.message || '네트워크 오류가 발생했습니다.');
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    
    if (startDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  const formatNumber = (num: any) => {
    if (!num || isNaN(Number(num))) return '0';
    return new Intl.NumberFormat('ko-KR').format(Number(num));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">일일 영업속보</h1>
          <p className="text-sm text-slate-400 mt-1">V6 Zero-Proxy 완제품 API 전용 렌더링 (단일망 배선)</p>
        </div>
        <GlobalDateSelector />
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

          {/* 4-Level Hierarchical Revenue Grid - Zero Proxy Render */}
          {data && data.divisions && data.divisions.length > 0 ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm h-[600px]">
              <RevenueGrid data={data.divisions} grandTotal={data.grandTotal} />
            </div>
          ) : (
             !error && (
               <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-500">
                 데이터 대기 중 (허수 차단됨)
               </div>
             )
          )}
        </div>
      )}
    </div>
  );
}
