'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Users, Calendar, Flame, TreePine, Activity, 
  Monitor, Key, Server, UserCheck, Layers, RefreshCw, ExternalLink,
  ChevronDown, ChevronRight
} from 'lucide-react';

interface VenueHeadcount {
  id: number;
  categoryCode: string;
  teamName: string;
  partName: string;
  venueName: string;
  leaderName: string;
  regularHeadcount: number;
  weekdayHeadcount: number;
  weekendHeadcount: number;
  dailyWorkerWeekday: number;
  dailyWorkerWeekend: number;
  isOutsourced: number;
  memo: string;
  updatedAt?: string;
}

interface PartHeadcount {
  partName: string;
  description?: string;
  venues: VenueHeadcount[];
  totalRegular: number;
  totalWeekday: number;
  totalWeekend: number;
}

interface HeadcountSummary {
  totalVenues: number;
  totalRegularHeadcount: number;
  totalWeekdayHeadcount: number;
  totalWeekendHeadcount: number;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants: any = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { stiffness: 100 }
  }
};

export default function OrganizationView({ isShared = false }: { isShared?: boolean }) {
  const [summary, setSummary] = useState<HeadcountSummary>({
    totalVenues: 0,
    totalRegularHeadcount: 0,
    totalWeekdayHeadcount: 0,
    totalWeekendHeadcount: 0
  });

  const [parts, setParts] = useState<PartHeadcount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHeadcount = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/organization/headcount');
      if (res.ok) {
        const json = await res.json();
        if (json.summary) {
          setSummary(json.summary);
        }
        if (json.parts && json.parts.length > 0) {
          setParts(json.parts.map((p: any) => ({
            ...p,
            description: '레저본부 직영 운영 및 현장 지원 파트'
          })));
        }
      }
    } catch (e) {
      console.error('Failed to load live headcount:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeadcount();
  }, []);

  // Accordion state for direct parts (default all expanded)
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});

  const togglePart = (name: string) => {
    setExpandedParts(prev => ({
      ...prev,
      [name]: prev[name] === undefined ? false : !prev[name]
    }));
  };

  const partThemeConfig: Record<string, { bg: string; num: number }> = {
    '액티비티': { bg: 'bg-indigo-600 hover:bg-indigo-700', num: 1 },
    '목장': { bg: 'bg-emerald-600 hover:bg-emerald-700', num: 2 },
    '벨포레 목장': { bg: 'bg-emerald-600 hover:bg-emerald-700', num: 2 },
    '미디어아트': { bg: 'bg-purple-600 hover:bg-purple-700', num: 3 },
    '미디어아트센터': { bg: 'bg-purple-600 hover:bg-purple-700', num: 3 }
  };

  const dynamicChildTeams = [
    ...parts.map((part, idx) => {
      const isActivity = part.partName.includes('액티비티');
      const isRanch = part.partName.includes('목장');
      const isMedia = part.partName.includes('미디어');
      
      return {
        name: part.partName,
        icon: isActivity ? <Activity size={28} className="text-blue-600" /> :
              isRanch ? <TreePine size={28} className="text-emerald-600" /> :
              isMedia ? <Monitor size={28} className="text-purple-600" /> :
              <Building2 size={28} className="text-indigo-600" />,
        color: isActivity ? 'bg-blue-50/70 border-blue-200 text-blue-900' :
               isRanch ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' :
               isMedia ? 'bg-purple-50/70 border-purple-200 text-purple-900' :
               'bg-slate-50/70 border-slate-200 text-slate-900',
        badge: part.venues.length > 0 ? `${part.venues.length}개 영업장` : '집계 중',
        facilities: part.venues.map(v => v.venueName)
      };
    }),
    {
      name: '디지털지원팀',
      icon: <Server size={28} className="text-indigo-600" />,
      color: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
      badge: '지원 부서',
      facilities: ['키오스크 & POS', '홈페이지 및 앱 기술 사항', '레저본부 마케팅', '네트워크 & BGM 유지보수']
    },
    {
      name: '본부팀',
      icon: <Key size={28} className="text-amber-600" />,
      color: 'bg-amber-50/70 border-amber-200 text-amber-900',
      badge: '총괄 관리',
      facilities: ['레저본부 신규 영업', '레저본부 마케팅', '관리 및 운영 업무']
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-12 bg-slate-50/50 min-h-screen">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
              <TreePine className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              레저본부 조직도
            </h1>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-extrabold rounded-full border border-emerald-200/60">
              3대 직영 파트 · {summary.totalVenues > 0 ? `${summary.totalVenues}개 영업장` : '영업장 집계 중'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            레저본부 산하의 각 팀과 주요 영업장을 시각적으로 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHeadcount}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!isShared && (
            <a 
              href="https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/admin/mapping" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              관리자 인력 통제 센터
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </a>
          )}
        </div>
      </div>

      {/* 2. Visual Organization Chart Tree */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-10"
      >
        <div className="flex flex-col items-center">
          {/* HQ Head Node */}
          <motion.div 
            variants={itemVariants}
            className="w-full max-w-sm rounded-3xl shadow-lg overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-800 p-6 sm:p-8 text-white flex flex-col items-center justify-center transform transition-transform hover:scale-[1.02] cursor-pointer z-10 border border-emerald-400/30"
          >
            <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-md mb-3 shadow-inner">
              <TreePine size={44} className="text-emerald-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-widest">레저본부</h2>
            <p className="text-emerald-100 text-sm mt-1.5 font-semibold tracking-wide">총괄 본부 (HQ)</p>
          </motion.div>

          {/* Tree Branch Lines */}
          <div className="w-px h-10 bg-gray-300"></div>
          <div className="w-[85%] h-px bg-gray-300"></div>
          <div className="w-[85%] flex justify-between">
            {dynamicChildTeams.map((_, i) => (
              <div key={i} className="w-px h-6 bg-gray-300"></div>
            ))}
          </div>

          {/* 5 Child Teams */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mt-3">
            {dynamicChildTeams.map((team, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className={`relative rounded-2xl border p-5 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-all bg-white ${team.color}`}
              >
                <div className="p-3 rounded-2xl mb-3 bg-white border border-gray-200/80 shadow-2xs">
                  {team.icon}
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <h3 className="text-lg font-black text-gray-900">{team.name}</h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-white/80 rounded-full border border-black/5 mb-3 text-gray-700">
                  {team.badge}
                </span>
                <div className="w-full space-y-2 flex-1">
                  {team.facilities.map((fac, fIdx) => (
                    <div 
                      key={fIdx} 
                      className="bg-white/90 backdrop-blur-sm rounded-xl py-2 px-3 text-xs font-bold text-gray-800 border border-black/5 shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">{fac}</span>
                    </div>
                  ))}
                  {team.facilities.length === 0 && (
                    <div className="text-xs text-gray-400 py-2">영업장 로딩 중...</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 3. 4대 KPI 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-4">
        {/* Card 1: 총 관리 영업장 */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">총 관리 영업장</span>
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Building2 className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              {summary.totalVenues}
            </span>
            <span className="text-sm font-bold text-gray-700">개소</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 font-medium">
            {parts.length > 0 ? parts.map(p => p.partName).join(' · ') : '레저본부 3대 파트'} {summary.totalVenues > 0 ? `${summary.totalVenues}개 영업장` : ''}
          </p>
        </div>

        {/* Card 2: 정규직 총원 */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">정규직 총원</span>
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-indigo-600 tracking-tight">
              {summary.totalRegularHeadcount}
            </span>
            <span className="text-sm font-bold text-indigo-900">명</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 font-medium">
            레저본부 소속 정규직 (책임자 포함)
          </p>
        </div>

        {/* Card 3: 주중 운영 투입 */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">주중 운영 투입</span>
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Calendar className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">
              {summary.totalWeekdayHeadcount}
            </span>
            <span className="text-sm font-bold text-emerald-900">명</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 font-medium">
            주중 평일 현장 배치 인원 (정규직+알바)
          </p>
        </div>

        {/* Card 4: 주말 집중 투입 */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">주말 집중 투입</span>
            <span className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Flame className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-amber-500 tracking-tight">
              {summary.totalWeekendHeadcount}
            </span>
            <span className="text-sm font-bold text-amber-800">명</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 font-medium">
            주말/공휴일 피크 투입 인원 {summary.totalWeekendHeadcount > summary.totalWeekdayHeadcount ? `(+${summary.totalWeekendHeadcount - summary.totalWeekdayHeadcount}명 증원)` : ''}
          </p>
        </div>
      </div>

      {/* 4. 3대 파트별 상세 조직 및 영업장 인력 현황 (아코디언 + 글자 확대) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-600">
              <Layers className="w-6 h-6" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              3대 직영 파트별 상세 조직 및 영업장 인력 현황
            </h2>
          </div>
          <span className="text-xs sm:text-sm font-bold text-gray-500 bg-gray-100/90 px-3.5 py-1.5 rounded-full border border-gray-200">
            백엔드 SSOT 실시간 동기화
          </span>
        </div>

        {/* Part Accordion Cards */}
        <div className="space-y-6">
          {parts.map((part, pIdx) => {
            const rawName = part.partName;
            const theme = partThemeConfig[rawName] || { bg: 'bg-slate-700 hover:bg-slate-800', num: pIdx + 1 };
            const displayName = rawName.includes('파트') ? rawName : `${rawName} 파트`;
            const isExpanded = expandedParts[rawName] !== false && expandedParts[displayName] !== false;

            return (
              <div key={pIdx} className="bg-white rounded-3xl border-2 border-gray-200/90 shadow-sm overflow-hidden transition-all">
                {/* Part Header Colored Banner (Clickable Accordion Header) */}
                <div 
                  onClick={() => togglePart(rawName)}
                  className={`${theme.bg} text-white p-5 sm:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors`}
                >
                  <div className="flex items-center gap-4">
                    {/* Expand/Collapse Chevron + Circle Number Badge */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white font-black text-base shadow-inner shrink-0">
                        {theme.num}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                          {displayName}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-white/20 text-white backdrop-blur-xs border border-white/20">
                          {part.venues.length}개 영업장
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-white/90 mt-1 font-medium">
                        {part.description || '레저본부 직영 운영 및 현장 지원 파트'} (클릭 시 접기/펼치기)
                      </p>
                    </div>
                  </div>

                  {/* Subtotal Badges (Right) */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-black border border-white/20 shadow-xs">
                      <Users className="w-4 h-4 opacity-90" />
                      정규직 {part.totalRegular}명
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-black border border-white/20 shadow-xs">
                      <Calendar className="w-4 h-4 opacity-90" />
                      주중 {part.totalWeekday}명
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-black border border-white/20 shadow-xs">
                      <Flame className="w-4 h-4 opacity-90" />
                      주말 {part.totalWeekend}명
                    </span>
                  </div>
                </div>

                {/* Venue Table (Collapsible) */}
                {isExpanded && (
                  <div className="overflow-x-auto border-t border-gray-200">
                    <table className="w-full text-left text-sm sm:text-base border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs sm:text-sm">
                        <tr>
                          <th className="py-4 px-6 sm:px-8 min-w-[260px] whitespace-nowrap text-left font-semibold text-slate-700">영업장명</th>
                          <th className="py-4 px-6 min-w-[180px] whitespace-nowrap text-left font-semibold text-slate-700">선임 / 책임자</th>
                          <th className="py-4 px-6 min-w-[110px] whitespace-nowrap text-center font-semibold text-slate-700">정규직</th>
                          <th className="py-4 px-6 min-w-[110px] whitespace-nowrap text-center font-semibold text-slate-700">주중 투입</th>
                          <th className="py-4 px-6 min-w-[110px] whitespace-nowrap text-center font-semibold text-slate-700">주말 투입</th>
                          <th className="py-4 px-6 sm:px-8 min-w-[280px] text-left font-semibold text-slate-700">특이사항 및 운영 메모</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                        {part.venues.map((v, vIdx) => (
                          <tr key={v.id || vIdx} className="hover:bg-slate-50/80 transition-colors">
                            {/* 영업장명 - 절대 2줄로 줄바꿈되지 않도록 whitespace-nowrap 적용 */}
                            <td className="py-4 px-6 sm:px-8 font-bold text-sm sm:text-base text-slate-900 whitespace-nowrap">
                              📍 {v.venueName}
                            </td>

                            {/* 선임 / 책임자 */}
                            <td className="py-4 px-6 whitespace-nowrap">
                              {v.leaderName ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-semibold border border-emerald-200">
                                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                                  {v.leaderName}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>

                            {/* 정규직 */}
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              {v.regularHeadcount > 0 ? (
                                <span className="inline-block px-3.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs sm:text-sm tabular-nums border border-indigo-100">
                                  {v.regularHeadcount}명
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>

                            {/* 주중 투입 */}
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              {v.weekdayHeadcount > 0 ? (
                                <span className="inline-block px-3.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-xs sm:text-sm tabular-nums border border-emerald-100">
                                  {v.weekdayHeadcount}명
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>

                            {/* 주말 투입 */}
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              {v.weekendHeadcount > 0 ? (
                                <span className="inline-block px-3.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-semibold text-xs sm:text-sm tabular-nums border border-amber-100">
                                  {v.weekendHeadcount}명
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>

                            {/* 특이사항 및 운영 메모 */}
                            <td className="py-4 px-6 sm:px-8 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                              {v.memo ? (
                                <span className="inline-block px-3.5 py-1.5 rounded-xl bg-gray-100 text-gray-800 font-bold border border-gray-200">
                                  {v.memo}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-normal">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

