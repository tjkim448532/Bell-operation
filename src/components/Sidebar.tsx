"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, TrendingUp, Building2, BarChart3, 
  TreePine, CreditCard, Tag, Kanban, PieChart, Upload, ShieldCheck, LogOut 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const reportNavItems = [
    { href: '/', label: '통합 경영 대시보드', icon: LayoutDashboard },
    { href: '/daily-sales', label: '일일 영업속보', icon: BarChart3 },
    { href: '/golf-sales', label: '골프 전용 대시보드', icon: Tag },
    { href: '/room-channel-sales', label: '객실 세그먼트 실적', icon: Building2 },
    { href: '/team-report', label: '부서별 영업 실적', icon: Users },
    { href: '/monthly-trends', label: '월별 수익 분석 (손익계산서)', icon: TrendingUp },
    { href: '/venue-analytics', label: '영업장별 분석 (방문객·객단가)', icon: Building2 },
    { href: '/business-plan', label: '당해 사업 종합 분석', icon: BarChart3 },
    { href: '/organization', label: '조직 및 운영 인력 현황', icon: TreePine },
    { href: '/team-expenses', label: '부서별 총 비용 분석', icon: CreditCard },
  ];

  const managementNavItems = [
    { href: '/settings-v6-mapping', label: '영업장 매출 매핑 관리', icon: Tag },
    { href: '/settings', label: '비용 부서 배정 (칸반보드)', icon: Kanban },
    { href: '/settings-macro-mapping', label: '비용 비목 분류 (인건비/경비)', icon: PieChart },
    { href: '/upload', label: '엑셀 데이터 업로드', icon: Upload },
    { href: '/validation', label: '비용 데이터 정합성 검증', icon: ShieldCheck },
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
            <p className="text-2xs text-slate-400 font-medium">경영 통합 통제 대시보드</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 p-3.5 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Section 1: Executive Reports */}
        <div>
          <h2 className="px-3 text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>📊</span> 경영 실적 분석
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

        {/* Section 2: Management & Mapping */}
        <div>
          <h2 className="px-3 text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>⚙️</span> 데이터 & 매핑 관리
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
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-rose-400 text-xs font-medium"
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
