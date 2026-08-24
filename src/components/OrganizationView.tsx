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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. Page Header */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60 shrink-0">
              <TreePine className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              조직 및 운영 인력 현황
            </h1>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200/60 shadow-2xs">
              3대 직영 파트 · {summary.totalVenues > 0 ? `${summary.totalVenues}개 영업장` : '영업장 집계 중'}
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5">
            레저본부 산하 직영 파트 및 지원 부서의 현장 인력 배치 현황을 실시간으로 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchHeadcount}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!isShared && (
            <a 
              href="https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/admin/mapping" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              인력 관리 시스템
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
        className="space-y-8"
      >
        <div className="flex flex-col items-center">
          {/* HQ Head Node */}
          <motion.div 
            variants={itemVariants}
            className="w-full max-w-sm rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-800 p-6 text-white flex flex-col items-center justify-center transform transition-transform hover:scale-[1.01] cursor-pointer z-10 border border-emerald-400/30"
          >
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md mb-2 shadow-inner">
              <TreePine size={32} className="text-emerald-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-wider">레저본부</h2>
            <p className="text-emerald-100 text-xs mt-1 font-semibold tracking-wide">총괄 본부 (HQ)</p>
          </motion.div>

          {/* Tree Branch Lines */}
          <div className="w-px h-8 bg-slate-300"></div>
          <div className="w-[85%] h-px bg-slate-300"></div>
          <div className="w-[85%] flex justify-between">
            {dynamicChildTeams.map((_, i) => (
              <div key={i} className="w-px h-5 bg-slate-300"></div>
            ))}
          </div>

          {/* 5 Child Teams */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
            {dynamicChildTeams.map((team, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className={`relative rounded-2xl border p-4 flex flex-col items-center text-center shadow-2xs hover:shadow-xs transition-all bg-white ${team.color}`}
              >
                <div className="p-2.5 rounded-xl mb-2.5 bg-white border border-slate-200/80 shadow-2xs">
                  {team.icon}
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <h3 className="text-base font-bold text-slate-900">{team.name}</h3>
                </div>
                <span className="text-2xs font-bold px-2 py-0.5 bg-white/80 rounded-full border border-slate-200/60 mb-2.5 text-slate-700">
                  {team.badge}
                </span>
                <div className="w-full space-y-1.5 flex-1">
                  {team.facilities.map((fac, fIdx) => (
                    <div 
                      key={fIdx} 
                      className="bg-white/90 backdrop-blur-sm rounded-lg py-1.5 px-2.5 text-xs font-semibold text-slate-800 border border-slate-200/60 shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">{fac}</span>
                    </div>
                  ))}
                  {team.facilities.length === 0 && (
                    <div className="text-xs text-slate-400 py-2">영업장 로딩 중...</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 3. 4대 KPI 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 총 관리 영업장 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 truncate mr-2">총 관리 영업장</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <Building2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
              <span className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-slate-900 tracking-tight">
                {summary.totalVenues}
              </span>
              <span className="text-xs font-semibold text-slate-600">개소</span>
            </div>
          </div>
          <p className="mt-3 pt-2 border-t border-slate-100 text-2xs sm:text-xs text-slate-500 font-medium truncate">
            {parts.length > 0 ? parts.map(p => p.partName).join(' · ') : '레저본부 3대 파트'}
          </p>
        </div>

        {/* Card 2: 정규직 총원 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 truncate mr-2">정규직 총원</span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
              <span className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-indigo-600 tracking-tight">
                {summary.totalRegularHeadcount}
              </span>
              <span className="text-xs font-semibold text-indigo-900">명</span>
            </div>
          </div>
          <p className="mt-3 pt-2 border-t border-slate-100 text-2xs sm:text-xs text-slate-500 font-medium truncate">
            레저본부 소속 정규직 (책임자 포함)
          </p>
        </div>

        {/* Card 3: 주중 운영 투입 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 truncate mr-2">주중 운영 투입</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
              <span className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-emerald-600 tracking-tight">
                {summary.totalWeekdayHeadcount}
              </span>
              <span className="text-xs font-semibold text-emerald-900">명</span>
            </div>
          </div>
          <p className="mt-3 pt-2 border-t border-slate-100 text-2xs sm:text-xs text-slate-500 font-medium truncate">
            주중 평일 현장 배치 인원 (정규직+알바)
          </p>
        </div>

        {/* Card 4: 주말 집중 투입 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 truncate mr-2">주말 집중 투입</span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                <Flame className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
              <span className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-2xl font-bold text-amber-600 tracking-tight">
                {summary.totalWeekendHeadcount}
              </span>
              <span className="text-xs font-semibold text-amber-800">명</span>
            </div>
          </div>
          <p className="mt-3 pt-2 border-t border-slate-100 text-2xs sm:text-xs text-slate-500 font-medium truncate">
            주말 피크 인원 {summary.totalWeekendHeadcount > summary.totalWeekdayHeadcount ? `(+${summary.totalWeekendHeadcount - summary.totalWeekdayHeadcount}명 증원)` : ''}
          </p>
        </div>
      </div>

      {/* 4. 3대 파트별 상세 조직 및 영업장 인력 현황 (아코디언 + 글자 확대) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-600">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              3대 직영 파트별 상세 조직 및 영업장 인력 현황
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/60">
            실시간 공식 연동
          </span>
        </div>

        {/* Part Accordion Cards */}
        <div className="space-y-4">
          {parts.map((part, pIdx) => {
            const rawName = part.partName;
            const theme = partThemeConfig[rawName] || { bg: 'bg-slate-700 hover:bg-slate-800', num: pIdx + 1 };
            const displayName = rawName.includes('파트') ? rawName : `${rawName} 파트`;
            const isExpanded = expandedParts[rawName] !== false && expandedParts[displayName] !== false;

            return (
              <div key={pIdx} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
                {/* Part Header Colored Banner (Clickable Accordion Header) */}
                <div 
                  onClick={() => togglePart(displayName)}
                  className={`w-full p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between text-left cursor-pointer transition-colors gap-3 ${theme.bg}`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Expand/Collapse Chevron + Circle Number Badge */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-white/25 backdrop-blur-md flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
                        {theme.num}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                          {displayName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-xs border border-white/20">
                          {part.venues.length}개 영업장
                        </span>
                      </div>
                      <p className="text-xs text-white/90 mt-0.5 font-medium">
                        {part.description || '레저본부 직영 운영 및 현장 지원 파트'} (클릭 시 접기/펼치기)
                      </p>
                    </div>
                  </div>

                  {/* Subtotal Badges (Right) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0 tabular-nums">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-semibold border border-white/20 shadow-2xs">
                      <Users className="w-3.5 h-3.5 opacity-90" />
                      정규직 {part.totalRegular}명
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-semibold border border-white/20 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 opacity-90" />
                      주중 {part.totalWeekday}명
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-semibold border border-white/20 shadow-2xs">
                      <Flame className="w-3.5 h-3.5 opacity-90" />
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

