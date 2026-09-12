"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileSpreadsheet, 
  ShieldCheck, 
  LogOut, 
  Layers 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const reportNavItems = [
    { href: '/', label: '레저 P&L 대시보드', icon: LayoutDashboard },
    { href: '/venue-analytics', label: '영업장별 심층 분석', icon: Building2 },
    { href: '/organization', label: '조직 및 인력 현황', icon: Users },
  ];

  const managementNavItems = [
    { href: '/upload', label: '비용 엑셀 업로드', icon: FileSpreadsheet },
    { href: '/validation', label: '검증마스터 감사센터', icon: ShieldCheck },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen shrink-0 border-r border-slate-800 selection:bg-emerald-500 selection:text-white">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
            B
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">벨포레 레저본부</h1>
            <p className="text-2xs text-slate-400 font-medium">매출 & 손익(P&L) 시스템 V2</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3.5 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Section 1: Executive Analytics */}
        <div>
          <h2 className="px-3 text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers size={13} className="text-emerald-400" />
            <span>경영 실적 분석</span>
          </h2>
          <div className="space-y-1">
            {reportNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 2: Data Management & Integrity */}
        <div>
          <h2 className="px-3 text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>데이터 관리 & 검증</span>
          </h2>
          <div className="space-y-1">
            {managementNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer / User Info */}
      {user && (
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
          <button 
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-rose-400 text-xs font-medium cursor-pointer"
          >
            <LogOut size={16} />
            <span className="truncate">로그아웃 ({user.email})</span>
          </button>
        </div>
      )}
      <div className="px-5 py-3 border-t border-slate-800/60 text-2xs text-slate-500 font-medium">
        © {new Date().getFullYear()} 벨포레 레저사업본부
      </div>
    </div>
  );
}
