'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, AlertTriangle, Target, Users, Map, DollarSign, Briefcase, CloudRain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from 'recharts';
import { useDateFilter } from '@/context/DateFilterContext';
import { businessPlanV5Schema } from '@/lib/schemas/dashboard.schema';
import GlobalDateSelector from '@/components/GlobalDateSelector';

export default function BusinessPlanPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { startMonth, endMonth } = useDateFilter();
  const [expandedFacs, setExpandedFacs] = useState<Record<string, boolean>>({});
  const [correlationTab, setCorrelationTab] = useState<'total' | 'weekday' | 'weekend'>('total');

  const toggleFac = (facName: string) => {
    setExpandedFacs(prev => ({ ...prev, [facName]: !prev[facName] }));
  };

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/business-plan?startMonth=${startMonth}&endMonth=${endMonth}`);
        const result = await res.json().catch(() => ({ success: false, error: '서버 응답을 읽을 수 없습니다.' }));
        if (!res.ok || !result.success) {
          throw new Error(result.error || result.details || '데이터를 불러오는데 실패했습니다.');
        }
        
        // Zod 방패(Shield) 가동: 백엔드 숫자가 무결한지 단속
        const parseResult = businessPlanV5Schema.safeParse(result.data);
        if (!parseResult.success) {
          console.error('Zod Validation Error:', parseResult.error);
          throw new Error('API 데이터 무결성 훼손 (Data Integrity Breach): True P&L 총합 숫자가 누락되거나 변조되었습니다. Zod 방어막이 렌더링을 차단했습니다.');
        }
        if (!ignore) {
          setData(parseResult.data);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { ignore = true; };
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

  const parseAmount = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = Number(val.replace(/,/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatCurrency = (val: any) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(parseAmount(val)));
  };

  // Build Radar Data from real V5 customer segmentation (Strict Zero-Dummy Policy)
  let radarData: { facility: string; weekday: number; weekend: number }[] = [];
  const excludedRadarFacilities = ['미사용 티켓', '미분류', '기타', '레저본부_공통', 'FNB본부_공통', '객실_공통'];
  
  if (customerSegmentation?.facilityPreference && Array.isArray(customerSegmentation.facilityPreference) && customerSegmentation.facilityPreference.length > 0) {
    radarData = customerSegmentation.facilityPreference
      .filter((f: any) => !excludedRadarFacilities.includes(f.facilityName))
      .map((f: any) => {
        const total = (f.weekdayRevenue || 0) + (f.weekendRevenue || 0);
        return {
          facility: f.facilityName,
          weekday: total > 0 ? Math.round(((f.weekdayRevenue || 0) / total) * 100) : 0,
          weekend: total > 0 ? Math.round(((f.weekendRevenue || 0) / total) * 100) : 0,
        };
      })
      .filter((f: any) => f.weekday > 0 || f.weekend > 0);
  }

  // Build Line Data from real V5 peak times (Strict Zero-Dummy Policy: No hardcoded mock array)
  let lineData: { time: string; weekday: number; weekend: number }[] = [];
  if (customerSegmentation?.peakTimes && Array.isArray(customerSegmentation.peakTimes) && customerSegmentation.peakTimes.length > 0) {
    const hourlyMap: Record<string, { weekday: number, weekend: number }> = {};
    const hours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
    hours.forEach(h => { hourlyMap[h] = { weekday: 0, weekend: 0 }; });

    let hasActualData = false;
    customerSegmentation.peakTimes.forEach((pt: any) => {
      const type = pt.dayType as 'weekday' | 'weekend';
      if (type === 'weekday' || type === 'weekend') {
        Object.keys(pt.hourlyData || {}).forEach(h => {
          if (hourlyMap[h] !== undefined) {
             const count = Number(pt.hourlyData[h]) || 0;
             hourlyMap[h][type] += count;
             if (count > 0) hasActualData = true;
          }
        });
      }
    });

    if (hasActualData) {
      lineData = hours.map(h => ({
        time: `${h}시`,
        weekday: hourlyMap[h].weekday,
        weekend: hourlyMap[h].weekend
      }));
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100/80">
              <Briefcase className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  레저사업 종합 분석
                </h1>
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-100">
                  경영 전략 리포트
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                데이터 기반 종합 경영 기획 리포트 (부서별 순이익, 기상 영향 및 객실-레저 교차 판매 상관관계)
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <GlobalDateSelector />
        </div>
      </div>

      {/* Section 1: Executive Summary */}
      <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
            <Target className="w-4 h-4" />
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            1. 핵심 경영 요약 (Executive Summary)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[120px] overflow-hidden">
            <div className="text-xs font-semibold text-slate-500 truncate">총 발생 매출</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums my-1 truncate">
              {(summary.totalRevenue / 100000000).toFixed(1)}<span className="text-xs sm:text-sm font-semibold ml-1 text-slate-600">억원</span>
            </div>
            <div className="text-2xs sm:text-xs text-slate-400 font-medium truncate">선택 기간 레저본부 총계</div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[120px] overflow-hidden">
            <div className="text-xs font-semibold text-slate-500 truncate">총 집행 비용</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-rose-600 tabular-nums my-1 truncate">
              {((summary.totalOperationalExpense + summary.totalCommonExpense) / 100000000).toFixed(1)}<span className="text-xs sm:text-sm font-semibold ml-1 text-slate-600">억원</span>
            </div>
            <div className="text-2xs sm:text-xs text-slate-400 font-medium truncate">운영직접비 + 공통비용 합계</div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[120px] overflow-hidden">
            <div className="text-xs font-semibold text-slate-500 truncate">공헌이익률 (영업이익률)</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-600 tabular-nums my-1 truncate">
              {summary.operatingMargin}<span className="text-xs sm:text-sm font-semibold ml-1 text-slate-600">%</span>
            </div>
            <div className="text-2xs sm:text-xs text-slate-400 font-medium truncate">매출 대비 잔여 이익 비중</div>
          </div>
        </div>
      </section>

      {/* Section 2: 매출 대비 순이익 */}
      <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                2. 영업장별 매출 대비 공헌이익 및 비용 내역
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">영업장별 직접 발생 비용과 공헌이익을 비교하여 수익성을 평가합니다.</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200/60 self-start sm:self-auto">
            실시간 연동
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
                <th className="p-3.5">영업장명 (소속 부서)</th>
                <th className="p-3.5 text-right">매출액</th>
                <th className="p-3.5 text-right">직접 지출액</th>
                <th className="p-3.5 text-right">공헌이익</th>
                <th className="p-3.5 text-center">수익성 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {facilitiesPerformance.map((fac: any, idx: number) => {
                const isLoss = fac.contributionMargin < 0;
                const isExpanded = !!expandedFacs[fac.facilityName];
                
                return (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-semibold text-slate-900">
                        <div>{fac.facilityName}</div>
                        <div className="text-2xs text-slate-400 font-normal mt-0.5">{fac.teamName}</div>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-800 tabular-nums">
                        {fac.revenue.toLocaleString()}원
                      </td>
                      <td className="p-3.5 text-right font-semibold text-rose-600 tabular-nums">
                        <button 
                          onClick={() => toggleFac(fac.facilityName)} 
                          className="hover:underline focus:outline-none inline-flex items-center justify-end group gap-1 cursor-pointer"
                          title="클릭하여 세부 지출 내역 보기"
                        >
                          <span>-{fac.expense.toLocaleString()}원</span>
                          <span className="text-2xs text-slate-400 group-hover:text-rose-600 transition-colors">▼</span>
                        </button>
                      </td>
                      <td className={`p-3.5 text-right font-bold tabular-nums ${isLoss ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {fac.contributionMargin > 0 ? '+' : ''}{fac.contributionMargin.toLocaleString()}원
                      </td>
                      <td className="p-3.5 text-center">
                        {isLoss ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                            적자 (개선 요망)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            흑자 (우수)
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {/* 지출 내역 아코디언 */}
                    {isExpanded && fac.expenseDetails && fac.expenseDetails.length > 0 && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={5} className="p-4 border-t border-slate-100">
                          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {fac.facilityName} 세부 지출 내역
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {fac.expenseDetails.map((detail: any, detailIdx: number) => (
                              <div key={detailIdx} className="bg-white p-2.5 rounded-lg border border-slate-200/70 flex justify-between items-center text-xs shadow-2xs tabular-nums">
                                <span className="text-slate-600 truncate mr-2 font-medium" title={detail.category}>{detail.category}</span>
                                <span className="font-semibold text-rose-600 whitespace-nowrap">{(detail.amount || 0).toLocaleString()}원</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100/80 border-t-2 border-slate-200 text-xs sm:text-sm font-bold tabular-nums">
              <tr>
                <td className="p-3.5 text-slate-900 font-bold">
                  총합계 (레저본부)
                </td>
                <td className="p-3.5 text-slate-900 text-right">
                  {formatCurrency(summary.totalRevenue || 0)}원
                </td>
                <td className="p-3.5 text-rose-600 text-right">
                  -{formatCurrency(summary.totalOperationalExpense || 0)}원
                </td>
                <td className={`p-3.5 text-right font-bold ${
                  (summary.totalRevenue || 0) - (summary.totalOperationalExpense || 0) < 0 ? 'text-rose-600' : 'text-indigo-600'
                }`}>
                  {(summary.totalRevenue || 0) - (summary.totalOperationalExpense || 0) > 0 ? '+' : ''}
                  {formatCurrency((summary.totalRevenue || 0) - (summary.totalOperationalExpense || 0))}원
                </td>
                <td className="p-3.5 text-center text-slate-400">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Section 3: Channel Correlation Analytics */}
      <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              3. 객실 판매채널 vs 레저 매출 상관관계 (교차 판매 분석)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">객실 채널별 투숙객 유입이 레저본부 매출 신장에 미치는 통계적 상관성을 분석합니다.</p>
          </div>
        </div>
          
          {(!Array.isArray(customerJourney) || customerJourney.length === 0) ? (
            <div className="text-center text-slate-500 py-8 bg-slate-50 rounded-xl border border-slate-100 text-xs sm:text-sm font-medium">충분한 일간 데이터가 누적되지 않아 상관관계를 분석할 수 없습니다.</div>
          ) : (
            <>
              <div className="flex space-x-1.5 mb-4 border-b border-slate-100 pb-3">
                <button 
                  onClick={() => setCorrelationTab('total')} 
                  className={`px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${correlationTab === 'total' ? 'bg-orange-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  전체 (365일)
                </button>
                <button 
                  onClick={() => setCorrelationTab('weekday')} 
                  className={`px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${correlationTab === 'weekday' ? 'bg-orange-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  주중 (일~목)
                </button>
                <button 
                  onClick={() => setCorrelationTab('weekend')} 
                  className={`px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${correlationTab === 'weekend' ? 'bg-orange-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  주말 (금~토)
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {
                  [...customerJourney]
                  .sort((a, b) => {
                    const corrA = correlationTab === 'total' ? a.correlationTotal : correlationTab === 'weekday' ? a.correlationWeekday : a.correlationWeekend;
                    const corrB = correlationTab === 'total' ? b.correlationTotal : correlationTab === 'weekday' ? b.correlationWeekday : b.correlationWeekend;
                    return corrB - corrA;
                  })
                  .map((corr: any, idx: number) => {
                    const activeCorrelation = correlationTab === 'total' ? corr.correlationTotal : correlationTab === 'weekday' ? corr.correlationWeekday : corr.correlationWeekend;
                    const activeAvgRooms = correlationTab === 'total' ? corr.avgRoomsTotal : correlationTab === 'weekday' ? corr.avgRoomsWeekday : corr.avgRoomsWeekend;
                    
                    if (isNaN(activeCorrelation) || activeCorrelation === undefined) return null;
                    
                    const score = Math.round(activeCorrelation * 100);
                    const colorClass = score > 60 ? 'bg-orange-50/70 border-orange-200 text-orange-900' : 
                                      score > 30 ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 
                                      score < -10 ? 'bg-slate-50 border-slate-200 text-slate-500 opacity-80' : 'bg-slate-50 border-slate-200 text-slate-900';
                    const titleColor = score > 60 ? 'text-orange-700' : score > 30 ? 'text-blue-700' : score < -10 ? 'text-slate-500' : 'text-slate-700';

                    return (
                      <div key={idx} className={`p-5 rounded-xl border text-center transition-all shadow-2xs ${colorClass}`}>
                        <div className="flex justify-center items-center mb-1.5">
                          <span className={`text-xs sm:text-sm font-bold ${titleColor}`}>{corr.channelName}</span>
                          {idx === 0 && <span className="ml-2 bg-orange-500 text-white text-2xs px-2 py-0.5 rounded-full font-semibold">최고 연관</span>}
                        </div>
                        <div className={`text-2xl sm:text-3xl font-bold mb-1 tabular-nums ${score < 0 ? 'text-slate-400' : ''}`}>
                          {score > 0 ? '+' : ''}{score}%
                        </div>
                        <div className={`text-xs mt-1.5 tabular-nums ${titleColor}`}>
                          상관계수: {activeCorrelation.toFixed(2)} (일평균 {Math.round(activeAvgRooms)}객실)
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </>
          )}
        </section>

        {/* Section 4: Weather Impact Analysis */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CloudRain className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                4. 기후 및 기상 영향도 분석 (Weather Impact)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">강수·강설일과 전년 동기 대비 레저 매출 변동 추이를 비교 분석합니다.</p>
            </div>
          </div>
          {(!data.weatherImpact || data.weatherImpact.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
              <p className="text-slate-500 font-medium text-xs">증평 기상 데이터를 불러오는 중입니다...</p>
            </div>
          ) : (
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weatherImpact} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: 12 }} />
                  <Bar dataKey="lastYearRainyDays" name="작년 비 온 날" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="thisYearRainyDays" name="올해 비 온 날" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Section 5: Customer Segmentation & Peak Time Analysis */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                5. 타겟 고객 세분화 및 이용 패턴 분석 (주중 vs 주말)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">주중(단체/행사)과 주말(가족/개인)의 시설 선호도 차이 및 시간대별 결제 패턴을 분석합니다.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 5-1. Facility Preference */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-indigo-500" />
                시설별 선호도 교차 분석
              </h3>
              {radarData.length > 0 ? (
                <>
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
                    <span className="font-bold text-purple-700">💡 실시간 데이터 인사이트:</span> 
                    현재 누적 통계상 주중에는 <strong>{radarData.reduce((prev: any, curr: any) => prev.weekday > curr.weekday ? prev : curr, radarData[0])?.facility}</strong>의 선호도가 가장 높게 나타나는 반면, 
                    주말에는 <strong>{radarData.reduce((prev: any, curr: any) => prev.weekend > curr.weekend ? prev : curr, radarData[0])?.facility}</strong>에 고객 트래픽이 집중되는 패턴이 확인됩니다.
                  </div>
                </>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-white rounded-lg border border-dashed border-gray-300">
                  <Target className="w-10 h-10 text-gray-400 mb-2 opacity-60" />
                  <p className="text-sm font-bold text-gray-600 mb-1">시설별 주중/주말 선호도 실측 대기 중</p>
                  <p className="text-xs text-gray-400">백엔드 V5 파이프라인에서 실제 주중/주말 선호도 데이터 집계 시 실시간 표출됩니다.</p>
                </div>
              )}
            </div>

            {/* 5-2. Peak Time Analysis */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Map className="w-5 h-5 mr-2 text-teal-500" />
                시간대별 결제 트래픽 (Peak Time)
              </h3>
              {lineData.length > 0 ? (
                <>
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
                    <span className="font-bold text-teal-700">💡 실시간 트래픽 인사이트:</span>
                    분석 결과, 주말 결제량이 가장 극심한 피크 타임은 <strong>{lineData.reduce((prev: any, curr: any) => prev.weekend > curr.weekend ? prev : curr, lineData[0])?.time}</strong> 부근으로 나타납니다. 
                    해당 시간대 전후로 키오스크와 F&B 현장 안내 인력의 유연한 집중 배치가 필요합니다.
                  </div>
                </>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-white rounded-lg border border-dashed border-slate-200">
                  <Map className="w-10 h-10 text-slate-400 mb-2 opacity-60" />
                  <p className="text-xs sm:text-sm font-bold text-slate-600 mb-1">시간대별 POS 결제 트래픽 실측 대기 중</p>
                  <p className="text-2xs text-slate-400">시간대별 결제 데이터 집계 완료 시 실시간 표출됩니다.</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 text-right">
             {radarData.length > 0 || lineData.length > 0 ? (
               <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full border border-emerald-200/60">
                 * 전사 공식 실시간 연동이 완료되어 실제 실적 데이터 기반으로 100% 표출되고 있습니다.
               </span>
             ) : (
               <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 font-semibold text-xs rounded-full border border-amber-200">
                 * 타겟 고객 세분화 및 피크타임 실측 데이터 대기 중 (실측 데이터 보증)
               </span>
             )}
          </div>
        </section>

      </div>
  );
}
