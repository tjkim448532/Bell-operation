'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  ClipboardList,
  ShieldCheck,
  Building,
  Layers,
  Sparkles,
  Calendar,
  AlertOctagon,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { AdSpot, AdReservation, UserProfile } from '@/types/adSpot';
import { adSpotService } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { ToastProvider, useToast } from '@/components/Toast';
import { SpotExplorerView } from '@/components/SpotExplorerView';
import { MyReservationsView } from '@/components/MyReservationsView';
import { AdminManageView } from '@/components/AdminManageView';
import { ReservationModal } from '@/components/ReservationModal';
import { CameraUploadModal } from '@/components/CameraUploadModal';
import { RejectReasonModal } from '@/components/RejectReasonModal';
import { AdminSpotModal } from '@/components/AdminSpotModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { UserProfileModal } from '@/components/UserProfileModal';

type ActiveView = 'SPOTS' | 'MY_RESERVATIONS' | 'ADMIN';

const DEFAULT_PROFILE: UserProfile = {
  empId: '20240101',
  name: '김철수',
  dept: '경영지원팀',
};

function AdSpotAppContent() {
  const toast = useToast();

  // App State
  const [activeView, setActiveView] = useState<ActiveView>('SPOTS');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeDept, setActiveDept] = useState<string>('경영지원팀');

  // Load user profile from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('adspot_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.empId && parsed?.name) {
            setUserProfile(parsed);
            if (parsed.dept) setActiveDept(parsed.dept);
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved user profile:', e);
      }
    }
  }, []);

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    setActiveDept(profile.dept);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('adspot_user_profile', JSON.stringify(profile));
      } catch (e) {
        console.warn('Failed to save profile to localStorage:', e);
      }
    }
  };

  const [spots, setSpots] = useState<AdSpot[]>([]);
  const [reservations, setReservations] = useState<AdReservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedSpotForBooking, setSelectedSpotForBooking] = useState<AdSpot | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const [reservationForCamera, setReservationForCamera] = useState<AdReservation | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [reservationForReject, setReservationForReject] = useState<AdReservation | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRejectReadOnly, setIsRejectReadOnly] = useState(false);

  const [spotForEdit, setSpotForEdit] = useState<AdSpot | null>(null);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);

  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [spotsData, reservationsData] = await Promise.all([
        adSpotService.getSpots(),
        adSpotService.getReservations(),
      ]);
      setSpots(spotsData);
      setReservations(reservationsData);
    } catch (err: any) {
      toast.error('데이터 조회 오류', err?.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Admin Toggle
  const handleToggleAdmin = () => {
    const nextAdmin = !isAdmin;
    setIsAdmin(nextAdmin);
    if (nextAdmin) {
      setActiveView('ADMIN');
      toast.info('관리자 모드 활성화', '시안 검토(HITL) 및 거점 마스터 관리 권한이 부여되었습니다.');
    } else {
      setActiveView('SPOTS');
      toast.info('신청자 모드 전환', '거점 탐색 및 현장 자율 게시 관리 모드로 전환되었습니다.');
    }
  };

  // Reset to seeds
  const handleResetSeed = async () => {
    const { spots: s, reservations: r } = await adSpotService.resetToSeed();
    setSpots(s);
    setReservations(r);
  };

  // Open booking modal
  const handleOpenReservation = (spot: AdSpot) => {
    setSelectedSpotForBooking(spot);
    setIsBookingOpen(true);
  };

  // Open camera upload
  const handleOpenUploadCamera = (res: AdReservation) => {
    setReservationForCamera(res);
    setIsCameraOpen(true);
  };

  // Open reject modal (Admin)
  const handleOpenRejectModal = (res: AdReservation) => {
    setReservationForReject(res);
    setIsRejectReadOnly(false);
    setIsRejectOpen(true);
  };

  // Open reject reason (User read-only)
  const handleOpenRejectReadOnly = (res: AdReservation) => {
    setReservationForReject(res);
    setIsRejectReadOnly(true);
    setIsRejectOpen(true);
  };

  // Open spot edit/create
  const handleOpenSpotModal = (spot: AdSpot | null) => {
    setSpotForEdit(spot);
    setIsSpotModalOpen(true);
  };

  // Open image preview
  const handlePreviewImage = (url: string, title: string, subtitle?: string) => {
    setPreviewImage({ url, title, subtitle });
  };

  // Calculated counters
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = reservations.filter(
    (r) => r.status === 'EXPIRED_OVERDUE' || (r.status === 'INSTALLED' && r.endDate < todayStr)
  ).length;
  const pendingCount = reservations.filter((r) => r.status === 'PENDING').length;
  const myReservationsCount = reservations.filter((r) => r.requesterDept === activeDept).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <Header
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
        activeDept={activeDept}
        onChangeDept={setActiveDept}
        userProfile={userProfile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onResetSeed={handleResetSeed}
        isCloud={adSpotService.isCloudConnected()}
        overdueCount={overdueCount}
      />

      {/* Main Layout Container (Desktop Sidebar + Content Area) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 md:pb-8">
        {/* Desktop Left Sidebar (>= 768px) */}
        <aside className="hidden md:flex flex-col w-64 p-4 border-r border-slate-200/80 bg-white/60 shrink-0 space-y-6">
          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveView('SPOTS')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'SPOTS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>1. 장소 선택 및 예약하기</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  activeView === 'SPOTS'
                    ? 'bg-indigo-700 text-indigo-100'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {spots.length}곳
              </span>
            </button>

            <button
              onClick={() => setActiveView('MY_RESERVATIONS')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'MY_RESERVATIONS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>2. 내 예약 / 설치·철거 인증</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  activeView === 'MY_RESERVATIONS'
                    ? 'bg-indigo-700 text-indigo-100'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {myReservationsCount}건
              </span>
            </button>

            <button
              onClick={() => {
                if (!isAdmin) setIsAdmin(true);
                setActiveView('ADMIN');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'ADMIN'
                  ? 'bg-purple-700 text-white shadow-md shadow-purple-100'
                  : 'text-slate-600 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>3. 관리자 승인 및 장소 관리</span>
              </div>
              {pendingCount > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                  대기 {pendingCount}
                </span>
              ) : (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    activeView === 'ADMIN'
                      ? 'bg-purple-800 text-purple-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  관리
                </span>
              )}
            </button>
          </nav>

          {/* Easy Step-by-Step Usage Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 rounded-2xl border border-indigo-100 text-xs space-y-2.5">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>이용 방법 (3단계 요약)</span>
            </div>
            <ol className="text-[11px] text-slate-600 space-y-1.5 leading-relaxed list-decimal pl-4 font-medium">
              <li><strong>장소 선택:</strong> 설치할 구역과 세부 위치를 고릅니다.</li>
              <li><strong>예약 신청:</strong> 게시 기간과 제목을 입력해 신청합니다.</li>
              <li><strong>설치·철거 인증:</strong> 승인 후 현장에 설치하면 사진을 찍어 올리고, 기간 종료 시 철거 완료를 누릅니다.</li>
            </ol>
          </div>

          {/* Spot Status Summary Widget */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
            <p className="text-[11px] font-bold text-slate-500">
              전체 홍보물 위치 현황
            </p>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">등록된 전체 위치</span>
              <span className="font-bold text-slate-900 font-mono tabular-nums">{spots.length}곳</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">정상 운영 위치</span>
              <span className="font-bold text-emerald-600 font-mono tabular-nums">
                {spots.filter((s) => s.isActive).length}곳
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">기간만료 철거 필요</span>
              <span className="font-bold text-red-600 font-mono tabular-nums">
                {overdueCount}건
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500">홍보 거점 및 예약 데이터 동기화 중...</p>
            </div>
          ) : (
            <>
              {activeView === 'SPOTS' && (
                <SpotExplorerView
                  spots={spots}
                  reservations={reservations}
                  onOpenReservation={handleOpenReservation}
                  onPreviewImage={handlePreviewImage}
                />
              )}

              {activeView === 'MY_RESERVATIONS' && (
                <MyReservationsView
                  reservations={reservations}
                  activeDept={activeDept}
                  userProfile={userProfile}
                  onRefresh={loadData}
                  onOpenUploadCamera={handleOpenUploadCamera}
                  onOpenRejectReason={handleOpenRejectReadOnly}
                  onPreviewImage={handlePreviewImage}
                />
              )}

              {activeView === 'ADMIN' && (
                <AdminManageView
                  spots={spots}
                  reservations={reservations}
                  onRefresh={loadData}
                  onOpenSpotModal={handleOpenSpotModal}
                  onOpenRejectModal={handleOpenRejectModal}
                  onPreviewImage={handlePreviewImage}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveView('SPOTS')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeView === 'SPOTS' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">거점 탐색</span>
        </button>

        <button
          onClick={() => setActiveView('MY_RESERVATIONS')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
            activeView === 'MY_RESERVATIONS'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">신청/게시</span>
          {overdueCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-red-600" />
          )}
        </button>

        <button
          onClick={() => {
            if (!isAdmin) setIsAdmin(true);
            setActiveView('ADMIN');
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
            activeView === 'ADMIN' ? 'text-purple-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">관리자</span>
          {pendingCount > 0 && (
            <span className="absolute top-0 right-2 px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </nav>

      {/* Global Modals */}
      <ReservationModal
        spot={selectedSpotForBooking}
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setSelectedSpotForBooking(null);
        }}
        onSuccess={loadData}
        defaultDept={activeDept}
        userProfile={userProfile}
        existingReservations={reservations}
      />

      <CameraUploadModal
        reservation={reservationForCamera}
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setReservationForCamera(null);
        }}
        onSuccess={loadData}
      />

      <RejectReasonModal
        reservation={reservationForReject}
        isOpen={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false);
          setReservationForReject(null);
        }}
        onSuccess={loadData}
        readOnly={isRejectReadOnly}
      />

      <AdminSpotModal
        spotToEdit={spotForEdit}
        isOpen={isSpotModalOpen}
        onClose={() => {
          setIsSpotModalOpen(false);
          setSpotForEdit(null);
        }}
        onSuccess={loadData}
      />

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || null}
        title={previewImage?.title || ''}
        subtitle={previewImage?.subtitle}
      />

      {/* User Profile / Employee ID Login Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={userProfile}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <AdSpotAppContent />
    </ToastProvider>
  );
}
