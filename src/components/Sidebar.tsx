"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  FileSpreadsheet, 
  ShieldCheck, 
  LogOut, 
  Layers,
  Landmark,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchStr = searchParams.toString();
  const fullPath = searchStr ? `${pathname}?${searchStr}` : pathname;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isSubActive = (subHref: string) => {
    if (subHref === fullPath) return true;
    if (!searchStr) {
      if (pathname === '/' && subHref === '/?slide=1') return true;
      if (pathname === '/upload' && subHref === '/upload?tab=sheets') return true;
      if (pathname === '/validation' && subHref === '/validation?view=team') return true;
    }
    // 슬라이드 링크 활성 상태 정확 매칭
    if (pathname === '/' && subHref.startsWith('/?slide=')) {
      const currentSlide = searchParams.get('slide') || '1';
      return subHref === `/?slide=${currentSlide}`;
    }
    return false;
  };

  const reportNavItems = [
    { 
      href: '/?slide=1', 
      label: '경영 실적 대시보드', 
      icon: LayoutDashboard,
      badge: '3대 슬라이드',
      subItems: [
        { label: '01. 경영 실적 총괄 & 매트릭스', href: '/?slide=1' },
        { label: '02. 4대 부서 상세 비용 결산', href: '/?slide=2' },
        { label: '03. 월별 실적 추이 (P&L 시뮬레이터)', href: '/?slide=3' },
      ]
    },
  ];

  const managementNavItems = [
    { 
      href: '/upload', 
      label: '비용 전표 등록 (업로드)', 
      icon: FileSpreadsheet,
      badge: '엑셀/시트',
      subItems: [
        { label: '구글 스프레드시트 동기화', href: '/upload?tab=sheets' },
        { label: '재경팀 전표 엑셀 등록', href: '/upload?tab=excel' },
      ]
    },
    { 
      href: '/validation', 
      label: '데이터 검증센터 (정합성)', 
      icon: ShieldCheck,
      badge: '0원 검증',
      subItems: [
        { label: '4대 부서 칸반 보드 (1-클릭 이동)', href: '/validation?view=team' },
        { label: '항목별 비목 칸반 보드', href: '/validation?view=category' },
        { label: '감가상각·외주 격리 원장', href: '/validation?view=table' },
      ]
    },
  ];

  const sharedNavItems = [
    {
      href: '/shared/team-report',
      label: '팀장 운영 리포트',
      icon: Users,
      badge: '공유/보안',
      subItems: [
        { label: '팀장 실적 & 통제비용 뷰', href: '/shared/team-report' },
      ]
    },
  ];

  return (
    <aside className="w-64 shrink-0 relative flex flex-col h-screen border-r border-slate-200 bg-white z-30 selection:bg-[#00AE95] selection:text-white shadow-xs">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#00AE95] flex items-center justify-center text-white font-black text-lg shadow-xs shrink-0">
            B
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1 leading-tight">
              <span>벨포레</span>
              <span className="text-[#00AE95]">레져본부</span>
            </h1>
            <p className="text-3xs text-slate-400 font-medium">실적 및 손익 관리</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto custom-scrollbar">
        {/* Section 1: Analytics */}
        <div>
          <div className="px-3 flex items-center justify-between mb-1.5">
            <h2 className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-[#00AE95]" />
              <span>실적 분석</span>
            </h2>
            <span className="text-3xs font-semibold text-slate-400">3대 슬라이드</span>
          </div>
          <div className="space-y-1">
            {reportNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === '/' || pathname === item.href;
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
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#00AE95] transition-colors'} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-3xs px-1.5 py-0.5 rounded-md font-mono font-medium ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* 서브 메뉴 */}
                  {(isActive || isHovered) && item.subItems && (
                    <div className="ml-7 my-1 pl-2.5 border-l-2 border-[#00AE95]/30 space-y-0.5 animate-in fade-in duration-200">
                      {item.subItems.map((sub, sIdx) => {
                        const active = isSubActive(sub.href);
                        return (
                          <Link
                            key={sIdx}
                            href={sub.href}
                            className={`flex items-center gap-1.5 text-3xs py-1.5 px-2 rounded-lg transition-all ${
                              active 
                                ? 'bg-[#E6F7F4] text-[#00826F] font-bold shadow-3xs' 
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-[#00AE95]' : 'bg-slate-300'}`} />
                            <span className="truncate">{sub.label}</span>
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

        {/* Section 2: Data Management */}
        <div>
          <div className="px-3 flex items-center justify-between mb-1.5">
            <h2 className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#00AE95]" />
              <span>데이터 관리</span>
            </h2>
            <span className="text-3xs font-semibold text-slate-400">2개 화면</span>
          </div>
          <div className="space-y-1">
            {managementNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
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
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#00AE95] transition-colors'} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-3xs px-1.5 py-0.5 rounded-md font-mono font-medium ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* 서브 메뉴 */}
                  {(isActive || isHovered) && item.subItems && (
                    <div className="ml-7 my-1 pl-2.5 border-l-2 border-[#00AE95]/30 space-y-0.5 animate-in fade-in duration-200">
                      {item.subItems.map((sub, sIdx) => {
                        const active = isSubActive(sub.href);
                        return (
                          <Link
                            key={sIdx}
                            href={sub.href}
                            className={`flex items-center gap-1.5 text-3xs py-1.5 px-2 rounded-lg transition-all ${
                              active 
                                ? 'bg-[#E6F7F4] text-[#00826F] font-bold shadow-3xs' 
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-[#00AE95]' : 'bg-slate-300'}`} />
                            <span className="truncate">{sub.label}</span>
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

        {/* Section 3: Shared Reports */}
        <div>
          <div className="px-3 flex items-center justify-between mb-1.5">
            <h2 className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={13} className="text-[#00AE95]" />
              <span>팀장 공유</span>
            </h2>
            <span className="text-3xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              보안모드
            </span>
          </div>
          <div className="space-y-1">
            {sharedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
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
                    target="_blank"
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#00AE95] transition-colors'} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-3xs px-1.5 py-0.5 rounded-md font-mono font-medium ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* 서브 메뉴 */}
                  {(isActive || isHovered) && item.subItems && (
                    <div className="ml-7 my-1 pl-2.5 border-l-2 border-[#00AE95]/30 space-y-0.5 animate-in fade-in duration-200">
                      {item.subItems.map((sub, sIdx) => {
                        const active = isSubActive(sub.href);
                        return (
                          <Link
                            key={sIdx}
                            href={sub.href}
                            target="_blank"
                            className={`flex items-center gap-1.5 text-3xs py-1.5 px-2 rounded-lg transition-all ${
                              active 
                                ? 'bg-[#E6F7F4] text-[#00826F] font-bold shadow-3xs' 
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-[#00AE95]' : 'bg-slate-300'}`} />
                            <span className="truncate">{sub.label}</span>
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
        <span>© {new Date().getFullYear()} 벨포레 레져본부</span>
        <span className="text-4xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          상시 고정됨
        </span>
      </div>
    </aside>
  );
}
