'use client';

import React, { useState, useEffect } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';

interface RevenueSummary {
  totalRevenue: number;
  todayLyRevenue: number;
  todayGrowth: number;
  todayDiff: number;
  availableRooms: number;
  totalRooms: number;
  totalRoomCap: number;
  totalADR: number;
  totalOcc: number;
  revPAR: number;
  trevPar: number;
  totalGolfVisitors: number;
  golfGreenFeeRevenue: number;
}

interface CategorySales {
  categoryCode: string;
  revenue: number;
  weight: number;
}

interface V6SummaryResponse {
  success: boolean;
  vatPolicy: string;
  summary: RevenueSummary;
  salesByCategory: CategorySales[];
}

const formatNum = (num: number) => new Intl.NumberFormat('ko-KR').format(num || 0);

export default function V6DashboardViewer() {
  const { startDate, endDate } = useDateFilter();
  const [data, setData] = useState<V6SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchV6Data = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(\https://belleforet-data.vercel.app/api/v6/dashboard/revenue-summary?startDate=\&endDate=\\);
        if (!res.ok) throw new Error(\HTTP 통신 에러: \\);
        
        const json = await res.json();
        // Zero-Proxy: 에러나면 즉시 throw
        if (json.success === false) {
           throw new Error(json.error || '백엔드 서버 장애 발생');
        }
        setData(json.data || json);
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchV6Data();
  }, [startDate, endDate]);

  if (loading) return <div className="p-4 font-bold text-gray-700">V6 0-Variance 엔진 데이터 동기화 중...</div>;
  if (error) return <div className="p-4 text-red-600 font-bold bg-red-50 border-l-4 border-red-500">🚨 API Server Error: {error}</div>;
  if (!data || !data.summary) return <div className="p-4 font-bold text-gray-700">조회된 데이터가 없습니다. (매출 0원)</div>;

  const { summary, salesByCategory, vatPolicy } = data;

  return (
    <div className="w-full p-4 bg-white shadow-md rounded-lg space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800">통합 매출 요약 (V6 SSOT)</h2>
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">{vatPolicy || 'NET (VAT 10% 별도)'}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-500 font-bold mb-1">전사 총매출</p>
          <p className="text-2xl font-bold text-gray-900">{formatNum(summary.totalRevenue)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-500 font-bold mb-1">전년 동기 대비</p>
          <p className="text-xl font-semibold text-gray-700">{formatNum(summary.todayLyRevenue)}</p>
          <p className={\	ext-sm font-bold \\}>
            {summary.todayGrowth >= 0 ? '+' : ''}{summary.todayGrowth}% ({formatNum(summary.todayDiff)})
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-500 font-bold mb-1">객실 TrevPAR (가용 {summary.availableRooms}실 기준)</p>
          <p className="text-2xl font-bold text-purple-700">{formatNum(summary.trevPar)}</p>
          <p className="text-xs text-gray-500 mt-1">ADR: {formatNum(summary.totalADR)} | Occ: {summary.totalOcc}%</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-500 font-bold mb-1">골프 내장객 및 그린피</p>
          <p className="text-xl font-bold text-emerald-700">{formatNum(summary.golfGreenFeeRevenue)}</p>
          <p className="text-sm text-gray-600 mt-1">{formatNum(summary.totalGolfVisitors)} 명</p>
        </div>
      </div>

      {/* Category Table */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-3">카테고리별 실적 (Zero-Calculation 바인딩)</h3>
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 p-2 text-left font-bold text-gray-700">카테고리</th>
              <th className="border border-gray-300 p-2 text-right font-bold text-gray-700">매출액</th>
              <th className="border border-gray-300 p-2 text-right font-bold text-gray-700">비중 (%)</th>
            </tr>
          </thead>
          <tbody>
            {salesByCategory?.map((cat, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 font-medium">{cat.categoryCode}</td>
                <td className="border border-gray-300 p-2 text-right font-mono text-gray-900">{formatNum(cat.revenue)}</td>
                <td className="border border-gray-300 p-2 text-right font-mono text-gray-500">{cat.weight}%</td>
              </tr>
            ))}
            {(!salesByCategory || salesByCategory.length === 0) && (
              <tr>
                <td colSpan={3} className="border border-gray-300 p-4 text-center text-gray-500">데이터 없음</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
