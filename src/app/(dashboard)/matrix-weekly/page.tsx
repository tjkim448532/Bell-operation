'use client';

import { useState, useEffect } from 'react';
import { Loader2, Calendar, TrendingUp } from 'lucide-react';

type MatrixRow = {
  is_subtotal: boolean;
  is_grand_total?: boolean;
  category_code: string;
  category_name: string;
  team_name: string;
  part_name: string;
  shop_name: string;
  today_actual: number;
  today_ly: number;
  today_growth: number;
  mtd_actual: number;
  mtd_ly: number;
  mtd_growth: number;
  ytd_actual: number;
  ytd_ly: number;
  ytd_growth: number;
};

import { useDateFilter } from '@/context/DateFilterContext';

export default function MatrixWeeklyPage() {
  const { currentMonth } = useDateFilter();
  const [data, setData] = useState<MatrixRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');


  const handleFetch = async () => {
    if (!currentMonth) return;
    
    // Get last day of the current month
    const [year, month] = currentMonth.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const fetchDate = `${currentMonth}-${lastDay}`;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/matrix-weekly?date=${fetchDate}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '데이터를 불러오는 중 오류가 발생했습니다.');
      }
      
      // Handle both { data: [...] } and direct array [...] formats
      const parsedData = Array.isArray(result) ? result : (result.data || []);
      setData(parsedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatGrowth = (rate: number) => {
    if (rate > 0) return <span className="text-red-400">+{rate.toFixed(2)}%</span>;
    if (rate < 0) return <span className="text-blue-400">{rate.toFixed(2)}%</span>;
    return <span className="text-gray-400">0.00%</span>;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <TrendingUp className="mr-3 text-mint-400" size={32} />
            V5 요일비교 매트릭스
          </h1>
          <p className="text-gray-400 mt-2">프론트엔드 연산 없이 백엔드 데이터를 그대로 렌더링하는 통합 매출 비교표입니다.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden p-6 flex items-end space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
            <Calendar size={16} className="mr-1.5" /> 기준 월
          </label>
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            {currentMonth} (마지막 날짜 기준 조회)
          </div>
        </div>
        <button
          onClick={handleFetch}
          disabled={isLoading || !currentMonth}
          className="bg-mint-600 hover:bg-mint-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <span>조회하기</span>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {data.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-300">
            <thead className="text-xs text-gray-400 bg-gray-800/50 uppercase sticky top-0">
              <tr>
                <th rowSpan={2} className="px-4 py-3 border-b border-r border-gray-700 text-center bg-gray-800/80">대분류</th>
                <th rowSpan={2} className="px-4 py-3 border-b border-r border-gray-700 text-center bg-gray-800/80">본부</th>
                <th rowSpan={2} className="px-4 py-3 border-b border-r border-gray-700 text-center bg-gray-800/80">파트</th>
                <th rowSpan={2} className="px-4 py-3 border-b border-r border-gray-700 text-center bg-gray-800/80">영업장</th>
                <th colSpan={3} className="px-4 py-2 border-b border-r border-gray-700 text-center bg-gray-800/60">금일 실적</th>
                <th colSpan={3} className="px-4 py-2 border-b border-r border-gray-700 text-center bg-gray-800/60">월 누계 (MTD)</th>
                <th colSpan={3} className="px-4 py-2 border-b border-gray-700 text-center bg-gray-800/60">연 누계 (YTD)</th>
              </tr>
              <tr>
                <th className="px-4 py-2 border-b border-r border-gray-700 text-center">당해</th>
                <th className="px-4 py-2 border-b border-r border-gray-700 text-center">전년</th>
                <th className="px-4 py-2 border-b border-r border-gray-700 text-center">증감율</th>
                <th className="px-4 py-2 border-b border-r border-gray-700 text-center">당해</th>
                <th className="px-4 py-2 border-b border-r border-gray-700 text-center">전년</th>
                <th className="px-4 py-2 border-b border-r border-gray-700 text-center">증감율</th>
                <th className="px-4 py-2 border-b border-r border-gray-700 text-center">당해</th>
                <th className="px-4 py-2 border-b border-r border-gray-700 text-center">전년</th>
                <th className="px-4 py-2 border-b border-gray-700 text-center">증감율</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                let rowClass = "border-b border-gray-800 hover:bg-gray-800/50 transition-colors";
                if (row.isGrandTotal || row.is_grand_total) {
                  rowClass = "bg-mint-900/20 font-bold text-white border-t-2 border-mint-500/50";
                } else if (row.isSubtotal || row.is_subtotal) {
                  rowClass = "bg-gray-800/80 font-bold text-gray-200 border-t border-gray-700";
                }

                return (
                  <tr key={idx} className={rowClass}>
                    <td className="px-4 py-3 border-r border-gray-800 text-center">{row.categoryName || row.category_name}</td>
                    <td className="px-4 py-3 border-r border-gray-800 text-center">{row.teamName || row.team_name}</td>
                    <td className="px-4 py-3 border-r border-gray-800 text-center">{row.partName || row.part_name}</td>
                    <td className="px-4 py-3 border-r border-gray-800 text-center">{row.shopName || row.shop_name}</td>
                    
                    <td className="px-4 py-3 border-r border-gray-800">{formatCurrency(row.todayActual || row.today_actual || 0)}</td>
                    <td className="px-4 py-3 border-r border-gray-800 text-gray-500">{formatCurrency(row.todayLy || row.today_ly || 0)}</td>
                    <td className="px-4 py-3 border-r border-gray-800 text-center font-medium">{formatGrowth(row.todayGrowth || row.today_growth || 0)}</td>
                    
                    <td className="px-4 py-3 border-r border-gray-800">{formatCurrency(row.mtdActual || row.mtd_actual || 0)}</td>
                    <td className="px-4 py-3 border-r border-gray-800 text-gray-500">{formatCurrency(row.mtdLy || row.mtd_ly || 0)}</td>
                    <td className="px-4 py-3 border-r border-gray-800 text-center font-medium">{formatGrowth(row.mtdGrowth || row.mtd_growth || 0)}</td>
                    
                    <td className="px-4 py-3 border-r border-gray-800">{formatCurrency(row.ytdActual || row.ytd_actual || 0)}</td>
                    <td className="px-4 py-3 border-r border-gray-800 text-gray-500">{formatCurrency(row.ytdLy || row.ytd_ly || 0)}</td>
                    <td className="px-4 py-3 text-center font-medium">{formatGrowth(row.ytdGrowth || row.ytd_growth || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
