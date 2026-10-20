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
} from 'lucide-react';
import { useToast } from './Toast';

interface HeaderProps {
  isAdmin: boolean;
  onToggleAdmin: () => void;
  activeDept: string;
  onChangeDept: (dept: string) => void;
  onResetSeed: () => Promise<void>;
  isCloud: boolean;
  overdueCount: number;
}

export const DEPARTMENTS = [
  '경영지원팀',
  '인사총무팀',
  'DX혁신추진팀',
  '홍보브랜드팀',
  '복리후생팀',
  '노사상생협의회',
  'ESG경영팀',
];

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onToggleAdmin,
  activeDept,
  onChangeDept,
  onResetSeed,
  isCloud,
  overdueCount,
}) => {
  const toast = useToast();
  const [isResetting, setIsResetting] = React.useState(false);

  const handleReset = async () => {
    if (!confirm('초기 데모 시드 데이터(거점 8곳, 예약 6건)로 복원하시겠습니까? 현재 로컬 변경사항이 초기화됩니다.')) {
      return;
    }
    setIsResetting(true);
    try {
      await onResetSeed();
      toast.success('초기 데이터 복원 완료', '모든 거점 및 예약 이력이 시드 데이터로 재설정되었습니다.');
    } catch (e: any) {
      toast.error('복원 실패', e?.message || '시드 데이터 복원 중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  Ad-Spot Manager
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  사내 홍보 거점 SSOT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                배너 · 현수막 · 포스터 자율 예약 및 게시 관리 시스템
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud or Local Status Pill */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isCloud
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={
                isCloud
                  ? 'Firebase Firestore & Cloud Storage 실시간 연동 중'
                  : 'Zero-Config 로컬 스토리지 모드 활성화됨 (환경변수 없이 즉시 동작)'
              }
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isCloud ? 'Firebase Cloud' : 'Local Mock SSOT'}</span>
            </div>

            {/* Overdue Alert Badge if > 0 */}
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                <span>미철거 {overdueCount}건</span>
              </div>
            )}

            {/* Department Selector for Testing */}
            {!isAdmin && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={activeDept}
                  onChange={(e) => onChangeDept(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
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
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center gap-1.5 transition-colors"
              title="초기 시드 데이터로 리셋"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">초기 데이터 복원</span>
            </button>

            {/* Mode Switch Toggle: User vs Admin */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => isAdmin && onToggleAdmin()}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  !isAdmin
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>신청자</span>
              </button>
              <button
                type="button"
                onClick={() => !isAdmin && onToggleAdmin()}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isAdmin
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>관리자</span>
                {isAdmin && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
