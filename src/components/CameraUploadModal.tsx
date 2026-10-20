'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { AdReservation } from '@/types/adSpot';
import { adSpotService } from '@/lib/firebase';
import { useToast } from './Toast';

interface CameraUploadModalProps {
  reservation: AdReservation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CameraUploadModal: React.FC<CameraUploadModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen || !reservation) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기 초과', '사진 용량은 10MB 이하만 등록 가능합니다.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl && !previewUrl.startsWith('data:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.warning('사진 등록 필요', '현장에 설치된 실제 홍보물 사진을 촬영하거나 첨부해 주십시오.');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload photo to Firebase Storage or Base64 DataURL
      const uploadedUrl = await adSpotService.uploadImage(selectedFile, 'installed_verifications');

      // 2. Update status to INSTALLED
      await adSpotService.updateReservationStatus(reservation.reservationId, 'INSTALLED', {
        installedImageUrl: uploadedUrl,
      });

      toast.success(
        '현장 게시 인증 완료!',
        `"${reservation.title}" 건의 상태가 '게시중(INSTALLED)'으로 변경되었습니다.`
      );
      handleClear();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('업로드 실패', err?.message || '사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">현장 게시 인증 사진 등록</h3>
              <p className="text-xs text-slate-500">실물 설치 완료 후 현장 인증 사진을 촬영/등록합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Reservation Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">{reservation.zoneName} · {reservation.spotName}</span>
              <span className="font-mono text-slate-500 tabular-nums">{reservation.specSummary}</span>
            </div>
            <div className="font-medium text-slate-900 text-sm">{reservation.title}</div>
            <div className="text-slate-500 flex justify-between">
              <span>신청자: {reservation.requesterDept} {reservation.requesterName}</span>
              <span className="tabular-nums">게시 기간: {reservation.startDate} ~ {reservation.endDate}</span>
            </div>
          </div>

          {/* Photo Capture/Upload Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment" // Forces smartphone rear camera directly!
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-950 aspect-[4/3] flex items-center justify-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="현장 인증 사진 미리보기"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-black/70 hover:bg-black text-white p-2 rounded-lg text-xs flex items-center gap-1 backdrop-blur"
                >
                  <X className="w-4 h-4" />
                  <span>다시 촬영</span>
                </button>
              </div>
              <div className="absolute bottom-2 left-2 bg-emerald-950/80 text-emerald-300 text-[11px] px-2.5 py-1 rounded-md backdrop-blur border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>촬영 완료 (확인 후 게시 처리)</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 rounded-xl p-8 text-center cursor-pointer transition-colors group flex flex-col items-center justify-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  스마트폰 카메라 촬영 또는 사진 업로드
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  모바일에서는 후면 카메라가 즉시 실행되며, 데스크탑에서는 파일 선택창이 열립니다.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <Upload className="w-3.5 h-3.5" />
                <span>터치하여 카메라 열기</span>
              </div>
            </div>
          )}

          {/* Guidelines */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              <strong>촬영 유의사항:</strong> 거점 위치 식별이 가능하도록 현수막/배너 전체가 나오는 정면 구도로 명확히 촬영해 주세요. 등록 즉시 전사 현황판의 상태가 <strong>[게시중]</strong>으로 전환됩니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>업로드 중...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>현장 게시 완료 확정</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
