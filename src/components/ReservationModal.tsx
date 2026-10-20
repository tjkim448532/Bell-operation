'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Building,
  User,
  Info,
  Layers,
  Zap,
  IdCard,
} from 'lucide-react';
import { AdSpot, AdReservation, ReservationStatus, UserProfile } from '@/types/adSpot';
import { adSpotService } from '@/lib/firebase';
import { formatDimensions, calculateDurationDays, compressAndResizeImage, formatBytes, CompressionResult } from '@/lib/utils';
import { useToast } from './Toast';
import { DEPARTMENTS } from './Header';

interface ReservationModalProps {
  spot: AdSpot | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDept?: string;
  userProfile?: UserProfile;
  existingReservations: AdReservation[];
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  spot,
  isOpen,
  onClose,
  onSuccess,
  defaultDept = '경영지원팀',
  userProfile,
  existingReservations,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [requesterEmpId, setRequesterEmpId] = useState(userProfile?.empId || '20240101');
  const [requesterName, setRequesterName] = useState(userProfile?.name || '김철수');
  const [requesterDept, setRequesterDept] = useState(userProfile?.dept || defaultDept);
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');

  // Default dates: tomorrow to +7 days
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [startDate, setStartDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(nextWeek.toISOString().split('T')[0]);

  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftPreview, setDraftPreview] = useState<string | null>(null);
  const [draftCompression, setDraftCompression] = useState<CompressionResult | null>(null);
  const [isCompressingDraft, setIsCompressingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Sync profile when opened or changed
  useEffect(() => {
    if (userProfile) {
      if (userProfile.empId) setRequesterEmpId(userProfile.empId);
      if (userProfile.name) setRequesterName(userProfile.name);
      if (userProfile.dept) setRequesterDept(userProfile.dept);
    } else if (defaultDept) {
      setRequesterDept(defaultDept);
    }
  }, [userProfile, defaultDept]);

  // Check overlap on input change
  useEffect(() => {
    if (!spot || !startDate || !endDate) {
      setConflictWarning(null);
      return;
    }

    if (startDate > endDate) {
      setConflictWarning('시작일은 종료일보다 이전이어야 합니다.');
      return;
    }

    const blockingStatuses: ReservationStatus[] = ['PENDING', 'APPROVED', 'INSTALLED', 'EXPIRED_OVERDUE'];
    const spotRes = existingReservations.filter((r) => r.spotId === spot.spotId);

    const conflict = spotRes.find((res) => {
      if (!blockingStatuses.includes(res.status)) return false;
      return res.startDate <= endDate && res.endDate >= startDate;
    });

    if (conflict) {
      setConflictWarning(
        `[중복 점유 감지] ${conflict.requesterDept} ${conflict.requesterName}님의 "${conflict.title}" 일정(${conflict.startDate} ~ ${conflict.endDate})과 겹칩니다.`
      );
    } else {
      setConflictWarning(null);
    }
  }, [spot, startDate, endDate, existingReservations]);

  if (!isOpen || !spot) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('파일 크기 초과', '시안 이미지 파일은 25MB 이하만 첨부 가능합니다.');
      return;
    }

