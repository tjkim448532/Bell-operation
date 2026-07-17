'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, AlertTriangle, Target, Users, Map, DollarSign, Briefcase } from 'lucide-react';

export default function BusinessPlanPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Date
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/business-plan?date=${date}`);
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
  }, [date]);

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

  const { summary, customerJourney, facilitiesPerformance } = data;

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
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-inner">
            <label className="text-xs text-gray-400 block mb-1 font-bold uppercase">기준일자 변경</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-2 outline-none focus:border-mint-400"
            />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
              <div className="text-sm font-bold text-yellow-700 mb-1">통합 객단가 (ARPU)</div>
              <div className="text-3xl font-extrabold text-yellow-900">{Math.round(summary.totalRevenue / summary.totalVisitors).toLocaleString()}<span className="text-lg ml-1">원</span></div>
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
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{fac.facilityName}</div>
                        <div className="text-xs text-gray-500">{fac.teamName} / {fac.categoryCode}</div>
                      </td>
                      <td className="p-4 text-right font-medium text-gray-700">
                        {fac.revenue.toLocaleString()}원
                      </td>
                      <td className="p-4 text-right font-medium text-red-600">
                        -{fac.expense.toLocaleString()}원
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
            <div><span className="font-bold text-gray-600">최고 수익 영업장:</span> <span className="font-extrabold text-blue-700 ml-1">{summary.bestFacility}</span></div>
            <div><span className="font-bold text-gray-600">최대 적자 영업장:</span> <span className="font-extrabold text-red-700 ml-1">{summary.worstFacility}</span></div>
          </div>
        </section>

        {/* Section 3: Customer Journey Analytics */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Map className="w-6 h-6 mr-3 text-orange-600" />
            3. Customer Journey (고객 동선 및 크로스셀링)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 text-center">
              <div className="text-sm font-bold text-orange-700 mb-2">동선 추적 가능 고객 비율</div>
              <div className="text-3xl font-extrabold text-orange-900">{customerJourney.trackingRate}%</div>
              <div className="text-xs text-orange-600 mt-2">백엔드 PMS-POS 맵핑 기준</div>
            </div>
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 text-center">
              <div className="text-sm font-bold text-orange-700 mb-2">최초 유입 영업장 (First Touch)</div>
              <div className="text-2xl font-extrabold text-orange-900 mt-3">{customerJourney.topFirstTouchpoint}</div>
            </div>
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 text-center">
              <div className="text-sm font-bold text-orange-700 mb-2">최종 이탈 영업장 (Last Touch)</div>
              <div className="text-2xl font-extrabold text-orange-900 mt-3">{customerJourney.topLastTouchpoint}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {customerJourney.touchpoints.map((tp: any, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                <h3 className="font-bold text-lg text-gray-800 mb-4 relative z-10 flex items-center">
                  <span className="w-2 h-2 bg-mint-500 rounded-full mr-2"></span>
                  {tp.facilityName} 동선 데이터
                </h3>
                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">첫 방문 고객수 (First Touch):</span>
                    <span className="font-bold text-gray-900">{tp.asFirstTouchCount.toLocaleString()}명</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">첫 방문 피크 타임:</span>
                    <span className="font-bold text-blue-600">{tp.asFirstTouchPeakTime}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-[1px] my-2"></div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">마지막 방문 고객수 (Last Touch):</span>
                    <span className="font-bold text-gray-900">{tp.asLastTouchCount.toLocaleString()}명</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">마지막 방문 피크 타임:</span>
                    <span className="font-bold text-red-600">{tp.asLastTouchPeakTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Action Plan & Strategic Output */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 flex items-center text-mint-400">
            <Target className="w-6 h-6 mr-3" />
            4. 전략적 제언 (Strategic Output)
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="bg-mint-500/20 text-mint-400 p-1 rounded mr-3 mt-0.5"><TrendingUp className="w-4 h-4" /></span>
              <div>
                <strong className="text-white block mb-1">마케팅 ROI 효율화</strong>
                <p className="text-gray-400 text-sm">전체 비용 중 {((summary.totalOperationalExpense + summary.totalCommonExpense) / summary.totalRevenue * 100).toFixed(1)}%가 지출되고 있습니다. 현재 최대 적자인 '{summary.worstFacility}'에 대한 마케팅 예산을 축소하고, 캐시카우인 '{summary.bestFacility}'에 재투자하는 전략이 필요합니다.</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-mint-500/20 text-mint-400 p-1 rounded mr-3 mt-0.5"><Users className="w-4 h-4" /></span>
              <div>
                <strong className="text-white block mb-1">고객 동선 최적화 (Cross-selling)</strong>
                <p className="text-gray-400 text-sm">대부분의 고객이 '{customerJourney.topFirstTouchpoint}'에서 여정을 시작해 '{customerJourney.topLastTouchpoint}'에서 종료합니다. 두 영업장 간의 연계 패키지 상품을 개발하면 객단가(현재 {Math.round(summary.totalRevenue / summary.totalVisitors).toLocaleString()}원)를 크게 상승시킬 수 있습니다.</p>
              </div>
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
}
