'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Users, Calendar, Flame, TreePine, Activity, 
  Monitor, Key, Server, UserCheck, Layers, RefreshCw, ExternalLink
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

// 상단 조직도 트리 데이터 (미사용티켓 삭제 완료)
const teams = [
  {
    name: '레저본부',
    role: '총괄 본부 (HQ)',
    icon: <TreePine size={44} className="text-emerald-400" />,
    color: 'bg-gradient-to-br from-emerald-600 to-teal-800',
    colSpan: 'col-span-full',
    children: [
      {
        name: '액티비티',
        icon: <Activity size={28} className="text-blue-600" />,
        color: 'bg-blue-50/70 border-blue-200 text-blue-900',
        badge: '5개 영업장',
        facilities: ['마운틴카트', '사계절썰매장', '마리나 클럽', '원더풀', '썸머랜드']
      },
      {
        name: '목장',
        icon: <TreePine size={28} className="text-emerald-600" />,
        color: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
        badge: '3개 영업장',
        facilities: ['벨포레 목장', '목장(체험)', '얼룩말카페']
      },
      {
        name: '미디어아트센터',
        icon: <Monitor size={28} className="text-purple-600" />,
        color: 'bg-purple-50/70 border-purple-200 text-purple-900',
        badge: '3개 영업장',
        facilities: ['미디어아트센터', '미디어-뮤지엄카페', '미디어-기프트샵']
      },
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
    ]
  }
];

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

