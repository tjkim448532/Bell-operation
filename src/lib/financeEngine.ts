/**
 * 벨포레 레져본부 재무/운영 핵심 비즈니스 로직 엔진
 * 1. 비용 안분 엔진: 직과 배정 + 공통비 안분
 * 2. 1원 단위 절사오차 보정
 * 3. KPI 계산기: 손익, 객단가, 숙박객 이용률
 * 4. 검증마스터: 엑셀 원천 데이터와 배분액 간의 대조 검증
 */

export const LEISURE_OFFICIAL_TEAMS = [
  '미디어아트센터',
  '액티비티',
  '목장',
  '디지털지원',
] as const;

export type LeisureOfficialTeam = typeof LEISURE_OFFICIAL_TEAMS[number];

export const ACCOUNT_MACRO_CATEGORIES = [
  '인건비',
  '복리후생비',
  '마케팅/판촉비',
  '지급수수료/임차료',
  '운영경비/소모품비',
  '시설유지/기타',
] as const;

export type AccountMacroCategory = typeof ACCOUNT_MACRO_CATEGORIES[number];

/**
 * 초등학생도 한눈에 이해할 수 있는 쉬운 한글 지출 항목 (AI 친화형 분류)
 * - 정규직 직원 급여와 알바비는 분리
 * - 직원보험(건강/고용/산재) 및 국민연금은 직원비용으로 통합 포괄
 */
export const FRIENDLY_EXPENSE_CATEGORIES = [
  '정규직 직원 급여',
  '아르바이트비 (알바비)',
  '직원 4대보험과 국민연금 (직원비용)',
  '직원 밥값과 간식비',
  '손님과 시설 안전 보험료',
  '전기세와 물·가스 요금',
  '인터넷과 전화 요금',
  '영업장에 필요한 물건 사기',
  '정수기와 차량 빌린 돈',
  '현수막·배너 만들기와 홍보비',
  '고장난 시설과 기구 고치기',
  '리조트 차량 기름값과 정비',
  '카드단말기·서비스 수수료',
  '나라와 지자체에 낸 세금',
  '좋은 일 돕기 (기부금)',
  '기타 운영 지출',
] as const;

export type FriendlyExpenseCategory = typeof FRIENDLY_EXPENSE_CATEGORIES[number];

/**
 * 인력 의·식·주(衣食住) 통합 및 정규/일용직 분리 신규 비목 분류
 */
export const LABOR_LIVING_CATEGORIES = [
  '정직원 급여',
  '일용직 노임',
  '4대보험/퇴직',
  '직원 식대(食)',
  '직원 숙소/차량(住)',
  '직원 의류/복지(衣)',
  '시설 운영비',
  '외주 위탁',
  '감가상각',
] as const;

export type LaborLivingCategory = typeof LABOR_LIVING_CATEGORIES[number];

/**
 * 1회성 특별 비용(선급금, 연간일시납, 시설공사, 재해복구, 기부금 등) 유형
 */
export type OneOffExpenseType = 
  | '연간일시납'     // 1년 단위 선납 보험료 등
  | '사업선급금'     // 국책/지원사업 대형 선급금
  | '시스템구축'     // ERP/PMS 연동 일회성 개발비
  | '시설공사'       // 대형 수선/보수/조성 공사
  | '재해복구'       // 화재/태풍 등 보험청구 복구비
  | '기부금'         // 문화재단 기부/장학금
  | '과거소급'       // 과거 미정산금 일시 소급
  | '기타특수';

export interface OneOffDetectionResult {
  isOneOff: boolean;
  oneOffType: OneOffExpenseType;
  oneOffLabel: string;
  oneOffReason: string;
  periodStart?: string;
  periodEnd?: string;
  amortizationMonths?: number;
  badgeColor: string;
}

export interface RawExpenseRow {
  accountCode: string;
  accountName: string;
  macroCategory: string;
  rawDepartment: string;
  amount: number;
  memo?: string;
  clientName?: string;         // 거래처명
  assignedTeam?: string;       // 4대 팀 중 하나 또는 '본부공통'
  assignedVenue?: string;      // 백엔드 공식 영업장명
  assignedCategory?: string;   // 6대 표준 비목
  friendlyCategory?: string;   // 초등학생도 이해할 수 있는 쉬운 항목명
  projectName?: string;        // 프로젝트명 (원천)
  partName?: string;           // 파트명 (SSOT: 프로젝트명 = 파트명)
  isOutsourced?: boolean;      // 외주 여부
  isOffsetCorrected?: boolean; // 상계 전표 보정 여부
  rawAccountCode?: string;     // 보정 전 원천 계정코드/계정과목명
  approvalNo?: string;         // 결재번호
  date?: string;               // 전표일자
  yearMonth?: string;          // YYYY-MM
  laborCategory?: LaborLivingCategory; // 인력 의식주 및 정규/일용직 신규 분류 체계
  isLabor?: boolean;                   // 인력 총투자비용 여부 (의식주 포함)
  isDepreciation?: boolean;            // 감가상각비 여부 (비용 집계 영구 제외)
  isOneOff?: boolean;                  // 1회성 특별 비용 여부
  oneOffType?: OneOffExpenseType;      // 1회성 비목 유형
  oneOffLabel?: string;                // UI 배지용 한글 라벨
  oneOffReason?: string;               // 사유 상세
  periodStart?: string;                // 안분 시작일 (YYYY-MM-DD)
  periodEnd?: string;                  // 안분 종료일 (YYYY-MM-DD)
  amortizationMonths?: number;         // 안분 개월 수 (예: 12, 13)
}

export interface PartMetrics {
  partName: string;
  revenue: number;
  visitors: number;
}

export interface AllocatedExpenseResult {
  partName: string;
  directExpense: number;
  commonExpense: number;
  totalExpense: number;
  categoryBreakdown?: Record<string, number>;
}

export interface ValidationMasterReport {
  rawExcelSum?: number;
  depreciationSum?: number;
  totalExcelSum: number;
  totalDirectSum: number;
  outsourcedSum: number;
  totalAllocatedSum: number;
  delta: number;
  isZeroVariance: boolean;
  status: 'VERIFIED' | 'DISCREPANCY';
}

export interface LeisurePartKPISummary {
  partName: string;
  revenue: number;           // 파트별 매출
  allocatedExpense: number;  // 파트별 분배 비용 (직과 + 안분)
  directExpense: number;     // 순수 직과 비용
  commonExpense: number;     // 안분된 공통비
  operatingProfit: number;   // 파트별 손익 (매출 - 비용)
  profitMargin: number;      // 영업이익률 (%)
  visitorCount: number;      // 파트 이용객 수
  spendPerGuest: number;     // 객단가 (매출 / 이용객 수)
  utilizationRate: number;   // 침투율 (파트 이용객 / 전체 숙박객 수 * 100)
  isSupportTeam?: boolean;   // 순수 지원 부서 여부 (디지털지원)
}

/**
 * 전표 행의 프로젝트명, 사용부서명, 적요를 기반으로 4대 팀 자동 추론
 */
export function inferTeamFromRawRow(project?: string, dept?: string, memo?: string): string {
  const p = (project || '').trim();
  const d = (dept || '').trim();
  const m = (memo || '').trim();
  const combined = `${p} ${d} ${m}`.toLowerCase();

  // 1. 디지털지원팀 (순수 지원부서 독립 팀)
  if (combined.includes('디지털') || combined.includes('digital') || combined.includes('전산')) {
    return '디지털지원';
  }

  // 2. 외주 위탁업체 (놀이동산, 회전그네, 미니골프, 미니포렛, 뉴스타피아 등) -> 직영 팀과 분리
  if (
    combined.includes('놀이동산') ||
    combined.includes('회전그네') ||
    combined.includes('미니골프') ||
    combined.includes('미니포렛') ||
    combined.includes('뉴스타피아')
  ) {
    return '외주';
  }

  // 3. 미디어아트센터
  if (
    combined.includes('미디어') ||
    combined.includes('아트센터') ||
    combined.includes('뮤지엄') ||
    combined.includes('기프트샵') ||
    combined.includes('벨포레홀')
  ) {
    return '미디어아트센터';
  }

  // 4. 목장
  if (
    combined.includes('목장') ||
    combined.includes('체험') ||
    combined.includes('얼룩말') ||
    combined.includes('리틀팜') ||
    combined.includes('양떼')
  ) {
    return '목장';
  }

  // 5. 액티비티 (순수 직영 액티비티 시설)
  if (
    combined.includes('액티비티') ||
    combined.includes('엑티비티') ||
    combined.includes('activity') ||
    combined.includes('카트') ||
    combined.includes('마운틴') ||
    combined.includes('썰매') ||
    combined.includes('마리나') ||
    combined.includes('썸머랜드') ||
    combined.includes('원더풀')
  ) {
    return '액티비티';
  }

  // 기본값: 본부공통비
  return '본부공통';
}

