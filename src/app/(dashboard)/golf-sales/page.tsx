'use client';

import { useState, useEffect } from 'react';
import GlobalDateSelector from '@/components/GlobalDateSelector';
import { useDateFilter } from '@/context/DateFilterContext';

export default function GolfSalesPage() {
  const { startDate } = useDateFilter();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const url = `/api/v6/dashboard/golf-sales?date=${startDate || ''}`;
        
        const res = await fetch(url);
        const result = await res.json();
        
        // Backend returns either the array directly, or inside a data envelope.
        if (Array.isArray(result)) {
          setData(result);
        } else if (result && Array.isArray(result.data)) {
          setData(result.data);
        } else if (result.status && result.status >= 400) {
          setError(result.message || result.details || '데이터를 불러오지 못했습니다.');
          setData([]);
        } else {
          setData([]);
        }
      } catch (err: any) {
        setError(err.message || '네트워크 오류가 발생했습니다.');
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    
    if (startDate) {
      fetchData();
    }
  }, [startDate]);

  const formatNumber = (num: any) => {
    if (!num || isNaN(Number(num))) return '0';
    return new Intl.NumberFormat('ko-KR').format(Number(num));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">V6 골프 전용 대시보드</h1>
          <p className="text-sm text-slate-400 mt-1">Zero-Variance 마트 뷰 기반 무결성 데이터</p>
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

          {!error && data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map((item, idx) => (
                <div key={idx} className="col-span-full space-y-6">
                  <h2 className="text-xl font-bold text-emerald-400">{item.facilityName}</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                      <div className="text-slate-400 text-xs font-semibold mb-1">그린피 매출</div>
                      <div className="text-2xl font-bold text-white">{formatNumber(item.greenFeeRevenue)}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                      <div className="text-slate-400 text-xs font-semibold mb-1">카트비 매출</div>
                      <div className="text-2xl font-bold text-white">{formatNumber(item.cartFeeRevenue)}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                      <div className="text-slate-400 text-xs font-semibold mb-1">캐디피 매출</div>
                      <div className="text-2xl font-bold text-white">{formatNumber(item.caddieFeeRevenue)}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                      <div className="text-slate-400 text-xs font-semibold mb-1">기타 매출</div>
                      <div className="text-2xl font-bold text-white">{formatNumber(item.extraRevenue)}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm bg-gradient-to-br from-slate-900 to-emerald-900/20">
                      <div className="text-slate-400 text-xs font-semibold mb-1">골프 내장객</div>
                      <div className="text-2xl font-bold text-emerald-400">{formatNumber(item.visitors)} 명</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !error && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-500">
                조회된 데이터가 없거나 대기 중입니다.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
