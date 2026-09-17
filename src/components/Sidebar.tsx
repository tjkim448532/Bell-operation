"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  FileSpreadsheet, 
  ShieldCheck, 
  LogOut, 
  Layers,
  Landmark,
  Menu,
  X,
  Pin,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // 사이드바 열림(호버/클릭) 및 고정(Pin) 상태 관리
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // 마우스 이동 시 급작스런 닫힘 방지를 위한 디바운스 타이머 (200ms 그레이스 타임)
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimeout = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimeout();
    if (!isPinned) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      clearCloseTimeout();
      leaveTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 200);
    }
  };

  const handleCloseImmediately = () => {
    clearCloseTimeout();
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  // 로컬 스토리지에서 사용자 고정 설정 복원
  useEffect(() => {
    const saved = localStorage.getItem('bell_sidebar_pinned');
    if (saved === 'true') {
      setIsPinned(true);
      setIsOpen(true);
    }
  }, []);

  const togglePin = () => {
    clearCloseTimeout();
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem('bell_sidebar_pinned', String(next));
      if (next) setIsOpen(true);
      return next;
    });
  };

  const reportNavItems = [
    { 
      href: '/', 
      label: '실적 총괄 대시보드', 
      icon: LayoutDashboard,
      badge: 'SSOT',
      subItems: [
        { label: '레져본부 경영 실적 총괄' },
        { label: '4대 부서 비용 안분 결산' },
        { label: '일별 실시간 순매출 추이' },
      ]
    },
    { 
      href: '/venue-pnl', 
      label: '영업장별 손익 (P&L)', 
      icon: Landmark,
      badge: '0-오차',
      subItems: [
        { label: '전체 영업장 실시간 손익' },
        { label: '직영 vs 외주 기여 마진' },
        { label: '4대 파트별 손익 매트릭스' },
      ]
    },
    { 
      href: '/venue-analytics', 
      label: '부서·영업장 상세 비용', 
      icon: Building2,
      subItems: [
        { label: '인력 의·식·주(衣食住) 비용' },
        { label: '✨ 1회성 특별비용 감사' },
        { label: '전표 세부 원장 조회' },
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
        { label: '재경팀 전표 엑셀 등록' },
        { label: '구글 스프레드시트 동기화' },
      ]
    },
    { 
      href: '/validation', 
      label: '데이터 검증센터 (정합성)', 
      icon: ShieldCheck,
      badge: '0원 검증',
      subItems: [
        { label: '4대 부서 칸반 보드 (1-클릭 이동)' },
        { label: '항목별 비목 칸반 보드' },
        { label: '감가상각·외주 격리 원장' },
      ]
    },
  ];

  return (
    <>
      {/* 1. 좌측 화면 끝 마우스 호버 감지 구역 (화면 좌측 끝 32px) */}
      {!isPinned && (
        <div 
          className="fixed inset-y-0 left-0 w-8 z-[65] bg-transparent cursor-pointer"
          onMouseEnter={handleMouseEnter}
          title="마우스를 올리면 사이드메뉴가 펼쳐집니다"
        />
      )}

      {/* 2. 플로팅 미니 메뉴 트리거 버튼 (상단 좌측 항상 노출) */}
      {!isPinned && !isOpen && (
        <button
          onClick={handleMouseEnter}
          onMouseEnter={handleMouseEnter}
          className="fixed top-3.5 left-4 z-[65] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 text-slate-700 hover:text-[#00AE95] shadow-md border border-slate-200/90 backdrop-blur-md transition-all cursor-pointer group hover:shadow-lg hover:border-[#00AE95]/50 hover:scale-105 animate-in fade-in duration-200"
          title="사이드 메뉴 열기 (마우스 호버 또는 클릭)"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00AE95] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00AE95]"></span>
          </span>
          <Menu size={16} className="text-[#00AE95] group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-xs font-bold tracking-tight">메뉴</span>
        </button>
      )}

      {/* 3. 오버레이 배경 (호버/열림 모드일 때 클릭 시 닫기) */}
      {!isPinned && isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs z-[68] transition-opacity duration-300"
          onClick={() => {
            clearCloseTimeout();
            setIsOpen(false);
          }}
        />
      )}

      {/* 4. 사이드바 본체 (고정 모드 vs 호버 슬라이딩 모드 완벽 지원) */}
      <aside
        className={`bg-white text-slate-800 flex flex-col h-screen border-r border-slate-200 selection:bg-[#00AE95] selection:text-white transition-all duration-300 ease-in-out ${
          isPinned
            ? 'w-64 shrink-0 relative z-30 shadow-none'
            : `fixed inset-y-0 left-0 z-[70] w-72 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Brand Header & Control Buttons */}
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

          {/* 고정(Pin) & 닫기(Close) 버튼 */}
          <div className="flex items-center gap-1">
            <button
              onClick={togglePin}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                isPinned 
                  ? 'text-[#00AE95] bg-[#E6F7F4] hover:bg-[#d0f0eb] shadow-2xs' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isPinned ? '사이드바 고정 해제 (마우스 호버 자동 숨김)' : '사이드바 화면에 고정 (항상 표시)'}
            >
              <Pin size={15} className={`transition-transform duration-200 ${isPinned ? 'rotate-45' : ''}`} />
            </button>
            {!isPinned && (
              <button
                onClick={handleCloseImmediately}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                title="메뉴 닫기"
              >
                <X size={16} />
              </button>
            )}
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
                      onClick={handleCloseImmediately}
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

                    {/* 호버 시 서브 메뉴 펼침 (하위 기능 미리보기) */}
                    {(isActive || isHovered) && item.subItems && (
                      <div className="ml-7 my-1 pl-2.5 border-l-2 border-[#00AE95]/30 space-y-0.5 animate-in fade-in duration-200">
                        {item.subItems.map((sub, sIdx) => (
                          <Link
                            key={sIdx}
                            href={item.href}
                            onClick={handleCloseImmediately}
                            className={`block text-3xs py-1 px-1.5 rounded-md transition-colors ${
                              isActive 
                                ? 'text-slate-600 hover:text-[#00AE95] hover:bg-[#E6F7F4]/60 font-medium' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                            }`}
                          >
                            • {sub.label}
                          </Link>
                        ))}
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
                      onClick={handleCloseImmediately}
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

                    {/* 호버 시 서브 메뉴 펼침 (하위 기능 미리보기) */}
                    {(isActive || isHovered) && item.subItems && (
                      <div className="ml-7 my-1 pl-2.5 border-l-2 border-[#00AE95]/30 space-y-0.5 animate-in fade-in duration-200">
                        {item.subItems.map((sub, sIdx) => (
                          <Link
                            key={sIdx}
                            href={item.href}
                            onClick={handleCloseImmediately}
                            className={`block text-3xs py-1 px-1.5 rounded-md transition-colors ${
                              isActive 
                                ? 'text-slate-600 hover:text-[#00AE95] hover:bg-[#E6F7F4]/60 font-medium' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                            }`}
                          >
                            • {sub.label}
                          </Link>
                        ))}
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
          <span className="text-4xs text-slate-400 font-mono">
            {isPinned ? '📌 고정됨' : '⚡ 자동숨김'}
          </span>
        </div>
      </aside>
    </>
  );
}
