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
  BookOpen,
  Layers,
  CheckCircle2,
  AlertOctagon,
  Eye,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  ChevronRight,
  Zap,
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
type ViewMode = 'STEP_FLOW' | 'ALL_GRID';
type ZoneCategoryFilter = 'ALL' | 'ONSITE' | 'AVAILABLE_ONLY' | 'ONLINE';

const ONLINE_ZONES = ['디지털 & 공식 웹', '대외 홍보 네트워크'];

interface ZoneMeta {
  zoneName: string;
  isOnline: boolean;
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  overdueSpots: number;
  representativeImageUrl: string;
  mediaTypes: MediaType[];
}

export const SpotExplorerView: React.FC<SpotExplorerViewProps> = ({
  spots,
  reservations,
  onOpenReservation,
  onPreviewImage,
}) => {
  const toast = useToast();

  // Mode & Selection State
  const [viewMode, setViewMode] = useState<ViewMode>('STEP_FLOW');
  // null = Step 1 (Zone Selection Screen), string = Step 2 (Spot Selection for that Zone)
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<AdSpot | null>(null);
  const [zoneCategory, setZoneCategory] = useState<ZoneCategoryFilter>('ALL');

  // Filters
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType | 'ALL'>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // UI Interactive States
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

  // Overall counts for availability
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

  // Zone metadata list for Step 1 (Physical Belleforet resort zones prioritized first!)
  const zoneMetaList = useMemo(() => {
    const zoneMap = new Map<string, ZoneMeta>();

    spots.forEach((spot) => {
      const info = spotOccupancyMap.get(spot.spotId);
      const isAvail = info?.isAvailable ?? false;
      const isOcc = Boolean(info?.active);
      const isOver = Boolean(info?.overdue);

      if (!zoneMap.has(spot.zoneName)) {
        zoneMap.set(spot.zoneName, {
          zoneName: spot.zoneName,
          isOnline: ONLINE_ZONES.includes(spot.zoneName),
          totalSpots: 0,
          availableSpots: 0,
          occupiedSpots: 0,
          overdueSpots: 0,
          representativeImageUrl: spot.spotImageUrl,
          mediaTypes: [],
        });
      }

      const meta = zoneMap.get(spot.zoneName)!;
      meta.totalSpots++;
      if (isOver) meta.overdueSpots++;
      else if (isOcc) meta.occupiedSpots++;
      else if (isAvail) meta.availableSpots++;

      if (!meta.mediaTypes.includes(spot.mediaType)) {
        meta.mediaTypes.push(spot.mediaType);
      }

      // Prioritize an existing valid spot photo
      if (
        (!meta.representativeImageUrl || meta.representativeImageUrl.includes('placeholder')) &&
        spot.spotImageUrl
      ) {
        meta.representativeImageUrl = spot.spotImageUrl;
      }
    });

    const list = Array.from(zoneMap.values());
    // Sort so on-site physical zones appear first, and online/external PR networks appear at the end
    return list.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? 1 : -1;
      return 0;
    });
  }, [spots, spotOccupancyMap]);

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

  // Filter spots for Step 2 or All Grid
  const currentZoneSpots = useMemo(() => {
    return spots.filter((spot) => {
      // In step flow, if a specific zone is selected, restrict to it
      if (viewMode === 'STEP_FLOW' && selectedZone && spot.zoneName !== selectedZone) {
        return false;
      }
      // In grid view, apply selectedZone if not ALL
      if (viewMode === 'ALL_GRID' && selectedZone && selectedZone !== 'ALL' && spot.zoneName !== selectedZone) {
        return false;
      }

      const info = spotOccupancyMap.get(spot.spotId);

      // Availability filter
      if (availabilityFilter === 'AVAILABLE' && !info?.isAvailable) return false;
      if (availabilityFilter === 'OCCUPIED' && !info?.active) return false;
      if (availabilityFilter === 'OVERDUE' && !info?.overdue) return false;

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
  }, [
    spots,
    spotOccupancyMap,
    viewMode,
    selectedZone,
    availabilityFilter,
    selectedMediaType,
    searchQuery,
  ]);

  // Filtered zones for Step 1 search & category
  const filteredZones = useMemo(() => {
    return zoneMetaList.filter((z) => {
      if (zoneCategory === 'ONSITE' && z.isOnline) return false;
      if (zoneCategory === 'ONLINE' && !z.isOnline) return false;
      if (zoneCategory === 'AVAILABLE_ONLY' && z.availableSpots === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchZone = z.zoneName.toLowerCase().includes(q);
        const matchSpotInside = spots.some(
          (s) =>
            s.zoneName === z.zoneName &&
            (s.spotName.toLowerCase().includes(q) || s.spotId.toLowerCase().includes(q))
        );
        if (!matchZone && !matchSpotInside) return false;
      }
      return true;
    });
  }, [zoneMetaList, zoneCategory, searchQuery, spots]);

  // Current Step Calculation
  // 1: Selecting Zone, 2: Selecting Spot, 3: Spot Selected (Ready to Book)
  const currentStep = useMemo(() => {
    if (viewMode === 'ALL_GRID') return 2;
    if (!selectedZone) return 1;
    if (selectedSpot) return 3;
    return 2;
  }, [viewMode, selectedZone, selectedSpot]);

  return (
    <div className="space-y-6 pb-24">
      {/* 1. PROGRESS STEP INDICATOR (사용자 직관적 진행 가이드) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 tracking-wide block">
              누구나 쉬운 3단계 홍보물 예약
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {currentStep === 1
                ? '1단계: 먼저 설치할 장소를 선택해 주세요'
                : currentStep === 2
                ? `2단계: [${selectedZone === 'ALL' ? '전체 장소' : selectedZone}] 안에서 설치할 위치를 선택해 주세요`
                : `3단계: [${selectedSpot?.spotName}] 예약 날짜와 시안을 입력해 주세요`}
            </h2>
          </div>

          {/* SOP Modal & Mode Switch */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRegulationOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="홍보물 사진 촬영 및 파일 등록 안내"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>사진 촬영 안내</span>
            </button>

            {/* View Mode Toggle: Step Flow vs All Grid */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'STEP_FLOW') {
                  setViewMode('ALL_GRID');
                  setSelectedZone('ALL');
                } else {
                  setViewMode('STEP_FLOW');
                  setSelectedZone(null);
                  setSelectedSpot(null);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{viewMode === 'STEP_FLOW' ? '전체 위치 한눈에 보기' : '장소별 단계 선택으로 보기'}</span>
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="pt-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Step 1 Button */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'ALL_GRID') setViewMode('STEP_FLOW');
                setSelectedZone(null);
                setSelectedSpot(null);
              }}
              className={`flex items-center gap-2 text-left transition-all cursor-pointer ${
                currentStep === 1
                  ? 'text-indigo-600 font-bold'
                  : currentStep > 1
                  ? 'text-emerald-700 font-bold hover:text-emerald-900'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                  currentStep === 1
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] text-slate-400 font-medium">STEP 1</p>
                <p className="text-xs">장소(구역) 선택</p>
                {selectedZone && (
                  <p className="text-[10px] text-emerald-600 font-bold truncate max-w-[120px]">
                    {selectedZone}
                  </p>
                )}
              </div>
            </button>

            <div
              className={`h-0.5 flex-1 mx-2 sm:mx-4 transition-colors ${
                currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />

            {/* Step 2 Button */}
            <button
              type="button"
              disabled={!selectedZone && viewMode !== 'ALL_GRID'}
              onClick={() => setSelectedSpot(null)}
              className={`flex items-center gap-2 text-left transition-all ${
                selectedZone || viewMode === 'ALL_GRID' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              } ${
                currentStep === 2
                  ? 'text-indigo-600 font-bold'
                  : currentStep > 2
                  ? 'text-emerald-700 font-bold hover:text-emerald-900'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                  currentStep === 2
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] text-slate-400 font-medium">STEP 2</p>
                <p className="text-xs">거점 위치/규격 선택</p>
                {selectedSpot && (
                  <p className="text-[10px] text-emerald-600 font-bold truncate max-w-[120px]">
                    {selectedSpot.spotName}
                  </p>
                )}
              </div>
            </button>

            <div
              className={`h-0.5 flex-1 mx-2 sm:mx-4 transition-colors ${
                currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />

            {/* Step 3 */}
            <div
              className={`flex items-center gap-2 text-left ${
                currentStep === 3 ? 'text-indigo-600 font-bold' : 'text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                  currentStep === 3
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 animate-pulse'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                3
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] text-slate-400 font-medium">STEP 3</p>
                <p className="text-xs">예약 신청서 작성</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STEP 1: ZONE (PLACE) FIRST SELECTION SCREEN                            */}
      {/* ========================================================================= */}
      {viewMode === 'STEP_FLOW' && !selectedZone && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Card with Search */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70 rounded-2xl p-5 sm:p-6 border border-indigo-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                    1단계 장소 선택
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    총 {zoneMetaList.length}개 주요 구역 · {spots.length}개 거점
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                  어느 장소에 홍보물을 설치하시겠습니까?
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  원하는 장소(구역)를 클릭하면 해당 장소에 설치 가능한 모든 배너·포맥스 거점 상세 화면으로 직관적으로 이동합니다.
                </p>
              </div>

              {/* Overall Availability Pills */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>즉시 가능 {availabilityCounts.available}곳</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>게시중 {availabilityCounts.occupied}곳</span>
                </div>
              </div>
            </div>

            {/* Quick Zone Category Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL', label: `전체 장소 (${zoneMetaList.length}곳)` },
                {
                  id: 'ONSITE',
                  label: `🏞️ 단지 내 현장 설치 장소 (${zoneMetaList.filter((z) => !z.isOnline).length}곳)`,
                },
                {
                  id: 'AVAILABLE_ONLY',
                  label: `🟢 지금 빈자리 있는 장소만 (${zoneMetaList.filter((z) => z.availableSpots > 0).length}곳)`,
                },
                {
                  id: 'ONLINE',
                  label: `🌐 온라인·대외 홍보 (${zoneMetaList.filter((z) => z.isOnline).length}곳)`,
                },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setZoneCategory(cat.id as ZoneCategoryFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    zoneCategory === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Live Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="설치할 장소나 건물 이름을 검색하세요 (예: 웰컴센터, 투썸, 남도예담, 목장, 콘도)..."
                className="w-full pl-9 pr-9 py-3 bg-white border border-slate-300 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Place Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredZones.map((zone) => {
              const hasAvailable = zone.availableSpots > 0;
              return (
                <div
                  key={zone.zoneName}
                  onClick={() => {
                    setSelectedZone(zone.zoneName);
                    setSelectedSpot(null);
                  }}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-xs hover:shadow-xl transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between hover:-translate-y-1"
                >
                  {/* Photo Preview Banner */}
                  <div className="relative h-44 bg-slate-950 overflow-hidden flex items-center justify-center">
                    {/* Ambient Blurred Background */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={zone.representativeImageUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-110 pointer-events-none"
                    />

                    {/* Main Photo (100% visible) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={zone.representativeImageUrl}
                      alt={zone.zoneName}
                      className="relative z-10 max-h-full max-w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                    />

                    {/* Availability Badge Overlay */}
                    <div className="absolute top-3 left-3 z-20">
                      {hasAvailable ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-600/95 text-white backdrop-blur border border-emerald-400/40 shadow-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>빈자리 {zone.availableSpots}곳 즉시 가능</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-900/90 text-blue-200 backdrop-blur border border-blue-500/40 shadow-xs">
                          현재 모두 게시중 (다음 날짜 예약 가능)
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-bold backdrop-blur">
                      전체 {zone.totalSpots}개 위치
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="flex items-center gap-1 text-indigo-600">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{zone.isOnline ? '온라인·대외 홍보' : '단지 내 설치 장소'}</span>
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors">
                        {zone.zoneName}
                      </h4>

                      {/* Media Types Tags */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {zone.mediaTypes.map((mt) => (
                          <span
                            key={mt}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            {MEDIA_TYPE_LABELS[mt] || mt}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Button: Choose this Zone */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-indigo-600 group-hover:text-indigo-700">
                      <span>이 장소 선택하기 (위치 {zone.totalSpots}곳 보기)</span>
                      <div className="w-7 h-7 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STEP 2: SPOT SELECTION IN SELECTED ZONE (OR ALL GRID VIEW)              */}
      {/* ========================================================================= */}
      {(selectedZone || viewMode === 'ALL_GRID') && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Bar for Selected Zone */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            {/* Quick Horizontal Zone Switcher so user can switch places in 1 click without going back */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setViewMode('STEP_FLOW');
                  setSelectedZone(null);
                  setSelectedSpot(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>장소 목록으로</span>
              </button>

              <span className="text-slate-300 mx-1">|</span>

              {zoneMetaList.map((z) => {
                const isActiveZone = selectedZone === z.zoneName;
                return (
                  <button
                    key={z.zoneName}
                    type="button"
                    onClick={() => {
                      setSelectedZone(z.zoneName);
                      setSelectedSpot(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                      isActiveZone
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{z.zoneName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActiveZone ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {z.availableSpots}/{z.totalSpots}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                      {viewMode === 'STEP_FLOW' ? '2단계: 세부 위치 및 치수 선택' : '전체 위치 목록'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      표시된 위치: <strong className="text-slate-900 font-bold">{currentZoneSpots.length}</strong>곳
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 mt-1">
                    <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span>{selectedZone === 'ALL' ? '전체 설치 위치 통합 보기' : `${selectedZone} — 설치할 위치를 선택해 주세요`}</span>
                  </h3>
                </div>
              </div>

              {/* Status Filter Tabs (ALL / AVAILABLE / OCCUPIED / OVERDUE) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: '전체' },
                  { id: 'AVAILABLE', label: '🟢 즉시 신청 가능' },
                  { id: 'OCCUPIED', label: '🔵 현재 게시중' },
                  { id: 'OVERDUE', label: '🚨 미철거 경고' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAvailabilityFilter(f.id as AvailabilityFilter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      availabilityFilter === f.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Type & Search Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
              <div className="md:col-span-8 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-purple-500" />
                  <span>매체:</span>
                </span>
                {[
                  { id: 'ALL', label: '전체' },
                  { id: 'BANNER', label: '배너' },
                  { id: 'PLACARD', label: '현수막' },
                  { id: 'POSTER', label: '포맥스·POP' },
                  { id: 'DIGITAL', label: '디지털' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedMediaType(tab.id as MediaType | 'ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      selectedMediaType === tab.id
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="거점명, 규격, 마감 검색..."
                  className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Spots Grid */}
          {currentZoneSpots.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 text-base">선택한 조건에 일치하는 거점이 없습니다.</h4>
              <p className="text-xs text-slate-500 mt-1">필터 조건을 완화하거나 검색어를 재설정해 보세요.</p>
              <button
                onClick={() => {
                  setSelectedMediaType('ALL');
                  setAvailabilityFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {currentZoneSpots.map((spot) => {
                const occupancy = spotOccupancyMap.get(spot.spotId);
                const activeOccupancy = occupancy?.active;
                const overdueOccupancy = occupancy?.overdue;
                const upcomingCount = occupancy?.upcoming.length || 0;
                const spotReservations = occupancy?.all || [];
                const isAvailable = occupancy?.isAvailable ?? false;

                const isSelected = selectedSpot?.spotId === spot.spotId;
                const isExpanded = expandedSpotId === spot.spotId;

                // Dual view photo state
                const viewType = photoViews[spot.spotId] || 'front';
                const currentImg = viewType === 'rear' && spot.rearImageUrl ? spot.rearImageUrl : spot.spotImageUrl;

                return (
                  <div
                    key={spot.spotId}
                    onClick={() => setSelectedSpot(spot)}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500 shadow-lg'
                        : !spot.isActive
                        ? 'border-slate-200 opacity-60'
                        : overdueOccupancy
                        ? 'border-red-300 shadow-sm shadow-red-100/50'
                        : isAvailable
                        ? 'border-emerald-200/90 hover:border-emerald-400 hover:shadow-md'
                        : 'border-slate-200 hover:shadow-md hover:border-indigo-300'
                    }`}
                  >
                    {/* Visual Status Ribbon Banner */}
                    <div
                      className={`px-4 py-1.5 text-xs font-bold flex items-center justify-between text-white ${
                        isSelected
                          ? 'bg-indigo-700'
                          : !spot.isActive
                          ? 'bg-slate-700'
                          : overdueOccupancy
                          ? 'bg-gradient-to-r from-red-600 to-rose-700 animate-pulse'
                          : activeOccupancy
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-700'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            <span>현재 선택됨 (예약 진행 준비)</span>
                          </>
                        ) : !spot.isActive ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-slate-300" />
                            <span>⛔ 시설 보수 / 운영 중단</span>
                          </>
                        ) : overdueOccupancy ? (
                          <>
                            <AlertOctagon className="w-3.5 h-3.5 text-yellow-300" />
                            <span className="truncate">
                              🚨 미철거 경고: [{overdueOccupancy.requesterDept}] ~{overdueOccupancy.endDate}
                            </span>
                          </>
                        ) : activeOccupancy ? (
                          <>
                            <Clock className="w-3.5 h-3.5 text-blue-200" />
                            <span className="truncate">
                              🔵 현재 게시중: [{activeOccupancy.requesterDept}] ~{activeOccupancy.endDate}
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                            <span>🟢 공실 · 즉시 신청 가능</span>
                          </>
                        )}
                      </div>
                      <span className="font-mono text-[11px] opacity-80 shrink-0 ml-2">
                        {spot.spotId}
                      </span>
                    </div>

                    {/* Spot Photo with Badge Overlay - 100% visible (object-contain) */}
                    <div className="relative h-64 sm:h-72 w-full bg-slate-950 overflow-hidden group flex items-center justify-center">
                      {/* Ambient Blurred Background */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentImg}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110 pointer-events-none"
                      />

                      {/* Foreground Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentImg}
                        alt={spot.spotName}
                        className="relative z-10 max-h-full max-w-full object-contain p-2 group-hover:scale-[1.03] transition-transform duration-300 drop-shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewImage(
                            currentImg,
                            spot.spotName,
                            `${spot.zoneName} · ${spot.spotId} (${viewType === 'front' ? '현장 정면 사진' : '현장 원경 사진'})`
                          );
                        }}
                      />

                      {/* Badges */}
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
                      </div>

                      {/* Dual photo switch toggle */}
                      {spot.rearImageUrl && (
                        <div className="absolute top-3 right-3 z-20 flex items-center bg-black/80 backdrop-blur rounded-full p-0.5 border border-white/20 text-[10px] shadow-xs">
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

                      {/* Bottom Image Caption */}
                      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 text-white text-xs flex justify-between items-end">
                        <span className="text-[11px] font-semibold text-slate-200">
                          {viewType === 'front' ? '정면 상세 컷' : '원경/주변 조망 컷'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewImage(
                              currentImg,
                              spot.spotName,
                              `${spot.zoneName} · ${spot.spotId} (${viewType === 'front' ? '현장 정면 사진' : '현장 원경 사진'})`
                            );
                          }}
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
                          <h4 className="font-black text-slate-900 text-base leading-snug">
                            {spot.spotName}
                          </h4>
                        </div>

                        {/* Description */}
                        {spot.description && (
                          <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                            {spot.description}
                          </p>
                        )}

                        {/* Dimensions & Copy Specs */}
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

                      {/* Main Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={!spot.isActive}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSpot(spot);
                            onOpenReservation(spot);
                          }}
                          className={`w-full py-2.5 px-4 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            !spot.isActive
                              ? 'bg-slate-300 text-white cursor-not-allowed'
                              : isAvailable
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          <span>
                            {!spot.isActive
                              ? '시설 점검 중 (예약 불가)'
                              : isAvailable
                              ? '이 위치 선택 · 바로 예약 신청하기 ➔'
                              : `현재 게시중 (~${activeOccupancy?.endDate.slice(5)}) · 다음 날짜 예약하기 ➔`}
                          </span>
                        </button>

                        {/* Collapsible Accordion Trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSpotId(isExpanded ? null : spot.spotId);
                          }}
                          className="w-full py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span>
                            점유 일정 ({spotReservations.length}건
                            {upcomingCount > 0 && `, 예정 ${upcomingCount}건`})
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Accordion Content */}
                    {isExpanded && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="border-t border-slate-200 bg-slate-50 p-4 space-y-2.5 animate-in slide-in-from-top-2 duration-150"
                      >
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
                                        type="button"
                                        onClick={() =>
                                          onPreviewImage(res.installedImageUrl!, res.title, '현장 설치 인증 사진')
                                        }
                                        className="text-emerald-700 underline font-bold hover:text-emerald-900 cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* 4. STEP 3: STICKY BOTTOM ACTION BAR (직관적 다음 단계 진행)                 */}
      {/* ========================================================================= */}
      {selectedSpot && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-indigo-200 shadow-2xl p-3 sm:p-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Spot Thumbnail & Details */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedSpot.spotImageUrl}
                  alt={selectedSpot.spotName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    선택된 거점
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 font-bold">
                    {selectedSpot.spotId}
                  </span>
                </div>
                <p className="font-black text-slate-900 text-sm truncate">
                  {selectedSpot.zoneName} · {selectedSpot.spotName}
                </p>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                  규격: {formatDimensions(selectedSpot.specWidthMm, selectedSpot.specHeightMm)}
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={(e) => handleCopySpecs(e, selectedSpot)}
                className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>규격 복사</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenReservation(selectedSpot)}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Calendar className="w-4 h-4" />
                <span>3단계: 예약 신청서 작성하기 (다음 ➔)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Regulation SOP Modal */}
      <ImageRegulationModal
        isOpen={isRegulationOpen}
        onClose={() => setIsRegulationOpen(false)}
      />
    </div>
  );
};
