'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Copy,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  Ruler,
  Wrench,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { AdSpot, AdReservation, MediaType, MEDIA_TYPE_LABELS, STATUS_META } from '@/types/adSpot';
import { formatDimensions, copyToClipboard } from '@/lib/utils';
import { useToast } from './Toast';

interface SpotExplorerViewProps {
  spots: AdSpot[];
  reservations: AdReservation[];
  onOpenReservation: (spot: AdSpot) => void;
  onPreviewImage: (url: string, title: string, subtitle?: string) => void;
}

export const SpotExplorerView: React.FC<SpotExplorerViewProps> = ({
  spots,
  reservations,
  onOpenReservation,
  onPreviewImage,
}) => {
  const toast = useToast();
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSpotId, setCopiedSpotId] = useState<string | null>(null);
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(null);

  // Extract unique zones
  const zones = Array.from(new Set(spots.map((s) => s.zoneName)));

  // Today for occupancy check
  const todayStr = new Date().toISOString().split('T')[0];

  // Copy specs handler
  const handleCopySpecs = async (e: React.MouseEvent, spot: AdSpot) => {
    e.stopPropagation();
    const textToCopy = `[Ad-Spot 거점 규격 정보]\n거점명: ${spot.zoneName} - ${spot.spotName} (${spot.spotId})\n매체: ${spot.mediaType} (${MEDIA_TYPE_LABELS[spot.mediaType]})\n규격: ${formatDimensions(spot.specWidthMm, spot.specHeightMm)}\n제작/마감 가이드: ${spot.finishingGuide}`;

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopiedSpotId(spot.spotId);
      toast.success('규격 정보 복사 완료', '제작 업체 전달용 상세 규격 및 마감 텍스트가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedSpotId(null), 2500);
    } else {
      toast.error('복사 실패', '클립보드 접근 권한을 확인해 주세요.');
    }
  };

  // Filter spots
  const filteredSpots = spots.filter((spot) => {
    if (selectedZone !== 'ALL' && spot.zoneName !== selectedZone) return false;
    if (selectedMediaType !== 'ALL' && spot.mediaType !== selectedMediaType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = spot.spotName.toLowerCase().includes(q);
      const matchZone = spot.zoneName.toLowerCase().includes(q);
      const matchId = spot.spotId.toLowerCase().includes(q);
      const matchGuide = spot.finishingGuide.toLowerCase().includes(q);
      if (!matchName && !matchZone && !matchId && !matchGuide) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        {/* Top Search & Count Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="거점명, 위치, 규격, 마감 방식 검색..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              총 <strong className="text-slate-900 tabular-nums">{filteredSpots.length}</strong>개 거점 탐색됨
            </span>
          </div>
        </div>

        {/* Zone Filter Chips */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span>설치 구역 필터</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedZone('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedZone === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 구역
            </button>
            {zones.map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedZone === zone
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Media Type Tabs */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-purple-500" />
            <span>홍보 매체 종류</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'ALL', label: '전체 매체' },
              { id: 'BANNER', label: '배너 (BANNER)' },
              { id: 'PLACARD', label: '현수막 (PLACARD)' },
              { id: 'POSTER', label: '포스터·POP' },
              { id: 'DIGITAL', label: '디지털·웹' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedMediaType(tab.id as MediaType | 'ALL')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  selectedMediaType === tab.id
                    ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spots Grid */}
      {filteredSpots.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h4 className="font-bold text-slate-800 text-sm">조건에 일치하는 홍보 거점이 없습니다.</h4>
          <p className="text-xs text-slate-500 mt-1">
            필터 조건이나 검색어를 변경해 보시기 바랍니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSpots.map((spot) => {
            // Find current active occupancy
            const spotReservations = reservations.filter((r) => r.spotId === spot.spotId);
            const activeOccupancy = spotReservations.find(
              (r) =>
                ['INSTALLED', 'EXPIRED_OVERDUE', 'APPROVED'].includes(r.status) &&
                r.startDate <= todayStr &&
                r.endDate >= todayStr
            );
            const overdueOccupancy = spotReservations.find(
              (r) => r.status === 'EXPIRED_OVERDUE' || (r.status === 'INSTALLED' && r.endDate < todayStr)
            );

            // Upcoming reservations count
            const upcomingCount = spotReservations.filter(
              (r) => ['PENDING', 'APPROVED'].includes(r.status) && r.startDate > todayStr
            ).length;

            const isExpanded = expandedSpotId === spot.spotId;

            return (
              <div
                key={spot.spotId}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
                  !spot.isActive
                    ? 'border-slate-200 opacity-60'
                    : 'border-slate-200/90 hover:shadow-lg hover:border-indigo-300/80'
                }`}
              >
                {/* Spot Photo with Badge Overlay */}
                <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spot.spotImageUrl}
                    alt={spot.spotName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    onClick={() =>
                      onPreviewImage(spot.spotImageUrl, spot.spotName, `${spot.zoneName} · ${spot.spotId}`)
                    }
                  />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/60 text-white backdrop-blur border border-white/20">
                      {spot.zoneName}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur border ${
                        spot.mediaType === 'BANNER'
                          ? 'bg-indigo-900/80 text-indigo-200 border-indigo-500/40'
                          : spot.mediaType === 'PLACARD'
                          ? 'bg-purple-900/80 text-purple-200 border-purple-500/40'
                          : spot.mediaType === 'POSTER'
                          ? 'bg-emerald-900/80 text-emerald-200 border-emerald-500/40'
                          : 'bg-cyan-900/80 text-cyan-200 border-cyan-500/40'
                      }`}
                    >
                      {spot.mediaType}
                    </span>
                    {spot.trafficLevel && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/80 text-white backdrop-blur border border-amber-400/40">
                        유동 {spot.trafficLevel}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur ${
                        spot.isActive
                          ? 'bg-emerald-500/90 text-white border border-emerald-400/50'
                          : 'bg-rose-500/90 text-white border border-rose-400/50'
                      }`}
                    >
                      {spot.isActive ? '운영중' : '사용중지'}
                    </span>
                  </div>

                  {/* Bottom Image Caption */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 text-white text-xs flex justify-between items-end">
                    <span className="font-mono text-[11px] opacity-80">{spot.spotId}</span>
                    <span className="text-[11px] underline opacity-90 cursor-pointer hover:opacity-100">
                      사진 크게보기
                    </span>
                  </div>
                </div>

                {/* Spot Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Spot Name */}
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {spot.spotName}
                    </h3>

                    {/* Spot Description by Admin */}
                    {spot.description && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/60">
                        {spot.description}
                      </p>
                    )}

                    {/* Exact Dimensions with Copy Spec Button */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Ruler className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="text-slate-500 font-medium">제작 규격:</span>
                          <strong className="font-mono text-slate-900 tabular-nums text-sm">
                            {formatDimensions(spot.specWidthMm, spot.specHeightMm)}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopySpecs(e, spot)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            copiedSpotId === spot.spotId
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
                          }`}
                          title="업체 발주용 규격 복사"
                        >
                          {copiedSpotId === spot.spotId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>복사됨!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-indigo-500" />
                              <span>규격 복사</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Finishing Guide */}
                      <div className="flex items-start gap-1.5 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-600 leading-tight">
                          {spot.finishingGuide}
                        </span>
                      </div>
                    </div>

                    {/* Current Status Pill */}
                    <div className="mt-3">
                      {overdueOccupancy ? (
                        <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="truncate">
                            미철거 초과: [{overdueOccupancy.requesterDept}] ~{overdueOccupancy.endDate}
                          </span>
                        </div>
                      ) : activeOccupancy ? (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">
                            {STATUS_META[activeOccupancy.status].label}: [{activeOccupancy.requesterDept}] ~{activeOccupancy.endDate}까지
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>현재 비어있음 · 즉시 신청 가능</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button: Book */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={!spot.isActive}
                      onClick={() => onOpenReservation(spot)}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{spot.isActive ? '이 거점에 예약 신청하기' : '사용 중지된 거점입니다'}</span>
                    </button>

                    {/* Collapsible Accordion Trigger */}
                    <button
                      type="button"
                      onClick={() => setExpandedSpotId(isExpanded ? null : spot.spotId)}
                      className="w-full py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span>
                        예약 일정 현황 ({spotReservations.length}건
                        {upcomingCount > 0 && `, 예정 ${upcomingCount}건`})
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Accordion Content */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                    <h5 className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>해당 거점 예약 및 점유 타임라인</span>
                    </h5>

                    {spotReservations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">등록된 예약 일정이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {spotReservations.map((res) => {
                          const meta = STATUS_META[res.status];
                          return (
                            <div
                              key={res.reservationId}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-2xl shadow-slate-100"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.bg} ${meta.text} ${meta.border}`}
                                >
                                  {meta.label}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                                  {res.startDate} ~ {res.endDate}
                                </span>
                              </div>
                              <div className="font-semibold text-slate-800 truncate" title={res.title}>
                                {res.title}
                              </div>
                              <div className="text-[11px] text-slate-500 flex justify-between">
                                <span>{res.requesterDept} {res.requesterName}</span>
                                {res.installedImageUrl && (
                                  <button
                                    onClick={() =>
                                      onPreviewImage(res.installedImageUrl!, res.title, '현장 설치 인증 사진')
                                    }
                                    className="text-emerald-600 underline font-medium hover:text-emerald-800"
                                  >
                                    설치인증샷
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