/**
 * 계정코드 및 계정과목명을 6대 표준 비목으로 자동 분류
 */
export function inferAccountCategory(accountCode?: string, accountName?: string): AccountMacroCategory {
  const c = (accountCode || '').replace(/[^0-9]/g, '');
  const n = (accountName || '').trim();

  // 1. 인건비 (급여, 잡급, 퇴직급여)
  if (c.startsWith('603') || c.startsWith('604') || c.startsWith('609') || n.includes('급여') || n.includes('잡급') || n.includes('퇴직')) {
    return '인건비';
  }

  // 2. 복리후생비 (복리후생, 건강보험, 국민연금, 고용/산재, 식대)
  if (c.startsWith('611') || n.includes('복리') || n.includes('식대') || n.includes('연금') || n.includes('건강보험') || n.includes('고용보험') || n.includes('산재보험')) {
    return '복리후생비';
  }

  // 3. 마케팅/판촉비
  if (c.startsWith('642') || c.startsWith('626') || n.includes('광고') || n.includes('판촉') || n.includes('마케팅') || n.includes('인쇄') || n.includes('홍보')) {
    return '마케팅/판촉비';
  }

  // 4. 지급수수료/임차료
  if (c.startsWith('631') || c.startsWith('619') || n.includes('수수료') || n.includes('임차') || n.includes('도메인') || n.includes('구독')) {
    return '지급수수료/임차료';
  }

  // 5. 운영경비/소모품비
  if (
    c.startsWith('630') || c.startsWith('614') || c.startsWith('615') || c.startsWith('616') ||
    c.startsWith('612') || c.startsWith('613') || n.includes('소모품') || n.includes('통신') ||
    n.includes('수도') || n.includes('전력') || n.includes('여비') || n.includes('접대')
  ) {
    return '운영경비/소모품비';
  }

  // 6. 시설유지/기타
  return '시설유지/기타';
}

/**
 * 엑셀/구글시트의 프로젝트명·부서명을 백엔드 공식 영업장 및 4대 팀으로 1:1 연결
 * SSOT 원칙: '프로젝트명'이 곧 운영 '파트명'
 */
export function linkVenueAndTeam(project?: string, dept?: string, memo?: string): { team: string; venue: string } {
  const p = (project || '').trim();
  const d = (dept || '').trim();
  const m = (memo || '').trim();

  // [SSOT 최우선] 프로젝트명(파트명) 1:1 직접 매핑
  if (p === '마운틴카트') return { team: '액티비티', venue: '마운틴카트' };
  if (p === '사계절썰매장' || p === '사계절썰매') return { team: '액티비티', venue: '사계절썰매장' };
  if (p === '썸머랜드') return { team: '액티비티', venue: '썸머랜드' };
  if (p === '원더풀') return { team: '액티비티', venue: '원더풀' };
  if (p === '마리나' || p.startsWith('마리나')) return { team: '액티비티', venue: '마리나 클럽' };
  if (p === 'Activity팀' || p === '액티비티') return { team: '액티비티', venue: '액티비티 (공통)' };

  if (p === '목장/체험' || p === '체험목장') return { team: '목장', venue: '벨포레 목장(체험)' };
  if (p === '얼룩말카페' || p === '얼룩말까페') return { team: '목장', venue: '얼룩말카페' };

  if (p === '미디어아트센터_뮤지엄카페') return { team: '미디어아트센터', venue: '미디어-뮤지엄카페' };
  if (p === '미디어아트센터_기프트샵') return { team: '미디어아트센터', venue: '미디어-기프트샵' };
  if (
    p === '미디어아트센터' ||
    p === '미디어아트_벨포레홀' ||
    p === '미디어아트' ||
    p === '미디어' ||
    p === '시네마하우스' ||
    p === '씨네마' ||
    p.includes('디어아트센터')
  ) {
    return { team: '미디어아트센터', venue: '미디어아트센터' };
  }

  if (p === '디지털지원팀' || p === '디지털지원') return { team: '디지털지원', venue: '디지털지원팀' };

  if (
    p === '놀이동산' ||
    p === '미니골프' ||
    p === '미니골프장' ||
    p === '회전그네' ||
    p === '미니포렛' ||
    p === '게임존'
  ) {
    return { team: '외주', venue: '놀이동산 (외주)' };
  }

  if (p === '루지') return { team: '액티비티', venue: '마운틴카트' };

  if (p === '예약운영팀') return { team: '본부공통', venue: '예약운영팀' };
  if (
    p === '레저사업본부' ||
    p === '임원실' ||
    p === '공통' ||
    p === '콘도' ||
    p === '모토아레나(공사중)' ||
    p === '펫포레'
  ) {
    return { team: '본부공통', venue: '레져본부 (공통)' };
  }

  // 프로젝트명이 미지정이거나 다른 경우 텍스트 기반 보조 추론
  const combined = `${p} ${d} ${m}`.toLowerCase();

  // 1. 디지털지원팀 (독립 팀)
  if (combined.includes('디지털') || combined.includes('digital') || combined.includes('전산')) {
    return { team: '디지털지원', venue: '디지털지원팀' };
  }

  // 2. 미디어아트센터 계열
  if (combined.includes('뮤지엄카페')) return { team: '미디어아트센터', venue: '미디어-뮤지엄카페' };
  if (combined.includes('기프트샵')) return { team: '미디어아트센터', venue: '미디어-기프트샵' };
  if (combined.includes('미디어') || combined.includes('벨포레홀') || combined.includes('아트센터') || combined.includes('시네마')) {
    return { team: '미디어아트센터', venue: '미디어아트센터' };
  }

  // 3. 목장 계열
  if (combined.includes('얼룩말')) return { team: '목장', venue: '얼룩말카페' };
  if (combined.includes('목장/체험') || combined.includes('체험')) return { team: '목장', venue: '벨포레 목장(체험)' };
  if (combined.includes('목장') || combined.includes('리틀팜') || combined.includes('양떼')) {
    return { team: '목장', venue: '벨포레 목장' };
  }

  // 4. 액티비티 계열 (순수 직영 액티비티)
  if (combined.includes('마운틴카트') || combined.includes('카트') || combined.includes('루지')) return { team: '액티비티', venue: '마운틴카트' };
  if (combined.includes('썰매') || combined.includes('사계절')) return { team: '액티비티', venue: '사계절썰매장' };
  if (combined.includes('썸머랜드')) return { team: '액티비티', venue: '썸머랜드' };
  if (combined.includes('원더풀')) return { team: '액티비티', venue: '원더풀' };
  if (combined.includes('마리나')) return { team: '액티비티', venue: '마리나 클럽' };

  // 5. 외주 위탁업체 계열 (놀이동산, 회전그네, 뉴스타피아 등)
  if (
    combined.includes('놀이동산') || 
    combined.includes('회전그네') || 
    combined.includes('미니골프') || 
    combined.includes('미니포렛') ||
    combined.includes('뉴스타피아') ||
    combined.includes('게임존')
  ) {
    return { team: '외주', venue: '놀이동산 (외주)' };
  }
  if (combined.includes('액티비티') || combined.includes('activity')) {
    return { team: '액티비티', venue: '액티비티 (공통)' };
  }

  return { team: '본부공통', venue: '레져본부 (공통)' };
}

