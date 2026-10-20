'use client';

import React, { useState, useEffect } from 'react';
import { Layers, X, Check, Image as ImageIcon, Sliders } from 'lucide-react';
import { AdSpot, MediaType } from '@/types/adSpot';
import { adSpotService } from '@/lib/firebase';
import { useToast } from './Toast';

interface AdminSpotModalProps {
  spotToEdit: AdSpot | null; // null for creating new
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminSpotModal: React.FC<AdminSpotModalProps> = ({
  spotToEdit,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [spotId, setSpotId] = useState('');
  const [zoneName, setZoneName] = useState('본관 실내');
  const [spotName, setSpotName] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('BANNER');
  const [specWidthMm, setSpecWidthMm] = useState<number>(600);
  const [specHeightMm, setSpecHeightMm] = useState<number>(1800);
  const [finishingGuide, setFinishingGuide] = useState('');
  const [description, setDescription] = useState('');
  const [trafficLevel, setTrafficLevel] = useState<'상' | '중' | '하'>('중');
  const [spotImageUrl, setSpotImageUrl] = useState('');
  const [rearImageUrl, setRearImageUrl] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (spotToEdit) {
      setSpotId(spotToEdit.spotId);
      setZoneName(spotToEdit.zoneName);
      setSpotName(spotToEdit.spotName);
      setMediaType(spotToEdit.mediaType);
      setSpecWidthMm(spotToEdit.specWidthMm);
      setSpecHeightMm(spotToEdit.specHeightMm);
      setFinishingGuide(spotToEdit.finishingGuide);
      setDescription(spotToEdit.description || '');
      setTrafficLevel(spotToEdit.trafficLevel || '중');
      setSpotImageUrl(spotToEdit.spotImageUrl);
      setRearImageUrl(spotToEdit.rearImageUrl || '');
      setIsActive(spotToEdit.isActive);
    } else {
      setSpotId(`SPOT-${Date.now().toString().slice(-4)}`);
      setZoneName('웰컴센터');
      setSpotName('');
      setMediaType('BANNER');
      setSpecWidthMm(600);
      setSpecHeightMm(1800);
      setFinishingGuide('단면 출력, 물통형 PET 배너 거치대 마감');
      setDescription('');
      setTrafficLevel('중');
      setSpotImageUrl('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80');
      setRearImageUrl('');
      setIsActive(true);
    }
  }, [spotToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spotId.trim() || !zoneName.trim() || !spotName.trim()) {
      toast.warning('필수 입력 누락', '거점 코드, 구역명, 상세 위치명을 입력해 주십시오.');
      return;
    }

    if (specWidthMm <= 0 || specHeightMm <= 0) {
      toast.warning('치수 오류', '가로/세로 규격(mm)은 0보다 큰 숫자여야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const spotData: AdSpot = {
        spotId: spotId.trim(),
        zoneName: zoneName.trim(),
        spotName: spotName.trim(),
        mediaType,
        specWidthMm: Number(specWidthMm),
        specHeightMm: Number(specHeightMm),
        finishingGuide: finishingGuide.trim() || '표준 마감 규격 준수',
        description: description.trim() || undefined,
        trafficLevel,
        spotImageUrl: spotImageUrl.trim() || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        rearImageUrl: rearImageUrl.trim() || undefined,
        isActive,
      };

      await adSpotService.saveSpot(spotData);

      toast.success(
        spotToEdit ? '거점 마스터 수정 완료' : '신규 홍보 거점 등록 완료',
        `"${spotData.zoneName} - ${spotData.spotName}" 정보가 반영되었습니다.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('저장 실패', err?.message || '거점 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {spotToEdit ? '홍보 거점 마스터 정보 수정' : '신규 홍보 거점 마스터 등록'}
              </h3>
              <p className="text-xs text-slate-500">
                치수(mm), 제작 마감 가이드 및 활성 상태를 관리합니다.
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                거점 고유 코드 (PK) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={spotId}
                onChange={(e) => setSpotId(e.target.value)}
                disabled={Boolean(spotToEdit)}
                placeholder="예: SPOT-LOBBY-03"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono disabled:opacity-60 outline-none"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                설치 구역 대분류 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="예: 본관 실내, 중앙 광장 등"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              상세 위치명 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
              placeholder="예: 로비 서측 엘리베이터 앞"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">매체 구분</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-purple-500"
              >
                <option value="BANNER">배너 (BANNER)</option>
                <option value="PLACARD">현수막 (PLACARD)</option>
                <option value="POSTER">포스터·POP (POSTER)</option>
                <option value="DIGITAL">디지털·웹 (DIGITAL)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                가로 너비 (mm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={specWidthMm}
                onChange={(e) => setSpecWidthMm(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono tabular-nums outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                세로 높이 (mm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={specHeightMm}
                onChange={(e) => setSpecHeightMm(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono tabular-nums outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              제작 / 마감 가이드 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={finishingGuide}
              onChange={(e) => setFinishingGuide(e.target.value)}
              placeholder="예: 단면 출력, 물통형 PET 배너 거치대 규격"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                장소 상세 설명 및 거점 특성
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 웰컴센터 안내데스크 정면으로 체크인 투숙객 100%가 경유하는 벨포레 핵심 거점입니다."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-purple-500 resize-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                통행량 / 유동인구
              </label>
              <select
                value={trafficLevel}
                onChange={(e) => setTrafficLevel(e.target.value as '상' | '중' | '하')}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-purple-500"
              >
                <option value="상">상 (최다 유동)</option>
                <option value="중">중 (일반 통행)</option>
                <option value="하">하 (특정 목적지)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">현장 사진 (정면 컷 URL)</label>
              <input
                type="url"
                value={spotImageUrl}
                onChange={(e) => setSpotImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">현장 사진 (원경·주변 컷 URL)</label>
              <input
                type="url"
                value={rearImageUrl}
                onChange={(e) => setRearImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="font-semibold text-slate-800 text-xs">거점 활성화 상태 (isActive)</p>
              <p className="text-[11px] text-slate-500">
                보수공사나 시설 파손 시 비활성화하면 예약 신청이 차단됩니다.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-purple-200 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '저장 중...' : '마스터 저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
