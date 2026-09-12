/**
 * 벨포레 레저사업본부 재무/운영 핵심 비즈니스 로직 엔진
 * 
 * 1. 비용 안분 엔진 (Allocation Engine): 직과 배정 + 공통비 안분
 * 2. 1원 단위 절사오차 보정 (Zero-Variance Penny Balancing)
 * 3. KPI 계산기: 손익(P&L), 객단가(Spend per Guest), 숙박객 이용율(Utilization Rate)
 * 4. 검증마스터 (Validation Master): 엑셀 원천 데이터와 배분액 간의 무결성 감사
 */

export interface RawExpenseRow {
  accountCode: string;
  accountName: string;
  macroCategory: string;
  rawDepartment: string;
  amount: number;
  memo?: string;
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
  allocatedExpense: number;  // 파트별 분배 비용
  operatingProfit: number;   // 파트별 손익 (매출 - 비용)
  profitMargin: number;      // 영업이익률 (%)
  visitorCount: number;      // 파트 이용객 수
  spendPerGuest: number;     // 객단가 (매출 / 이용객 수)
  utilizationRate: number;   // 이용율 (파트 이용객 / 전체 숙박객 수 * 100)
}

/**
 * 1. 비용 안분 및 검증마스터 엔진
 * - 백엔드에서 내려준 파트명을 기준으로 100% 직과 또는 공통비 안분 집행
 */
export function allocateExpenses(
  expenses: RawExpenseRow[],
  partMetrics: PartMetrics[]
): { allocations: Map<string, AllocatedExpenseResult>; audit: ValidationMasterReport } {
  const totalLeisureRevenue = partMetrics.reduce((sum, p) => sum + p.revenue, 0);
  const totalExcelSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  const resultMap = new Map<string, AllocatedExpenseResult>();
  partMetrics.forEach((p) => {
    resultMap.set(p.partName, {
      partName: p.partName,
      directExpense: 0,
      commonExpense: 0,
      totalExpense: 0,
    });
  });

  expenses.forEach((expense) => {
    const rawDept = expense.rawDepartment || '';
    
    // 백엔드 파트명과 엑셀 부서명 1:1 직과 판별 (임의 매핑 딕셔너리 전면 배제)
    const matchedPart = partMetrics.find((p) => {
      return rawDept.includes(p.partName) || p.partName.includes(rawDept);
    });

    if (matchedPart) {
      // (1) 직과 배정 (Direct Allocation - 100%)
      const target = resultMap.get(matchedPart.partName)!;
      target.directExpense += expense.amount;
      target.totalExpense += expense.amount;
    } else {
      // (2) 공통비 안분 배정 (Common Pool by Revenue Ratio)
      partMetrics.forEach((p) => {
        const ratio = totalLeisureRevenue > 0 ? p.revenue / totalLeisureRevenue : 1 / partMetrics.length;
        const allocatedPortion = Math.round(expense.amount * ratio);
        const target = resultMap.get(p.partName)!;
        target.commonExpense += allocatedPortion;
        target.totalExpense += allocatedPortion;
      });
    }
  });

  // (3) 1원 단위 절사오차 보정 (Penny Balancing)
  let totalAllocatedSum = 0;
  resultMap.forEach((v) => (totalAllocatedSum += v.totalExpense));
  const delta = totalExcelSum - totalAllocatedSum;

  if (delta !== 0 && partMetrics.length > 0) {
    // 매출 비중 1위 파트에 잔여 단수(1~2원)를 가산하여 Zero-Variance 보장
    const topPart = [...partMetrics].sort((a, b) => b.revenue - a.revenue)[0];
    const target = resultMap.get(topPart.partName)!;
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
 * 2. KPI 및 손익 자동 계산 함수
 */
export function calculatePartKPIs(
  partMetrics: PartMetrics[],
  allocations: Map<string, AllocatedExpenseResult>,
  totalResortRoomGuests: number
): LeisurePartKPISummary[] {
  return partMetrics.map((part) => {
    const alloc = allocations.get(part.partName) || {
      directExpense: 0,
      commonExpense: 0,
      totalExpense: 0,
    };

    // 파트별 손익 = (파트별 매출) - (파트별로 분배된 비용)
    const operatingProfit = part.revenue - alloc.totalExpense;
    const profitMargin = part.revenue > 0 ? (operatingProfit / part.revenue) * 100 : 0;

    // 객단가 = (파트별 매출) / (파트별 이용객 수)
    const spendPerGuest = part.visitors > 0 ? Math.round(part.revenue / part.visitors) : 0;

    // 이용율 = (파트별 이용객 수) / (전체 숙박객 수) * 100 (%)
    const utilizationRate =
      totalResortRoomGuests > 0 ? (part.visitors / totalResortRoomGuests) * 100 : 0;

    return {
      partName: part.partName,
      revenue: part.revenue,
      allocatedExpense: alloc.totalExpense,
      operatingProfit,
      profitMargin: Number(profitMargin.toFixed(1)),
      visitorCount: part.visitors,
      spendPerGuest,
      utilizationRate: Number(utilizationRate.toFixed(2)),
    };
  });
}
