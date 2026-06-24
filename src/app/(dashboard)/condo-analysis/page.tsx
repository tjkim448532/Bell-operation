'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Database, Search, Users } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function CondoAnalysisPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Set default to current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;
    setStartDate(currentMonth);
    setEndDate(currentMonth);
  }, []);

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      setError('조회 기간을 설정해주세요.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/room-data?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러오는 중 오류가 발생했습니다.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const groupMarketType = (market: string) => {
    if (market.includes('단체') || market.includes('세미나')) return '단체(세미나)';
    if (market.includes('기업') || market.includes('휴양소')) return '기업 휴양소';
    if (market.includes('예약실') || market.includes('전화') || market.includes('메신저') || market.includes('홈페이지') || market.includes('APP')) return '예약실+홈페이지+전화';
    if (market.includes('온라인') || market.includes('여행사') || market.includes('OTA') || market.includes('자동') || market.includes('수동')) return 'OTA';
    return '기타';
  };

  const COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA'];

  // Calculate expected guests
  const calculateExpectedGuests = () => {
    if (!result || !result.data) return 0;
    
    let totalGuests = 0;
    if (result.data['16평']) totalGuests += result.data['16평'].totalNights * 2.5;
    if (result.data['35평']) totalGuests += result.data['35평'].totalNights * 4.5;
    if (result.data['51평']) totalGuests += result.data['51평'].totalNights * 6.0;
    
    return Math.round(totalGuests);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">콘도 객실 상세 분석</h1>
          <p className="text-gray-400 mt-2">시스템에 저장된 객실 원본 데이터를 기반으로 평수별, 마켓타입별 매출을 분석합니다.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center space-x-2 text-white">
            <Database size={20} className="text-yellow-400" />
            <span>조회 기간 설정</span>
          </h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
              />
              <span className="text-gray-400">~</span>
              <input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
              />
            </div>
            <button
              onClick={handleFetch}
              disabled={isLoading}
              className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>조회 중...</span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span>데이터 조회</span>
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start space-x-3 text-red-400">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      {result && result.data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-sm font-medium text-gray-400 mb-1">총 객실 매출</div>
              <div className="text-3xl font-bold text-mint-400">{formatCurrency(result.summary.totalRevenue)}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-sm font-medium text-gray-400 mb-1">총 객실 박수</div>
              <div className="text-3xl font-bold text-blue-400">{result.summary.totalNights.toLocaleString()} 박</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Users size={64} className="text-purple-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center text-sm font-medium text-gray-400 mb-1">
                  <Users size={16} className="mr-1.5 text-purple-400" />
                  예상 누적 숙박객 수
                </div>
                <div className="text-3xl font-bold text-purple-400">{calculateExpectedGuests().toLocaleString()} 명</div>
                <div className="text-xs text-gray-500 mt-2">16평(2.5명) / 35평(4.5명) / 51평(6명) 기준</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {['16평', '35평', '51평'].map((type) => {
              const typeData = result.data[type];
              if (!typeData) return null;

              // Group markets into 4 major categories
              const groupedMarkets: Record<string, { revenue: number, nights: number }> = {
                '단체(세미나)': { revenue: 0, nights: 0 },
                'OTA': { revenue: 0, nights: 0 },
                '예약실+홈페이지+전화': { revenue: 0, nights: 0 },
                '기업 휴양소': { revenue: 0, nights: 0 },
                '기타': { revenue: 0, nights: 0 },
              };

              Object.entries(typeData.markets).forEach(([marketName, data]: any) => {
                const groupName = groupMarketType(marketName);
                groupedMarkets[groupName].revenue += data.revenue;
                groupedMarkets[groupName].nights += data.nights;
              });

              // Remove empty categories and sort by revenue
              const sortedMarkets = Object.entries(groupedMarkets)
                .filter(([_, data]) => data.nights > 0)
                .sort(([, a]: any, [, b]: any) => b.revenue - a.revenue);

              // Prepare chart data
              const chartData = sortedMarkets.map(([name, data]) => ({
                name,
                value: data.nights
              }));

              return (
                <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-gray-800 bg-gray-800/50">
                    <h3 className="text-xl font-semibold text-white flex justify-between items-center">
                      <span>{type}</span>
                      <span className="text-sm font-normal text-gray-400">{typeData.totalNights.toLocaleString()} 박</span>
                    </h3>
                    <div className="text-2xl font-bold text-mint-400 mt-2">
                      {formatCurrency(typeData.totalRevenue)}
                    </div>
                  </div>
                  
                  {chartData.length > 0 && (
                    <div className="p-4 flex flex-col justify-center items-center h-64 border-b border-gray-800">
                      <div className="text-xs text-gray-500 mb-2 font-medium tracking-wide">판매 비중 (박수 기준)</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value.toLocaleString()} 박`, '판매 박수']}
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="flex-1 overflow-auto max-h-[400px]">
                    <table className="w-full text-sm text-left text-gray-300">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-800/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3">분류</th>
                          <th className="px-4 py-3 text-right">박수</th>
                          <th className="px-4 py-3 text-right">매출</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMarkets.map(([market, data]: any, index: number) => (
                          <tr key={market} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-200 flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              {market}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{data.nights.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(data.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>
      )}
    </div>
  );
}
