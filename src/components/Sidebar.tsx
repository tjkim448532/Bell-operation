"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
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
    { href: '/', label: '레져본부 손익 대시보드', icon: LayoutDashboard },
    { href: '/venue-analytics', label: '영업장별 실적 분석', icon: Building2 },
  ];

  const managementNavItems = [
    { href: '/upload', label: '비용 엑셀 등록', icon: FileSpreadsheet },
    { href: '/validation', label: '데이터 검증센터', icon: ShieldCheck },
  ];

  return (
    <div className="w-64 bg-white text-slate-800 flex flex-col h-screen shrink-0 border-r border-slate-200 selection:bg-[#00AE95] selection:text-white">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00AE95] flex items-center justify-center text-white font-black text-xl shadow-xs">
            B
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1">
              <span>벨포레</span>
              <span className="text-[#00AE95]">레져본부</span>
            </h1>
            <p className="text-3xs text-slate-400 font-medium">실적 및 손익 관리</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3.5 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Section 1: Analytics */}
        <div>
          <h2 className="px-3 text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers size={13} className="text-[#00AE95]" />
            <span>실적 분석</span>
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
                      ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 2: Data Management */}
        <div>
          <h2 className="px-3 text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[#00AE95]" />
            <span>데이터 관리</span>
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
                      ? 'bg-[#00AE95] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
          <button 
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-slate-200/60 transition-colors text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
          >
            <LogOut size={16} />
            <span className="truncate">로그아웃 ({user.email})</span>
          </button>
        </div>
      )}
      <div className="px-5 py-3 border-t border-slate-100 text-2xs text-slate-400 font-medium">
        © {new Date().getFullYear()} 벨포레 레져본부
      </div>
    </div>
  );
}