    setIsCompressingDraft(true);
    try {
      const result = await compressAndResizeImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
      });
      setDraftCompression(result);
      setDraftFile(result.file);
      setDraftPreview(result.dataUrl);

      if (result.ratioPercent > 0) {
        toast.info(
          '시안 해상도 최적화 완료',
          `클라우드 비용 절감: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.compressedSize)} (${result.ratioPercent}% 절감)`
        );
      }
    } catch (err: any) {
      console.warn('Draft image compression failed, using original:', err);
      setDraftFile(file);
      const objectUrl = URL.createObjectURL(file);
      setDraftPreview(objectUrl);
      setDraftCompression(null);
    } finally {
      setIsCompressingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requesterEmpId.trim()) {
      toast.warning('사번 누락', '신청자의 사번(Employee ID)을 입력해 주십시오.');
      return;
    }

    if (!title.trim() || !purpose.trim()) {
      toast.warning('필수 입력 누락', '홍보 건명과 목적을 모두 입력해 주십시오.');
      return;
    }

    if (!startDate || !endDate) {
      toast.warning('기간 미지정', '게시 시작일과 종료일을 지정해 주십시오.');
      return;
    }

    if (startDate > endDate) {
      toast.error('일정 오류', '게시 시작일은 종료일보다 이전이어야 합니다.');
      return;
    }

    // Fail-Fast: Overlap check
    if (conflictWarning) {
      toast.error('신청 불가: 일정 중복', conflictWarning);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload draft image (Firebase Storage or Base64 dataURL fallback)
      let draftImageUrl = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80';
      if (draftFile) {
        draftImageUrl = await adSpotService.uploadImage(draftFile, 'draft_designs');
      }

      // 2. Submit reservation through service layer with requesterEmpId
      await adSpotService.createReservation({
        spotId: spot.spotId,
        zoneName: spot.zoneName,
        spotName: spot.spotName,
        mediaType: spot.mediaType,
        specSummary: formatDimensions(spot.specWidthMm, spot.specHeightMm),
        requesterEmpId: requesterEmpId.trim(),
        requesterName: requesterName.trim(),
        requesterDept,
        title: title.trim(),
        purpose: purpose.trim(),
        startDate,
        endDate,
        draftImageUrl,
      });

      toast.success(
        '예약 신청 접수 완료!',
        `[사번: ${requesterEmpId.trim()}] "${title}" 건이 관리자 승인 대기열(PENDING)에 등록되었습니다.`
      );

      // Reset form
      setTitle('');
      setPurpose('');
      setDraftFile(null);
      setDraftPreview(null);
      setDraftCompression(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('신청 실패', err?.message || '예약 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const durationDays = calculateDurationDays(startDate, endDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">홍보 거점 예약 신청</h3>
              <p className="text-xs text-slate-500">
                일정 중복 원천 차단 및 관리자 시안 검토(HITL) 프로세스
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Selected Spot Info Card */}
          <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200 flex items-center justify-center p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={spot.spotImageUrl}
                alt={spot.spotName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {spot.zoneName} · {spot.spotName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                  {spot.mediaType}
                </span>
              </div>
              <div className="text-slate-600 flex items-center gap-2 font-mono tabular-nums text-xs">
                <span>규격: <strong>{formatDimensions(spot.specWidthMm, spot.specHeightMm)}</strong></span>
              </div>
              <p className="text-[11px] text-slate-500 truncate" title={spot.finishingGuide}>
                마감: {spot.finishingGuide}
              </p>
            </div>
          </div>

          {/* Requester Identity Grid: EmpId + Name + Department */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>신청자 식별 정보 (사번 기반 자동 연동)</span>
              </span>
              <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                사번별 신청 이력 SSOT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Employee ID */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
                  사번 (Employee ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={requesterEmpId}
                  onChange={(e) => setRequesterEmpId(e.target.value)}
                  placeholder="예: 20240101"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              {/* Name */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-[11px] flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>신청자 성명</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="예: 김철수"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              {/* Department */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-[11px] flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span>소속 부서</span>
                </label>
                <select
                  value={requesterDept}
                  onChange={(e) => setRequesterDept(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                  required
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              홍보 건명 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 하반기 안전보건 정기교육 안내"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              required
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              홍보 내용 및 목적 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="예: 법정의무교육 전사 이수 독려 및 QR코드 링크 안내"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
              required
            />
          </div>

          {/* Date Picker Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>게시 기간 설정 (시작일 ~ 종료일)</span>
              </label>
              {durationDays > 0 && (
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 tabular-nums">
                  총 {durationDays}일간 점유
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">시작일</span>
                <input
                  type="date"
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">종료일</span>
                <input
                  type="date"
                  min={startDate || todayStr}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Conflict Warning Alert Box (Fail-Fast Rule) */}
            {conflictWarning ? (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2 text-rose-800 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="text-xs leading-relaxed font-medium">
                  {conflictWarning}
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>선택하신 기간에 중복 예약이 없습니다. 신청 가능합니다.</span>
              </div>
            )}
          </div>

          {/* Design Draft Upload */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5 flex items-center justify-between">
              <span>디자인 시안 이미지 첨부</span>
              <span className="text-[11px] text-slate-400">
                권장 규격: {formatDimensions(spot.specWidthMm, spot.specHeightMm)}
              </span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {isCompressingDraft ? (
              <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 text-center flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-slate-700">
                  시안 이미지 해상도 자동 최적화 및 용량 압축 중...
                </span>
              </div>
            ) : draftPreview ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-900 p-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draftPreview}
                      alt="시안 미리보기"
                      className="w-14 h-14 object-contain rounded-lg border border-slate-700 bg-slate-900 p-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">시안 파일 첨부됨</p>
                      <p className="text-[11px] text-slate-400">{draftFile?.name || '기본 시안 이미지'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftFile(null);
                      setDraftPreview(null);
                      setDraftCompression(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Draft Compression Cost-Saving Badge */}
                {draftCompression && (
                  <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px] text-emerald-900">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500" />
                      <span className="font-semibold">
                        해상도 자동 최적화 ({draftCompression.width}×{draftCompression.height}px)
                      </span>
                    </div>
                    <div className="font-mono tabular-nums">
                      <span className="text-slate-400 line-through mr-1 text-[10px]">
                        {formatBytes(draftCompression.originalSize)}
                      </span>
                      <strong className="text-emerald-700 font-bold">
                        {formatBytes(draftCompression.compressedSize)}
                      </strong>
                      <span className="ml-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1 py-0.2 rounded">
                        -{draftCompression.ratioPercent}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-xl p-4 text-center cursor-pointer transition-colors flex items-center justify-center gap-3"
              >
                <Upload className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-medium text-slate-700">
                  클릭하여 디자인 시안 파일 첨부 (JPG, PNG, WebP)
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(conflictWarning)}
              className="px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
            >
              {isSubmitting ? '신청 접수 중...' : '예약 신청 제출 (대기열 등록)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
