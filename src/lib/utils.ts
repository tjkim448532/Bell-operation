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
  let str = String(val).trim();
  if (!str) return 0;

  // Handle accounting parentheses negative e.g. "(1,000.50)" -> -1000.50
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-') || str.includes('-')) {
    isNegative = true;
  }

  // Remove commas, currency symbols (₩, $, 원), whitespace, and minus signs (already tracked by isNegative)
  const cleaned = str.replace(/[,\s₩$원]/g, '').replace(/-/g, '');
  const num = Number(cleaned);
  if (isNaN(num) || !isFinite(num)) return 0;
  return isNegative ? -num : num;
}

/**
 * 원화 포맷터 (예: 56,608,188원)
 */
export function formatKrw(amount: any): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(cleanNum(amount))) + '원';
}

/**
 * V6 금액/수치 표준 포맷터: 순수 숫자와 쉼표로만 구성된 #,##0 서식 (예: 15,300,000)
 * ₩ 또는 임의의 통화 기호 텍스트 조합을 완전히 배제하고 천 단위 콤마만 적용
 */
export function formatNumber(val: any): string {
  const num = Math.round(cleanNum(val));
  return new Intl.NumberFormat('ko-KR').format(num);
}

/**
 * 백분율 포맷터 (예: +15.4%, -3.2%)
 */
export function formatPercent(val: any, decimals = 1): string {
  const num = cleanNum(val);
  const formatted = num.toFixed(decimals);
  return num > 0 ? `+${formatted}%` : `${formatted}%`;
}

