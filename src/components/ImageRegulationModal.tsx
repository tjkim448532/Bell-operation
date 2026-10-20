'use client';

import React from 'react';
import {
  BookOpen,
  X,
  Camera,
  FolderTree,
  Maximize2,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  Ruler,
  HardDrive,
  Info,
} from 'lucide-react';

interface ImageRegulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageRegulationModal: React.FC<ImageRegulationModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Camera className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">
                벨포레 홍보물 이미지 운영 및 관리 표준 규정 (SOP)
              </h3>
              <p className="text-xs text-indigo-200">
                거점 사진 영구 아카이빙, 촬영 기준, 클라우드 저장 경로 및 최적화 표준
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs leading-relaxed text-slate-700">
          {/* Article 1: 듀얼 촬영 앵글 원칙 (정면 + 원경) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-mono">1</span>
              <h4>현장 사진 2대 앵글 촬영 기준 (Dual-View Principle)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>① 현장 사진 (정면 컷 / Front View)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  - <strong>촬영 거리:</strong> 2m ~ 3m 정면 수평 유지<br />
                  - <strong>촬영 목적:</strong> 홍보물 시안(문구, 디자인, QR코드)의 가독성 및 훼손 여부 정밀 확인<br />
                  - <strong>주의 사항:</strong> 광각 왜곡 배제, 상하좌우 여백을 최소화하여 프레임에 90% 이상 채움
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-purple-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>② 현장 사진 (원경·원면 컷 / Wide Context View)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  - <strong>촬영 거리:</strong> 7m ~ 15m 원거리 조망<br />
                  - <strong>촬영 목적:</strong> 주변 보행 동선, 랜드마크 건물(매표소, 웰컴센터 등)과의 위치 관계 식별<br />
                  - <strong>주의 사항:</strong> 유동인구 시선 방향에서 실제 고객이 바라보는 각도로 주변 맥락 포함
                </p>
              </div>
            </div>
          </section>

          {/* Article 2: 매체별 표준 규격 및 종횡비 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-mono">2</span>
              <h4>매체별 표준 제작 규격 및 종횡비 (Aspect Ratios)</h4>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5 pl-3">매체 구분</th>
                    <th className="p-2.5">표준 규격 (mm)</th>
                    <th className="p-2.5">종횡비</th>
                    <th className="p-2.5">대표 설치 장소</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] tabular-nums">
                  <tr>
                    <td className="p-2.5 pl-3 font-sans font-semibold text-indigo-700">스탠드 배너</td>
                    <td className="p-2.5">600 × 1,800 / 500 × 1,500</td>
                    <td className="p-2.5">1 : 3</td>
                    <td className="p-2.5 font-sans">투썸 정류장, 모토아레나, 웰컴센터, 목장</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-3 font-sans font-semibold text-purple-700">대형 현수막</td>
                    <td className="p-2.5">5,600 × 1,300 / 8,000 × 1,500</td>
                    <td className="p-2.5">4.3 : 1 / 5.3 : 1</td>
                    <td className="p-2.5 font-sans">정문 로터리, 웰컴센터 옆 대형 게시대</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-3 font-sans font-semibold text-emerald-700">포맥스 / POP</td>
                    <td className="p-2.5">2,300 × 600 / 297 × 420(A3)</td>
                    <td className="p-2.5">3.8 : 1 / 1 : 1.41</td>
                    <td className="p-2.5 font-sans">남도예담·투썸 정류장 쉘터, 콘도 로비</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-3 font-sans font-semibold text-cyan-700">디지털 모니터</td>
                    <td className="p-2.5">1,920 × 1,080 (FHD) / 1,920 × 744</td>
                    <td className="p-2.5">16 : 9 / 2.58 : 1</td>
                    <td className="p-2.5 font-sans">미디어아트센터 모니터, 공식 웹 메인배너</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Article 3: 클라우드 스토리지 파일명 명명 규칙 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-mono">3</span>
              <h4>클라우드 스토리지 명명 규칙 (SSOT Naming Convention)</h4>
            </div>
            <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <FolderTree className="w-4 h-4" />
                <span>Firebase Cloud Storage Directory Hierarchy</span>
              </div>
              <div className="space-y-1.5 pl-2 text-slate-300">
                <p>📂 <strong>/ad_spots/masters/</strong><span className="text-slate-400">{"{spotId}"}</span>/front_<span className="text-amber-300">YYYYMMDD</span>.webp <span className="text-slate-500">(거점 정면 사진)</span></p>
                <p>📂 <strong>/ad_spots/masters/</strong><span className="text-slate-400">{"{spotId}"}</span>/wide_<span className="text-amber-300">YYYYMMDD</span>.webp <span className="text-slate-500">(거점 원경 사진)</span></p>
                <p>📂 <strong>/ad_reservations/drafts/</strong><span className="text-slate-400">{"{reservationId}"}</span>/draft.webp <span className="text-slate-500">(신청 디자인 시안)</span></p>
                <p>📂 <strong>/ad_verifications/</strong><span className="text-slate-400">{"{reservationId}"}</span>/installed_<span className="text-amber-300">YYYYMMDD_HHmm</span>.webp <span className="text-slate-500">(현장 인증샷)</span></p>
              </div>
            </div>
          </section>

          {/* Article 4: 용량 및 압축 가이드 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-mono">4</span>
              <h4>용량 최적화 및 업로드 제한 (Compression Policy)</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block">권장 포맷</strong>
                <p className="text-[11px]">차세대 고압축 <strong>WebP</strong> (용량 70% 절감) 또는 고화질 JPEG/PNG</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block">최대 파일 용량</strong>
                <p className="text-[11px]">개별 파일당 <strong>최대 10MB 이하</strong> (모바일 앱 내 자동 압축 적용)</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block">해상도 최적화</strong>
                <p className="text-[11px]">장축 기준 <strong>1920px ~ 2560px</strong> 수준 권장 (DPI 150~300)</p>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
