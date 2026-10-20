'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Check, FileQuestion } from 'lucide-react';
import { AdReservation } from '@/types/adSpot';
import { adSpotService } from '@/lib/firebase';
import { useToast } from './Toast';

interface RejectReasonModalProps {
  reservation: AdReservation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  readOnly?: boolean;
}

export const RejectReasonModal: React.FC<RejectReasonModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onSuccess,
  readOnly = false,
}) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !reservation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.warning('반려 사유 입력', '신청자가 보완할 수 있도록 구체적인 반려 사유를 입력해 주십시오.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adSpotService.updateReservationStatus(reservation.reservationId, 'REJECTED', {
        rejectReason: reason.trim(),
      });
      toast.info('반려 처리 완료', `"${reservation.title}" 신청이 반려 처리되었습니다.`);
      setReason('');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('반려 처리 실패', err?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {readOnly ? '신청 반려 사유 안내' : '예약 신청 반려(HITL)'}
              </h3>
              <p className="text-xs text-slate-500">
                {readOnly
                  ? '관리자가 입력한 반려 사유를 확인합니다.'
                  : '부적격 사유를 입력하면 해당 일정의 점유가 즉시 해제됩니다.'}
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

        {/* Form or Info */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-medium text-slate-800 text-sm">{reservation.title}</div>
            <div className="text-slate-500">
              거점: {reservation.zoneName} · {reservation.spotName}
            </div>
            <div className="text-slate-500">
              신청: {reservation.requesterDept} {reservation.requesterName} (
              <span className="tabular-nums">{reservation.startDate} ~ {reservation.endDate}</span>)
            </div>
          </div>

          {readOnly ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">관리자 반려 사유</label>
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed min-h-[90px] whitespace-pre-wrap">
                {reservation.rejectReason || '상세 사유가 기재되지 않았습니다.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="reason" className="text-xs font-semibold text-slate-700 block">
                반려 사유 입력 <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="reason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 해당 기간 전사 타운홀 미팅 현수막 우선 배정 건으로 부득이 반려합니다. 익월 2주차로 재신청 바랍니다."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none"
                required
              />
              <p className="text-[11px] text-slate-400">
                * 반려 시 신청자에게 사유가 투명하게 공개되며 거점 점유는 즉시 해제됩니다.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              닫기
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-rose-200 flex items-center gap-1.5"
              >
                {isSubmitting ? '처리 중...' : '반려 확정'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
