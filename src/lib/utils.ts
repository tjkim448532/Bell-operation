import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 콤마(,) 포함 문자열, null, undefined, NaN 등을 완벽히 방어하여 순수 숫자로 정규화 변환
 */
export function cleanNum(val: any): number {
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? 0 : val;
  }
  if (val === null || val === undefined || val === '') {
    return 0;
  }
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) || !isFinite(num) ? 0 : num;
}

/**
 * 원화 포맷터 (예: 56,608,188원)
 */
export function formatKrw(amount: any): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(cleanNum(amount))) + '원';
}

/**
 * 백분율 포맷터 (예: +15.4%, -3.2%)
 */
export function formatPercent(val: any, decimals = 1): string {
  const num = cleanNum(val);
  const formatted = num.toFixed(decimals);
  return num > 0 ? `+${formatted}%` : `${formatted}%`;
}
