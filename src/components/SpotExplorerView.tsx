'use client';

import React, { useState, useMemo } from 'react';
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
  BookOpen,
  Camera,
  Layers,
  CheckCircle2,
  AlertOctagon,
  Eye,
} from 'lucide-react';
import { AdSpot, AdReservation, MediaType, MEDIA_TYPE_LABELS, STATUS_META } from '@/types/adSpot';
import { formatDimensions, copyToClipboard } from '@/lib/utils';
import { useToast } from './Toast';
import { ImageRegulationModal } from './ImageRegulationModal';

interface SpotExplorerViewProps {
  spots: AdSpot[];
  reservations: AdReservation[];
  onOpenReservation: (spot: AdSpot) => void;
  onPreviewImage: (url: string, title: string, subtitle?: string) => void;
}

type AvailabilityFilter = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'OVERDUE';

export const SpotExplorerView: React.FC<SpotExplorerViewProps> = ({
  spots,
  reservations,
  onOpenReservation,
  onPreviewImage,
}) => {
  const toast = useToast();
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType | 'ALL'>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSpotId, setCopiedSpotId] = useState<string | null>(null);
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(null);
  const [isRegulationOpen, setIsRegulationOpen] = useState(false);
  const [photoViews, setPhotoViews] = useState<Record<string, 'front' | 'rear'>>({});

  // Today for occupancy check
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute spot occupancy helper map
  const spotOccupancyMap = useMemo(() => {
    const map = new Map<
      string,
      {
        active?: AdReservation;
        overdue?: AdReservation;
        upcoming: AdReservation[];
        all: AdReservation[];
        isAvailable: boolean;
      }
    >();

    spots.forEach((spot) => {
      const spotRes = reservations.filter((r) => r.spotId === spot.spotId);
      const overdue = spotRes.find(
        (r) => r.status === 'EXPIRED_OVERDUE' || (r.status === 'INSTALLED' && r.endDate < todayStr)
      );
      const active = spotRes.find(
        (r) =>
          ['INSTALLED', 'APPROVED'].includes(r.status) &&
          r.startDate <= todayStr &&
          r.endDate >= todayStr
      );
      const upcoming = spotRes.filter(
        (r) => ['PENDING', 'APPROVED'].includes(r.status) && r.startDate > todayStr
      );

      const isAvailable = spot.isActive && !active && !overdue;

      map.set(spot.spotId, {
        active,
        overdue,
        upcoming,
        all: spotRes,
        isAvailable,
      });
    });

    return map;
  }, [spots, reservations, todayStr]);

  // Overall counts for availability tabs
  const availabilityCounts = useMemo(() => {
    let available = 0;
    let occupied = 0;
    let overdue = 0;

    spots.forEach((spot) => {
      const info = spotOccupancyMap.get(spot.spotId);
      if (!info) return;
      if (info.overdue) overdue++;
      else if (info.active) occupied++;
      else if (info.isAvailable) available++;
    });

    return {
      all: spots.length,
      available,
      occupied,
      overdue,
    };
  }, [spots, spotOccupancyMap]);

  // Extract unique zones with count
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    spots.forEach((s) => {
      counts[s.zoneName] = (counts[s.zoneName] || 0) + 1;
    });
    return counts;
  }, [spots]);

  const zones = useMemo(() => Object.keys(zoneCounts), [zoneCounts]);

  // Media type counts
  const mediaCounts = useMemo(() => {
    const counts: Record<string, number> = {
      BANNER: 0,
      PLACARD: 0,
      POSTER: 0,
      DIGITAL: 0,
    };
    spots.forEach((s) => {
      if (counts[s.mediaType] !== undefined) {
        counts[s.mediaType]++;
      }
    });
    return counts;
  }, [spots]);

  // Copy specs handler
  const handleCopySpecs = async (e: React.MouseEvent, spot: AdSpot) => {
    e.stopPropagation();
    const textToCopy = `[Ad-Spot 벨포레 홍보 거점 규격 정보]
거점명: ${spot.zoneName} - ${spot.spotName} (${spot.spotId})
매체 구분: ${spot.mediaType} (${MEDIA_TYPE_LABELS[spot.mediaType] || spot.mediaType})
규격(mm): 가로 ${spot.specWidthMm.toLocaleString()} × 세로 ${spot.specHeightMm.toLocaleString()} mm
제작/마감 가이드: ${spot.finishingGuide}${spot.description ? `\n위치 설명: ${spot.description}` : ''}`;

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopiedSpotId(spot.spotId);
      toast.success(
        '규격 정보 복사 완료',
        `${spot.spotName} (${formatDimensions(spot.specWidthMm, spot.specHeightMm)}) 규격이 클립보드에 복사되었습니다.`
      );
      setTimeout(() => setCopiedSpotId(null), 2500);
    } else {
      toast.error('복사 실패', '클립보드 접근 권한을 확인해 주세요.');
    }
  };

  // Filter spots
  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      const info = spotOccupancyMap.get(spot.spotId);

      // Availability filter
      if (availabilityFilter === 'AVAILABLE' && !info?.isAvailable) return false;
      if (availabilityFilter === 'OCCUPIED' && !info?.active) return false;
      if (availabilityFilter === 'OVERDUE' && !info?.overdue) return false;

      // Zone filter
      if (selectedZone !== 'ALL' && spot.zoneName !== selectedZone) return false;

      // Media type filter
      if (selectedMediaType !== 'ALL' && spot.mediaType !== selectedMediaType) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = spot.spotName.toLowerCase().includes(q);
        const matchZone = spot.zoneName.toLowerCase().includes(q);
        const matchId = spot.spotId.toLowerCase().includes(q);
        const matchGuide = spot.finishingGuide.toLowerCase().includes(q);
        const matchDesc = spot.description?.toLowerCase().includes(q);
        if (!matchName && !matchZone && !matchId && !matchGuide && !matchDesc) return false;
      }
      return true;
    });
  }, [spots, spotOccupancyMap, availabilityFilter, selectedZone, selectedMediaType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. TOP INTUITIVE AVAILABILITY QUICK SELECTOR (가장 직관적인 상태 필터) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
              Quick Filter
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              거점 실시간 점유 상태 선택
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRegulationOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="홍보물 이미지 촬영 및 클라우드 아카이빙 규정 열람"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>이미지 운영 규정 (SOP)</span>
            </button>
          </div>
        </div>

        {/* 4 Big Availability Filter Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setAvailabilityFilter('ALL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              availabilityFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div>
              <span className={`text-[11px] font-bold block ${availabilityFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                전체 거점
              </span>
              <span className="text-lg font-black tracking-tight tabular-nums">
                {availabilityCounts.all}개
              </span>
            </div>
            <Layers className={`w-5 h-5 ${availabilityFilter === 'ALL' ? 'text-indigo-400' : 'text-slate-400'}`} />
          </button>

          <button
            type="button"
            onClick={() => setAvailabilityFilter('AVAILABLE')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              availabilityFilter === 'AVAILABLE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70'
            }`}
          >
            <div>
              <span className={`text-[11px] font-bold block ${availabilityFilter === 'AVAILABLE' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                🟢 즉시 예약 가능 (공실)
              </span>
              <span className="text-lg font-black tracking-tight tabular-nums">
                {availabilityCounts.available}개
              </span>
            </div>
            <Sparkles className={`w-5 h-5 ${availabilityFilter === 'AVAILABLE' ? 'text-emerald-200' : 'text-emerald-600'}`} />
          </button>

          <button
            type="button"
            onClick={() => setAvailabilityFilter('OCCUPIED')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              availabilityFilter === 'OCCUPIED'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                : 'bg-blue-50/70 text-blue-900 border-blue-200 hover:bg-blue-100/70'
            }`}
          >
            <div>
              <span className={`text-[11px] font-bold block ${availabilityFilter === 'OCCUPIED' ? 'text-blue-100' : 'text-blue-700'}`}>
                🔵 현재 게시중 (점유)
              </span>
              <span className="text-lg font-black tracking-tight tabular-nums">
                {availabilityCounts.occupied}개
              </span>
            </div>
            <Clock className={`w-5 h-5 ${availabilityFilter === 'OCCUPIED' ? 'text-blue-200' : 'text-blue-600'}`} />
          </button>

          <button
            type="button"
            onClick={() => setAvailabilityFilter('OVERDUE')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              availabilityFilter === 'OVERDUE'
                ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-200'
                : availabilityCounts.overdue > 0
                ? 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100 animate-pulse'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div>
              <span className={`text-[11px] font-bold block ${availabilityFilter === 'OVERDUE' ? 'text-red-100' : 'text-red-600'}`}>
                🚨 미철거 초과 주의
              </span>
              <span className="text-lg font-black tracking-tight tabular-nums">
                {availabilityCounts.overdue}개
              </span>
            </div>
            <AlertOctagon className={`w-5 h-5 ${availabilityFilter === 'OVERDUE' ? 'text-red-200' : 'text-red-600'}`} />
          </button>
        </div>

        {/* Search input with live clear */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="거점명(예: 웰컴센터, 루지, 투썸), 거점코드, 규격(600), 마감 가이드 검색..."
            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* 2. ZONE FILTER CHIPS WITH ITEM COUNTS */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>설치 구역 필터</span>
            </div>
            <span className="text-slate-400 font-normal">
              선택 결과: <strong className="text-slate-800 font-bold tabular-nums">{filteredSpots.length}</strong>곳
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedZone('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedZone === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>전체 구역</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedZone === 'ALL' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-200 text-slate-600'
              }`}>
                {spots.length}
              </span>
            </button>
            {zones.map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedZone === zone
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{zone}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  selectedZone === zone ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-200 text-slate-600'
                }`}>
                  {zoneCounts[zone]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. MEDIA TYPE TABS WITH ITEM COUNTS */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-purple-500" />
            <span>홍보 매체 구분</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'ALL', label: '전체 매체', count: spots.length },
              { id: 'BANNER', label: '배너 (BANNER)', count: mediaCounts.BANNER },
              { id: 'PLACARD', label: '현수막 (PLACARD)', count: mediaCounts.PLACARD },
              { id: 'POSTER', label: '포스터·POP', count: mediaCounts.POSTER },
              { id: 'DIGITAL', label: '디지털·웹', count: mediaCounts.DIGITAL },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedMediaType(tab.id as MediaType | 'ALL')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedMediaType === tab.id
                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                  selectedMediaType === tab.id ? 'bg-purple-900 text-purple-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spots Grid */}
      {filteredSpots.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h4 className="font-bold text-slate-900 text-base">선택한 조건에 일치하는 거점이 없습니다.</h4>
          <p className="text-xs text-slate-500 mt-1">
            필터 조건이나 검색어를 재조정해 보세요.
          </p>
          <button
            onClick={() => {
              setSelectedZone('ALL');
              setSelectedMediaType('ALL');
              setAvailabilityFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl transition-all"
          >
            모든 필터 초기화
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSpots.map((spot) => {
            const occupancy = spotOccupancyMap.get(spot.spotId);
            const activeOccupancy = occupancy?.active;
            const overdueOccupancy = occupancy?.overdue;
            const upcomingCount = occupancy?.upcoming.length || 0;
            const spotReservations = occupancy?.all || [];
            const isAvailable = occupancy?.isAvailable ?? false;

            const isExpanded = expandedSpotId === spot.spotId;

            // Dual view photo state
            const viewType = photoViews[spot.spotId] || 'front';
            const currentImg = viewType === 'rear' && spot.rearImageUrl ? spot.rearImageUrl : spot.spotImageUrl;

            return (
              <div
                key={spot.spotId}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
                  !spot.isActive
                    ? 'border-slate-200 opacity-60'
                    : overdueOccupancy
                    ? 'border-red-300 shadow-sm shadow-red-100/50 ring-1 ring-red-200'
                    : isAvailable
                    ? 'border-emerald-200/80 hover:border-emerald-400 hover:shadow-md'
                    : 'border-slate-200/90 hover:shadow-md hover:border-indigo-300'
                }`}
              >
                {/* Visual Status Ribbon Banner at the very top of each card */}
                <div
                  className={`px-4 py-1.5 text-xs font-bold flex items-center justify-between text-white ${
                    !spot.isActive
                      ? 'bg-slate-700'
                      : overdueOccupancy
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 animate-pulse'
                      : activeOccupancy
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {!spot.isActive ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-300" />
                        <span>⛔ 시설 보수 / 운영 중단</span>
                      </>
                    ) : overdueOccupancy ? (
                      <>
                        <AlertOctagon className="w-3.5 h-3.5 text-yellow-300" />
                        <span className="truncate">
                          🚨 미철거 경고: [{overdueOccupancy.requesterDept}] ~{overdueOccupancy.endDate} 종료
                        </span>
                      </>
                    ) : activeOccupancy ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-blue-200" />
                        <span className="truncate">
                          🔵 현재 게시중: [{activeOccupancy.requesterDept}] ~{activeOccupancy.endDate}까지
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                        <span>🟢 현재 공실 · 즉시 신청 가능</span>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-[11px] opacity-80 shrink-0 ml-2">
                    {spot.spotId}
                  </span>
                </div>

                {/* Spot Photo with Badge Overlay - Auto-fit whole image without cropping */}
                <div className="relative h-64 sm:h-72 w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden group flex items-center justify-center">
                  {/* Ambient Blurred Background for visual atmosphere */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImg}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110 pointer-events-none"
                  />

                  {/* Main Foreground Image: 100% visible (object-contain, auto-adjusted) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImg}
                    alt={spot.spotName}
                    className="relative z-10 max-h-full max-w-full object-contain p-2 group-hover:scale-[1.03] transition-transform duration-300 cursor-pointer drop-shadow-md"
                    onClick={() =>
                      onPreviewImage(
                        currentImg,
                        spot.spotName,
                        `${spot.zoneName} · ${spot.spotId} (${viewType === 'front' ? '현장 정면 사진' : '현장 원경 사진'})`
                      )
                    }
                  />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/70 text-white backdrop-blur border border-white/20 shadow-xs">
                      {spot.zoneName}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold backdrop-blur border shadow-xs ${
                        spot.mediaType === 'BANNER'
                          ? 'bg-indigo-900/90 text-indigo-200 border-indigo-500/50'
                          : spot.mediaType === 'PLACARD'
                          ? 'bg-purple-900/90 text-purple-200 border-purple-500/50'
                          : spot.mediaType === 'POSTER'
                          ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/50'
                          : 'bg-cyan-900/90 text-cyan-200 border-cyan-500/50'
                      }`}
                    >
                      {spot.mediaType}
                    </span>
                    {spot.trafficLevel && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/95 text-white backdrop-blur border border-amber-400/50 shadow-xs">
                        유동 {spot.trafficLevel}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                    {/* Dual photo switch toggle */}
                    {spot.rearImageUrl && (
                      <div className="flex items-center bg-black/80 backdrop-blur rounded-full p-0.5 border border-white/20 text-[10px] shadow-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoViews((prev) => ({ ...prev, [spot.spotId]: 'front' }));
                          }}
                          className={`px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                            viewType === 'front' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          정면
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoViews((prev) => ({ ...prev, [spot.spotId]: 'rear' }));
                          }}
                          className={`px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                            viewType === 'rear' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          원경
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Image Caption */}
                  <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 text-white text-xs flex justify-between items-end">
                    <span className="text-[11px] font-semibold text-slate-200">
                      {viewType === 'front' ? '정면 상세 컷' : '원경/주변 조망 컷'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewImage(
                          currentImg,
                          spot.spotName,
                          `${spot.zoneName} · ${spot.spotId} (${viewType === 'front' ? '현장 정면 사진' : '현장 원경 사진'})`
                        )
                      }
                      className="text-[11px] text-white hover:text-indigo-200 font-bold flex items-center gap-1 underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>전체 원본 확대</span>
                    </button>
                  </div>
                </div>

                {/* Spot Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Spot Name */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                        {spot.spotName}
                      </h3>
                    </div>

                    {/* Spot Description by Admin */}
                    {spot.description && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        {spot.description}
                      </p>
                    )}

                    {/* Exact Dimensions with Prominent Copy Spec Button */}
                    <div className="mt-3 p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Ruler className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="text-slate-500 font-semibold">제작 규격:</span>
                          <strong className="font-mono text-slate-900 tabular-nums text-sm font-extrabold">
                            {formatDimensions(spot.specWidthMm, spot.specHeightMm)}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopySpecs(e, spot)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            copiedSpotId === spot.spotId
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 shadow-xs'
                          }`}
                          title="외주 제작 업체 전달용 규격 정보 복사"
                        >
                          {copiedSpotId === spot.spotId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>복사됨!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-indigo-500" />
                              <span>규격 복사</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Finishing Guide */}
                      <div className="flex items-start gap-1.5 text-xs text-slate-600 pt-1.5 border-t border-slate-200/70">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-700 leading-tight font-medium">
                          {spot.finishingGuide}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button: Book */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={!spot.isActive}
                      onClick={() => onOpenReservation(spot)}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{spot.isActive ? '이 거점에 예약 신청하기' : '사용 중지된 거점입니다'}</span>
                    </button>

                    {/* Collapsible Accordion Trigger */}
                    <button
                      type="button"
                      onClick={() => setExpandedSpotId(isExpanded ? null : spot.spotId)}
                      className="w-full py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span>
                        예약 및 점유 일정 ({spotReservations.length}건
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
                      <span>해당 거점 예약 및 점유 히스토리</span>
                    </h5>

                    {spotReservations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center bg-white rounded-xl border border-slate-200">
                        현재 등록된 예약 일정이 없습니다. (바로 신청 가능)
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {spotReservations.map((res) => {
                          const meta = STATUS_META[res.status];
                          return (
                            <div
                              key={res.reservationId}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.bg} ${meta.text} ${meta.border}`}
                                >
                                  {meta.label}
                                </span>
                                <span className="font-mono text-[11px] text-slate-600 font-bold tabular-nums">
                                  {res.startDate} ~ {res.endDate}
                                </span>
                              </div>
                              <div className="font-bold text-slate-800 truncate" title={res.title}>
                                {res.title}
                              </div>
                              <div className="text-[11px] text-slate-500 flex justify-between items-center">
                                <span>{res.requesterDept} {res.requesterName}</span>
                                {res.installedImageUrl && (
                                  <button
                                    onClick={() =>
                                      onPreviewImage(res.installedImageUrl!, res.title, '현장 설치 인증 사진')
                                    }
                                    className="text-emerald-700 underline font-bold hover:text-emerald-900 cursor-pointer"
                                  >
                                    설치인증샷 확인
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

      {/* Image Regulation Guidelines Modal */}
      <ImageRegulationModal
        isOpen={isRegulationOpen}
        onClose={() => setIsRegulationOpen(false)}
      />
    </div>
  );
};
