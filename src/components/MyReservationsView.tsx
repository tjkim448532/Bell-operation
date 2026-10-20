'use client';

import React, { useState } from 'react';
import {
  Clock,
  Camera,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  FileQuestion,
  Search,
  Filter,
  Eye,
  Check,
  Building,
  User,
  Calendar,
  Layers,
  ArrowUpRight,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { AdReservation, ReservationStatus, STATUS_META } from '@/types/adSpot';
import { adSpotService } from '@/lib/firebase';
import { useToast } from './Toast';

interface MyReservationsViewProps {
  reservations: AdReservation[];
  activeDept: string;
  onRefresh: () => void;
  onOpenUploadCamera: (res: AdReservation) => void;
  onOpenRejectReason: (res: AdReservation) => void;
  onPreviewImage: (url: string, title: string, subtitle?: string) => void;
}

export const MyReservationsView: React.FC<MyReservationsViewProps> = ({
  reservations,
  activeDept,
  onRefresh,
  onOpenUploadCamera,
  onOpenRejectReason,
  onPreviewImage,
}) => {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [filterOnlyMyDept, setFilterOnlyMyDept] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Handle Removal Completion
  const handleCompleteRemoval = async (res: AdReservation) => {
    if (
      !confirm(
        `"${res.title}" 홍보물의 현장 철거를 완료하셨습니까?\n확인 시 거점 점유가 즉시 종료되고 '철거완료(REMOVED)' 처리됩니다.`
      )
    ) {
      return;
    }

    setProcessingId(res.reservationId);
    try {
      await adSpotService.updateReservationStatus(res.reservationId, 'REMOVED');
      toast.success('철거 완료 처리', `"${res.title}" 거점 점유가 공식 해제되었습니다.`);
      onRefresh();
    } catch (err: any) {
      toast.error('철거 처리 실패', err?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter reservations
  const filtered = reservations.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (filterOnlyMyDept && r.requesterDept !== activeDept) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDept = r.requesterDept.toLowerCase().includes(q);
      const matchName = r.requesterName.toLowerCase().includes(q);
      const matchSpot = r.spotName.toLowerCase().includes(q);
      const matchZone = r.zoneName.toLowerCase().includes(q);
      if (!matchTitle && !matchDept && !matchName && !matchSpot && !matchZone) return false;
    }
    return true;
  });

  // KPI Stats Counts
  const totalCount = reservations.length;
  const pendingCount = reservations.filter((r) => r.status === 'PENDING').length;
  const approvedCount = reservations.filter((r) => r.status === 'APPROVED').length;
  const installedCount = reservations.filter((r) => r.status === 'INSTALLED').length;
  const overdueCount = reservations.filter((r) => r.status === 'EXPIRED_OVERDUE').length;

  return (
    <div className="space-y-6">
      {/* 1. INTUITIVE KPI SUMMARY FILTER BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className={`text-xs font-bold ${statusFilter === 'ALL' ? 'text-indigo-100' : 'text-slate-500'}`}>
            전체 예약 신청
          </p>
          <p className="text-2xl font-black font-mono tabular-nums mt-1">{totalCount}건</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-100'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className={`text-xs font-bold ${statusFilter === 'PENDING' ? 'text-amber-100' : 'text-slate-500'}`}>
            승인 대기중
          </p>
          <p className="text-2xl font-black font-mono tabular-nums mt-1 text-amber-600">
            {pendingCount}건
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className={`text-xs font-bold ${statusFilter === 'APPROVED' ? 'text-blue-100' : 'text-slate-500'}`}>
            설치 인증 대기
          </p>
          <p className="text-2xl font-black font-mono tabular-nums mt-1 text-blue-600">
            {approvedCount}건
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('INSTALLED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'INSTALLED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className={`text-xs font-bold ${statusFilter === 'INSTALLED' ? 'text-emerald-100' : 'text-slate-500'}`}>
            현장 게시중
          </p>
          <p className="text-2xl font-black font-mono tabular-nums mt-1 text-emerald-600">
            {installedCount}건
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('EXPIRED_OVERDUE')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'EXPIRED_OVERDUE'
              ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-100'
              : overdueCount > 0
              ? 'bg-red-50 text-red-900 border-red-300 animate-pulse'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <p
            className={`text-xs font-bold ${
              statusFilter === 'EXPIRED_OVERDUE' ? 'text-red-100' : 'text-red-600'
            }`}
          >
            미철거 초과 주의
          </p>
          <p className="text-2xl font-black font-mono tabular-nums mt-1 text-red-600">
            {overdueCount}건
          </p>
        </button>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter Toggle */}
          <button
            onClick={() => setFilterOnlyMyDept(!filterOnlyMyDept)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              filterOnlyMyDept
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            <span>내 부서({activeDept}) 신청 건만 보기</span>
          </button>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReservationStatus | 'ALL')}
            className="p-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">전체 상태 보기</option>
            <option value="PENDING">승인대기 (PENDING)</option>
            <option value="APPROVED">승인완료/설치대기 (APPROVED)</option>
            <option value="INSTALLED">현장게시중 (INSTALLED)</option>
            <option value="EXPIRED_OVERDUE">기간만료/미철거 (EXPIRED_OVERDUE)</option>
            <option value="REMOVED">철거완료 (REMOVED)</option>
            <option value="REJECTED">반려됨 (REJECTED)</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="홍보 건명, 부서, 신청자명, 거점 검색..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 3. RESERVATION CARDS WITH VISUAL PROGRESS STEP BAR */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-extrabold text-slate-900 text-base">해당 조건의 신청 내역이 없습니다.</h4>
          <p className="text-xs text-slate-500 mt-1">필터 조건을 재설정하거나 신규 예약을 진행해 주세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((res) => {
            const meta = STATUS_META[res.status];
            const isProcessing = processingId === res.reservationId;

            // Compute Step for Visual Progress Bar
            // 1: PENDING, 2: APPROVED, 3: INSTALLED, 4: REMOVED (REJECTED is separate)
            let step = 1;
            if (res.status === 'APPROVED') step = 2;
            else if (res.status === 'INSTALLED' || res.status === 'EXPIRED_OVERDUE') step = 3;
            else if (res.status === 'REMOVED') step = 4;

            return (
              <div
                key={res.reservationId}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs space-y-4 ${
                  res.status === 'EXPIRED_OVERDUE'
                    ? 'border-red-300 bg-red-50/20 ring-1 ring-red-200'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Visual Step Tracker (생애주기 4단계 진행 바) */}
                {res.status !== 'REJECTED' ? (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className={`flex flex-col items-center gap-1 ${step >= 1 ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          ✓
                        </div>
                        <span className="text-[11px]">1. 신청접수</span>
                      </div>

                      <div className={`flex flex-col items-center gap-1 ${step >= 2 ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {step >= 2 ? '✓' : '2'}
                        </div>
                        <span className="text-[11px]">2. 관리자승인</span>
                      </div>

                      <div className={`flex flex-col items-center gap-1 ${step >= 3 ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {step >= 3 ? '✓' : '3'}
                        </div>
                        <span className="text-[11px]">3. 현장게시인증</span>
                      </div>

                      <div className={`flex flex-col items-center gap-1 ${step >= 4 ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step >= 4 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {step >= 4 ? '✓' : '4'}
                        </div>
                        <span className="text-[11px]">4. 철거완료</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>관리자에 의해 반려된 예약 건입니다. 사유를 확인한 후 다시 신청해 주십시오.</span>
                  </div>
                )}

                {/* Top Row: Spot & Status & Dates */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-bold border ${meta.bg} ${meta.text} ${meta.border}`}
                    >
                      {meta.label}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {res.zoneName} · {res.spotName}
                    </span>
                    <span className="text-slate-400 text-xs">|</span>
                    <span className="text-xs font-mono text-slate-600 font-bold tabular-nums">{res.specSummary}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-700 tabular-nums">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>게시 기간: <strong className="font-bold text-slate-900">{res.startDate} ~ {res.endDate}</strong></span>
                  </div>
                </div>

                {/* Middle Row: Content & Visual Preview */}
                <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <h3 className="font-extrabold text-slate-900 text-base">{res.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{res.purpose}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>신청부서: <strong className="text-slate-800 font-bold">{res.requesterDept}</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>담당자: <strong className="text-slate-800 font-bold">{res.requesterName}</strong></span>
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono tabular-nums">
                        ID: {res.reservationId}
                      </span>
                    </div>

                    {/* Rejection Note Alert if rejected */}
                    {res.status === 'REJECTED' && res.rejectReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          관리자 반려 사유:
                        </span>
                        <p className="leading-relaxed pl-4 font-medium">{res.rejectReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Previews: Draft & Installed Proof (Full view auto-fit) */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Draft Preview */}
                    <div
                      onClick={() => onPreviewImage(res.draftImageUrl, res.title, '신청 디자인 시안')}
                      className="cursor-pointer group text-center space-y-1"
                    >
                      <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 group-hover:border-indigo-500 transition-colors relative shadow-xs flex items-center justify-center p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={res.draftImageUrl}
                          alt="디자인 시안"
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 block">시안 전체보기</span>
                    </div>

                    {/* Installed Photo Preview */}
                    {res.installedImageUrl && (
                      <div
                        onClick={() =>
                          onPreviewImage(res.installedImageUrl!, res.title, '현장 설치 인증 사진')
                        }
                        className="cursor-pointer group text-center space-y-1"
                      >
                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-950 border border-emerald-300 group-hover:border-emerald-600 transition-colors relative shadow-xs flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={res.installedImageUrl}
                            alt="현장 설치 인증 사진"
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 block">설치 인증 사진</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Actions based on State Machine */}
                <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    현재 안내: <span className="text-slate-800 font-semibold">{meta.desc}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* State: APPROVED -> Camera Upload Trigger */}
                    {res.status === 'APPROVED' && (
                      <button
                        onClick={() => onOpenUploadCamera(res)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-100 flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
                      >
                        <Camera className="w-4 h-4" />
                        <span>📷 현장 게시 인증 사진 등록 (촬영)</span>
                      </button>
                    )}

                    {/* State: INSTALLED -> Remove button */}
                    {res.status === 'INSTALLED' && (
                      <button
                        onClick={() => handleCompleteRemoval(res)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>🧹 현장 철거 완료 확정</span>
                      </button>
                    )}

                    {/* State: EXPIRED_OVERDUE -> Red Urgent Removal button */}
                    {res.status === 'EXPIRED_OVERDUE' && (
                      <button
                        onClick={() => handleCompleteRemoval(res)}
                        disabled={isProcessing}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-red-200 flex items-center gap-1.5 animate-bounce transition-all cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>🚨 기간 만료! 즉시 철거 완료 확정</span>
                      </button>
                    )}

                    {/* State: REJECTED -> View Reject Reason modal */}
                    {res.status === 'REJECTED' && (
                      <button
                        onClick={() => onOpenRejectReason(res)}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileQuestion className="w-3.5 h-3.5" />
                        <span>반려 사유 상세 확인</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
