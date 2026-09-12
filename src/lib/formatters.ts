/**
 * 벨포레 금융/재무 포맷팅 표준 유틸리티
 * 
 * [무관용 절대 규칙]
 * 1. ₩ 통화 기호는 전면 배제하며, 순수 천 단위 콤마(#,##0) 서식을 엄격 적용합니다.
 * 2. 값이 없거나 NaN인 경우 '0'을 반환합니다.
 */

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 0,
  }).format(Math.round(val));
}

export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  return `${val.toFixed(decimals)}%`;
}

export function cleanNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}
