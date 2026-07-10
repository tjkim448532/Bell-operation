"use client";

import Link from 'next/link';
import { Home, Upload, Settings, BarChart2, Users, LogOut, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      <div className="p-6 text-2xl font-bold border-b border-gray-800 tracking-wider">
        <span className="text-mint-400">레져</span>본부
      </div>
      <nav className="flex-1 p-4 space-y-6">
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📊 실적 리포트</h3>
          <div className="space-y-1">
            <Link href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Home size={20} className="text-mint-400" />
              <span>통합 대시보드</span>
            </Link>
            <Link href="/analysis" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <BarChart2 size={20} className="text-mint-400" />
              <span>수익 구조 상세 분석</span>
            </Link>
            <Link href="/team-report" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Users size={20} className="text-purple-400" />
              <span>5대 팀별 실적 현황</span>
            </Link>
            <Link href="/condo-analysis" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <BarChart2 size={20} className="text-blue-400" />
              <span>콘도 객실 상세 분석</span>
            </Link>
            <Link href="/matrix-weekly" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <TrendingUp size={20} className="text-mint-400" />
              <span>V5 요일비교 매트릭스</span>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📤 데이터 센터</h3>
          <div className="space-y-1">
            <Link href="/upload" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Upload size={20} className="text-green-400" />
              <span>데이터 동기화 (가져오기)</span>
            </Link>
            <Link href="/validation" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <BarChart2 size={20} className="text-mint-400" />
              <span>[관리자] 비용 데이터 수동 교정</span>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">⚙️ 인공지능 분류 설정</h3>
          <div className="space-y-1">
            <Link href="/settings" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Settings size={20} className="text-gray-400" />
              <span>매출/비용 &rarr; 팀 연결 규칙 관리</span>
            </Link>
            <Link href="/settings-revenue" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Settings size={20} className="text-gray-400" />
              <span>매출 통계 제외 항목 설정</span>
            </Link>
            <Link href="/settings-expense" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <Settings size={20} className="text-gray-400" />
              <span>비용 통계 제외 항목 설정</span>
            </Link>
          </div>
        </div>
      </nav>
      {user && (
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={logout}
            className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          >
            <LogOut size={20} />
            <span className="text-sm">로그아웃 ({user.email})</span>
          </button>
        </div>
      )}
      <div className="p-4 border-t border-gray-800 text-sm text-gray-500">
        © 2026 Leisure Division
      </div>
    </div>
  );
}