/**
 * 적요, 계정과목, 거래처명을 보고 AI 기능으로 도출하는 '초등학생도 이해할 수 있는 쉬운 한글 항목명'
 * 1. 정규직 직원 급여 vs 아르바이트비 분리
 * 2. 직원 4대보험(건강/고용/산재) 및 국민연금은 직원비용으로 통합
 * 3. 손님/시설 안전 보험료(화재/배상책임)는 시설경비로 분리
 */
export function makeFriendlyCategory(
  accountCode?: string, 
  accountName?: string, 
  memo?: string,
  clientName?: string
): { category: FriendlyExpenseCategory; subcategory: string } {
  const acct = `${accountCode || ''} ${accountName || ''}`.trim();
  const m = (memo || '').trim();
  const cl = (clientName || '').trim();

  // (1) 아르바이트비 (알바비): 일용노임, 잡급, 단기 알바
  if (
    cl.includes('일용노임') || 
    acct.includes('잡급') || 
    m.includes('일용') || 
    m.includes('알바') || 
    m.includes('단기') ||
    cl.includes('아르바이트')
  ) {
    return { category: '아르바이트비 (알바비)', subcategory: '아르바이트/일용직 노임' };
  }

  // (2) 정규직 직원 급여: 기타직원(정규직), 정기 월급
  if (
    cl.includes('정규직') || 
    (acct.includes('급여') && !cl.includes('일용')) || 
    m.includes('직원급여') || 
    acct.includes('퇴직')
  ) {
    return { category: '정규직 직원 급여', subcategory: '정규직 직원 월급/상여' };
  }

  // (3) 직원 4대보험과 국민연금 (직원비용): 건강보험, 국민연금, 고용보험, 산재보험
  if (
    cl.includes('국민연금') || m.includes('국민연금') || acct.includes('국민연금') ||
    cl.includes('건강보험') || m.includes('건강보험') || acct.includes('건강보험') ||
    cl.includes('고용보험') || m.includes('고용보험') || acct.includes('고용보험') ||
    cl.includes('산재보험') || m.includes('산재보험') || acct.includes('산재보험') ||
    m.includes('4대보험') || cl.includes('보험관리공단')
  ) {
    return { category: '직원 4대보험과 국민연금 (직원비용)', subcategory: '4대보험 및 국민연금' };
  }

  // (4) 직원 밥값과 간식비
  if (
    acct.includes('복리후생') ||
    acct.includes('식대') || 
    m.includes('식대') || 
    m.includes('간식') || 
    m.includes('식사') ||
    m.includes('스넥') || 
    m.includes('생고기') ||
    m.includes('막국수') ||
    m.includes('오봉집') ||
    m.includes('만휴정') ||
    m.includes('다산마트')
  ) {
    return { category: '직원 밥값과 간식비', subcategory: '직원 식사/간식 구매' };
  }

  // (5) 손님과 시설 안전 보험료 (화재/배상/시설손해보험)
  if (
    acct.includes('보험') || 
    cl.includes('손해보험') || 
    cl.includes('화재') || 
    m.includes('배상') ||
    m.includes('화재')
  ) {
    return { category: '손님과 시설 안전 보험료', subcategory: '화재/영업배상/시설손해보험' };
  }

  // (6) 전기세와 물·가스 요금
  if (acct.includes('전력비') || acct.includes('수도광열비') || m.includes('전기') || m.includes('수도') || m.includes('가스')) {
    return { category: '전기세와 물·가스 요금', subcategory: '전기/수도 요금' };
  }

  // (7) 인터넷과 전화 요금
  if (acct.includes('통신비') || m.includes('통신') || m.includes('인터넷') || m.includes('단말기') || m.includes('qr')) {
    return { category: '인터넷과 전화 요금', subcategory: '인터넷/무전기/통신료' };
  }

  // (8) 정수기와 차량 빌린 돈 (임차료)
  if (acct.includes('임차료') || m.includes('렌탈') || m.includes('스타리아') || m.includes('정수기')) {
    return { category: '정수기와 차량 빌린 돈', subcategory: '정수기/차량 렌탈료' };
  }

  // (9) 현수막·배너 만들기와 홍보비
  if (acct.includes('도서인쇄비') || acct.includes('판촉') || acct.includes('광고') || m.includes('배너') || m.includes('디자인') || m.includes('현수막')) {
    return { category: '현수막·배너 만들기와 홍보비', subcategory: '안내판/배너/광고 제작' };
  }

  // (10) 고장난 시설과 기구 고치기
  if (acct.includes('수선비') || m.includes('수리') || m.includes('보수') || m.includes('고치') || m.includes('부품') || m.includes('타이어')) {
    return { category: '고장난 시설과 기구 고치기', subcategory: '놀이기구/시설물 수리비' };
  }

  // (11) 리조트 차량 기름값과 정비
  if (acct.includes('차량유지비') || m.includes('주유') || m.includes('기름') || m.includes('엔진오일')) {
    return { category: '리조트 차량 기름값과 정비', subcategory: '차량 주유/정비비' };
  }

  // (12) 카드단말기·서비스 수수료
  if (acct.includes('수수료') || m.includes('수수료') || m.includes('카드단말기대금') || cl.includes('나이스정보통신')) {
    return { category: '카드단말기·서비스 수수료', subcategory: '결제/프로그램 수수료' };
  }

  // (13) 나라와 지자체에 낸 세금 (국민연금 제외)
  if (acct.includes('세금과공과') || m.includes('세금') || m.includes('공과금')) {
    return { category: '나라와 지자체에 낸 세금', subcategory: '지방세/공과금' };
  }

  // (14) 좋은 일 돕기 (기부금)
  if (acct.includes('기부금') || m.includes('기부') || m.includes('장학')) {
    return { category: '좋은 일 돕기 (기부금)', subcategory: '지역 장학/사회 공헌' };
  }

  // (15) 영업장에 필요한 물건 사기 (소모품/용품)
  if (acct.includes('소모품') || acct.includes('사무용품') || acct.includes('상품') || m.includes('구매') || m.includes('구입')) {
    return { category: '영업장에 필요한 물건 사기', subcategory: '현장 비품/소모품 구매' };
  }

  return { category: '기타 운영 지출', subcategory: '기타 경비' };
}

/**
 * 인력 의·식·주(衣食住) 및 정규/일용직 신규 비목 분류 엔진
 */
