export type MediaType = 'BANNER' | 'PLACARD' | 'POSTER';

export type ReservationStatus =
  | 'PENDING'          // 승인대기
  | 'APPROVED'         // 승인완료
  | 'REJECTED'         // 반려됨
  | 'INSTALLED'        // 게시중
  | 'EXPIRED_OVERDUE'  // 기간만료/미철거
  | 'REMOVED';         // 철거완료

export interface AdSpot {
  spotId: string;           // 거점 고유 코드 (예: "SPOT-LOBBY-01")
  zoneName: string;         // 설치 구역 대분류 (예: "본관 실내", "중앙 광장", "진입로 가로등")
  spotName: string;         // 상세 위치명 (예: "로비 동측 안내데스크 옆")
  mediaType: MediaType;     // 매체 구분 (배너 / 현수막 / 포스터)
  specWidthMm: number;      // 가로 규격 mm (예: 600)
  specHeightMm: number;     // 세로 규격 mm (예: 1800)
  finishingGuide: string;   // 제작/마감 가이드 (예: "단면 출력, 물통형 PET 배너")
  spotImageUrl: string;     // 현장 위치 안내 사진 URL
  isActive: boolean;        // 사용 가능 여부 (파손/보수 시 false)
}

export interface AdReservation {
  reservationId: string;
  spotId: string;
  zoneName: string;
  spotName: string;
  mediaType: MediaType;
  specSummary: string;      // 예: "600 × 1,800 mm"
  requesterName: string;
  requesterDept: string;
  title: string;
  purpose: string;
  startDate: string;        // 'YYYY-MM-DD'
  endDate: string;          // 'YYYY-MM-DD'
  draftImageUrl: string;
  installedImageUrl: string | null;
  status: ReservationStatus;
  rejectReason: string | null;
  createdAt: string;        // ISO 8601 String
  updatedAt: string;        // ISO 8601 String
}

export interface ReservationFilter {
  status?: ReservationStatus | 'ALL';
  zoneName?: string;
  mediaType?: MediaType | 'ALL';
  searchQuery?: string;
  requesterDept?: string;
}

export interface SpotFilter {
  zoneName?: string;
  mediaType?: MediaType | 'ALL';
  searchQuery?: string;
  onlyActive?: boolean;
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  BANNER: '스탠드 배너 (X/Y배너)',
  PLACARD: '대형 현수막',
  POSTER: '벽면 포스터/액자',
};

export const STATUS_META: Record<
  ReservationStatus,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  PENDING: {
    label: '승인대기',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    desc: '관리자 시안 및 일정 검토 중',
  },
  APPROVED: {
    label: '승인완료',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    desc: '인쇄 발주 및 현장 설치 가능',
  },
  REJECTED: {
    label: '반려됨',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    desc: '사유 확인 후 재신청 필요',
  },
  INSTALLED: {
    label: '게시중',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    desc: '현장 실물 설치 및 인증 완료',
  },
  EXPIRED_OVERDUE: {
    label: '기간만료/미철거',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-300',
    desc: '게시 기간 초과! 즉시 철거 필요',
  },
  REMOVED: {
    label: '철거완료',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    desc: '현장 철거 후 거점 점유 해제',
  },
};
