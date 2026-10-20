'use client';

import React from 'react';
import {
  Layers,
  Shield,
  User,
  Database,
  RotateCcw,
  Sparkles,
  Building2,
  AlertOctagon,
  CheckCircle2,
  SlidersHorizontal,
  IdCard,
} from 'lucide-react';
import { UserProfile } from '@/types/adSpot';
import { useToast } from './Toast';

interface HeaderProps {
  isAdmin: boolean;
  onToggleAdmin: () => void;
  activeDept: string;
  onChangeDept: (dept: string) => void;
  userProfile?: UserProfile;
  onOpenProfileModal?: () => void;
  onResetSeed: () => Promise<void>;
  isCloud: boolean;
  overdueCount: number;
}

export const DEPARTMENTS = [
  '벨포레 운영팀',
  '홍보브랜드팀',
  '고객경험혁신팀',
  '경영지원팀',
  '인사총무팀',
  'DX혁신추진팀',
  '복리후생팀',
  '노사상생협의회',
  'ESG경영팀',
];

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onToggleAdmin,
  activeDept,
  onChangeDept,
  userProfile,
  onOpenProfileModal,
  onResetSeed,
  isCloud,
  overdueCount,
}) => {
  const toast = useToast();
  const [isResetting, setIsResetting] = React.useState(false);

  const handleReset = async () => {
    if (!confirm('구글 스프레드시트 66개 공식 거점 및 실시간 배너 데이터로 초기화하시겠습니까?')) {
      return;
    }
    setIsResetting(true);
    try {
      await onResetSeed();
      toast.success('시트 데이터 동기화 완료', '66개 공식 거점 및 현황이 최신 상태로 재설정되었습니다.');
    } catch (e: any) {
      toast.error('동기화 실패', e?.message || '초기화 중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      {/* Top Notification Stripe in Admin Mode */}
      {isAdmin && (
        <div className="bg-purple-900 text-purple-100 text-[11px] px-4 py-1 text-center font-medium flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5 text-purple-300" />
          <span>
            <strong>[관리자 모드 활성화됨]</strong> 거점 마스터 등록/수정, 승인(HITL) 및 강제 철거 권한이 적용 중입니다.
          </span>
          <button
            onClick={onToggleAdmin}
            className="underline hover:text-white ml-2 font-bold cursor-pointer"
          >
            신청자 모드로 돌아가기
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all ${
              isAdmin
                ? 'bg-gradient-to-tr from-purple-700 to-indigo-800 shadow-purple-200'
                : 'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 shadow-indigo-200'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  Ad-Spot Manager
                </span>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  벨포레 홍보 거점 SSOT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                사내 배너 · 현수막 · 포맥스 · POP 자율 예약 및 게시 관리 시스템
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud or Local Status Pill */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isCloud
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isCloud ? 'Cloud Firestore 실시간 연동' : 'Local Mock SSOT'}</span>
            </div>

            {/* Overdue Urgent Badge */}
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                <span>미철거 {overdueCount}건</span>
              </div>
            )}

            {/* Employee ID / User Profile Button */}
            {userProfile && onOpenProfileModal && (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-all text-xs font-semibold shadow-xs cursor-pointer group"
                title="사번 로그인 및 프로필 변경"
              >
                <IdCard className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-bold text-indigo-900">사번: {userProfile.empId}</span>
                <span className="hidden md:inline text-indigo-600">({userProfile.name})</span>
              </button>
            )}

            {/* Department Selector for Testing */}
            {!isAdmin && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-300/80 rounded-xl px-2.5 py-1 shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] text-slate-400 font-medium">신청부서:</span>
                <select
                  value={activeDept}
                  onChange={(e) => onChangeDept(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  title="현재 신청 부서 변경 (테스트용)"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset to Seed Button */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="구글 시트 66개 거점 데이터로 복원"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">시트 데이터 동기화</span>
            </button>

            {/* Highly Intuitive Mode Switch Toggle: User vs Admin */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300/80 shadow-xs">
              <button
                type="button"
                onClick={() => isAdmin && onToggleAdmin()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isAdmin
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>신청자 화면</span>
              </button>
              <button
                type="button"
                onClick={() => !isAdmin && onToggleAdmin()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isAdmin
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-500 hover:text-purple-700'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>관리자 모드</span>
                {isAdmin ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                ) : (
                  <span className="text-[10px] text-purple-600 font-normal">통제</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
