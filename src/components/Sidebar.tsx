"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ShieldCheck,
  LogOut,
  Layers,
  Users,
  Dog,
  Store,
  Calculator,
  Receipt,
  BarChart3,
  ExternalLink,
  CreditCard,
  ChevronDown,
  ChevronRight,
  FolderKanban,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarNavItem {
  href: string;
  basePath?: string;
  slideMatch?: string;
  stepNum?: string;
  label: string;
  subLabel?: string;
  icon: React.ElementType;
  badge?: string;
  isExternal?: boolean;
  subItems?: { label: string; href: string }[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isTeamMode =
    pathname.startsWith('/shared/team-report') || searchParams.get('mode') === 'team';

  const withMode = (path: string) => (isTeamMode ? `${path}?mode=team` : path);

  // 현재 경로가 부가 도구함에 속하는지 판별 (속할 경우 자동 펼침)
  const isInsideAuxTools =
    pathname.startsWith('/leisure') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/validation') ||
    pathname.startsWith('/petforet') ||
    searchParams.get('tab') === 'animals' ||
    searchParams.get('view') === 'animals';

  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(isInsideAuxTools);

  useEffect(() => {
    if (isInsideAuxTools) {
      setIsToolsOpen(true);
    }
  }, [isInsideAuxTools]);

  const currentSlide = searchParams.get('slide') || '1';

  const isSubActive = (subHref: string) => {
    const fullCurrentUrl =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    if (fullCurrentUrl === subHref) return true;
    if (pathname === '/' && subHref.startsWith('/?slide=')) {
      return subHref === `/?slide=${currentSlide}`;
    }
    return false;
  };

  // ============================================================================
  // [1] 상단 핵심 경영 메뉴 (Core 3 Menus: 매출·비용·손익 / 이용률·숙박모수 / 비용 상세)
  // ============================================================================
  const coreNavItems: SidebarNavItem[] = isTeamMode
    ? [
        {
          stepNum: '01',
          href: '/shared/team-report',
          basePath: '/shared/team-report',
          label: '부서 실적 & 운영비 홈',
          subLabel: '팀별 매출 · 운영비 · 절감 분석',
          icon: LayoutDashboard,
          badge: '핵심',
        },
        {
          stepNum: '02',
          href: withMode('/venue-usage-rate'),
          basePath: '/venue-usage-rate',
          label: '매장별 이용률 & 숙박모수',
          subLabel: '숙박객(골프제외) + 워크인 모수',
          icon: Calculator,
          badge: '모수SSOT',
        },
      ]
    : [
        {
          stepNum: '01',
          href: '/?slide=1',
          basePath: '/',
          slideMatch: '1_or_3',
          label: '매출·비용·손익 총괄',
          subLabel: '순매출 · 총비용 · 손익 · 숙박모수',
          icon: LayoutDashboard,
          badge: '총괄 홈',
          subItems: [
            { label: '종합 손익 & 숙박·이용률 요약', href: '/?slide=1' },
            { label: '월별 매출·비용·손익 추이', href: '/?slide=3' },
          ],
        },
        {
          stepNum: '02',
          href: withMode('/venue-usage-rate'),
          basePath: '/venue-usage-rate',
          label: '매장별 이용률 & 숙박모수',
          subLabel: '숙박객(골프제외) + 워크인 모수',
          icon: Calculator,
          badge: '이용률',
        },
        {
          stepNum: '03',
          href: '/?slide=2',
          basePath: '/',
          slideMatch: '2',
          label: '부서별 비용 상세 결산',
          subLabel: '4대 직영부서 인건비 · 경비 원장',
          icon: CreditCard,
          badge: '비용원장',
        },
      ];

  // ============================================================================
  // [2] 하단 접이식 부가 도구함 (현장 안내 · 요금 · 인력 · 전표 등록)
  // ============================================================================
  const auxFieldNavItems: SidebarNavItem[] = [
    ...(isTeamMode
      ? [
          {
            href: '/shared/team-report?team=목장&tab=animals',
            basePath: '/shared/team-report?team=목장&tab=animals',
            label: '목장 동물 관리 대장',
            icon: Dog,
            badge: '구글시트',
          },
        ]
      : []),
    {
      href: withMode('/leisure'),
      basePath: '/leisure',
      label: '레저 영업장 티켓·채널 현황',
      icon: Store,
    },
    {
      href: 'https://bell-dashboard.web.app/facility-trend?embed=true',
      basePath: 'https://bell-dashboard.web.app/facility-trend?embed=true',
      label: '전사 영업장 실적 추이',
      icon: BarChart3,
      isExternal: true,
      badge: '새창 ↗',
    },
    {
      href: withMode('/leisure/pricing'),
      basePath: '/leisure/pricing',
      label: '종합 이용요금 안내',
      icon: Receipt,
    },
    {
      href: withMode('/leisure/simulator'),
      basePath: '/leisure/simulator',
      label: '티켓 요금 시뮬레이터',
      icon: Calculator,
    },
    {
      href: withMode('/leisure/organization'),
      basePath: '/leisure/organization',
      label: '조직도 및 인력 현황',
      icon: Users,
    },
  ];

  const managementNavItems: SidebarNavItem[] = [
    {
      href: '/upload',
      basePath: '/upload',
      label: '비용 전표 등록 (시트/엑셀)',
      icon: FileSpreadsheet,
      badge: '등록',
      subItems: [
        { label: '구글 시트 동기화', href: '/upload?tab=sheets' },
        { label: '재경팀 전표 엑셀 등록', href: '/upload?tab=excel' },
      ],
    },
    {
      href: '/validation',
      basePath: '/validation',
      label: '데이터 검증센터',
      icon: ShieldCheck,
      badge: '0-Variance',
      subItems: [
        { label: '4대 부서 칸반 보드', href: '/validation?view=team' },
        { label: '항목별 비목 칸반 보드', href: '/validation?view=category' },
        { label: '감가상각·외주 격리 원장', href: '/validation?view=table' },
      ],
    },
    {
      href: '/petforet',
      basePath: '/petforet',
      label: '펫포레 운영 센터 (알림톡)',
      icon: Dog,
      badge: '알림톡',
    },
  ];

  const isCoreItemActive = (item: SidebarNavItem) => {
    if (isTeamMode) {
      const isAnimalTab =
        searchParams.get('tab') === 'animals' || searchParams.get('view') === 'animals';
      if (item.basePath === '/shared/team-report') {
        return pathname.startsWith('/shared/team-report') && !isAnimalTab;
      }
      return pathname === item.basePath;
    }

    if (item.basePath === '/' && pathname === '/') {
      if (item.slideMatch === '2') {
        return currentSlide === '2';
      }
      if (item.slideMatch === '1_or_3') {
        return currentSlide === '1' || currentSlide === '3';
      }
    }
    return pathname === item.basePath;
  };

  return (
    <aside className="w-72 shrink-0 relative flex flex-col h-screen border-r border-slate-200 bg-white z-30 selection:bg-[#00AE95] selection:text-white shadow-xs print:hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#00AE95] flex items-center justify-center text-white font-black text-lg shadow-xs shrink-0">
            B
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 leading-tight">
              <span>벨포레 레저본부</span>
              {isTeamMode ? (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-3xs font-extrabold tracking-tight">
                  👥 팀장용
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-amber-300 text-3xs font-extrabold tracking-tight">
                  👑 본부장용
                </span>
              )}
            </h1>
            <p className="text-3xs text-slate-500 font-semibold mt-0.5">
              매출 · 비용 · 이용률 · 숙박모수 통합
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto custom-scrollbar">
        {/* ==================================================================== */}
        {/* Section 1: 핵심 3대 메뉴 (매출·손익 / 이용률·숙박모수 / 비용 상세) */}
        {/* ==================================================================== */}
        <div>
          <div className="px-2.5 flex items-center justify-between mb-2">
            <h2 className="text-2xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-[#00AE95]" />
              <span>핵심 경영 지표 (TOP {coreNavItems.length})</span>
            </h2>
            <span className="text-3xs font-bold text-[#00826F] bg-[#E6F7F4] px-1.5 py-0.5 rounded">
              최우선 과제
            </span>
          </div>

          <div className="space-y-2">
            {coreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isCoreItemActive(item);
              const isHovered = hoveredItem === item.href;

              return (
                <div
                  key={item.href}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="rounded-2xl transition-all"
                >
                  <Link
                    href={item.href}
                    className={`flex items-start justify-between p-3 rounded-2xl transition-all group border ${
                      isActive
                        ? 'bg-[#00AE95] text-white border-[#00AE95] shadow-sm'
                        : 'bg-slate-50/70 text-slate-800 border-slate-200/80 hover:bg-white hover:border-[#00AE95]/50 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-mono text-2xs font-black ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-[#00826F] border border-slate-200 group-hover:border-[#00AE95]'
                        }`}
                      >
                        {item.stepNum || <Icon size={15} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold tracking-tight whitespace-nowrap">
                            {item.label}
                          </span>
                        </div>
                        {item.subLabel && (
                          <p
                            className={`text-3xs mt-0.5 truncate font-medium ${
                              isActive ? 'text-white/90' : 'text-slate-500'
                            }`}
                          >
                            {item.subLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-3xs px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                          isActive
                            ? 'bg-black/20 text-white'
                            : 'bg-white text-slate-600 border border-slate-200/80'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* 서브 메뉴 (01. 매출·비용·손익 총괄 내부 슬라이드 전환) */}
                  {(isActive || isHovered) && item.subItems && (
                    <div className="ml-6 my-1.5 pl-2.5 border-l-2 border-[#00AE95]/40 space-y-1 animate-in fade-in duration-200">
                      {item.subItems.map((sub, sIdx) => {
                        const active = isSubActive(sub.href);
                        return (
                          <Link
                            key={sIdx}
                            href={sub.href}
                            className={`flex items-center gap-1.5 text-3xs py-1.5 px-2.5 rounded-lg transition-all ${
                              active
                                ? 'bg-[#E6F7F4] text-[#00826F] font-bold shadow-3xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                active ? 'bg-[#00AE95]' : 'bg-slate-300'
                              }`}
                            />
                            <span className="whitespace-nowrap">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* Section 2: 하단 접이식 부가 도구함 (요금·인력·채널·데이터 등록) */}
        {/* ==================================================================== */}
        <div className="pt-3 border-t border-slate-200/80">
          <button
            type="button"
            onClick={() => setIsToolsOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isToolsOpen || isInsideAuxTools
                ? 'bg-slate-100 text-slate-800 border-slate-300/80'
                : 'bg-slate-50/80 text-slate-500 border-slate-200/60 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderKanban size={15} className="text-slate-500" />
              <span>부가 도구 & 데이터 관리</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-3xs px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200 font-medium">
                {isToolsOpen ? '접기' : '더보기'}
              </span>
              {isToolsOpen ? (
                <ChevronDown size={14} className="text-slate-500" />
              ) : (
                <ChevronRight size={14} className="text-slate-400" />
              )}
            </div>
          </button>

          {isToolsOpen && (
            <div className="mt-2.5 space-y-4 pl-1 animate-in fade-in duration-200">
              {/* 소그룹 A: 영업장 보조 / 요금 / 인력 */}
              <div className="space-y-1">
                <div className="px-2.5 text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  영업장 참고 · 요금 · 인력
                </div>
                {auxFieldNavItems.map((item) => {
                  const Icon = item.icon;
                  const isAnimalTab =
                    searchParams.get('tab') === 'animals' || searchParams.get('view') === 'animals';
                  const isActive = item.href.includes('tab=animals')
                    ? isAnimalTab
                    : pathname === item.basePath;

                  if (item.isExternal) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            size={15}
                            className="text-slate-400 group-hover:text-[#00AE95] transition-colors"
                          />
                          <span className="whitespace-nowrap">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.badge && (
                            <span className="text-3xs px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-[#00826F] border border-emerald-200">
                              {item.badge}
                            </span>
                          )}
                          <ExternalLink size={11} className="text-slate-400" />
                        </div>
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-slate-800 text-white font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          className={
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 group-hover:text-[#00AE95] transition-colors'
                          }
                        />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-3xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* 소그룹 B: 데이터 등록 & 운영 센터 (관리자 전용) */}
              {user && !isTeamMode && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="px-2.5 text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    전표 등록 · 검증 · 알림톡
                  </div>
                  {managementNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.basePath;
                    const isHovered = hoveredItem === item.href;

                    return (
                      <div
                        key={item.href}
                        onMouseEnter={() => setHoveredItem(item.href)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className="rounded-xl transition-all"
                      >
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                            isActive
                              ? 'bg-slate-800 text-white font-bold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              size={15}
                              className={
                                isActive
                                  ? 'text-white'
                                  : 'text-slate-400 group-hover:text-[#00AE95] transition-colors'
                              }
                            />
                            <span className="whitespace-nowrap">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-3xs px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>

                        {(isActive || isHovered) && item.subItems && (
                          <div className="ml-6 my-1 pl-2.5 border-l-2 border-slate-300 space-y-0.5">
                            {item.subItems.map((sub, sIdx) => {
                              const active = isSubActive(sub.href);
                              return (
                                <Link
                                  key={sIdx}
                                  href={sub.href}
                                  className={`flex items-center gap-1.5 text-3xs py-1 px-2 rounded-lg transition-all ${
                                    active
                                      ? 'bg-slate-200/80 text-slate-900 font-bold'
                                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      active ? 'bg-slate-800' : 'bg-slate-300'
                                    }`}
                                  />
                                  <span className="whitespace-nowrap">{sub.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer / User Info */}
      {user && (
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-slate-200/60 transition-colors text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
          >
            <LogOut size={15} />
            <span className="truncate">로그아웃 ({user.email})</span>
          </button>
        </div>
      )}
      <div className="px-5 py-2.5 border-t border-slate-100 text-3xs text-slate-400 font-medium shrink-0 flex items-center justify-between">
        <span>© {new Date().getFullYear()} 벨포레</span>
        <span className="text-4xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          핵심 3메뉴 체계
        </span>
      </div>
    </aside>
  );
}