export function classifyLaborLiving(expense: {
  accountName?: string;
  accountCode?: string;
  memo?: string;
  clientName?: string;
  projectName?: string;
  isOutsourced?: boolean;
  isDepreciation?: boolean;
}): {
  category: LaborLivingCategory;
  isLabor: boolean;
  badgeLabel: string;
  badgeColor: string;
} {
  const acct = (expense.accountName || '').trim();
  const code = (expense.accountCode || '').trim();
  const m = (expense.memo || '').trim();
  const cl = (expense.clientName || '').trim();
  const p = (expense.projectName || '').trim();

  // 1. 감가상각 (비용 집계 영구 제외)
  if (expense.isDepreciation || acct === '감가상각비') {
    return {
      category: '감가상각',
      isLabor: false,
      badgeLabel: '감가상각 (자산)',
      badgeColor: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    };
  }

  // 2. 외주 위탁 시설 (놀이동산/회전그네/미니골프/미니포렛)
  if (expense.isOutsourced) {
    return {
      category: '외주 위탁',
      isLabor: false,
      badgeLabel: '외주 위탁',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }

  // 3. 정직원 급여 / 상여
  if (
    acct === '급여' ||
    (code.startsWith('603') && !cl.includes('일용') && !m.includes('일용')) ||
    m.includes('정규직') ||
    (m.includes('직원급여') && !m.includes('일용'))
  ) {
    return {
      category: '정직원 급여',
      isLabor: true,
      badgeLabel: '정직원 급여',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }

  // 4. 퇴직급여
  if (acct === '퇴직급여' || code.startsWith('609') || m.includes('퇴직')) {
    return {
      category: '4대보험/퇴직',
      isLabor: true,
      badgeLabel: '4대보험/퇴직금',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    };
  }

  // 5. 일용직 / 알바 잡급
  if (
    acct === '잡급' ||
    code.startsWith('604') ||
    cl.includes('일용노임') ||
    cl.includes('아르바이트') ||
    m.includes('일용') ||
    m.includes('알바') ||
    m.includes('단기')
  ) {
    return {
      category: '일용직 노임',
      isLabor: true,
      badgeLabel: '일용직/알바 노임',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  }

  // 6. 법정 4대보험
  if (
    acct.includes('건강보험') ||
    acct.includes('국민연금') ||
    acct.includes('고용보험') ||
    acct.includes('산재보험') ||
    m.includes('건강보험') ||
    m.includes('국민연금') ||
    m.includes('4대보험')
  ) {
    return {
      category: '4대보험/퇴직',
      isLabor: true,
      badgeLabel: '4대보험/퇴직금',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    };
  }

  // 7. 직원 식대 / 간식 (食)
  if (
    acct.includes('식대') ||
    m.includes('식대') ||
    m.includes('직원식당') ||
    m.includes('간식') ||
    m.includes('스넥') ||
    m.includes('회식') ||
    m.includes('식사')
  ) {
    return {
      category: '직원 식대(食)',
      isLabor: true,
      badgeLabel: '직원 식대 (食)',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    };
  }

  // 8. 직원 숙소 / 이동 (住·셔틀)
  if (
    p.includes('기숙사') ||
    m.includes('스타리아') ||
    m.includes('기숙사') ||
    m.includes('숙소') ||
    m.includes('통근') ||
    m.includes('셔틀')
  ) {
    return {
      category: '직원 숙소/차량(住)',
      isLabor: true,
      badgeLabel: '직원 숙소/차량 (住)',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
  }

  // 9. 직원 의류 / 복지 (衣·복지)
  if (
    m.includes('유니폼') ||
    m.includes('근무복') ||
    m.includes('안전화') ||
    m.includes('방한복') ||
    acct.includes('복리후생') ||
    m.includes('경조사') ||
    m.includes('화환') ||
    m.includes('상조')
  ) {
    return {
      category: '직원 의류/복지(衣)',
      isLabor: true,
      badgeLabel: '직원 유니폼/복지 (衣)',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    };
  }

  // 10. 순수 시설 운영비
  return {
    category: '시설 운영비',
    isLabor: false,
    badgeLabel: '시설 운영비',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

/**
 * 외주 운영 전표 판별 (놀이동산 등 외주 위탁업체 전표)
 */
export function isOutsourcedExpense(row: RawExpenseRow): boolean {
  const p = (row.projectName || '').trim();
  const t = (row.assignedTeam || '').trim();
  const v = (row.assignedVenue || '').trim();
  const d = (row.rawDepartment || '').trim();
  const c = (row.clientName || '').trim();
  const m = (row.memo || '').trim();

  return (
    t === '외주' ||
    t === '외주위탁' ||
    p === '놀이동산' ||
    p === '회전그네' ||
    p === '미니골프' ||
    p === '미니골프장' ||
    p === '미니포렛' ||
    p === '게임존' ||
    v.includes('놀이동산') ||
    v.includes('회전그네') ||
    v.includes('미니골프') ||
    v.includes('미니포렛') ||
    d.includes('놀이동산') ||
    c.includes('뉴스타피아') ||
    m.includes('놀이동산') ||
    m.includes('회전그네') ||
    m.includes('미니골프') ||
    m.includes('미니포렛') ||
    m.includes('뉴스타피아')
  );
}

/**
 * 전표 적요(memo) 등에서 연간 기간 및 개월 수 자동 추출 (예: 26.07.01~27.07.01)
 */
export function extractPeriod(text?: string): { periodStart: string; periodEnd: string; amortizationMonths: number } | null {
  if (!text) return null;
  const m = text.match(/(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})\s*~\s*(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m) {
    let startY = parseInt(m[1], 10);
    if (startY < 100) startY += 2000;
    const startM = m[2].padStart(2, '0');
    const startD = m[3].padStart(2, '0');

    let endY = parseInt(m[4], 10);
    if (endY < 100) endY += 2000;
    const endM = m[5].padStart(2, '0');
    const endD = m[6].padStart(2, '0');

    const periodStart = `${startY}-${startM}-${startD}`;
    const periodEnd = `${endY}-${endM}-${endD}`;

    const months = (endY - startY) * 12 + (parseInt(m[5], 10) - parseInt(m[2], 10)) + 1;

    return { periodStart, periodEnd, amortizationMonths: months > 0 ? months : 12 };
  }
  return null;
}

/**
 * 1회성 특별 비용(선급금, 연간일시납, 시설공사, 재해복구, 기부금 등) 구조적 자동 탐지기
 */
export function detectOneOffExpense(row: RawExpenseRow): OneOffDetectionResult | null {
  const acct = (row.accountName || '').trim();
  const memo = (row.memo || '').trim();
  const client = (row.clientName || '').trim();
  const amount = row.amount || 0;

  // 0. 감가상각비, 외주비는 고유 비목이므로 1회성 분류 대상에서 제외
  if (row.isDepreciation || acct === '감가상각비' || row.isOutsourced || row.assignedTeam === '외주') {
    return null;
  }

  const period = extractPeriod(memo);

  // 1. 연간 일시납 보험료 (메리츠, 흥국화재 등 1년 단위 선납)
  if (
    (acct.includes('보험료') || memo.includes('보험')) &&
    (memo.includes('연간') || (period && period.amortizationMonths >= 10) || client.includes('보험') || client.includes('해상')) &&
    amount >= 3000000
  ) {
    return {
      isOneOff: true,
      oneOffType: '연간일시납',
      oneOffLabel: '연간 보험료 선납',
      oneOffReason: `1년 단위 연간 일시납 보험료 (${memo})`,
      periodStart: period?.periodStart,
      periodEnd: period?.periodEnd,
      amortizationMonths: period?.amortizationMonths || 12,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    };
  }

  // 2. 대형 국책/지원사업 선급금 (예: 혁신바우처 등)
  if (
    (memo.includes('선급금') || memo.includes('바우처') || memo.includes('지원사업')) &&
    amount >= 5000000
  ) {
    return {
      isOneOff: true,
      oneOffType: '사업선급금',
      oneOffLabel: '사업 대형 선급금',
      oneOffReason: `지원사업/대형 프로젝트 선급 집행 (${memo})`,
      periodStart: period?.periodStart,
      periodEnd: period?.periodEnd,
      amortizationMonths: period?.amortizationMonths,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
  }

  // 3. 일회성 대형 시스템/대시보드 구축 개발비
  if (
    (memo.includes('구축') || memo.includes('개발')) &&
    (memo.includes('PMS') || memo.includes('대시보드') || memo.includes('데이터 연동') || memo.includes('시스템')) &&
    amount >= 3000000
  ) {
    return {
      isOneOff: true,
      oneOffType: '시스템구축',
      oneOffLabel: '시스템 일회성 구축',
      oneOffReason: `PMS/대시보드 등 시스템 구축 개발비 (${memo})`,
      periodStart: period?.periodStart,
      periodEnd: period?.periodEnd,
      amortizationMonths: period?.amortizationMonths,
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
    };
  }

  // 4. 대형 시설 조성 / 보수 공사 (일반 소액 수선비 제외, 500만원 이상 대형 공사)
  if (
    (acct.includes('수선비') || memo.includes('공사') || memo.includes('조성')) &&
    (memo.includes('보수공사') || memo.includes('조성공사') || memo.includes('신규제작') || memo.includes('바닥공사')) &&
    amount >= 5000000
  ) {
    return {
      isOneOff: true,
      oneOffType: '시설공사',
      oneOffLabel: '대형 시설공사',
      oneOffReason: `자쿠지 도장/리틀팜 조성 등 대형 시설 보수공사 (${memo})`,
      periodStart: period?.periodStart,
      periodEnd: period?.periodEnd,
      amortizationMonths: period?.amortizationMonths,
      badgeColor: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    };
  }

  // 5. 재해 복구 및 보험 청구 대상 비용 (화재, 태풍 피해 등)
  if (
    memo.includes('보험청구') ||
    memo.includes('태풍피해') ||
    (memo.includes('화재') && (memo.includes('복구') || memo.includes('수리') || memo.includes('기물')))
  ) {
    return {
      isOneOff: true,
      oneOffType: '재해복구',
      oneOffLabel: '재해복구(보험청구)',
      oneOffReason: `태풍/화재 등 천재지변 및 재해복구 비용 (${memo})`,
      periodStart: period?.periodStart,
      periodEnd: period?.periodEnd,
      amortizationMonths: period?.amortizationMonths,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    };
  }

  // 6. 기업 기부금 (문화예술 후원 및 매칭펀드)
  if (acct.includes('기부금') || memo.includes('기부금') || client.includes('문화관광재단')) {
    return {
      isOneOff: true,
      oneOffType: '기부금',
      oneOffLabel: '기업 기부금',
      oneOffReason: `문화예술 후원 및 사회공헌 기부금 (${memo})`,
      periodStart: period?.periodStart,
      periodEnd: period?.periodEnd,
      amortizationMonths: period?.amortizationMonths,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }

  // 7. 과거 미정산 소급 일시 지급
  if (memo.includes('미정산금') || memo.includes('소급지급') || (memo.includes('추가지급') && amount >= 5000000)) {
    return {
      isOneOff: true,
      oneOffType: '과거소급',
      oneOffLabel: '과거 미정산 소급',
      oneOffReason: `과거 누락/정산 지연분 일시 소급 지급 (${memo})`,
      periodStart: period?.periodStart,
      periodEnd: period?.periodEnd,
      amortizationMonths: period?.amortizationMonths,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    };
  }

  // 기존 DB에 이미 isOneOff=true로 마킹되어 있는 경우 유지
  if (row.isOneOff && row.oneOffType) {
    return {
      isOneOff: true,
      oneOffType: row.oneOffType,
      oneOffLabel: row.oneOffLabel || '1회성 특별비용',
      oneOffReason: row.oneOffReason || (row.memo || ''),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      amortizationMonths: row.amortizationMonths,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    };
  }

  return null;
}

/**
 * 감가상각비 판정 헬퍼
 * - 8월 기준 확정 원칙: 감가상각비(비현금성 자산상각)는 영업 손익 및 4대 부서 비용 집계에서 완전 제외
 */
export function isDepreciationExpense(row: { isDepreciation?: boolean; accountName?: string }): boolean {
  if (row.isDepreciation) return true;
  const acct = (row.accountName || '').trim();
  return acct === '감가상각비' || acct.includes('감가상각');
}

/**
 * 4대 팀 비용 배분 및 검증마스터 엔진
 * - 디지털지원은 독립된 팀으로 자체 비용 100% 직과 집계
 * - 외주업체(놀이동산 등) 전표는 직영 4대 부서 및 공통비 풀에서 완전 제외
 * - 본부 공통비는 매출 발생 3개 부서(미디어아트센터, 액티비티, 목장)에 매출 비율로 합리적 안분
 * - 1원 단위 절사오차 보정 (Zero-Variance Penny Balancing)
 */
export function allocateExpenses(
  expenses: RawExpenseRow[],
  partMetrics: PartMetrics[]
): { allocations: Map<string, AllocatedExpenseResult>; audit: ValidationMasterReport } {
  const rawExcelSum = expenses.reduce((sum, e) => sum + e.amount, 0);
  const depreciationExpenses = expenses.filter((e) => isDepreciationExpense(e));
  const depreciationSum = depreciationExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 감가상각비(비현금성 자산 상각)는 연산 집계에서 완전 제외
  const activeExpenses = expenses.filter((e) => !isDepreciationExpense(e));
  const totalExcelSum = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 4대 공식 팀 초기화
  const resultMap = new Map<string, AllocatedExpenseResult>();
  LEISURE_OFFICIAL_TEAMS.forEach((team) => {
    resultMap.set(team, {
      partName: team,
      directExpense: 0,
      commonExpense: 0,
      totalExpense: 0,
      categoryBreakdown: {
        '인건비': 0,
        '복리후생비': 0,
        '마케팅/판촉비': 0,
        '지급수수료/임차료': 0,
        '운영경비/소모품비': 0,
        '시설유지/기타': 0,
      },
    });
  });

  // 매출 부서 3곳(미디어아트센터, 액티비티, 목장)의 매출 합계
  const revenueTeams = ['미디어아트센터', '액티비티', '목장'];
  const revenueMap = new Map<string, number>();
  partMetrics.forEach((p) => {
    revenueMap.set(p.partName, p.revenue);
  });

  const totalRevenueForAllocation = revenueTeams.reduce((sum, t) => sum + (revenueMap.get(t) || 0), 0);

  let commonPoolSum = 0;
  let outsourcedSum = 0;
  let totalDirectSum = 0;

  activeExpenses.forEach((expense) => {
    // 외주업체(놀이동산 등) 전표 식별: 직영 4대 부서 및 공통비 풀에서 원천 배제
    if (isOutsourcedExpense(expense)) {
      outsourcedSum += expense.amount;
      return;
    }

    totalDirectSum += expense.amount;
    const mapped = linkVenueAndTeam(expense.projectName, expense.rawDepartment, expense.memo);
    const assignedTeam = mapped.team !== '본부공통'
      ? mapped.team
      : (expense.assignedTeam && expense.assignedTeam !== '본부공통' ? expense.assignedTeam : mapped.team);
    const category = (expense.assignedCategory || inferAccountCategory(expense.accountCode, expense.accountName)) as AccountMacroCategory;

    if (assignedTeam === '디지털지원') {
      // 디지털지원: 자체 발생 비용 100% 직과
      const target = resultMap.get('디지털지원')!;
      target.directExpense += expense.amount;
      target.totalExpense += expense.amount;
      if (target.categoryBreakdown) {
        target.categoryBreakdown[category] = (target.categoryBreakdown[category] || 0) + expense.amount;
      }
    } else if (resultMap.has(assignedTeam)) {
      // 미디어아트센터, 액티비티, 목장: 직과
      const target = resultMap.get(assignedTeam)!;
      target.directExpense += expense.amount;
      target.totalExpense += expense.amount;
      if (target.categoryBreakdown) {
        target.categoryBreakdown[category] = (target.categoryBreakdown[category] || 0) + expense.amount;
      }
    } else {
      // 본부 공통비 풀에 적립
      commonPoolSum += expense.amount;
    }
  });

  // 본부 공통비 안분 집행 (매출 비중에 따라 매출 부서 3곳에 배부)
  if (commonPoolSum > 0) {
    revenueTeams.forEach((team) => {
      const rev = revenueMap.get(team) || 0;
      const ratio = totalRevenueForAllocation > 0 ? rev / totalRevenueForAllocation : 1 / revenueTeams.length;
      const allocatedPortion = Math.round(commonPoolSum * ratio);
      const target = resultMap.get(team)!;
      target.commonExpense += allocatedPortion;
      target.totalExpense += allocatedPortion;
    });
  }

  // 1원 단위 절사오차 보정 (Penny Balancing)
  let totalAllocatedSum = 0;
  resultMap.forEach((v) => (totalAllocatedSum += v.totalExpense));
  const delta = totalDirectSum - totalAllocatedSum;

  if (delta !== 0 && revenueTeams.length > 0) {
    // 매출 1위 파트(또는 첫 번째 매출 팀)에 단수 1~2원 보정하여 Zero-Variance 달성
    const topTeam = revenueTeams[0];
    const target = resultMap.get(topTeam)!;
    target.commonExpense += delta;
    target.totalExpense += delta;
    totalAllocatedSum += delta;
  }

  const audit: ValidationMasterReport = {
    rawExcelSum,
    depreciationSum,
    totalExcelSum,
    totalDirectSum,
    outsourcedSum,
    totalAllocatedSum,
    delta: totalDirectSum - totalAllocatedSum,
    isZeroVariance: totalDirectSum === totalAllocatedSum,
    status: totalDirectSum === totalAllocatedSum ? 'VERIFIED' : 'DISCREPANCY',
  };

  return { allocations: resultMap, audit };
}

/**
 * 4대 팀 손익(P&L) 및 운영 KPI 계산기
 */
export function calculatePartKPIs(
  partMetrics: PartMetrics[],
  allocations: Map<string, AllocatedExpenseResult>,
  totalResortRoomGuests: number
): LeisurePartKPISummary[] {
  const metricMap = new Map<string, PartMetrics>();
  partMetrics.forEach((m) => metricMap.set(m.partName, m));

  return LEISURE_OFFICIAL_TEAMS.map((teamName) => {
    const isSupportTeam = teamName === '디지털지원';
    const m = metricMap.get(teamName) || {
      partName: teamName,
      revenue: 0,
      visitors: 0,
    };

    const alloc = allocations.get(teamName) || {
      partName: teamName,
      directExpense: 0,
      commonExpense: 0,
      totalExpense: 0,
    };

    const revenue = isSupportTeam ? 0 : m.revenue;
    const visitors = isSupportTeam ? 0 : m.visitors;

    // 파트별 손익 = 매출 - 총비용
    const operatingProfit = revenue - alloc.totalExpense;
    const profitMargin = revenue > 0 ? (operatingProfit / revenue) * 100 : 0;
    const spendPerGuest = visitors > 0 ? Math.round(revenue / visitors) : 0;
    const utilizationRate = totalResortRoomGuests > 0 ? (visitors / totalResortRoomGuests) * 100 : 0;

    return {
      partName: teamName,
      revenue,
      allocatedExpense: alloc.totalExpense,
      directExpense: alloc.directExpense,
      commonExpense: alloc.commonExpense,
      operatingProfit,
      profitMargin: Number(profitMargin.toFixed(1)),
      visitorCount: visitors,
      spendPerGuest,
      utilizationRate: Number(utilizationRate.toFixed(2)),
      isSupportTeam,
    };
  });
}

/**
 * 쉬운 한글 항목 대분류 그룹핑 (칸반 보드 필터링 및 시각화용)
 */
export function getFriendlyCategoryGroup(category: FriendlyExpenseCategory | string): '직원비용' | '시설/운영비' | '수수료/세금' | '기타' {
  switch (category) {
    case '정규직 직원 급여':
    case '아르바이트비 (알바비)':
    case '직원 4대보험과 국민연금 (직원비용)':
    case '직원 밥값과 간식비':
      return '직원비용';
    case '손님과 시설 안전 보험료':
    case '전기세와 물·가스 요금':
    case '인터넷과 전화 요금':
    case '영업장에 필요한 물건 사기':
    case '정수기와 차량 빌린 돈':
    case '현수막·배너 만들기와 홍보비':
    case '고장난 시설과 기구 고치기':
    case '리조트 차량 기름값과 정비':
      return '시설/운영비';
    case '카드단말기·서비스 수수료':
    case '나라와 지자체에 낸 세금':
      return '수수료/세금';
    default:
      return '기타';
  }
}

/**
 * 외주 운영 사업장 여부 판별 (놀이동산 등 외주 위탁 매장)
 */
export function isOutsourcedVenue(venueName: string, partName?: string): boolean {
  const v = (venueName || '').trim();
  const p = (partName || '').trim();
  return (
    v.includes('놀이동산') ||
    v.includes('회전그네') ||
    v.includes('미니골프') ||
    v.includes('미니포렛') ||
    p.includes('놀이동산')
  );
}

export interface VenuePnLItem {
  venueName: string;
  partName: string;
  isOutsourced: boolean;
  revenue: number;
  directExpense: number;
  commonExpense: number;
  totalExpense: number;
  operatingProfit: number;
  profitMargin: number;
  visitorCount: number;
  spendPerGuest: number;
}

/**
 * 영업장별 손익(P&L) 연산 엔진
 * - 외주업체(놀이동산)는 직영과 분리
 * - 본부 공통비는 직영 사업장 매출 비중에 따라 안분 (외주업체에는 공통비 안분 제외)
 */
export function calculateVenuePnL(
  venues: { venueName: string; partName: string; revenue: number; visitorCount: number }[],
  rawExpenses: RawExpenseRow[]
): VenuePnLItem[] {
  // 1. 영업장별 직과 비용 집계
  const venueDirectExpenseMap = new Map<string, number>();
  const teamGeneralExpenseMap = new Map<string, number>();
  let headquartersCommonExpense = 0;
  let digitalSupportExpense = 0;

  rawExpenses.forEach((row) => {
    // 8월 확정 표준 원칙: 감가상각비는 비현금성 비용이므로 영업 손익 산출에서 전면 제외 (실적총괄/손익 100% 일치)
    if (isDepreciationExpense(row)) return;

    // 외주업체(놀이동산 등) 전표는 직영 영업장 P&L 산출 시 공통비/팀비용에 혼입되지 않도록 배제
    if (isOutsourcedExpense(row)) return;

    const resolved = linkVenueAndTeam(row.projectName, row.rawDepartment, row.memo);
    const team = resolved.team !== '본부공통' ? resolved.team : (row.assignedTeam?.trim() || '본부공통');
    const venue = (resolved.venue !== '레져본부 (공통)' && resolved.venue !== '액티비티 (공통)')
      ? resolved.venue
      : (row.assignedVenue?.trim() || resolved.venue);
    const amt = row.amount || 0;

    if (team === '외주') return;

    if (team === '디지털지원' || venue === '디지털지원팀' || venue === '디지털지원' || row.partName?.includes('디지털지원')) {
      // 순수 지원부서(디지털지원)는 전액 디지털지원팀에 직과 배분
      digitalSupportExpense += amt;
    } else if (team === '본부공통' || venue === '레져본부 (공통)') {
      headquartersCommonExpense += amt;
    } else if (venue && venue !== '레져본부 (공통)' && venue !== '액티비티 (공통)') {
      venueDirectExpenseMap.set(venue, (venueDirectExpenseMap.get(venue) || 0) + amt);
    } else {
      // 팀 공통 비용
      teamGeneralExpenseMap.set(team, (teamGeneralExpenseMap.get(team) || 0) + amt);
    }
  });

  // 2. 직영 사업장 총매출 집계 (공통비 안분 기준)
  let directTotalRevenue = 0;
  venues.forEach((v) => {
    if (!isOutsourcedVenue(v.venueName, v.partName)) {
      directTotalRevenue += v.revenue;
    }
  });

  // 팀별 직영 매출 집계
  const teamDirectRevenueMap = new Map<string, number>();
  venues.forEach((v) => {
    if (!isOutsourcedVenue(v.venueName, v.partName)) {
      teamDirectRevenueMap.set(
        v.partName,
        (teamDirectRevenueMap.get(v.partName) || 0) + v.revenue
      );
    }
  });

  // 디지털지원팀 영업장 행 보장
  const venueList = [...venues];
  const hasDigitalVenue = venueList.some(
    (v) => v.partName === '디지털지원' || v.venueName.includes('디지털지원')
  );
  if (!hasDigitalVenue && digitalSupportExpense > 0) {
    venueList.push({
      venueName: '디지털지원팀',
      partName: '디지털지원',
      revenue: 0,
      visitorCount: 0,
    });
  }

  // 비용 전표에 직과되었으나 매출 목록에 없는 영업장 보장 (비용 누락 원천 방지)
  venueDirectExpenseMap.forEach((amt, vName) => {
    const exists = venueList.some((v) => v.venueName === vName);
    if (!exists) {
      const matchingRow = rawExpenses.find((r) => r.assignedVenue === vName);
      const part = matchingRow?.assignedTeam || matchingRow?.partName || '본부공통';
      venueList.push({
        venueName: vName,
        partName: part,
        revenue: 0,
        visitorCount: 0,
      });
    }
  });

  // 직영 및 공통비 안분 계산 (단수 보정 포함)
  let allocatedCommonSum = 0;
  const directVenues = venueList.filter(
    (v) => !isOutsourcedVenue(v.venueName, v.partName) && v.partName !== '디지털지원' && !v.venueName.includes('디지털지원')
  );
  const topDirectVenueName = directVenues.length > 0
    ? directVenues.reduce((max, v) => (v.revenue > max.revenue ? v : max), directVenues[0]).venueName
    : '';

  // 3. 각 영업장별 P&L 산출
  const results = venueList.map((v) => {
    const isOutsourced = isOutsourcedVenue(v.venueName, v.partName);
    const isDigitalSupport = v.partName === '디지털지원' || v.venueName.includes('디지털지원');

    let directExpense = 0;
    if (isDigitalSupport) {
      directExpense = digitalSupportExpense;
    } else {
      directExpense = venueDirectExpenseMap.get(v.venueName) || 0;

      // 팀 공통 경비가 있는 경우 팀 내 직영 매장에 매출 비례 안분
      if (!isOutsourced) {
        const teamGeneral = teamGeneralExpenseMap.get(v.partName) || 0;
        const teamRev = teamDirectRevenueMap.get(v.partName) || 0;
        if (teamGeneral > 0 && teamRev > 0) {
          directExpense += Math.round((v.revenue / teamRev) * teamGeneral);
        }
      }
    }

    // 본부 공통비 안분: 직영 사업장에만 매출 비례 안분 (외주업체 및 순수지원부서 제외)
    let commonExpense = 0;
    if (!isOutsourced && !isDigitalSupport && directTotalRevenue > 0 && headquartersCommonExpense > 0) {
      commonExpense = Math.round((v.revenue / directTotalRevenue) * headquartersCommonExpense);
      allocatedCommonSum += commonExpense;
    }

    const totalExpense = directExpense + commonExpense;
    const operatingProfit = v.revenue - totalExpense;
    const profitMargin = v.revenue > 0 ? Number(((operatingProfit / v.revenue) * 100).toFixed(1)) : 0;
    const spendPerGuest = v.visitorCount > 0 ? Math.round(v.revenue / v.visitorCount) : 0;

    return {
      venueName: v.venueName,
      partName: v.partName,
      isOutsourced,
      revenue: v.revenue,
      directExpense,
      commonExpense,
      totalExpense,
      operatingProfit,
      profitMargin,
      visitorCount: v.visitorCount,
      spendPerGuest,
    };
  });

  // 단수 1~2원 보정 (Penny Balancing): 공통비 배부액 합계가 headquartersCommonExpense와 일치하도록 보정
  const commonDelta = headquartersCommonExpense - allocatedCommonSum;
  if (commonDelta !== 0 && topDirectVenueName) {
    const topItem = results.find((r) => r.venueName === topDirectVenueName);
    if (topItem) {
      topItem.commonExpense += commonDelta;
      topItem.totalExpense += commonDelta;
      topItem.operatingProfit -= commonDelta;
      topItem.profitMargin = topItem.revenue > 0 ? Number(((topItem.operatingProfit / topItem.revenue) * 100).toFixed(1)) : 0;
    }
  }

  // 팀 공통비 단수 1~2원 보정: 팀별 공통비 배부액 합계가 teamGeneral과 일치하도록 보정
  teamGeneralExpenseMap.forEach((teamGeneral, teamName) => {
    if (teamGeneral > 0) {
      const teamVenues = results.filter((r) => r.partName === teamName && !r.isOutsourced);
      if (teamVenues.length > 0) {
        const topInTeam = teamVenues.reduce((max, v) => (v.revenue > max.revenue ? v : max), teamVenues[0]);
        const allocatedTeamSum = teamVenues.reduce(
          (sum, v) => sum + (v.directExpense - (venueDirectExpenseMap.get(v.venueName) || 0)),
          0
        );
        const teamDelta = teamGeneral - allocatedTeamSum;
        if (teamDelta !== 0) {
          topInTeam.directExpense += teamDelta;
          topInTeam.totalExpense += teamDelta;
          topInTeam.operatingProfit -= teamDelta;
          topInTeam.profitMargin = topInTeam.revenue > 0 ? Number(((topInTeam.operatingProfit / topInTeam.revenue) * 100).toFixed(1)) : 0;
        }
      }
    }
  });

  return results;
}

export interface PartCategoryExpenseSummary {
  partName: string;
  isSupportTeam: boolean;
  categories: Record<AccountMacroCategory, number>;
  directTotal: number;
  allocatedCommon: number;
  totalExpense: number;
  ratioOfTotal: number;
  laborRatio: number;
  welfareRatio: number;
}

export interface VenueExpenseSummary {
  venueName: string;
  partName: string;
  categories: Record<AccountMacroCategory, number>;
  totalDirect: number;
  voucherCount: number;
  vouchers: RawExpenseRow[];
}

export interface OneOffAnalyticsSummary {
  totalCount: number;
  totalAmount: number;
  normalizedDirect: number;
  items: Array<RawExpenseRow & { oneOffDetection: OneOffDetectionResult }>;
}

export interface DetailedExpenseAnalyticsResult {
  partSummaries: PartCategoryExpenseSummary[];
  commonPoolSummary: {
    categories: Record<AccountMacroCategory, number>;
    totalDirect: number;
    directTotal: number;
  };
  venueSummaries: VenueExpenseSummary[];
  topLaborPart: { partName: string; amount: number; ratioOfPart: number; ratioOfTotalLabor: number };
  topWelfarePart: { partName: string; amount: number; ratioOfPart: number; ratioOfTotalWelfare: number };
  topOperatingPart: { partName: string; amount: number; ratioOfPart: number; ratioOfTotalOperating: number };
  totalLaborCost: number;
  totalWelfareCost: number;
  totalOperatingCost: number;
  grandTotalDirect: number;
  grandTotalAllocated: number;
  macroTotals: Record<AccountMacroCategory, number>;
  friendlyBreakdowns: {
    regularSalary: number;
    partTimePay: number;
    partTimeLabor: number;
    welfareMeal: number;
    mealsAndSnacks: number;
    welfareInsurance: number;
    socialInsurance: number;
    utilityExpense: number;
    utilities: number;
    telecomExpense: number;
    rentalFee: number;
    cardCommission: number;
    repairMaintenance: number;
  };
  oneOffSummary: OneOffAnalyticsSummary;
}

/**
 * 부서 및 세부 영업장별 비목 상세 분석 엔진 (인건비, 복리후생비 등 철저한 리포트 생성)
 */
export function calculateDetailedExpenseAnalytics(
  expenses: RawExpenseRow[],
  allocations: Map<string, AllocatedExpenseResult>
): DetailedExpenseAnalyticsResult {
  const categoriesTemplate = (): Record<AccountMacroCategory, number> => ({
    '인건비': 0,
    '복리후생비': 0,
    '마케팅/판촉비': 0,
    '지급수수료/임차료': 0,
    '운영경비/소모품비': 0,
    '시설유지/기타': 0,
  });

  const partMap: Record<string, { directTotal: number; categories: Record<AccountMacroCategory, number> }> = {};
  LEISURE_OFFICIAL_TEAMS.forEach((team) => {
    partMap[team] = { directTotal: 0, categories: categoriesTemplate() };
  });

  const commonPool = { directTotal: 0, totalDirect: 0, categories: categoriesTemplate() };
  const macroTotals = categoriesTemplate();

  const venueMap: Record<string, VenueExpenseSummary> = {};

  const friendlyBreakdowns = {
    regularSalary: 0,
    partTimePay: 0,
    partTimeLabor: 0,
    welfareMeal: 0,
    mealsAndSnacks: 0,
    welfareInsurance: 0,
    socialInsurance: 0,
    utilityExpense: 0,
    utilities: 0,
    telecomExpense: 0,
    rentalFee: 0,
    cardCommission: 0,
    repairMaintenance: 0,
  };

  expenses.forEach((row) => {
    // 감가상각비 및 외주비 제외
    if (row.isDepreciation || row.accountName === '감가상각비') return;
    if (isOutsourcedExpense(row)) return;

    const resolved = linkVenueAndTeam(row.projectName, row.rawDepartment, row.memo);
    const team = resolved.team !== '본부공통' ? resolved.team : (row.assignedTeam?.trim() || '본부공통');
    const venue = (resolved.venue !== '레져본부 (공통)' && resolved.venue !== '액티비티 (공통)')
      ? resolved.venue
      : (row.assignedVenue?.trim() || resolved.venue);
    const cat = (row.assignedCategory || inferAccountCategory(row.accountCode, row.accountName)) as AccountMacroCategory;
    const amt = row.amount || 0;

    if (team === '외주') return;

    macroTotals[cat] = (macroTotals[cat] || 0) + amt;

    if (partMap[team]) {
      partMap[team].directTotal += amt;
      partMap[team].categories[cat] = (partMap[team].categories[cat] || 0) + amt;
    } else {
      commonPool.directTotal += amt;
      commonPool.totalDirect += amt;
      commonPool.categories[cat] = (commonPool.categories[cat] || 0) + amt;
    }

    // 세부 영업장별 비용 집계
    const venueKey = `${team}__${venue}`;
    if (!venueMap[venueKey]) {
      venueMap[venueKey] = {
        venueName: venue,
        partName: team,
        categories: categoriesTemplate(),
        totalDirect: 0,
        voucherCount: 0,
        vouchers: [],
      };
    }
    venueMap[venueKey].totalDirect += amt;
    venueMap[venueKey].voucherCount += 1;
    venueMap[venueKey].categories[cat] = (venueMap[venueKey].categories[cat] || 0) + amt;
    venueMap[venueKey].vouchers.push(row);

    // 친화형 분류 분석 (기존 DB 전표에 friendlyCategory가 없거나 매크로 카테고리인 경우 자동 재연산)
    const rawFriendly = row.friendlyCategory?.trim();
    const friendly = (rawFriendly && (FRIENDLY_EXPENSE_CATEGORIES as readonly string[]).includes(rawFriendly))
      ? rawFriendly
      : makeFriendlyCategory(row.accountCode, row.accountName, row.memo, row.clientName).category;

    if (friendly === '정규직 직원 급여') {
      friendlyBreakdowns.regularSalary += amt;
    } else if (friendly === '아르바이트비 (알바비)') {
      friendlyBreakdowns.partTimePay += amt;
      friendlyBreakdowns.partTimeLabor += amt;
    } else if (friendly === '직원 밥값과 간식비') {
      friendlyBreakdowns.welfareMeal += amt;
      friendlyBreakdowns.mealsAndSnacks += amt;
    } else if (friendly === '직원 4대보험과 국민연금 (직원비용)') {
      friendlyBreakdowns.welfareInsurance += amt;
      friendlyBreakdowns.socialInsurance += amt;
    } else if (friendly === '전기세와 물·가스 요금') {
      friendlyBreakdowns.utilityExpense += amt;
      friendlyBreakdowns.utilities += amt;
    } else if (friendly === '인터넷과 전화 요금') {
      friendlyBreakdowns.telecomExpense += amt;
    } else if (friendly === '정수기와 차량 빌린 돈') {
      friendlyBreakdowns.rentalFee += amt;
    } else if (friendly === '카드단말기·서비스 수수료') {
      friendlyBreakdowns.cardCommission += amt;
    } else if (friendly === '고장난 시설과 기구 고치기') {
      friendlyBreakdowns.repairMaintenance += amt;
    }
  });

  let grandTotalAllocated = 0;
  allocations.forEach((val) => {
    grandTotalAllocated += val.totalExpense;
  });

  let grandTotalDirect = 0;
  Object.values(partMap).forEach((p) => (grandTotalDirect += p.directTotal));
  grandTotalDirect += commonPool.directTotal;

  const totalLaborCost = macroTotals['인건비'] || 0;
  const totalWelfareCost = macroTotals['복리후생비'] || 0;
  const totalOperatingCost = macroTotals['운영경비/소모품비'] || 0;

  const partSummaries: PartCategoryExpenseSummary[] = LEISURE_OFFICIAL_TEAMS.map((teamName) => {
    const isSupportTeam = teamName === '디지털지원';
    const pData = partMap[teamName] || { directTotal: 0, categories: categoriesTemplate() };
    const alloc = allocations.get(teamName);
    const allocatedCommon = alloc?.commonExpense || 0;
    const totalExpense = alloc?.totalExpense || pData.directTotal + allocatedCommon;

    const ratioOfTotal = grandTotalAllocated > 0 ? Number(((totalExpense / grandTotalAllocated) * 100).toFixed(1)) : 0;
    const laborRatio = totalExpense > 0 ? Number(((pData.categories['인건비'] / totalExpense) * 100).toFixed(1)) : 0;
    const welfareRatio = totalExpense > 0 ? Number(((pData.categories['복리후생비'] / totalExpense) * 100).toFixed(1)) : 0;

    return {
      partName: teamName,
      isSupportTeam,
      categories: pData.categories,
      directTotal: pData.directTotal,
      allocatedCommon,
      totalExpense,
      ratioOfTotal,
      laborRatio,
      welfareRatio,
    };
  });

  // Highlight calculations
  let topLaborPart = { partName: '-', amount: 0, ratioOfPart: 0, ratioOfTotalLabor: 0 };
  let topWelfarePart = { partName: '-', amount: 0, ratioOfPart: 0, ratioOfTotalWelfare: 0 };
  let topOperatingPart = { partName: '-', amount: 0, ratioOfPart: 0, ratioOfTotalOperating: 0 };

  partSummaries.forEach((p) => {
    const labor = p.categories['인건비'];
    if (labor > topLaborPart.amount) {
      topLaborPart = {
        partName: p.partName,
        amount: labor,
        ratioOfPart: p.laborRatio,
        ratioOfTotalLabor: totalLaborCost > 0 ? Number(((labor / totalLaborCost) * 100).toFixed(1)) : 0,
      };
    }

    const welfare = p.categories['복리후생비'];
    if (welfare > topWelfarePart.amount) {
      topWelfarePart = {
        partName: p.partName,
        amount: welfare,
        ratioOfPart: p.welfareRatio,
        ratioOfTotalWelfare: totalWelfareCost > 0 ? Number(((welfare / totalWelfareCost) * 100).toFixed(1)) : 0,
      };
    }

    const op = p.categories['운영경비/소모품비'];
    if (op > topOperatingPart.amount) {
      topOperatingPart = {
        partName: p.partName,
        amount: op,
        ratioOfPart: p.totalExpense > 0 ? Number(((op / p.totalExpense) * 100).toFixed(1)) : 0,
        ratioOfTotalOperating: totalOperatingCost > 0 ? Number(((op / totalOperatingCost) * 100).toFixed(1)) : 0,
      };
    }
  });

  const venueSummaries = Object.values(venueMap).sort((a, b) => b.totalDirect - a.totalDirect);

  // 1회성 특별 비용 집계 (선급금, 연간일시납, 시설공사, 재해복구, 기부금 등)
  const oneOffItems: Array<RawExpenseRow & { oneOffDetection: OneOffDetectionResult }> = [];
  let oneOffTotal = 0;

  expenses.forEach((row) => {
    if (row.isDepreciation || row.accountName === '감가상각비') return;
    if (isOutsourcedExpense(row)) return;

    const detected = detectOneOffExpense(row);
    if (detected) {
      oneOffTotal += (row.amount || 0);
      oneOffItems.push({
        ...row,
        oneOffDetection: detected,
      });
    }
  });

  const oneOffSummary: OneOffAnalyticsSummary = {
    totalCount: oneOffItems.length,
    totalAmount: oneOffTotal,
    normalizedDirect: grandTotalDirect - oneOffTotal,
    items: oneOffItems,
  };

  return {
    partSummaries,
    commonPoolSummary: commonPool,
    venueSummaries,
    topLaborPart,
    topWelfarePart,
    topOperatingPart,
    totalLaborCost,
    totalWelfareCost,
    totalOperatingCost,
    grandTotalDirect,
    grandTotalAllocated,
    macroTotals,
    friendlyBreakdowns,
    oneOffSummary,
  };
}