export default function OrganizationPage() {
  const [summary, setSummary] = useState<HeadcountSummary>({
    totalVenues: 11,
    totalRegularHeadcount: 27,
    totalWeekdayHeadcount: 35,
    totalWeekendHeadcount: 50
  });

  const [parts, setParts] = useState<PartHeadcount[]>([
    {
      partName: '액티비티',
      description: '레저본부 직영 운영 및 현장 지원 파트',
      totalRegular: 12,
      totalWeekday: 25,
      totalWeekend: 29,
      venues: [
        {
          id: 1,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '액티비티',
          venueName: '마운틴카트',
          leaderName: '배유진 선임',
          regularHeadcount: 2,
          weekdayHeadcount: 3,
          weekendHeadcount: 4,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '안수빈,김대희'
        },
        {
          id: 2,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '액티비티',
          venueName: '사계절썰매장',
          leaderName: '이성민 매니저',
          regularHeadcount: 3,
          weekdayHeadcount: 3,
          weekendHeadcount: 4,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '홍세준,연명순'
        },
        {
          id: 3,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '액티비티',
          venueName: '마리나 클럽',
          leaderName: '김정식 선임',
          regularHeadcount: 2,
          weekdayHeadcount: 2,
          weekendHeadcount: 3,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '정송현'
        },
        {
          id: 4,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '액티비티',
          venueName: '썸머랜드',
          leaderName: '김형도 팀장',
          regularHeadcount: 3,
          weekdayHeadcount: 15,
          weekendHeadcount: 15,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '연봉석,허영준'
        },
        {
          id: 5,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '액티비티',
          venueName: '원더풀',
          leaderName: '김원곤 선임',
          regularHeadcount: 2,
          weekdayHeadcount: 2,
          weekendHeadcount: 3,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '김원곤,김주현'
        }
      ]
    },
    {
      partName: '목장',
      description: '레저본부 직영 운영 및 현장 지원 파트',
      totalRegular: 10,
      totalWeekday: 6,
      totalWeekend: 16,
      venues: [
        {
          id: 6,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '목장',
          venueName: '벨포레 목장',
          leaderName: '이재훈 팀장',
          regularHeadcount: 9,
          weekdayHeadcount: 5,
          weekendHeadcount: 14,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '이민혜,장준호,고성민,강남준,김가람,신정민'
        },
        {
          id: 7,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '목장',
          venueName: '벨포레 목장(체험)',
          leaderName: '',
          regularHeadcount: 0,
          weekdayHeadcount: 0,
          weekendHeadcount: 0,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '공연 8명, 매표 2명,  리틀팜 2명,  승마 2명'
        },
        {
          id: 8,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '목장',
          venueName: '얼룩말카페',
          leaderName: '조혜원 매니저',
          regularHeadcount: 1,
          weekdayHeadcount: 1,
          weekendHeadcount: 2,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '조혜원'
        }
      ]
    },
    {
      partName: '미디어아트',
      description: '레저본부 직영 운영 및 현장 지원 파트',
      totalRegular: 5,
      totalWeekday: 4,
      totalWeekend: 5,
      venues: [
        {
          id: 9,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '미디어아트센터',
          venueName: '미디어아트센터',
          leaderName: '신지선 팀장',
          regularHeadcount: 5,
          weekdayHeadcount: 4,
          weekendHeadcount: 5,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: '윤정한,조예림,최지영'
        },
        {
          id: 10,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '미디어아트센터',
          venueName: '미디어-뮤지엄카페',
          leaderName: '',
          regularHeadcount: 0,
          weekdayHeadcount: 0,
          weekendHeadcount: 0,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: ''
        },
        {
          id: 11,
          categoryCode: 'TICKET',
          teamName: '레저본부',
          partName: '미디어아트센터',
          venueName: '미디어-기프트샵',
          leaderName: '',
          regularHeadcount: 0,
          weekdayHeadcount: 0,
          weekendHeadcount: 0,
          dailyWorkerWeekday: 0,
          dailyWorkerWeekend: 0,
          isOutsourced: 0,
          memo: ''
        }
      ]
    }
  ]);

  const [loading, setLoading] = useState<boolean>(false);

  const fetchHeadcount = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/organization/headcount');
      if (res.ok) {
        const json = await res.json();
        if (json.summary) setSummary(json.summary);
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

  const partThemeConfig: Record<string, { bg: string; badge: string; num: number }> = {
    '액티비티': { bg: 'bg-indigo-600', badge: '5개영업장', num: 1 },
    '목장': { bg: 'bg-emerald-600', badge: '3개영업장', num: 2 },
    '미디어아트': { bg: 'bg-purple-600', badge: '3개영업장', num: 3 },
    '미디어아트센터': { bg: 'bg-purple-600', badge: '3개영업장', num: 3 }
  };

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
              3대 직영 파트 · 11개 영업장
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
        </div>
      </div>

      {/* 2. Visual Organization Chart Tree */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-10"
      >
        {teams.map((hq, idx) => (
          <div key={idx} className="flex flex-col items-center">
            {/* HQ Head Node */}
            <motion.div 
              variants={itemVariants}
              className={`w-full max-w-sm rounded-3xl shadow-lg overflow-hidden ${hq.color} p-6 sm:p-8 text-white flex flex-col items-center justify-center transform transition-transform hover:scale-[1.02] cursor-pointer z-10 border border-emerald-400/30`}
            >
              <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-md mb-3 shadow-inner">
                {hq.icon}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-widest">{hq.name}</h2>
              <p className="text-emerald-100 text-sm mt-1.5 font-semibold tracking-wide">{hq.role}</p>
            </motion.div>

            {/* Tree Branch Lines */}
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="w-[85%] h-px bg-gray-300"></div>
            <div className="w-[85%] flex justify-between">
              {hq.children.map((_, i) => (
                <div key={i} className="w-px h-6 bg-gray-300"></div>
              ))}
            </div>

            {/* 5 Child Teams (미사용티켓 삭제 완료) */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mt-3">
              {hq.children.map((team, i) => (
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
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {/* 3. 4대 KPI 요약 카드 (사용자 스크린샷 1:1 완벽 일치) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-4">
        {/* Card 1: 총 관리 영업장 */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">총 관리 영업장</span>
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
            액티비티 · 목장 · 미디어 · 놀이동산
          </p>
        </div>

        {/* Card 2: 정규직 총원 */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">정규직 총원</span>
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
            <span className="text-xs font-bold text-gray-500">주중 운영 투입</span>
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
            <span className="text-xs font-bold text-gray-500">주말 집중 투입</span>
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
            주말/공휴일 피크 투입 인원 (+15명 증원)
          </p>
        </div>
      </div>

      {/* 4. 파트별 상세 조직 및 영업장 인력 현황 (사용자 스크린샷 1:1 테이블) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-600">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              4대 파트별 상세 조직 및 영업장 인력 현황
            </h2>
          </div>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100/80 px-3 py-1 rounded-full">
            백엔드 SSOT 실시간 동기화
          </span>
        </div>

        {/* Part Cards */}
        <div className="space-y-8">
          {parts.map((part, pIdx) => {
            const rawName = part.partName;
            const theme = partThemeConfig[rawName] || { bg: 'bg-slate-700', badge: `${part.venues.length}개영업장`, num: pIdx + 1 };
            const displayName = rawName.includes('파트') ? rawName : `${rawName} 파트`;

            return (
              <div key={pIdx} className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
                {/* Part Header Colored Banner */}
                <div className={`${theme.bg} text-white p-5 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-4">
                    {/* Circle Number Badge */}
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-sm shadow-inner shrink-0">
                      {theme.num}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                          {displayName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
                          {theme.badge}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 mt-1 font-medium">
                        {part.description || '레저본부 직영 운영 및 현장 지원 파트'}
                      </p>
                    </div>
                  </div>

                  {/* Subtotal Badges (Right) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/10">
                      <Users className="w-3.5 h-3.5 opacity-80" />
                      정규직 {part.totalRegular}명
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/10">
                      <Calendar className="w-3.5 h-3.5 opacity-80" />
                      주중 {part.totalWeekday}명
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/10">
                      <Flame className="w-3.5 h-3.5 opacity-80" />
                      주말 {part.totalWeekend}명
                    </span>
                  </div>
                </div>

                {/* Venue Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-gray-50/70 text-gray-500 font-bold border-b border-gray-100">
                      <tr>
                        <th className="py-4 px-6 sm:px-8 w-44">영업장명</th>
                        <th className="py-4 px-6 w-40">선임 / 책임자</th>
                        <th className="py-4 px-6 text-center w-28">정규직</th>
                        <th className="py-4 px-6 text-center w-28">주중 투입</th>
                        <th className="py-4 px-6 text-center w-28">주말 투입</th>
                        <th className="py-4 px-6 sm:px-8">특이사항 및 운영 메모</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900 font-medium">
                      {part.venues.map((v, vIdx) => (
                        <tr key={v.id || vIdx} className="hover:bg-gray-50/60 transition-colors">
                          {/* 영업장명 */}
                          <td className="py-4 px-6 sm:px-8 font-black text-gray-900">
                            {v.venueName}
                          </td>

                          {/* 선임 / 책임자 */}
                          <td className="py-4 px-6">
                            {v.leaderName ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100">
                                <Users className="w-3 h-3 text-emerald-600" />
                                {v.leaderName}
                              </span>
                            ) : (
                              <span className="text-gray-300 font-normal">-</span>
                            )}
                          </td>

                          {/* 정규직 */}
                          <td className="py-4 px-6 text-center">
                            {v.regularHeadcount > 0 ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs">
                                {v.regularHeadcount}명
                              </span>
                            ) : (
                              <span className="text-gray-300 font-normal">-</span>
                            )}
                          </td>

                          {/* 주중 투입 */}
                          <td className="py-4 px-6 text-center">
                            {v.weekdayHeadcount > 0 ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-extrabold text-xs">
                                {v.weekdayHeadcount}명
                              </span>
                            ) : (
                              <span className="text-gray-300 font-normal">-</span>
                            )}
                          </td>

                          {/* 주말 투입 */}
                          <td className="py-4 px-6 text-center">
                            {v.weekendHeadcount > 0 ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-600 font-extrabold text-xs">
                                {v.weekendHeadcount}명
                              </span>
                            ) : (
                              <span className="text-gray-300 font-normal">-</span>
                            )}
                          </td>

                          {/* 특이사항 및 운영 메모 */}
                          <td className="py-4 px-6 sm:px-8 text-gray-600 text-xs">
                            {v.memo ? (
                              <span className="inline-block px-3 py-1 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
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
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
