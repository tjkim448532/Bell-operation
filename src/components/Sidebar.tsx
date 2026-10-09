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
      if (pathname === '/venue-analytics' && subHref === '/venue-analytics?tab=labor') return true;
      if (pathname === '/venue-pnl' && subHref === '/venue-pnl?track=ALL') return true;
      if (pathname === '/upload' && subHref === '/upload?tab=sheets') return true;
      if (pathname === '/validation' && subHref === '/validation?view=team') return true;
    }
    return false;
  };

  const reportNavItems = [
    { 
      href: '/', 
      label: '실적 총괄 대시보드', 
      icon: LayoutDashboard,
      badge: 'SSOT',
      subItems: [
        { label: '레져본부 경영 실적 총괄', href: '/?slide=1' },
        { label: '4대 부서 비용 배분 결산', href: '/?slide=2' },
        { label: '일별 실시간 순매출 추이', href: '/?slide=3' },
      ]
    },
    { 
      href: '/venue-pnl', 
      label: '영업장별 손익 (P&L)', 
      icon: Landmark,
      badge: '0-오차',
      subItems: [
        { label: '전체 영업장 실시간 손익', href: '/venue-pnl?track=ALL' },
        { label: '직영 vs 외주 기여 마진', href: '/venue-pnl?track=DIRECT' },
        { label: '외주 위탁업체 손익 분리', href: '/venue-pnl?track=OUTSOURCED' },
      ]
    },
    { 
      href: '/venue-analytics', 
      label: '부서·영업장 상세 비용', 
      icon: Building2,
      subItems: [
        { label: '인력 의·식·주(衣食住) 비용', href: '/venue-analytics?tab=labor' },
        { label: '✨ 1회성 특별비용 감사', href: '/venue-analytics?tab=oneoff' },
        { label: '전표 세부 원장 조회', href: '/venue-analytics?tab=vouchers' },
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
            <span className="text-3xs font-semibold text-slate-400">3개 화면</span>
          </div>
          <div className="space-y-1">
            {reportNavItems.map((item) => {
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
