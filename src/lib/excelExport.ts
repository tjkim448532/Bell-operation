import * as XLSX from 'xlsx';
import { LeisurePartKPISummary, ValidationMasterReport } from '@/lib/financeEngine';
import { HierarchicalRow } from '@/components/HierarchicalRowspanTable';

/**
 * 경영보고서용 엑셀 내보내기 유틸리티
 * - 파트별 손익 및 KPI 요약 시트
 * - 계층형 세부 실적 시트
 * - 검증마스터 감사 리포트 시트
 */
export function exportLeisureDashboardToExcel({
  targetPeriod,
  partKPIs,
  gridRows,
  audit,
}: {
  targetPeriod: string;
  partKPIs: LeisurePartKPISummary[];
  gridRows: HierarchicalRow[];
  audit: ValidationMasterReport | null;
}) {
  const wb = XLSX.utils.book_new();

  // 1. 파트별 손익 및 KPI 시트
  const partSummaryData = partKPIs.map((p) => ({
    '레저 파트': p.partName,
    '순매출': p.revenue,
    '분배비용': p.allocatedExpense,
    '영업손익': p.operatingProfit,
    '이익률(%)': p.profitMargin,
    '이용객수(명)': p.visitorCount,
    '객단가': p.spendPerGuest,
    '숙박객 이용율(%)': p.utilizationRate,
  }));

  const totalRev = partKPIs.reduce((sum, p) => sum + p.revenue, 0);
  const totalExp = partKPIs.reduce((sum, p) => sum + p.allocatedExpense, 0);
  const totalProfit = totalRev - totalExp;
  const totalVis = partKPIs.reduce((sum, p) => sum + p.visitorCount, 0);

  partSummaryData.push({
    '레저 파트': '합계 (Grand Total)',
    '순매출': totalRev,
    '분배비용': totalExp,
    '영업손익': totalProfit,
    '이익률(%)': totalRev > 0 ? Number(((totalProfit / totalRev) * 100).toFixed(1)) : 0,
    '이용객수(명)': totalVis,
    '객단가': totalVis > 0 ? Math.round(totalRev / totalVis) : 0,
    '숙박객 이용율(%)': 0,
  });

  const wsPart = XLSX.utils.json_to_sheet(partSummaryData);
  XLSX.utils.book_append_sheet(wb, wsPart, '파트별 P&L 요약');

  // 2. 계층형 세부 실적 시트
  const gridData = gridRows.map((r) => ({
    '레저 파트(대분류)': r.partName,
    '세부 영업장': r.venueName,
    '상품/티켓군': r.ticketGroup,
    '순매출': r.revenue,
    '이용객(명)': r.visitorCount,
    '객단가': r.spendPerGuest,
  }));
  const wsGrid = XLSX.utils.json_to_sheet(gridData);
  XLSX.utils.book_append_sheet(wb, wsGrid, '계층형 세부 실적');

  // 3. 검증마스터 감사 리포트 시트
  if (audit) {
    const auditData = [
      { '구분': '원천 엑셀 총액', '금액': audit.totalExcelSum },
      { '구분': '파트 분배 총액', '금액': audit.totalAllocatedSum },
      { '구분': '단수 오차(Δ)', '금액': audit.delta },
      { '구분': '무결성 감사 결과', '금액': audit.isZeroVariance ? 'ZERO-VARIANCE 통과' : '불일치' },
    ];
    const wsAudit = XLSX.utils.json_to_sheet(auditData);
    XLSX.utils.book_append_sheet(wb, wsAudit, '검증마스터 감사');
  }

  // 파일 다운로드 실행
  const fileName = `벨포레_레저본부_손익보고서_${targetPeriod.replace(/[^0-9-]/g, '')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
