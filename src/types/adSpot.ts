export type MediaType = 'BANNER' | 'PLACARD' | 'POSTER' | 'DIGITAL';

export type ReservationStatus =
  | 'PENDING'          // 승인대기
  | 'APPROVED'         // 승인완료
  | 'REJECTED'         // 반려됨
  | 'INSTALLED'        // 게시중
  | 'EXPIRED_OVERDUE'  // 기간만료/미철거
  | 'REMOVED';         // 철거완료

export interface AdSpot {
  spotId: string;           // 거점 고유 코드 (예: "SPOT-001")
  zoneName: string;         // 설치 구역 대분류 (예: "웰컴센터", "정문 및 진입로", "투썸 및 광장 정류장")
  spotName: string;         // 상세 위치명 (예: "웰컴센터 테이블 POP 5개소")
  mediaType: MediaType;     // 매체 구분 (배너 / 현수막 / 포스터·포맥스 / 디지털)
  specWidthMm: number;      // 가로 규격 mm (예: 600)
  specHeightMm: number;     // 세로 규격 mm (예: 1800)
  quantity?: string;        // 수량 (예: "4개", "9개", "5면")
  finishingGuide: string;   // 제작/마감 가이드 (예: "단면 출력, 물통형 PET 배너", "포맥스 3T 부착")
  description?: string;     // 장소에 관한 상세 설명 및 위치 특성 (Admin 작성/수정)
  spotImageUrl: string;     // 현장 정면 사진 URL (현장사진 정면)
  rearImageUrl?: string | null; // 현장 원경/배경 사진 URL (현장사진 원면)
  isActive: boolean;        // 사용 가능 여부
  trafficLevel?: '상' | '중' | '하'; // 통행량/유동인구 (시트 데이터 연계)
}

export interface AdReservation {
  reservationId: string;
  spotId: string;
  zoneName: string;
  spotName: string;
  mediaType: MediaType;
  specSummary: string;      // 예: "600 × 1,800 mm"
  requesterEmpId?: string;  // 신청자 사번 (예: "20240101")
  requesterName: string;    // 신청자 성명
  requesterDept: string;    // 신청 부서명
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

export interface UserProfile {
  empId: string;    // 사번 (예: "20240101")
  name: string;     // 성명 (예: "김철수")
  dept: string;     // 부서명 (예: "벨포레 운영팀")
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
  BANNER: '배너 (스탠드/물통)',
  PLACARD: '현수막 / 가로등배너',
  POSTER: '포맥스 / 포스터 / POP',
  DIGITAL: '디지털 / 온라인 / 대외홍보',
};

export const STATUS_META: Record<
  ReservationStatus,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  PENDING: {
    label: '승인 대기중',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    desc: '관리자가 내용을 확인하고 있습니다. 승인 후 설치해 주세요.',
  },
  APPROVED: {
    label: '승인됨 (설치 가능)',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    desc: '승인되었습니다! 현장에 설치한 뒤 [설치 인증 사진]을 올려주세요.',
  },
  REJECTED: {
    label: '반려됨',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    desc: '반려 사유를 확인하고 내용을 수정해 다시 신청해 주세요.',
  },
  INSTALLED: {
    label: '현장 게시중',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    desc: '현장에 정상 게시 중입니다. 종료일에 철거 후 [철거 완료]를 눌러주세요.',
  },
  EXPIRED_OVERDUE: {
    label: '기간 만료 (철거 필요)',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-300',
    desc: '약속된 게시 기간이 지났습니다! 현장에서 철거 후 [철거 완료]를 눌러주세요.',
  },
  REMOVED: {
    label: '철거 완료',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    desc: '현장 철거가 완료되어 다음 사람이 사용할 수 있는 상태입니다.',
  },
};
