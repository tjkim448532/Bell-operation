'use client';

import React, { useState, useMemo } from 'react';
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
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  User,
  MapPin,
  Ruler,
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

  // Search & filters for Timeline Tab
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineZoneFilter, setTimelineZoneFilter] = useState('ALL');
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'OVERDUE'>('ALL');

  // Search & filters for Spots Tab
  const [spotSearch, setSpotSearch] = useState('');
  const [spotZoneFilter, setSpotZoneFilter] = useState('ALL');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Overdue reservations (either status EXPIRED_OVERDUE or installed with passed endDate)
  const overdueList = useMemo(() => {
    return reservations.filter(
      (r) => r.status === 'EXPIRED_OVERDUE' || (r.status === 'INSTALLED' && r.endDate < todayStr)
    );
  }, [reservations, todayStr]);

  // Pending queue
  const pendingList = useMemo(() => {
    return reservations.filter((r) => r.status === 'PENDING');
  }, [reservations]);

  // Calculate days overdue
  const getDaysOverdue = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const today = new Date(todayStr).getTime();
    const diff = Math.floor((today - end) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Handle Approve
  const handleApprove = async (res: AdReservation) => {
    setProcessingId(res.reservationId);
    try {
      await adSpotService.updateReservationStatus(res.reservationId, 'APPROVED');
      toast.success(
        '신청 승인 완료 (HITL)',
        `"${res.title}" 건이 공식 승인되었습니다. 이제 신청자가 현장 게시를 진행할 수 있습니다.`
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
    if (
      !confirm(
        `"${res.title}" 건을 관리자 권한으로 강제 철거 완료 처리하시겠습니까?\n확인 시 거점 점유가 즉시 공식 해제(REMOVED)됩니다.`
      )
    ) {
      return;
    }

    setProcessingId(res.reservationId);
    try {
      await adSpotService.updateReservationStatus(res.reservationId, 'REMOVED');
      toast.info('철거 완료 처리', `"${res.title}" 홍보물의 거점 점유가 해제되었습니다.`);
      onRefresh();
    } catch (err: any) {
      toast.error('처리 실패', err?.message || '오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  // Toggle Spot Active
  const handleToggleActive = async (spot: AdSpot) => {
    const nextState = !spot.isActive;
    const confirmMsg = nextState
      ? `"${spot.spotName}" 거점을 정상 운영 상태로 전환하시겠습니까?`
      : `"${spot.spotName}" 거점을 시설 보수/파손 사유로 '사용 중지' 처리하시겠습니까?\n신청자 화면에서 예약 신청이 차단됩니다.`;

    if (!confirm(confirmMsg)) return;

    try {
      await adSpotService.toggleSpotActive(spot.spotId, nextState);
      toast.success(
        nextState ? '거점 정상 운영 전환' : '거점 사용 중지 완료',
        `"${spot.spotName}" 상태가 변경되었습니다.`
      );
      onRefresh();
    } catch (err: any) {
      toast.error('상태 변경 실패', err?.message);
    }
  };

  // Unique zones for timeline and spot master
  const zones = useMemo(() => Array.from(new Set(spots.map((s) => s.zoneName))), [spots]);

  // Timeline spots filtering
  const filteredTimelineSpots = useMemo(() => {
    return spots.filter((spot) => {
      if (timelineZoneFilter !== 'ALL' && spot.zoneName !== timelineZoneFilter) return false;

      const spotResList = reservations.filter(
        (r) => r.spotId === spot.spotId && r.status !== 'REJECTED' && r.status !== 'REMOVED'
      );
      const active = spotResList.find(
        (r) =>
          ['INSTALLED', 'APPROVED'].includes(r.status) &&
          r.startDate <= todayStr &&
          r.endDate >= todayStr
      );
      const overdue = spotResList.find(
        (r) => r.status === 'EXPIRED_OVERDUE' || (r.status === 'INSTALLED' && r.endDate < todayStr)
      );

      if (timelineStatusFilter === 'AVAILABLE' && (active || overdue || !spot.isActive)) return false;
      if (timelineStatusFilter === 'OCCUPIED' && !active) return false;
      if (timelineStatusFilter === 'OVERDUE' && !overdue) return false;

      if (timelineSearch.trim()) {
        const q = timelineSearch.toLowerCase();
        const matchName = spot.spotName.toLowerCase().includes(q);
        const matchZone = spot.zoneName.toLowerCase().includes(q);
        const matchId = spot.spotId.toLowerCase().includes(q);
        const matchRes = spotResList.some(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.requesterDept.toLowerCase().includes(q) ||
            r.requesterName.toLowerCase().includes(q)
        );
        if (!matchName && !matchZone && !matchId && !matchRes) return false;
      }

      return true;
    });
  }, [spots, reservations, timelineZoneFilter, timelineStatusFilter, timelineSearch, todayStr]);

  // Master spots filtering
  const filteredMasterSpots = useMemo(() => {
    return spots.filter((spot) => {
      if (spotZoneFilter !== 'ALL' && spot.zoneName !== spotZoneFilter) return false;
      if (spotSearch.trim()) {
        const q = spotSearch.toLowerCase();
        const matchName = spot.spotName.toLowerCase().includes(q);
        const matchZone = spot.zoneName.toLowerCase().includes(q);
        const matchId = spot.spotId.toLowerCase().includes(q);
        const matchGuide = spot.finishingGuide.toLowerCase().includes(q);
        const matchDesc = spot.description?.toLowerCase().includes(q);
        if (!matchName && !matchZone && !matchId && !matchGuide && !matchDesc) return false;
      }
      return true;
    });
  }, [spots, spotZoneFilter, spotSearch]);

  return (
    <div className="space-y-6">
      {/* 1. URGENT OVERDUE ALERT BANNER (미철거 경고 관리 최우선 노출) */}
      {overdueList.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center animate-bounce shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-red-950 text-base flex items-center gap-2">
                  <span>🚨 긴급 조치: 게시 기간 초과 홍보물 ({overdueList.length}건)</span>
                  <span className="text-[11px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">
                    즉시 철거 요망
                  </span>
                </h4>
                <p className="text-xs text-red-700 mt-0.5 font-medium">
                  게시 종료일이 경과했으나 현장 철거 처리가 완료되지 않은 거점입니다. 현장 확인 후 즉시 강제 철거 완료를 집행하십시오.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {overdueList.map((res) => {
              const daysOverdue = getDaysOverdue(res.endDate);
              return (
                <div
                  key={res.reservationId}
                  className="bg-white p-4 rounded-xl border border-red-200 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">{res.title}</span>
                      <span className="text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-bold tabular-nums">
                        {daysOverdue > 0 ? `+${daysOverdue}일 경과` : '오늘 종료'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>{res.zoneName}</strong> · {res.spotName} ({res.specSummary})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      신청자: <span className="font-semibold text-slate-800">{res.requesterDept} {res.requesterName}</span> (기한: ~{res.endDate})
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {res.installedImageUrl && (
                      <button
                        onClick={() => onPreviewImage(res.installedImageUrl!, res.title, '설치 사진 확인')}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-center"
                      >
                        설치샷
                      </button>
                    )}
                    <button
                      onClick={() => handleForceRemoval(res)}
                      disabled={processingId === res.reservationId}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      {processingId === res.reservationId ? '처리중' : '강제 철거'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. ADMIN NAVIGATION SUB-TABS */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5">
        <button
          onClick={() => setAdminTab('PENDING')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            adminTab === 'PENDING'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>신규 승인 대기열 (HITL)</span>
          {pendingList.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                adminTab === 'PENDING' ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
              }`}
            >
              {pendingList.length}건
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('TIMELINE')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            adminTab === 'SPOTS'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>거점 마스터 통제실 ({spots.length}곳)</span>
        </button>
      </div>

      {/* TAB 1: PENDING APPROVAL QUEUE */}
      {adminTab === 'PENDING' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                신규 예약 검토 대기열 (총 {pendingList.length}건)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                신청자가 등록한 디자인 시안 및 일정을 검토한 후 승인(HITL) 또는 반려 처리하십시오.
              </p>
            </div>
          </div>

          {pendingList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-extrabold text-slate-900 text-base">검토 대기 중인 예약 신청이 없습니다.</h4>
              <p className="text-xs text-slate-500 mt-1">모든 신청 건이 검토 완료되었습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingList.map((res) => {
                // Check if there are overlapping active reservations
                const existingBlocking = reservations.filter(
                  (r) =>
                    r.reservationId !== res.reservationId &&
                    r.spotId === res.spotId &&
                    ['APPROVED', 'INSTALLED', 'EXPIRED_OVERDUE'].includes(r.status) &&
                    r.startDate <= res.endDate &&
                    r.endDate >= res.startDate
                );
                const hasConflict = existingBlocking.length > 0;

                return (
                  <div
                    key={res.reservationId}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-purple-300 p-5 shadow-sm transition-all flex flex-col md:flex-row gap-5 items-start justify-between"
                  >
                    {/* Left: Draft Image Preview (Large) */}
                    <div
                      onClick={() => onPreviewImage(res.draftImageUrl, res.title, '시안 크게보기')}
                      className="w-full md:w-52 aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden cursor-pointer relative group shrink-0 border border-slate-200 shadow-xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={res.draftImageUrl}
                        alt={res.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                        <Eye className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">시안 원본 확대</span>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur">
                        디자인 시안
                      </div>
                    </div>

                    {/* Middle: Content Info */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
                          승인 대기중 (HITL)
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {res.zoneName} · {res.spotName}
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-bold tabular-nums">
                          ({res.specSummary})
                        </span>
                      </div>

                      {/* Conflict validation status banner */}
                      {hasConflict ? (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            주의: 기존 승인/게시 건({existingBlocking[0].title}, ~{existingBlocking[0].endDate})과 일정이 충돌합니다.
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>기존 예약과의 일정 충돌 없음 (승인 적합)</span>
                        </div>
                      )}

                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg leading-tight">{res.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70 font-medium">
                          {res.purpose}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                          <span className="text-slate-400 block text-[10px] font-semibold">신청 부서 / 담당자</span>
                          <strong className="text-slate-900 font-bold">{res.requesterDept} {res.requesterName}</strong>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 col-span-2">
                          <span className="text-slate-400 block text-[10px] font-semibold">요청 게시 기간</span>
                          <strong className="font-mono text-slate-900 tabular-nums text-xs font-bold">
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
                        className="flex-1 md:w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{processingId === res.reservationId ? '처리중' : '승인 완료'}</span>
                      </button>

                      <button
                        onClick={() => onOpenRejectModal(res)}
                        disabled={processingId === res.reservationId}
                        className="flex-1 md:w-full py-2.5 px-4 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>반려 처리</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TIMELINE STATUS BOARD */}
      {adminTab === 'TIMELINE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">전체 거점 예약 및 점유 현황 매트릭스</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                사내 전체 거점별 점유 상태와 예약 스케줄을 실시간으로 추적·관리합니다.
              </p>
            </div>
          </div>

          {/* Timeline Filter and Search Controls */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Zone Filter */}
              <select
                value={timelineZoneFilter}
                onChange={(e) => setTimelineZoneFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">전체 구역 ({spots.length})</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={timelineStatusFilter}
                onChange={(e) => setTimelineStatusFilter(e.target.value as any)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">전체 상태</option>
                <option value="AVAILABLE">🟢 공실만 보기</option>
                <option value="OCCUPIED">🔵 게시중인 거점</option>
                <option value="OVERDUE">🚨 미철거 초과 거점</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                placeholder="거점명, 부서, 신청자, 건명 검색..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5 pl-4">거점 / 코드</th>
                  <th className="p-3.5">규격</th>
                  <th className="p-3.5">현재 상태</th>
                  <th className="p-3.5">게시 건명</th>
                  <th className="p-3.5">신청 부서 / 담당자</th>
                  <th className="p-3.5 pr-4">점유 기간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTimelineSpots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      검색 조건에 해당하는 거점이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredTimelineSpots.map((spot) => {
                    const spotResList = reservations
                      .filter((r) => r.spotId === spot.spotId && r.status !== 'REJECTED' && r.status !== 'REMOVED')
                      .sort((a, b) => a.startDate.localeCompare(b.startDate));

                    if (spotResList.length === 0) {
                      return (
                        <tr key={spot.spotId} className="hover:bg-slate-50/50">
                          <td className="p-3.5 pl-4 font-semibold text-slate-900">
                            <div>{spot.zoneName} · {spot.spotName}</div>
                            <div className="font-mono text-[11px] text-slate-400 font-normal">{spot.spotId}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-600 font-bold tabular-nums">
                            {formatDimensions(spot.specWidthMm, spot.specHeightMm)}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
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
                              <div className="font-bold">{spot.zoneName} · {spot.spotName}</div>
                              <div className="font-mono text-[11px] text-slate-400 font-normal mt-0.5">
                                {spot.spotId}
                              </div>
                            </td>
                          )}
                          {idx === 0 && (
                            <td
                              className="p-3.5 font-mono text-slate-600 font-bold tabular-nums border-r border-slate-100 align-top"
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
                          <td className="p-3.5 font-semibold text-slate-900">
                            {res.title}
                          </td>
                          <td className="p-3.5 text-slate-700 font-medium">
                            {res.requesterDept} {res.requesterName}
                          </td>
                          <td className="p-3.5 pr-4 font-mono tabular-nums text-slate-800 font-bold">
                            {res.startDate} ~ {res.endDate}
                          </td>
                        </tr>
                      );
                    });
                  })
                )}
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
              <h3 className="font-extrabold text-slate-900 text-base">홍보 거점 마스터 관리 (Master Catalog)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                사내 설치 가능한 거점의 치수(mm), 마감 규격, 위치 설명, 사용 여부를 영구 관리합니다.
              </p>
            </div>
            <button
              onClick={() => onOpenSpotModal(null)}
              className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-100 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ 신규 거점 마스터 추가</span>
            </button>
          </div>

          {/* Search & Zone Filter for Spot Master */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <select
                value={spotZoneFilter}
                onChange={(e) => setSpotZoneFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">전체 구역 ({spots.length})</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={spotSearch}
                onChange={(e) => setSpotSearch(e.target.value)}
                placeholder="거점명, 코드, 가이드 검색..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5 pl-4">거점 코드</th>
                  <th className="p-3.5">구역 / 위치명</th>
                  <th className="p-3.5">매체 구분</th>
                  <th className="p-3.5">규격 (mm)</th>
                  <th className="p-3.5">제작/마감 가이드</th>
                  <th className="p-3.5 text-center">운영 상태</th>
                  <th className="p-3.5 pr-4 text-right">설정 수정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMasterSpots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      검색 조건에 해당하는 거점 마스터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredMasterSpots.map((spot) => (
                    <tr key={spot.spotId} className="hover:bg-slate-50/50">
                      <td className="p-3.5 pl-4 font-mono font-bold text-slate-900 tabular-nums">
                        {spot.spotId}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{spot.spotName}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{spot.zoneName}</div>
                        {spot.description && (
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={spot.description}>
                            💡 {spot.description}
                          </p>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {spot.mediaType}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono tabular-nums text-slate-900 font-bold">
                        {formatDimensions(spot.specWidthMm, spot.specHeightMm)}
                      </td>
                      <td className="p-3.5 text-slate-700 max-w-xs truncate font-medium" title={spot.finishingGuide}>
                        {spot.finishingGuide}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleActive(spot)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer ${
                            spot.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                          title="클릭 시 운영/중지 전환"
                        >
                          {spot.isActive ? '운영중' : '사용중지'}
                        </button>
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <button
                          onClick={() => onOpenSpotModal(spot)}
                          className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="거점 정보 수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
