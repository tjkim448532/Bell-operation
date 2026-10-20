'use client';

import React, { useState } from 'react';
import { User, Building, IdCard, X, Check, Sparkles } from 'lucide-react';
import { UserProfile } from '@/types/adSpot';
import { DEPARTMENTS } from './Header';
import { useToast } from './Toast';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

// Sample presets for quick switching / demo
const PRESET_PROFILES: UserProfile[] = [
  { empId: '20240101', name: '김철수', dept: '경영지원팀' },
  { empId: '20230512', name: '이영희', dept: '홍보브랜드팀' },
  { empId: '20220930', name: '박민수', dept: '벨포레 운영팀' },
  { empId: '20210415', name: '정다은', dept: '고객경험혁신팀' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  const toast = useToast();
  const [empId, setEmpId] = useState(currentProfile.empId);
  const [name, setName] = useState(currentProfile.name);
  const [dept, setDept] = useState(currentProfile.dept);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim()) {
      toast.warning('사번 필수 입력', '사번(Employee ID)을 입력해 주십시오.');
      return;
    }
    if (!name.trim()) {
      toast.warning('이름 필수 입력', '성명을 입력해 주십시오.');
      return;
    }

    const newProfile: UserProfile = {
      empId: empId.trim(),
      name: name.trim(),
      dept,
    };

    onSaveProfile(newProfile);
    toast.success('사번 로그인 완료', `[사번: ${newProfile.empId}] ${newProfile.dept} ${newProfile.name}님으로 식별되었습니다.`);
    onClose();
  };

  const handleApplyPreset = (preset: UserProfile) => {
    setEmpId(preset.empId);
    setName(preset.name);
    setDept(preset.dept);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">사번 로그인 / 사용자 프로필</h3>
              <p className="text-xs text-slate-500">사번별 신청 및 게시 내역을 분리 관리합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {/* Preset Buttons for Quick Demo */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>빠른 사번 프리셋 선택</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_PROFILES.map((p) => (
                <button
                  key={p.empId}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2 rounded-lg border text-left transition-all text-[11px] cursor-pointer ${
                    empId === p.empId
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-mono text-[10px] text-slate-500">사번 {p.empId}</div>
                  <div className="truncate font-semibold">{p.dept} · {p.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Employee ID */}
          <div>
            <label className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
              <IdCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>사번 (Employee ID) <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="예: 20240101"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              신청 건마다 이 사번이 영구 기록되며 본인 신청 내역만 모아볼 수 있습니다.
            </p>
          </div>

          {/* Requester Name */}
          <div>
            <label className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>성명 <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김철수"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              required
            />
          </div>

          {/* Department */}
          <div>
            <label className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              <span>소속 부서</span>
            </label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
              required
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>사번 로그인 완료</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
