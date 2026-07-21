'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, AlertTriangle, Target, Users, Map, DollarSign, Briefcase, CloudRain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from 'recharts';
import { useDateFilter } from '@/context/DateFilterContext';

export default function BusinessPlanPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { startMonth, endMonth } = useDateFilter();
  const [expandedFacs, setExpandedFacs] = useState<Record<string, boolean>>({});

  const toggleFac = (facName: string) => {
    setExpandedFacs(prev => ({ ...prev, [facName]: !prev[facName] }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/business-plan?startMonth=${startMonth}&endMonth=${endMonth}`);
        if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다.');
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || '알 수 없는 오류');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startMonth, endMonth]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-mint-600 animate-spin mb-4" />
        <span className="text-xl font-bold text-gray-700 ml-4">맥킨지식 사업 분석 데이터를 컴파일 중입니다...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-red-500">
        <AlertTriangle className="w-16 h-16 mb-4" />
        <span className="text-2xl font-bold">오류 발생</span>
        <span className="mt-2 text-gray-600">{error}</span>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg font-bold">재시도</button>
      </div>
    );
  }

  const { summary, customerJourney, facilitiesPerformance, customerSegmentation } = data;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(val));
  };

  // Build Radar Data
  let radarData = [
    { facility: '미디어아트', weekday: 80, weekend: 30 },
    { facility: '루지', weekday: 40, weekend: 95 },
    { facility: '목장', weekday: 55, weekend: 85 },
    { facility: '카트', weekday: 30, weekend: 90 },
    { facility: '콘도식음', weekday: 70, weekend: 100 },
  ];
  if (customerSegmentation?.facilityPreference && customerSegmentation.facilityPreference.length > 0) {
    radarData = customerSegmentation.facilityPreference.map((f: any) => {
       const total = f.weekdayRevenue + f.weekendRevenue;
       return {
         facility: f.facilityName,
         weekday: total > 0 ? Math.round((f.weekdayRevenue / total) * 100) : 0,
         weekend: total > 0 ? Math.round((f.weekendRevenue / total) * 100) : 0,
       };
    });
  }

  // Build Line Data (Aggregated across all facilities)
  let lineData = [
    { time: '09시', weekday: 10, weekend: 40 },
    { time: '11시', weekday: 85, weekend: 320 },
    { time: '13시', weekday: 120, weekend: 280 },
    { time: '15시', weekday: 210, weekend: 450 },
    { time: '17시', weekday: 150, weekend: 180 },
    { time: '19시', weekday: 40, weekend: 90 },
  ];
  if (customerSegmentation?.peakTimes && customerSegmentation.peakTimes.length > 0) {
    const hourlyMap: Record<string, { weekday: number, weekend: number }> = {};
    const hours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
    hours.forEach(h => hourlyMap[h] = { weekday: 0, weekend: 0 });

    customerSegmentation.peakTimes.forEach((pt: any) => {
      const type = pt.dayType; // 'weekday' | 'weekend'
      Object.keys(pt.hourlyData || {}).forEach(h => {
        if (hourlyMap[h]) {
           hourlyMap[h][type] += pt.hourlyData[h];
        }
      });
    });

    lineData = hours.map(h => ({
      time: `${h}시`,
      weekday: hourlyMap[h].weekday,
      weekend: hourlyMap[h].weekend
    }));
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gray-900 text-white py-10 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-mint-400 to-blue-500">맥킨지식</span> 6개월 실적 리뷰 및 사업계획
            </h1>
            <p className="text-gray-400 text-lg">데이터 기반 전략 기획 리포트 (통합 P&L 및 동선 분석)</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-[-30px] space-y-8">
        
        {/* Section 1: Executive Summary */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Briefcase className="w-6 h-6 mr-3 text-purple-600" />
            1. Executive Summary (핵심 요약)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="text-sm font-bold text-green-700 mb-1">총 발생 매출 (Revenue)</div>
              <div className="text-3xl font-extrabold text-green-900">{(summary.totalRevenue / 100000000).toFixed(1)}<span className="text-lg ml-1">억원</span></div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
              <div className="text-sm font-bold text-red-700 mb-1">총 영업/공통비용 (Expenses)</div>
              <div className="text-3xl font-extrabold text-red-900">{((summary.totalOperationalExpense + summary.totalCommonExpense) / 100000000).toFixed(1)}<span className="text-lg ml-1">억원</span></div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="text-sm font-bold text-blue-700 mb-1">영업 이익률 (Operating Margin)</div>
              <div className="text-3xl font-extrabold text-blue-900">{summary.operatingMargin}<span className="text-lg ml-1">%</span></div>
            </div>
          </div>
        </section>

        {/* Section 2: True P&L 3D Visualization */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <DollarSign className="w-6 h-6 mr-3 text-green-600" />
            2. True P&L (영업장별 진성 공헌이익)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
                  <th className="p-4 font-bold">영업장명 (분류)</th>
                  <th className="p-4 font-bold text-right">매출액</th>
                  <th className="p-4 font-bold text-right">직접 지출액</th>
                  <th className="p-4 font-bold text-right">진성 공헌이익</th>
                  <th className="p-4 font-bold text-center">수익성 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facilitiesPerformance.map((fac: any, idx: number) => {
                  const isLoss = fac.contributionMargin < 0;
                  const isExpanded = !!expandedFacs[fac.facilityName];
                  
                  return (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{fac.facilityName}</div>
                          <div className="text-xs text-gray-500">{fac.teamName} / {fac.categoryCode}</div>
                        </td>
                        <td className="p-4 text-right font-medium text-gray-700">
                          {fac.revenue.toLocaleString()}원
                        </td>
                        <td className="p-4 text-right font-medium text-red-600">
                          <button 
                            onClick={() => toggleFac(fac.facilityName)} 
                            className="hover:underline focus:outline-none flex items-center justify-end w-full group"
                            title="클릭하여 세부 지출 내역 보기"
                          >
                            <span>-{fac.expense.toLocaleString()}원</span>
                            <svg className={`w-4 h-4 ml-1 text-gray-400 group-hover:text-red-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </button>
                        </td>
                        <td className={`p-4 text-right font-bold ${isLoss ? 'text-red-600' : 'text-blue-600'}`}>
                          {fac.contributionMargin > 0 ? '+' : ''}{fac.contributionMargin.toLocaleString()}원
                        </td>
                        <td className="p-4 text-center">
                          {isLoss ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              적자 (구조조정 요망)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              흑자 (캐시카우)
                            </span>
                          )}
                        </td>
                      </tr>
                      
                      {/* 지출 내역 아코디언 */}
                      {isExpanded && fac.expenseDetails && fac.expenseDetails.length > 0 && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={5} className="p-0">
                            <div className="px-6 py-4 border-t border-gray-100 shadow-inner">
                              <div className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                                <DollarSign className="w-4 h-4 mr-1 text-red-500" />
                                {fac.facilityName} 세부 지출 내역
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {fac.expenseDetails.map((detail: any, detailIdx: number) => (
                                  <div key={detailIdx} className="bg-white px-3 py-2 rounded border border-gray-200 flex justify-between items-center shadow-sm">
                                    <span className="text-xs font-medium text-gray-600 truncate mr-2" title={detail.category}>{detail.category}</span>
                                    <span className="text-sm font-bold text-red-600 shrink-0">-{detail.amount.toLocaleString()}원</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    총합계
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(facilitiesPerformance.reduce((sum: number, f: any) => sum + (f.revenue || 0), 0))}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                    -{formatCurrency(facilitiesPerformance.reduce((sum: number, f: any) => sum + (f.expense || 0), 0))}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 text-right">
                    +{formatCurrency(facilitiesPerformance.reduce((sum: number, f: any) => sum + (f.revenue || 0) - (f.expense || 0), 0))}원
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    -
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-6 flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
            <div><span className="font-bold text-gray-600">최고 수익 영업장:</span> <span className="font-extrabold text-blue-700 ml-1">{summary.bestFacility}</span></div>
            <div><span className="font-bold text-gray-600">최대 적자 영업장:</span> <span className="font-extrabold text-red-700 ml-1">{summary.worstFacility}</span></div>
          </div>
        </section>

        {/* Section 3: Channel Correlation Analytics */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <TrendingUp className="w-6 h-6 mr-3 text-orange-600" />
            3. 객실 판매채널 vs 레저 매출 상관관계 (Cross-selling)
          </h2>
          <p className="text-sm text-gray-500 mb-6">최근 1년간의 일별 객실 판매 수와 레저본부 총매출액의 피어슨 상관계수(Pearson Correlation)를 분석한 결과입니다. 100%에 가까울수록 해당 채널의 투숙객 증가가 레저 매출 상승으로 직결됨을 의미합니다.</p>
          
          {(!Array.isArray(customerJourney) || customerJourney.length === 0) ? (
            <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl border border-gray-100">충분한 일간 데이터가 누적되지 않아 상관관계를 분석할 수 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {customerJourney.map((corr: any, idx: number) => {
                const score = Math.round(corr.correlation * 100);
                const colorClass = score > 60 ? 'bg-orange-50 border-orange-100 text-orange-900' : 
                                  score > 30 ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-gray-50 border-gray-100 text-gray-900';
                const titleColor = score > 60 ? 'text-orange-700' : score > 30 ? 'text-blue-700' : 'text-gray-700';

                return (
                  <div key={idx} className={`p-6 rounded-xl border text-center ${colorClass}`}>
                    <div className="flex justify-center items-center mb-2">
                      <span className={`text-sm font-bold ${titleColor}`}>{corr.channelName}</span>
                      {idx === 0 && <span className="ml-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">Top 1</span>}
                    </div>
                    <div className="text-3xl font-extrabold mb-1">
                      {score > 0 ? '+' : ''}{score}%
                    </div>
                    <div className={`text-xs mt-2 ${titleColor}`}>
                      상관계수: {corr.correlation.toFixed(2)} (일평균 {Math.round(corr.avgRooms)}객실)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 4: Weather Impact Analysis */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <CloudRain className="w-6 h-6 mr-3 text-blue-500" />
            4. Weather Impact Analysis (기후 영향도 분석)
          </h2>
          {(!data.weatherImpact || data.weatherImpact.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <CloudRain className="w-12 h-12 text-gray-400 mb-3 opacity-50" />
              <p className="text-gray-500 font-semibold">기상청 날씨 데이터 V5 연동 대기 중입니다</p>
              <p className="text-gray-400 text-sm mt-1">백엔드 연동 완료 시, 작년/올해의 월별 비 온 날 비교 차트가 나타납니다.</p>
            </div>
          ) : (
            <div className="h-80 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weatherImpact} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="lastYearRainyDays" name="작년 비 온 날" fill="#9CA3AF" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="thisYearRainyDays" name="올해 비 온 날" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>



        {/* Section 5: Customer Segmentation & Peak Time Analysis */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
            <Users className="w-6 h-6 mr-3 text-purple-600" />
            5. 타겟 고객 세분화 및 이용 패턴 분석 (주중 vs 주말)
          </h2>
          <p className="text-sm text-gray-500 mb-6">주중(단체/행사 위주)과 주말(가족/개인 위주)의 시설 선호도 차이 및 결제 피크타임을 분석하여, 인력 배치와 타겟 마케팅 최적화를 지원합니다.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 5-1. Facility Preference */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-indigo-500" />
                시설별 선호도 교차 분석
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="facility" tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="주중 선호도" dataKey="weekday" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                    <Radar name="주말 선호도" dataKey="weekend" stroke="#EC4899" fill="#EC4899" fillOpacity={0.4} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs text-gray-500 bg-white p-3 rounded border border-gray-100 shadow-sm">
                <span className="font-bold text-purple-700">💡 인사이트:</span> 주말은 루지, 카트 등 체험형 액티비티 쏠림이 극심하나, 주중은 미디어아트(단체/관람) 비중이 높게 나타납니다.
              </div>
            </div>

            {/* 5-2. Peak Time Analysis */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Map className="w-5 h-5 mr-2 text-teal-500" />
                시간대별 결제 트래픽 (Peak Time)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="weekday" name="주중 트래픽" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="weekend" name="주말 트래픽" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs text-gray-500 bg-white p-3 rounded border border-gray-100 shadow-sm">
                <span className="font-bold text-teal-700">💡 인사이트:</span> 주말은 14~15시에 최대 결제 피크가 발생하므로, 해당 시간대에 F&B/키오스크 안내 인력을 집중 배치해야 합니다.
              </div>
            </div>
          </div>
          <div className="mt-4 text-right">
             <span className="inline-block px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full border border-green-200">
               * V5 백엔드 API 연동이 완료되어 실제 결제 데이터 기반으로 분석 차트가 표출되고 있습니다.
             </span>
          </div>
        </section>

      </div>
    </div>
  );
}
