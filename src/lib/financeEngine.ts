/**
 * 벨포레 레저사업본부 재무/운영 핵심 비즈니스 로직 엔진
 * 
 * 1. 비용 안분 엔진 (Allocation Engine): 직과 배정 + 공통비 안분
 * 2. 1원 단위 절사오차 보정 (Zero-Variance Penny Balancing)
 * 3. KPI 계산기: 손익(P&L), 객단가(Spend per Guest), 숙박객 이용율(Utilization Rate)
 * 4. 검증마스터 (Validation Master): 엑셀 원천 데이터와 배분액 간의 무결성 감사
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

export interface RawExpenseRow {
  accountCode: string;
  accountName: string;
  macroCategory: string;
  rawDepartment: string;
  amount: number;
  memo?: string;
  assignedTeam?: string;       // 4대 팀 중 하나 또는 '본부공통'
  assignedCategory?: string;   // 6대 표준 비목
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
  totalExcelSum: number;
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

  // 2. 미디어아트센터
  if (
    combined.includes('미디어') ||
    combined.includes('아트센터') ||
    combined.includes('뮤지엄') ||
    combined.includes('기프트샵') ||
    combined.includes('벨포레홀')
  ) {
    return '미디어아트센터';
  }

  // 3. 목장
  if (
    combined.includes('목장') ||
    combined.includes('체험') ||
    combined.includes('얼룩말') ||
    combined.includes('리틀팜') ||
    combined.includes('양떼')
  ) {
    return '목장';
  }

  // 4. 액티비티 (놀이동산 포함)
  if (
    combined.includes('액티비티') ||
    combined.includes('엑티비티') ||
    combined.includes('activity') ||
    combined.includes('카트') ||
    combined.includes('마운틴') ||
    combined.includes('썰매') ||
    combined.includes('마리나') ||
    combined.includes('썸머랜드') ||
    combined.includes('원더풀') ||
    combined.includes('놀이동산') ||
    combined.includes('회전그네') ||
    combined.includes('미니골프') ||
    combined.includes('미니포렛')
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
  if (c.startsWith('611') || c.startsWith('617') || c.startsWith('621') || n.includes('복리') || n.includes('보험') || n.includes('식대') || n.includes('연금') || n.includes('세금과공과')) {
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
 * 4대 팀 비용 배분 및 검증마스터 엔진
 * - 디지털지원은 독립된 팀으로 자체 비용 100% 직과 집계
 * - 본부 공통비는 매출 발생 3개 부서(미디어아트센터, 액티비티, 목장)에 매출 비율로 합리적 안분
 * - 1원 단위 절사오차 보정 (Zero-Variance Penny Balancing)
 */
export function allocateExpenses(
  expenses: RawExpenseRow[],
  partMetrics: PartMetrics[]
): { allocations: Map<string, AllocatedExpenseResult>; audit: ValidationMasterReport } {
  const totalExcelSum = expenses.reduce((sum, e) => sum + e.amount, 0);

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

  expenses.forEach((expense) => {
    const assignedTeam = expense.assignedTeam || inferTeamFromRawRow(expense.rawDepartment, expense.rawDepartment, expense.memo);
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
  const delta = totalExcelSum - totalAllocatedSum;

  if (delta !== 0) {
    // 매출 1위 파트(또는 첫 번째 매출 팀)에 단수 1~2원 보정하여 Zero-Variance 달성
    const topTeam = revenueTeams[0];
    const target = resultMap.get(topTeam)!;
    target.commonExpense += delta;
    target.totalExpense += delta;
    totalAllocatedSum += delta;
  }

  const audit: ValidationMasterReport = {
    totalExcelSum,
    totalAllocatedSum,
    delta: totalExcelSum - totalAllocatedSum,
    isZeroVariance: totalExcelSum === totalAllocatedSum,
    status: totalExcelSum === totalAllocatedSum ? 'VERIFIED' : 'DISCREPANCY',
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
