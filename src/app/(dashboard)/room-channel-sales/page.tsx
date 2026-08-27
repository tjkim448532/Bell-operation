"use client";

import { useState, useEffect } from 'react';
import GlobalDateSelector from '@/components/GlobalDateSelector';

export default function RoomChannelSalesPage() {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const [data, setData] = useState<{ summary: any, segments: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/room-channel-sales?date=${date}`);
        const result = await res.json();
        
        if (result.success && result.data) {
          setData({
            summary: result.data.summary || {},
            segments: result.data.segments || []
          });
        } else {
          setError(result.error || '데이터를 불러오지 못했습니다.');
          setData({ summary: {}, segments: [] });
        }
      } catch (err: any) {
        setError(err.message || '네트워크 오류가 발생했습니다.');
        setData({ summary: {}, segments: [] });
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
          <h1 className="text-2xl font-bold text-slate-100">객실 세그먼트 실적</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-slate-400 text-xs font-semibold mb-1">총 객실 매출</div>
              <div className="text-2xl font-bold text-emerald-400">{formatNumber(data?.summary?.totalRevenue)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-slate-400 text-xs font-semibold mb-1">총 판매 객실(Nights)</div>
              <div className="text-2xl font-bold text-white">{formatNumber(data?.summary?.totalRoomsSold)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-slate-400 text-xs font-semibold mb-1">총 정원(Capacity)</div>
              <div className="text-2xl font-bold text-white">{formatNumber(data?.summary?.totalRoomCap)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="text-slate-400 text-xs font-semibold mb-1">예상 숙박객 수</div>
              <div className="text-2xl font-bold text-white">{formatNumber(data?.summary?.totalGuests)}</div>
            </div>
          </div>

          {/* Segments Table - Zero Proxy Render */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
              <h2 className="text-sm font-bold text-slate-200">세그먼트별 실적 상세 (Zero-Proxy)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/50 text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-bold border-b border-slate-800">세그먼트(채널)</th>
                    <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">매출액</th>
                    <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">판매 객실 수</th>
                    <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">숙박객 수</th>
                    <th className="px-5 py-4 font-bold border-b border-slate-800 text-right">객단가(ADR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.segments && data.segments.length > 0 ? (
                    data.segments.map((seg, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-200">{seg.segmentName || seg.channelName || '미분류'}</td>
                        <td className="px-5 py-4 text-right">{formatNumber(seg.revenue)}</td>
                        <td className="px-5 py-4 text-right">{formatNumber(seg.roomsSold)}</td>
                        <td className="px-5 py-4 text-right">{formatNumber(seg.guests)}</td>
                        <td className="px-5 py-4 text-right">{formatNumber(seg.adr)}</td>
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
