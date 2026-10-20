'use client';

import React, { useState } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Calendar,
  Layers,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Check,
  Building,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AdSpot, AdReservation, ReservationStatus, STATUS_META } from '@/types/adSpot';
import { adSpotService } from '@/lib/firebase';
import { formatDimensions } from '@/lib/utils';
import { useToast } from './Toast';

interface AdminManageViewProps {
  spots: AdSpot[];
  reservations: AdReservation[];
  onRefresh: () => void;
  onOpenSpotModal: (spot: AdSpot | null) => void;
  onOpenRejectModal: (res: AdReservation) => void;
  onPreviewImage: (url: string, title: string, subtitle?: string) => void;
}

export const AdminManageView: React.FC<AdminManageViewProps> = ({
  spots,
  reservations,
  onRefresh,
  onOpenSpotModal,
  onOpenRejectModal,
  onPreviewImage,
}) => {
  const toast = useToast();
  const [adminTab, setAdminTab] = useState<'PENDING' | 'TIMELINE' | 'SPOTS'>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Overdue reservations (either status EXPIRED_OVERDUE or installed with passed endDate)
  const overdueList = reservations.filter(
    (r) => r.status === 'EXPIRED_OVERDUE' || (r.status === 'INSTALLED' && r.endDate < todayStr)
  );

  // Pending queue
  const pendingList = reservations.filter((r) => r.status === 'PENDING');

  // Handle Approve
  const handleApprove = async (res: AdReservation) => {
    setProcessingId(res.reservationId);
    try {
      await adSpotService.updateReservationStatus(res.reservationId, 'APPROVED');
      toast.success(
        '신청 승인 완료 (HITL)',
        `"${res.title}" 건이 승인되었습니다. 이제 신청자가 현장 게시를 진행할 수 있습니다.`
      );
      onRefresh();
    } catch (err: any) {
      toast.error('승인 처리 실패', err?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Force Removal
  const handleForceRemoval = async (res: AdReservation) => {
    if (!confirm(`"${res.title}" 건을 관리자 권한으로 강제 철거 완료 처리하시겠습니까?`)) {
      return;
    }

    setProcessingId(res.reservationId);
    try {
      await adSpotService.updateReservationStatus(res.reservationId, 'REMOVED');
      toast.info('철거 완료 처리', `"${res.title}" 거점 점유가 해제되었습니다.`);
      onRefresh();
    } catch (err: any) {
      toast.error('처리 실패', err?.message || '오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  // Toggle Spot Active
  const handleToggleActive = async (spot: AdSpot) => {
    try {
      await adSpotService.toggleSpotActive(spot.spotId, !spot.isActive);
      toast.success(
        spot.isActive ? '거점 사용 중지' : '거점 정상 운영 전환',
        `"${spot.spotName}" 상태가 변경되었습니다.`
      );
      onRefresh();
    } catch (err: any) {
      toast.error('상태 변경 실패', err?.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. OVERDUE URGENT ALERT BANNER */}
      {overdueList.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-md shadow-red-100/50 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center animate-bounce">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-red-950 text-sm flex items-center gap-2">
                  <span>🚨 게시 기간 초과 홍보물 감지 (미철거 {overdueList.length}건)</span>
                  <span className="text-[11px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                    즉시 조치 요망
                  </span>
                </h4>
                <p className="text-xs text-red-700 mt-0.5">
                  게시 종료일({todayStr} 기준)이 경과했으나 현장 철거 인증이 완료되지 않은 홍보물입니다.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {overdueList.map((res) => (
              <div
                key={res.reservationId}
                className="bg-white p-3.5 rounded-xl border border-red-200 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs truncate">{res.title}</span>
                    <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-mono tabular-nums">
                      ~{res.endDate} 만료
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {res.zoneName} · {res.spotName} | 담당: {res.requesterDept} {res.requesterName}
                  </p>
                </div>
                <button
                  onClick={() => handleForceRemoval(res)}
                  disabled={processingId === res.reservationId}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-sm"
                >
                  철거 완료
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Navigation Sub-Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
        <button
          onClick={() => setAdminTab('PENDING')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminTab === 'PENDING'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>승인 대기열 (HITL)</span>
          {pendingList.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                adminTab === 'PENDING' ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
              }`}
            >
              {pendingList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('TIMELINE')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminTab === 'TIMELINE'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>전체 거점 타임라인 현황판</span>
        </button>

        <button
          onClick={() => setAdminTab('SPOTS')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminTab === 'SPOTS'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>거점 마스터 관리 ({spots.length})</span>
        </button>
      </div>

      {/* TAB 1: PENDING APPROVAL QUEUE */}
      {adminTab === 'PENDING' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              신규 예약 승인 대기열 (총 {pendingList.length}건)
            </h3>
            <span className="text-xs text-slate-500">
              * 시안 및 기간을 검토한 후 승인 또는 사유를 입력하여 반려하십시오.
            </span>
          </div>

          {pendingList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-base">승인 대기 중인 예약 건이 없습니다.</h4>
              <p className="text-xs text-slate-500 mt-1">모든 예약 신청이 검토 완료되었습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingList.map((res) => (
                <div
                  key={res.reservationId}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-purple-300 p-5 shadow-sm transition-all flex flex-col md:flex-row gap-5 items-start justify-between"
                >
                  {/* Left: Draft Image Preview (Large) */}
                  <div
                    onClick={() => onPreviewImage(res.draftImageUrl, res.title, '시안 크게보기')}
                    className="w-full md:w-48 aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden cursor-pointer relative group shrink-0 border border-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={res.draftImageUrl}
                      alt={res.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                      <Eye className="w-6 h-6 mb-1" />
                      <span className="text-xs font-semibold">시안 원본 확대</span>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur">
                      시안 이미지
                    </div>
                  </div>

                  {/* Middle: Content Info */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        승인 대기중
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {res.zoneName} · {res.spotName}
                      </span>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        ({res.specSummary})
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-lg leading-tight">{res.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {res.purpose}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px]">신청 부서 / 이름</span>
                        <strong className="text-slate-800">{res.requesterDept} {res.requesterName}</strong>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 col-span-2">
                        <span className="text-slate-400 block text-[10px]">요청 게시 기간</span>
                        <strong className="font-mono text-slate-900 tabular-nums text-xs">
                          {res.startDate} ~ {res.endDate}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Right: HITL Approval / Reject Action Buttons */}
                  <div className="flex md:flex-col gap-2 w-full md:w-36 shrink-0 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      onClick={() => handleApprove(res)}
                      disabled={processingId === res.reservationId}
                      className="flex-1 md:w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>{processingId === res.reservationId ? '처리중' : '승인 완료'}</span>
                    </button>

                    <button
                      onClick={() => onOpenRejectModal(res)}
                      disabled={processingId === res.reservationId}
                      className="flex-1 md:w-full py-2.5 px-4 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>반려 처리</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TIMELINE STATUS BOARD */}
      {adminTab === 'TIMELINE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">전체 거점 예약 및 점유 현황판</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                각 거점별 등록된 모든 예약 건의 일정과 상태를 종합 조망합니다.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3.5 pl-4">거점 / 위치</th>
                  <th className="p-3.5">규격</th>
                  <th className="p-3.5">현재 상태</th>
                  <th className="p-3.5">게시 건명</th>
                  <th className="p-3.5">신청 부서 / 담당자</th>
                  <th className="p-3.5 pr-4">점유 기간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spots.map((spot) => {
                  const spotResList = reservations
                    .filter((r) => r.spotId === spot.spotId && r.status !== 'REJECTED' && r.status !== 'REMOVED')
                    .sort((a, b) => a.startDate.localeCompare(b.startDate));

                  if (spotResList.length === 0) {
                    return (
                      <tr key={spot.spotId} className="hover:bg-slate-50/50">
                        <td className="p-3.5 pl-4 font-medium text-slate-800">
                          {spot.zoneName} · {spot.spotName}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 tabular-nums">
                          {formatDimensions(spot.specWidthMm, spot.specHeightMm)}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            공실 (신청가능)
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 italic" colSpan={3}>
                          점유 및 예정 일정이 없습니다.
                        </td>
                      </tr>
                    );
                  }

                  return spotResList.map((res, idx) => {
                    const meta = STATUS_META[res.status];
                    return (
                      <tr key={res.reservationId} className="hover:bg-slate-50/50">
                        {idx === 0 && (
                          <td
                            className="p-3.5 pl-4 font-semibold text-slate-900 border-r border-slate-100 align-top"
                            rowSpan={spotResList.length}
                          >
                            <div>{spot.zoneName} · {spot.spotName}</div>
                            <div className="font-mono text-[11px] text-slate-400 font-normal mt-0.5">
                              {spot.spotId}
                            </div>
                          </td>
                        )}
                        {idx === 0 && (
                          <td
                            className="p-3.5 font-mono text-slate-500 tabular-nums border-r border-slate-100 align-top"
                            rowSpan={spotResList.length}
                          >
                            {formatDimensions(spot.specWidthMm, spot.specHeightMm)}
                          </td>
                        )}
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.bg} ${meta.text} ${meta.border}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {res.title}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {res.requesterDept} {res.requesterName}
                        </td>
                        <td className="p-3.5 pr-4 font-mono tabular-nums text-slate-700">
                          {res.startDate} ~ {res.endDate}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SPOT MASTER CATALOG */}
      {adminTab === 'SPOTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">홍보 거점 마스터 관리 (Master Catalog)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                사내 설치 가능한 거점의 치수(mm), 마감 규격, 사용 여부를 영구 관리합니다.
              </p>
            </div>
            <button
              onClick={() => onOpenSpotModal(null)}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-100 flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>신규 거점 마스터 추가</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3.5 pl-4">거점 코드</th>
                  <th className="p-3.5">구역 / 상세 위치</th>
                  <th className="p-3.5">매체 구분</th>
                  <th className="p-3.5">규격 (mm)</th>
                  <th className="p-3.5">제작/마감 가이드</th>
                  <th className="p-3.5 text-center">활성 상태</th>
                  <th className="p-3.5 pr-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spots.map((spot) => (
                  <tr key={spot.spotId} className="hover:bg-slate-50/50">
                    <td className="p-3.5 pl-4 font-mono font-bold text-slate-800 tabular-nums">
                      {spot.spotId}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{spot.spotName}</div>
                      <div className="text-[11px] text-slate-500">{spot.zoneName}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {spot.mediaType}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono tabular-nums text-slate-900 font-medium">
                      {formatDimensions(spot.specWidthMm, spot.specHeightMm)}
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate" title={spot.finishingGuide}>
                      {spot.finishingGuide}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleToggleActive(spot)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                          spot.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        {spot.isActive ? '운영중' : '사용중지'}
                      </button>
                    </td>
                    <td className="p-3.5 pr-4 text-right">
                      <button
                        onClick={() => onOpenSpotModal(spot)}
                        className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                        title="거점 정보 수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
