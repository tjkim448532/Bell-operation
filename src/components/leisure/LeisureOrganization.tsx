"use client";

import { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Calendar, Flame, Building2, 
  Sparkles, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { secureFetcher } from '@/lib/secureFetcher';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.VITE_API_URL || 'https://belleforet-data.vercel.app';

export interface VenueHeadcountItem {
  id: number;
  categoryCode?: string;
  teamName?: string;
  partName?: string;
  venueName: string;
  leaderName: string;
  regularHeadcount: number;
  weekdayHeadcount: number;
  weekendHeadcount: number;
  dailyWorkerWeekday?: number;
  dailyWorkerWeekend?: number;
  isOutsourced: number; // 1이면 외주
  memo: string;
  updatedAt?: string;
}

export interface PartGroup {
  partName: string;
  totalRegular: number;
  totalWeekday: number;
  totalWeekend: number;
  venues: VenueHeadcountItem[];
}

export interface LeisureOrgResponse {
  status: 'success' | 'error';
  division: string;
  summary: {
    totalVenues: number;
    totalRegularHeadcount: number;
    totalWeekdayHeadcount: number;
    totalWeekendHeadcount: number;
  };
  parts: PartGroup[];
}

export default function LeisureOrganization() {
  const [data, setData] = useState<LeisureOrgResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizationData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await secureFetcher(`${API_BASE}/api/v6/report/leisure-organization`);
      const payload: LeisureOrgResponse = res?.data ?? res;
      if (payload && payload.status === 'success' && Array.isArray(payload.parts)) {
        setData(payload);
      } else {
        setError('조직도 데이터를 불러오는 데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Error fetching leisure organization:', err);
      setError(err?.message || '조직도 API 호출 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-mint"></div>
          <p className="text-sm font-medium text-slate-500">레저본부 조직도 및 인력 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-3xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-base">데이터 로드 오류</h3>
              <p className="text-sm text-rose-600 mt-0.5">{error || '데이터가 없습니다.'}</p>
            </div>
          </div>
          <button
            onClick={fetchOrganizationData}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-xs"
          >
            <RefreshCw size={16} /> 다시 시도
          </button>
        </div>
      </div>
    );
  }

  const { summary, parts, division } = data;

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 pb-32 lg:pb-12 max-w-[1600px] mx-auto">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-[#00ae95] to-slate-900 rounded-[32px] p-8 lg:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute right-32 -bottom-20 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <Users size={22} className="text-emerald-200" />
              <span className="font-semibold tracking-wider text-xs lg:text-sm text-emerald-100 uppercase whitespace-nowrap">
                BELLE FORET LEISURE DIVISION WORKFORCE
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3 flex-wrap break-keep">
              <span className="whitespace-nowrap">{division} 조직도 및 영업장 인력 현황</span>
              <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-medium whitespace-nowrap">
                4대 파트 · 12개 영업장
              </span>
            </h1>
            <p className="text-sm text-white/80 mt-2 break-keep">
              통합 데이터 통제 센터(Admin)와 실시간 연동된 레저본부 영업장별 책임자, 정규직 및 주중/주말 운영 투입 인력 현황입니다.
            </p>
          </div>

          <button
            onClick={fetchOrganizationData}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs lg:text-sm font-semibold rounded-2xl backdrop-blur-md transition-all border border-white/20 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw size={15} /> 새로고침
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (4-Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        
        {/* Total Venues */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">총 관리 영업장</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">{summary.totalVenues}</span>
            <span className="text-sm font-semibold text-slate-500">개소</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
            액티비티 · 목장 · 미디어 · 놀이동산
          </div>
        </div>

        {/* Total Regular Headcount */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">정규직 총원</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">{summary.totalRegularHeadcount}</span>
            <span className="text-sm font-semibold text-slate-500">명</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
            레저본부 소속 정규직 (책임자 포함)
          </div>
        </div>

        {/* Total Weekday Headcount */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">주중 운영 투입</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
              <Calendar size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">{summary.totalWeekdayHeadcount}</span>
            <span className="text-sm font-semibold text-slate-500">명</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
            주중 평일 현장 배치 인원 (정규직+알바)
          </div>
        </div>

        {/* Total Weekend Headcount */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs lg:text-sm font-semibold text-slate-500 tracking-wider uppercase whitespace-nowrap">주말 집중 투입</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00ae95] flex items-center justify-center">
              <Flame size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">{summary.totalWeekendHeadcount}</span>
            <span className="text-sm font-semibold text-slate-500">명</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium whitespace-nowrap">
            주말/공휴일 피크 투입 인원 (+{(summary.totalWeekendHeadcount - summary.totalWeekdayHeadcount)}명 증원)
          </div>
        </div>

      </div>

      {/* 3. 4대 파트별 인력 현황 테이블 & 카드 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-600" />
            4대 파트별 상세 조직 및 영업장 인력 현황
          </h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            실시간 동기화
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {parts.map((part, pIdx) => {
            const isActivity = part.partName === '액티비티';
            const isRanch = part.partName === '목장';
            const isMedia = part.partName === '미디어아트센터';
            const isAmusement = part.partName === '놀이동산';

            const headerBg = isActivity 
              ? 'from-blue-600 to-indigo-600' 
              : isRanch 
              ? 'from-emerald-600 to-teal-600' 
              : isMedia 
              ? 'from-purple-600 to-indigo-600' 
              : 'from-amber-600 to-orange-600';

            return (
              <div 
                key={pIdx} 
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                {/* Part Header Bar */}
                <div className={`bg-gradient-to-r ${headerBg} p-5 lg:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-lg text-white">
                      {pIdx + 1}
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2 flex-wrap break-keep">
                        <span className="whitespace-nowrap">{part.partName} 파트</span>
                        <span className="text-xs bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                          {part.venues.length}개 영업장
                        </span>
                      </h3>
                      <p className="text-xs text-white/80 mt-0.5 font-normal break-keep">
                        {isAmusement ? '전문 운영사 위탁 관리 파트' : '레저본부 직영 운영 및 현장 지원 파트'}
                      </p>
                    </div>
                  </div>

                  {/* Part Subtotal Badges (Backend SSOT) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {part.totalRegular > 0 && (
                      <span className="bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                        <UserCheck size={14} className="text-indigo-200" />
                        정규직 <b className="text-white tabular-nums">{part.totalRegular}명</b>
                      </span>
                    )}
                    {part.totalWeekday > 0 && (
                      <span className="bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar size={14} className="text-emerald-200" />
                        주중 <b className="text-white tabular-nums">{part.totalWeekday}명</b>
                      </span>
                    )}
                    {part.totalWeekend > 0 && (
                      <span className="bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                        <Flame size={14} className="text-amber-200" />
                        주말 <b className="text-white tabular-nums">{part.totalWeekend}명</b>
                      </span>
                    )}
                    {isAmusement && (
                      <span className="bg-amber-500/80 backdrop-blur-md border border-amber-300/40 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                        <Sparkles size={14} />
                        외주 위탁 운영
                      </span>
                    )}
                  </div>
                </div>

                {/* Venues Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                    <thead className="whitespace-nowrap">
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 tracking-wider uppercase whitespace-nowrap">
                        <th className="py-3.5 px-5 lg:px-6 whitespace-nowrap">영업장명</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">선임 / 책임자</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">정규직</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">주중 투입</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">주말 투입</th>
                        <th className="py-3.5 px-5 lg:px-6 min-w-[200px] whitespace-nowrap">특이사항 및 운영 메모</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                      {part.venues.map((venue) => (
                        <tr 
                          key={venue.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          {/* 영업장명 */}
                          <td className="py-4 px-5 lg:px-6 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{venue.venueName}</span>
                              {venue.isOutsourced === 1 && (
                                <span className="inline-flex items-center text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  외주
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 선임/책임자 */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {venue.leaderName ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 whitespace-nowrap">
                                <UserCheck size={13} className="text-emerald-600" />
                                {venue.leaderName}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>

                          {/* 정규직 */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {venue.regularHeadcount > 0 ? (
                              <span className="inline-flex items-center justify-center font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full text-xs tabular-nums whitespace-nowrap">
                                {venue.regularHeadcount}명
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>

                          {/* 주중 투입 */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {venue.weekdayHeadcount > 0 ? (
                              <span className="inline-flex items-center justify-center font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs tabular-nums whitespace-nowrap">
                                {venue.weekdayHeadcount}명
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>

                          {/* 주말 투입 */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {venue.weekendHeadcount > 0 ? (
                              <span className="inline-flex items-center justify-center font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs tabular-nums whitespace-nowrap">
                                {venue.weekendHeadcount}명
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>

                          {/* 특이사항 및 메모 */}
                          <td className="py-4 px-5 lg:px-6 text-xs text-slate-500 font-normal break-keep">
                            {venue.memo ? (
                              <span className="text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">
                                {venue.memo}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
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

    </div>
  );
}
