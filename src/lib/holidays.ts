/**
 * 2025년 및 2026년 대한민국 법정 공휴일 및 대체 공휴일 데이터
 * (공휴일은 벨포레 운영 정책상 '주말' 트래픽/요금으로 산입)
 */
export const KOREAN_HOLIDAYS_SET = new Set<string>([
  // 2025년 공휴일
  '2025-01-01', // 신정
  '2025-01-28', '2025-01-29', '2025-01-30', // 설날 연휴
  '2025-03-01', '2025-03-03', // 삼일절 및 대체공휴일
  '2025-05-05', '2025-05-06', // 어린이날, 부처님오신날 및 대체공휴일
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // 추석 연휴 및 대체공휴일
  '2025-10-09', // 한글날
  '2025-12-25', // 성탄절

  // 2026년 공휴일
  '2026-01-01', // 신정
  '2026-02-16', '2026-02-17', '2026-02-18', // 설날 연휴
  '2026-03-01', '2026-03-02', // 삼일절 및 대체공휴일
  '2026-05-05', // 어린이날
  '2026-05-24', '2026-05-25', // 부처님오신날 및 대체공휴일
  '2026-06-06', // 현충일
  '2026-08-15', '2026-08-17', // 광복절 및 대체공휴일
  '2026-09-24', '2026-09-25', '2026-09-26', // 추석 연휴
  '2026-10-03', '2026-10-05', // 개천절 및 대체공휴일
  '2026-10-09', // 한글날
  '2026-12-25', // 성탄절
]);

/**
 * 특정 일자가 주말(토/일)이거나 법정 공휴일인지 여부 판정
 * @param dateStr 'YYYY-MM-DD' 형식의 날짜 문자열
 * @returns true면 주말/공휴일, false면 순수 주중(평일)
 */
export function isWeekendOrHoliday(dateStr: string): boolean {
  if (!dateStr) return false;
  
  // 정규화 (YYYY-MM-DD)
  const cleanDate = dateStr.slice(0, 10);
  
  // 1. 공휴일 체크
  if (KOREAN_HOLIDAYS_SET.has(cleanDate)) {
    return true;
  }
  
  // 2. 요일 체크 (0: 일요일, 6: 토요일)
  const d = new Date(cleanDate);
  if (isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * 일자별 주중/주말 타입 반환
 */
export function getDayCategory(dateStr: string): 'weekday' | 'weekend' {
  return isWeekendOrHoliday(dateStr) ? 'weekend' : 'weekday';
}
