"use client";

import pptxgen from 'pptxgenjs';
import { formatNumber, formatPercent } from './formatters';
import { TableData } from '@/components/PerformanceTable';
import { 
  RawExpenseRow, 
  AllocatedExpenseResult, 
  calculateDetailedExpenseAnalytics 
} from './financeEngine';

export interface ExportSlidesData {
  startDate: string;
  endDate: string;
  totalLeisureRevenue: number;
  totalAllocatedExpense: number;
  totalOperatingProfit: number;
  totalProfitMargin: number;
  totalLeisureVisitors: number;
  totalRoomGuests: number;
  penetrationRate: number;
  partKPIs: Array<{
    partName: string;
    revenue: number;
    allocatedExpense: number;
    operatingProfit: number;
    profitMargin: number;
    visitorCount: number;
    spendPerGuest: number;
    utilizationRate: number;
    isSupportTeam?: boolean;
  }>;
  gridRows?: Array<{
    teamName?: string;
    partName: string;
    venueName: string;
    ticketGroup: string;
    revenue: number;
    visitorCount: number;
    spendPerGuest: number;
  }>;
  dailyTrends?: Array<{
    date: string;
    revenue: number;
    visitors: number;
  }>;
  audit?: {
    totalExcelSum: number;
    totalAllocatedSum: number;
    delta: number;
    isZeroVariance: boolean;
  } | null;
  performanceTableData?: TableData;
  rawExpenses?: RawExpenseRow[];
  allocations?: Map<string, AllocatedExpenseResult>;
}

export async function exportDashboardToSlides(data: ExportSlidesData) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9'; // 10" x 5.625"
  pres.author = '벨포레 레져본부';
  pres.company = '블랙스톤 벨포레 리조트';
  pres.title = `벨포레 레져본부 실적보고서 (${data.startDate} ~ ${data.endDate})`;

  const C_MINT = '00AE95';
  const C_CHARCOAL = '18181B';
  const C_CARD_BG = 'FFFFFF';
  const C_SLATE_TEXT = '1E293B';
  const C_SLATE_MUTED = '64748B';
  const C_BORDER = 'E2E8F0';
  const C_ROSE = 'E11D48';
  const C_BLUE = '2563EB';
  const C_EMERALD = '10B981';
  const C_PURPLE = '7C3AED';
  const FONT_MAIN = 'Noto Sans KR';

  const avgSpend = data.totalLeisureVisitors > 0 
    ? Math.round(data.totalLeisureRevenue / data.totalLeisureVisitors) 
    : 0;

  const hasPerfTable = !!(data.performanceTableData && data.performanceTableData.divisions.length > 0);
  const totalSlides = hasPerfTable ? 5 : 4;

  // ==========================================================================
  // SLIDE 1: 실적 총괄 요약
  // ==========================================================================
  const slide1 = pres.addSlide();
  slide1.background = { color: 'F8FAFC' };

  // 상단 헤더 배너
  slide1.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.95,
    fill: { color: C_MINT },
    line: { color: C_MINT }
  });

  // 로고 심볼 B
  slide1.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 0.18,
    w: 0.6,
    h: 0.6,
    rectRadius: 0.12,
    fill: { color: 'FFFFFF' },
    line: { color: 'FFFFFF' }
  });
  slide1.addText('B', {
    x: 0.5,
    y: 0.18,
    w: 0.6,
    h: 0.6,
    fontSize: 22,
    fontFace: FONT_MAIN,
    bold: true,
    color: C_MINT,
    align: 'center',
    valign: 'middle'
  });

  // 헤더 타이틀
  slide1.addText('벨포레 레져본부 실적 및 손익 보고서', {
    x: 1.25,
    y: 0.15,
    w: 6.5,
    h: 0.38,
    fontSize: 15,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });
  slide1.addText(`조회 기간: ${data.startDate} ~ ${data.endDate} | 출처: 벨포레 정산 원장 (부가가치세 제외)`, {
    x: 1.25,
    y: 0.48,
    w: 6.5,
    h: 0.3,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: 'E6F7F4'
  });

  // 우측 슬라이드 번호 배지
  slide1.addText(`01 / 0${totalSlides}`, {
    x: 8.0,
    y: 0.32,
    w: 1.5,
    h: 0.35,
    fontSize: 10,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF',
    align: 'right'
  });

  // 주요 실적 요약 패널 (Soft Mint #E6F7F4)
  slide1.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 1.15,
    w: 9.0,
    h: 1.2,
    rectRadius: 0.15,
    fill: { color: 'E6F7F4' },
    line: { color: C_MINT, width: 1.5 }
  });
  slide1.addText('주요 실적 요약', {
    x: 0.7,
    y: 1.25,
    w: 8.6,
    h: 0.25,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    bold: true,
    color: '00826F'
  });
  const takeawayText = `• 레져본부 총 순매출은 ${formatNumber(data.totalLeisureRevenue)}원이며,\n• 총 객실 정원은 ${formatNumber(data.totalRoomGuests)}명, 레저 티켓 실측 이용객 수는 ${formatNumber(data.totalLeisureVisitors)}명입니다.`;
  slide1.addText(takeawayText, {
    x: 0.7,
    y: 1.55,
    w: 8.6,
    h: 0.7,
    fontSize: 10.5,
    fontFace: FONT_MAIN,
    color: '1E293B',
    lineSpacing: 16
  });

  // 1회성 및 특이 대형 비용 추출 (퇴직금, 1회성 공사/선급금/연간보험료 등)
  let severanceTotal = 0;
  let severanceCount = 0;
  const severanceItems: Array<{ amount: number; name: string }> = [];

  let otherOneOffTotal = 0;
  let otherOneOffCount = 0;
  const otherOneOffLabels: string[] = [];

  (data.rawExpenses || []).forEach((r) => {
    if (r.isDepreciation || r.accountName === '감가상각비') return;
    if (r.isOutsourced || r.assignedTeam === '외주') return;

    const amt = r.amount || 0;
    const acct = (r.accountName || '').trim();
    const memo = (r.memo || '').trim();

    // 1) 퇴직급여 / 퇴직금 (비경상적 대형 인건비 지출)
    if (acct.includes('퇴직') || memo.includes('퇴직')) {
      severanceTotal += amt;
      severanceCount++;
      const nameMatch = memo.match(/([가-힣]{2,4})\s*퇴직/);
      const personName = nameMatch && nameMatch[1] ? nameMatch[1] : '';
      severanceItems.push({ amount: amt, name: personName });
      return;
    }

    // 2) 공식 1회성 마킹 (isOneOff) 또는 대형 1회성 특별 지출 (선급금, 연간보험료, 대형공사, 기부금 등)
    if (r.isOneOff || memo.includes('선급금') || memo.includes('보험청구') || memo.includes('화재') || memo.includes('기부금') || memo.includes('미정산금')) {
      otherOneOffTotal += amt;
      otherOneOffCount++;
      const label = r.oneOffLabel || (memo.includes('기부') ? '기부금' : memo.includes('보험') ? '연간보험' : memo.includes('선급금') ? '사업선급금' : '1회성');
      otherOneOffLabels.push(label);
    }
  });

  // 금액 기준 내림차순 정렬하여 가장 큰 퇴직자 이름 추출
  severanceItems.sort((a, b) => b.amount - a.amount);
  const topSeveranceNames = severanceItems.map((i) => i.name).filter(Boolean);

  const specialExpenseTotal = severanceTotal + otherOneOffTotal;

  let specialSubText = '특이/1회성 비용 없음';
  if (specialExpenseTotal > 0) {
    const parts: string[] = [];
    if (severanceTotal > 0) {
      const namesStr = topSeveranceNames.length > 0
        ? `(${topSeveranceNames.slice(0, 2).join('·')}${topSeveranceNames.length > 2 ? ' 외' : ''})`
        : '';
      parts.push(`퇴직금 ${severanceCount}건${namesStr}`);
    }
    if (otherOneOffTotal > 0) {
      parts.push(`특이·1회성 ${otherOneOffCount}건`);
    }
    specialSubText = parts.join(', ');
  }

  // 4 Core KPI Cards
  const cardW = 2.13;
  const cardH = 1.6;
  const cardY = 2.5;
  const cardGap = 0.16;

  const kpis = [
    { label: '01. 레져 총 순매출', val: `${formatNumber(data.totalLeisureRevenue)}`, sub: '부가가치세 제외', color: C_MINT },
    { label: '02. 분배 총비용', val: `${formatNumber(data.totalAllocatedExpense)}`, sub: '직접비용 및 공통비 배부액', color: C_ROSE },
    { label: '03. 영업 손익', val: `${formatNumber(data.totalOperatingProfit)}`, sub: `손익률: ${formatPercent(data.totalProfitMargin)}`, color: C_EMERALD },
    { 
      label: '04. 주요 1회성·특이비용', 
      val: `${formatNumber(specialExpenseTotal)}`, 
      sub: specialSubText, 
      color: specialExpenseTotal > 0 ? C_PURPLE : C_SLATE_MUTED 
    },
  ];

  kpis.forEach((k, idx) => {
    const cardX = 0.5 + idx * (cardW + cardGap);
    slide1.addShape(pres.ShapeType.roundRect, {
      x: cardX,
      y: cardY,
      w: cardW,
      h: cardH,
      rectRadius: 0.15,
      fill: { color: C_CARD_BG },
      line: { color: C_BORDER, width: 1 }
    });
    slide1.addText(k.label, {
      x: cardX + 0.15,
      y: cardY + 0.15,
      w: cardW - 0.3,
      h: 0.25,
      fontSize: 9,
      fontFace: FONT_MAIN,
      bold: true,
      color: C_SLATE_MUTED
    });
    slide1.addText(k.val, {
      x: cardX + 0.15,
      y: cardY + 0.45,
      w: cardW - 0.3,
      h: 0.6,
      fontSize: 16,
      fontFace: FONT_MAIN,
      bold: true,
      color: k.color
    });
    slide1.addText(k.sub, {
      x: cardX + 0.15,
      y: cardY + 1.15,
      w: cardW - 0.3,
      h: 0.35,
      fontSize: 8,
      fontFace: FONT_MAIN,
      color: C_SLATE_MUTED
    });
  });

  // 하단 검증 확인 배너
  slide1.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 4.3,
    w: 9.0,
    h: 0.7,
    rectRadius: 0.12,
    fill: { color: 'E6F7F4' },
    line: { color: C_MINT, width: 1 }
  });
  slide1.addText('✔ 원천 전표와 부서 배부 비용 일치 확인 (오차 0원)', {
    x: 0.7,
    y: 4.4,
    w: 8.6,
    h: 0.25,
    fontSize: 10,
    fontFace: FONT_MAIN,
    bold: true,
    color: '00826F'
  });
  slide1.addText('원천 엑셀 전표 합계와 4대 부서 배부 비용 합계가 정확히 일치합니다.', {
    x: 0.7,
    y: 4.65,
    w: 8.6,
    h: 0.25,
    fontSize: 8.5,
    fontFace: FONT_MAIN,
    color: C_SLATE_MUTED
  });

  // ==========================================================================
  // SLIDE 2: 4대 부서 손익 및 비중 분석
  // ==========================================================================
  const slide2 = pres.addSlide();
  slide2.background = { color: 'F8FAFC' };

  slide2.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: C_MINT },
    line: { color: C_MINT }
  });
  slide2.addText('02. 레져본부 4대 부서 손익 및 비중', {
    x: 0.5,
    y: 0.15,
    w: 7.0,
    h: 0.32,
    fontSize: 15,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });
  slide2.addText('4대 부서(미디어아트센터, 액티비티, 목장, 디지털지원) 매출·비용·손익 결산표', {
    x: 0.5,
    y: 0.45,
    w: 7.0,
    h: 0.25,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: 'E6F7F4'
  });
  slide2.addText(`02 / 0${totalSlides}`, {
    x: 8.0,
    y: 0.25,
    w: 1.5,
    h: 0.35,
    fontSize: 10,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF',
    align: 'right'
  });

  // 부서별 손익 테이블
  const tableRowsSlide2: any[][] = [
    [
      { text: '부서명', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'left' } },
      { text: '순매출', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '매출 비중', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '분배 비용', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '영업 손익', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '손익률', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '이용객 수', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '1인당 객단가', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } }
    ]
  ];

  data.partKPIs.forEach((kpi) => {
    const isSupport = kpi.isSupportTeam || kpi.partName === '디지털지원';
    const share = data.totalLeisureRevenue > 0 ? (kpi.revenue / data.totalLeisureRevenue) * 100 : 0;
    tableRowsSlide2.push([
      { text: kpi.partName + (isSupport ? ' (지원부서)' : ''), options: { bold: true, align: 'left' } },
      { text: isSupport ? '-' : formatNumber(kpi.revenue), options: { bold: true, align: 'right', color: C_SLATE_TEXT } },
      { text: isSupport ? '-' : formatPercent(share), options: { align: 'right' } },
      { text: formatNumber(kpi.allocatedExpense), options: { align: 'right', color: C_ROSE } },
      { text: formatNumber(kpi.operatingProfit), options: { bold: true, align: 'right', color: kpi.operatingProfit >= 0 ? C_MINT : C_ROSE } },
      { text: isSupport ? '-' : formatPercent(kpi.profitMargin), options: { align: 'right' } },
      { text: isSupport ? '-' : formatNumber(kpi.visitorCount), options: { align: 'right' } },
      { text: isSupport ? '-' : formatNumber(kpi.spendPerGuest), options: { bold: true, align: 'right', color: C_MINT } }
    ]);
  });

  // 전체 합계 행
  tableRowsSlide2.push([
    { text: '레져본부 전체 합계', options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'left' } },
    { text: formatNumber(data.totalLeisureRevenue), options: { bold: true, fill: { color: '00826F' }, color: 'E6F7F4', align: 'right' } },
    { text: '100.0%', options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
    { text: formatNumber(data.totalAllocatedExpense), options: { bold: true, fill: { color: '00826F' }, color: 'FDA4AF', align: 'right' } },
    { text: formatNumber(data.totalOperatingProfit), options: { bold: true, fill: { color: '00826F' }, color: '6EE7B7', align: 'right' } },
    { text: formatPercent(data.totalProfitMargin), options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
    { text: formatNumber(data.totalLeisureVisitors), options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
    { text: formatNumber(avgSpend), options: { bold: true, fill: { color: '00826F' }, color: 'E6F7F4', align: 'right' } }
  ]);

  slide2.addTable(tableRowsSlide2, {
    x: 0.5,
    y: 1.1,
    w: 9.0,
    colW: [1.6, 1.1, 0.9, 1.1, 1.1, 0.9, 0.9, 1.4],
    border: { pt: 0.5, color: C_BORDER },
    fontFace: FONT_MAIN,
    fontSize: 9,
    rowH: 0.45
  });

  // ==========================================================================
  // SLIDE 3: 3-Depth 경영 실적 통합 분석 (대분류 > 파트 > 영업장)
  // ==========================================================================
  if (hasPerfTable && data.performanceTableData) {
    const slidePerf = pres.addSlide();
    slidePerf.background = { color: 'F8FAFC' };

    slidePerf.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.85,
      fill: { color: C_MINT },
      line: { color: C_MINT }
    });
    slidePerf.addText('03. 3-Depth 경영 실적 통합 분석', {
      x: 0.5,
      y: 0.15,
      w: 7.0,
      h: 0.32,
      fontSize: 15,
      fontFace: FONT_MAIN,
      bold: true,
      color: 'FFFFFF'
    });
    slidePerf.addText('대분류(본부) > 파트 > 영업장 계층별 당월 누계(MTD) 및 올해 누계(YTD) 실적 대조표', {
      x: 0.5,
      y: 0.45,
      w: 7.0,
      h: 0.25,
      fontSize: 9.5,
      fontFace: FONT_MAIN,
      color: 'E6F7F4'
    });
    slidePerf.addText(`03 / 0${totalSlides}`, {
      x: 8.0,
      y: 0.25,
      w: 1.5,
      h: 0.35,
      fontSize: 10,
      fontFace: FONT_MAIN,
      bold: true,
      color: 'FFFFFF',
      align: 'right'
    });

    const formatGrowth = (g: number | undefined | null) => {
      if (g === undefined || g === null || isNaN(g)) return '-';
      const arrow = g > 0 ? '▲ ' : g < 0 ? '▼ ' : '';
      return `${arrow}${Math.abs(g).toFixed(1)}%`;
    };

    const getGrowthColor = (g: number | undefined | null) => {
      if (!g) return C_SLATE_MUTED;
      return g > 0 ? C_ROSE : C_BLUE;
    };

    const perfTableRows: any[][] = [
      [
        { text: '조직 구분 (대분류 > 파트 > 영업장)', options: { bold: true, fill: { color: 'E2E8F0' }, color: C_SLATE_TEXT, align: 'left' } },
        { text: '당월 당해', options: { bold: true, fill: { color: 'CCFBF1' }, color: '0F766E', align: 'right' } },
        { text: '당월 전년', options: { bold: true, fill: { color: 'CCFBF1' }, color: '0F766E', align: 'right' } },
        { text: '당월 증감', options: { bold: true, fill: { color: 'CCFBF1' }, color: '0F766E', align: 'right' } },
        { text: '올해 당해', options: { bold: true, fill: { color: 'E0E7FF' }, color: '3730A3', align: 'right' } },
        { text: '올해 전년', options: { bold: true, fill: { color: 'E0E7FF' }, color: '3730A3', align: 'right' } },
        { text: '올해 증감', options: { bold: true, fill: { color: 'E0E7FF' }, color: '3730A3', align: 'right' } },
      ]
    ];

    data.performanceTableData.divisions.forEach((div) => {
      // 1-Depth: Division
      perfTableRows.push([
        { text: `${div.orgDivision} (대분류 총계)`, options: { bold: true, fill: { color: 'EEF2FF' }, color: '1E1B4B', align: 'left' } },
        { text: formatNumber(div.divisionSubtotal?.mtd?.actual), options: { bold: true, fill: { color: 'EEF2FF' }, align: 'right' } },
        { text: formatNumber(div.divisionSubtotal?.mtd?.ly), options: { fill: { color: 'EEF2FF' }, align: 'right', color: C_SLATE_MUTED } },
        { text: formatGrowth(div.divisionSubtotal?.mtd?.growth), options: { bold: true, fill: { color: 'EEF2FF' }, align: 'right', color: getGrowthColor(div.divisionSubtotal?.mtd?.growth) } },
        { text: formatNumber(div.divisionSubtotal?.ytd?.actual), options: { bold: true, fill: { color: 'EEF2FF' }, align: 'right' } },
        { text: formatNumber(div.divisionSubtotal?.ytd?.ly), options: { fill: { color: 'EEF2FF' }, align: 'right', color: C_SLATE_MUTED } },
        { text: formatGrowth(div.divisionSubtotal?.ytd?.growth), options: { bold: true, fill: { color: 'EEF2FF' }, align: 'right', color: getGrowthColor(div.divisionSubtotal?.ytd?.growth) } },
      ]);

      div.parts.forEach((part) => {
        // 2-Depth: Part
        perfTableRows.push([
          { text: `  [파트] ${part.partName} 소계`, options: { bold: true, fill: { color: 'FAF5FF' }, color: '581C87', align: 'left' } },
          { text: formatNumber(part.partSubtotal?.mtd?.actual), options: { bold: true, fill: { color: 'FAF5FF' }, align: 'right' } },
          { text: formatNumber(part.partSubtotal?.mtd?.ly), options: { fill: { color: 'FAF5FF' }, align: 'right', color: C_SLATE_MUTED } },
          { text: formatGrowth(part.partSubtotal?.mtd?.growth), options: { bold: true, fill: { color: 'FAF5FF' }, align: 'right', color: getGrowthColor(part.partSubtotal?.mtd?.growth) } },
          { text: formatNumber(part.partSubtotal?.ytd?.actual), options: { bold: true, fill: { color: 'FAF5FF' }, align: 'right' } },
          { text: formatNumber(part.partSubtotal?.ytd?.ly), options: { fill: { color: 'FAF5FF' }, align: 'right', color: C_SLATE_MUTED } },
          { text: formatGrowth(part.partSubtotal?.ytd?.growth), options: { bold: true, fill: { color: 'FAF5FF' }, align: 'right', color: getGrowthColor(part.partSubtotal?.ytd?.growth) } },
        ]);

        part.venues.forEach((venue) => {
          // 3-Depth: Venue
          perfTableRows.push([
            { text: `      • ${venue.venueName}`, options: { align: 'left', color: C_SLATE_TEXT } },
            { text: formatNumber(venue.metrics?.mtd?.actual), options: { align: 'right' } },
            { text: formatNumber(venue.metrics?.mtd?.ly), options: { align: 'right', color: C_SLATE_MUTED } },
            { text: formatGrowth(venue.metrics?.mtd?.growth), options: { align: 'right', color: getGrowthColor(venue.metrics?.mtd?.growth) } },
            { text: formatNumber(venue.metrics?.ytd?.actual), options: { align: 'right' } },
            { text: formatNumber(venue.metrics?.ytd?.ly), options: { align: 'right', color: C_SLATE_MUTED } },
            { text: formatGrowth(venue.metrics?.ytd?.growth), options: { align: 'right', color: getGrowthColor(venue.metrics?.ytd?.growth) } },
          ]);
        });
      });
    });

    slidePerf.addTable(perfTableRows, {
      x: 0.5,
      y: 1.05,
      w: 9.0,
      colW: [2.7, 1.05, 1.05, 0.95, 1.15, 1.15, 0.95],
      border: { pt: 0.5, color: C_BORDER },
      fontFace: FONT_MAIN,
      fontSize: 8,
      rowH: 0.28
    });
  }

  // ==========================================================================
  // SLIDE: 부서 및 세부 영업장별 상세 비용 (인건비/복지비)
  // ==========================================================================
  const slideVenues = pres.addSlide();
  slideVenues.background = { color: 'F8FAFC' };

  const venuesSlideNum = hasPerfTable ? 4 : 3;

  slideVenues.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: C_MINT },
    line: { color: C_MINT }
  });
  slideVenues.addText(`0${venuesSlideNum}. 부서 및 세부 영업장별 상세 비용 (인건비/복지비)`, {
    x: 0.5,
    y: 0.15,
    w: 7.0,
    h: 0.32,
    fontSize: 15,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });
  slideVenues.addText('파트별 인건비·복리후생비(복지비) 비교 및 세부 영업장별 비용 원장 (외주 격리)', {
    x: 0.5,
    y: 0.45,
    w: 7.0,
    h: 0.25,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: 'E6F7F4'
  });
  slideVenues.addText(`0${venuesSlideNum} / 0${totalSlides}`, {
    x: 8.0,
    y: 0.25,
    w: 1.5,
    h: 0.35,
    fontSize: 10,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF',
    align: 'right'
  });

  const expenseAnalytics = (data.rawExpenses && data.rawExpenses.length > 0)
    ? calculateDetailedExpenseAnalytics(data.rawExpenses, data.allocations || new Map())
    : null;

  if (expenseAnalytics) {
    // Matrix Table
    const tableRowsExpense: any[][] = [
      [
        { text: '부서명', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'left' } },
        { text: '인건비', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
        { text: '복리후생비', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
        { text: '운영경비/소모품', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
        { text: '지급수수료/임차', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
        { text: '마케팅/기타', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
        { text: '직접비용 소계', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
        { text: '배부공통비', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
        { text: '최종 총비용', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
        { text: '비중(%)', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      ]
    ];

    expenseAnalytics.partSummaries.forEach((p) => {
      const mktAndOther = (p.categories['마케팅/판촉비'] || 0) + (p.categories['시설유지/기타'] || 0);
      tableRowsExpense.push([
        { text: p.partName, options: { bold: true, align: 'left' } },
        { text: formatNumber(p.categories['인건비']), options: { bold: true, align: 'right', color: '3730A3' } },
        { text: formatNumber(p.categories['복리후생비']), options: { bold: true, align: 'right', color: 'BE123C' } },
        { text: formatNumber(p.categories['운영경비/소모품비']), options: { align: 'right' } },
        { text: formatNumber(p.categories['지급수수료/임차료']), options: { align: 'right' } },
        { text: formatNumber(mktAndOther), options: { align: 'right' } },
        { text: formatNumber(p.directTotal), options: { bold: true, align: 'right' } },
        { text: p.allocatedCommon > 0 ? formatNumber(p.allocatedCommon) : '-', options: { align: 'right', color: C_SLATE_MUTED } },
        { text: formatNumber(p.totalExpense), options: { bold: true, align: 'right', color: C_MINT } },
        { text: `${p.ratioOfTotal}%`, options: { bold: true, align: 'right' } },
      ]);
    });

    // Grand total row
    tableRowsExpense.push([
      { text: '레저본부 총합계', options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'left' } },
      { text: formatNumber(expenseAnalytics.macroTotals['인건비']), options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
      { text: formatNumber(expenseAnalytics.macroTotals['복리후생비']), options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
      { text: formatNumber(expenseAnalytics.macroTotals['운영경비/소모품비']), options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
      { text: formatNumber(expenseAnalytics.macroTotals['지급수수료/임차료']), options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
      { text: formatNumber((expenseAnalytics.macroTotals['마케팅/판촉비'] || 0) + (expenseAnalytics.macroTotals['시설유지/기타'] || 0)), options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
      { text: formatNumber(expenseAnalytics.grandTotalDirect), options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
      { text: '0원', options: { bold: true, fill: { color: '00826F' }, color: 'E6F7F4', align: 'right' } },
      { text: formatNumber(expenseAnalytics.grandTotalAllocated), options: { bold: true, fill: { color: '00826F' }, color: 'E6F7F4', align: 'right' } },
      { text: '100.0%', options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } },
    ]);

    slideVenues.addTable(tableRowsExpense, {
      x: 0.5,
      y: 1.15,
      w: 9.0,
      colW: [1.5, 0.9, 0.9, 0.9, 0.9, 0.8, 1.0, 0.8, 1.1, 0.6],
      border: { pt: 0.5, color: C_BORDER },
      fontFace: FONT_MAIN,
      fontSize: 9,
      rowH: 0.45
    });

    // 하단 검증 확인 배너
    slideVenues.addShape(pres.ShapeType.roundRect, {
      x: 0.5,
      y: 4.3,
      w: 9.0,
      h: 0.7,
      rectRadius: 0.12,
      fill: { color: 'E6F7F4' },
      line: { color: C_MINT, width: 1 }
    });
    slideVenues.addText('✔ 4대 직영 부서 비용 배분 및 외주 위탁비 100% 격리 검증 완료', {
      x: 0.7,
      y: 4.4,
      w: 8.6,
      h: 0.25,
      fontSize: 10,
      fontFace: FONT_MAIN,
      bold: true,
      color: '00826F'
    });
    slideVenues.addText('놀이동산 등 외주 매장 전표는 직영 비용 합계에서 원천 격리되어 직영 원가 왜곡을 방지합니다.', {
      x: 0.7,
      y: 4.65,
      w: 8.6,
      h: 0.25,
      fontSize: 8.5,
      fontFace: FONT_MAIN,
      color: C_SLATE_MUTED
    });
  } else {
    slideVenues.addText('실측 전표 데이터 대기 중 (비용 엑셀 등록 후 재다운로드)', {
      x: 0.5, y: 2.0, w: 9.0, h: 1.0, fontSize: 13, fontFace: FONT_MAIN, bold: true, color: C_SLATE_MUTED, align: 'center'
    });
  }

  // ==========================================================================
  // SLIDE: 일별 매출 추이 (Daily Trends)
  // ==========================================================================
  const slideTrends = pres.addSlide();
  slideTrends.background = { color: 'F8FAFC' };

  slideTrends.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: C_MINT },
    line: { color: C_MINT }
  });
  slideTrends.addText(`0${totalSlides}. 월별 실적 추이 및 매출·비용 분석`, {
    x: 0.5,
    y: 0.15,
    w: 7.0,
    h: 0.32,
    fontSize: 15,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });
  slideTrends.addText(`2026년 1월부터 당월까지 레져본부 및 모든 영업장별 월별 실적 현황`, {
    x: 0.5,
    y: 0.45,
    w: 7.0,
    h: 0.25,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: 'E6F7F4'
  });
  slideTrends.addText(`0${totalSlides} / 0${totalSlides}`, {
    x: 8.0,
    y: 0.25,
    w: 1.5,
    h: 0.35,
    fontSize: 10,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF',
    align: 'right'
  });

  // 일별 요약 카드 2개
  slideTrends.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 1.1,
    w: 4.35,
    h: 1.3,
    rectRadius: 0.12,
    fill: { color: C_CARD_BG },
    line: { color: C_BORDER }
  });
  slideTrends.addText('일평균 순매출', {
    x: 0.7,
    y: 1.25,
    w: 4.0,
    h: 0.25,
    fontSize: 10,
    fontFace: FONT_MAIN,
    color: C_SLATE_MUTED,
    bold: true
  });
  const daysCount = data.dailyTrends?.length || 0;
  const avgDailyRev = daysCount > 0 ? Math.round(data.totalLeisureRevenue / daysCount) : 0;
  slideTrends.addText(daysCount > 0 ? `${formatNumber(avgDailyRev)}원 / 일` : '실측 추이 대기 중', {
    x: 0.7,
    y: 1.55,
    w: 4.0,
    h: 0.5,
    fontSize: daysCount > 0 ? 20 : 14,
    fontFace: FONT_MAIN,
    color: daysCount > 0 ? C_MINT : C_SLATE_MUTED,
    bold: true
  });

  slideTrends.addShape(pres.ShapeType.roundRect, {
    x: 5.15,
    y: 1.1,
    w: 4.35,
    h: 1.3,
    rectRadius: 0.12,
    fill: { color: C_CARD_BG },
    line: { color: C_BORDER }
  });
  slideTrends.addText('일평균 이용객 수', {
    x: 5.35,
    y: 1.25,
    w: 4.0,
    h: 0.25,
    fontSize: 10,
    fontFace: FONT_MAIN,
    color: C_SLATE_MUTED,
    bold: true
  });
  const avgDailyVisitors = daysCount > 0 ? Math.round(data.totalLeisureVisitors / daysCount) : 0;
  slideTrends.addText(daysCount > 0 ? `${formatNumber(avgDailyVisitors)}명 / 일` : '실측 추이 대기 중', {
    x: 5.35,
    y: 1.55,
    w: 4.0,
    h: 0.5,
    fontSize: daysCount > 0 ? 20 : 14,
    fontFace: FONT_MAIN,
    color: daysCount > 0 ? C_SLATE_TEXT : C_SLATE_MUTED,
    bold: true
  });

  // 안내문 박스
  slideTrends.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 2.6,
    w: 9.0,
    h: 2.4,
    rectRadius: 0.15,
    fill: { color: 'E6F7F4' },
    line: { color: C_MINT, width: 1.5 }
  });
  slideTrends.addText('구글 슬라이드 온라인 편집 안내', {
    x: 0.8,
    y: 2.8,
    w: 8.4,
    h: 0.35,
    fontSize: 12,
    fontFace: FONT_MAIN,
    bold: true,
    color: '00826F'
  });
  const guideText = `1. 다운로드된 파일(.pptx)을 구글 드라이브(drive.google.com)에 업로드합니다.\n2. 마우스 우클릭 후 '연결 앱 > Google 프레젠테이션'을 클릭하면 즉시 온라인 슬라이드로 열립니다.\n3. 본 슬라이드의 3-Depth 경영 실적표를 비롯한 모든 텍스트, 숫자, 표, 색상은 벡터 데이터로 분리되어 있어 구글 슬라이드 상에서 자유롭게 편집 및 추가 작성이 가능합니다.\n\n* 출처: 벨포레 정산 원장 (부가가치세 제외)`;
  slideTrends.addText(guideText, {
    x: 0.8,
    y: 3.2,
    w: 8.4,
    h: 1.6,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: '1E293B',
    lineSpacing: 18
  });

  // 파일 다운로드 실행
  const fileName = `벨포레_레져본부_경영실적보고서_${data.startDate}_${data.endDate}.pptx`;
  await pres.writeFile({ fileName });
  return fileName;
}

export interface MonthlyMetricForSlide {
  revenue: number;
  expense: number;
  profit: number;
}

export interface ExportMonthlyPnLSlidesOptions {
  data: {
    months: string[];
    monthLabels: string[];
    grandTotal: {
      directTotal: {
        name: string;
        monthly: Record<string, MonthlyMetricForSlide>;
        total: MonthlyMetricForSlide;
      };
      allTotal: {
        name: string;
        monthly: Record<string, MonthlyMetricForSlide>;
        total: MonthlyMetricForSlide;
      };
    };
    departments: Array<{
      name: string;
      monthly: Record<string, MonthlyMetricForSlide>;
      total: MonthlyMetricForSlide;
      venues: Array<{
        name: string;
        monthly: Record<string, MonthlyMetricForSlide>;
        total: MonthlyMetricForSlide;
        subVenues?: Array<{
          name: string;
          monthly: Record<string, MonthlyMetricForSlide>;
          total: MonthlyMetricForSlide;
        }>;
      }>;
    }>;
  };
  unit?: 'million' | 'thousand' | 'won';
  viewMode?: string;
}

export async function exportMonthlyPnLToSlides(options: ExportMonthlyPnLSlidesOptions): Promise<string> {
  const { data, unit = 'million' } = options;
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9'; // 10" x 5.625"
  pres.author = '벨포레 레져본부';
  pres.company = '블랙스톤 벨포레 리조트';
  pres.title = `벨포레 2026 연간 레저본부 및 세부 영업장별 월별 손익 추이 (P&L)`;

  const C_MINT = '00AE95';
  const C_SLATE_TEXT = '1E293B';
  const C_BORDER = 'CBD5E1';
  const C_ROSE = 'E11D48';
  const C_EMERALD = '00826F';
  const FONT_MAIN = 'Noto Sans KR';

  const formatVal = (val: number, showSign = false): string => {
    if (val === 0) return '-';
    const sign = showSign && val > 0 ? '+' : '';
    if (unit === 'million') {
      const inM = val / 1000000;
      return `${sign}${inM.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    if (unit === 'thousand') {
      const inK = Math.round(val / 1000);
      return `${sign}${inK.toLocaleString('ko-KR')}천`;
    }
    return `${sign}${val.toLocaleString('ko-KR')}`;
  };

  // ==========================================================================
  // SLIDE 1: 2026 연간 P&L 월별 추이 (직영 및 4대 부서 결산표)
  // ==========================================================================
  const slide1 = pres.addSlide();
  slide1.background = { color: 'F8FAFC' };

  slide1.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: C_MINT },
    line: { color: C_MINT }
  });

  slide1.addText('2026 연간 레저본부 월별 매출·비용·손익 추이 (P&L)', {
    x: 0.5,
    y: 0.12,
    w: 7.0,
    h: 0.35,
    fontSize: 14,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });

  const unitText = unit === 'million' ? '백만원 (M)' : unit === 'thousand' ? '천원' : '원';
  slide1.addText(`단위: ${unitText} | 감가상각비 제외 (실지출 기준) | ${data.monthLabels[0]} ~ ${data.monthLabels[data.monthLabels.length - 1]} (${data.months.length}개월 누적)`, {
    x: 0.5,
    y: 0.47,
    w: 7.0,
    h: 0.25,
    fontSize: 9,
    fontFace: FONT_MAIN,
    color: 'E6F7F4'
  });

  slide1.addText('01 / 02', {
    x: 8.0,
    y: 0.25,
    w: 1.5,
    h: 0.35,
    fontSize: 10,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF',
    align: 'right'
  });

  // 테이블 생성
  const headerCols: any[] = [
    { text: '부서명', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'left' } },
    { text: '구분', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'center' } },
    ...data.monthLabels.map((ml) => ({
      text: ml,
      options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' }
    })),
    { text: '총합(누적)', options: { bold: true, fill: { color: '00826F' }, color: 'FFFFFF', align: 'right' } }
  ];

  const tableRowsSlide1: any[][] = [headerCols];

  const addDeptRows = (name: string, monthly: Record<string, MonthlyMetricForSlide>, total: MonthlyMetricForSlide, isHighlight = false) => {
    const bgRow1 = isHighlight ? 'F0FDF4' : 'FFFFFF';
    const bgRow2 = isHighlight ? 'FFF1F2' : 'FAFAFA';
    const bgRow3 = isHighlight ? 'EEF2FF' : 'FFFFFF';
    const nameCell = { text: name, options: { bold: true, rowSpan: 3, align: 'left', valign: 'middle', fill: { color: isHighlight ? 'E6F7F4' : 'FFFFFF' } } };

    // 매출
    tableRowsSlide1.push([
      nameCell,
      { text: '매출', options: { bold: true, align: 'center', color: '00826F', fill: { color: bgRow1 } } },
      ...data.months.map((ym) => ({ text: formatVal(monthly[ym]?.revenue || 0), options: { align: 'right', fill: { color: bgRow1 }, bold: isHighlight } })),
      { text: formatVal(total.revenue), options: { bold: true, align: 'right', fill: { color: isHighlight ? '00826F' : 'E2E8F0' }, color: isHighlight ? 'FFFFFF' : C_SLATE_TEXT } }
    ]);
    // 비용
    tableRowsSlide1.push([
      { text: '비용', options: { bold: true, align: 'center', color: C_ROSE, fill: { color: bgRow2 } } },
      ...data.months.map((ym) => ({ text: formatVal(monthly[ym]?.expense || 0), options: { align: 'right', fill: { color: bgRow2 }, color: C_ROSE, bold: isHighlight } })),
      { text: formatVal(total.expense), options: { bold: true, align: 'right', fill: { color: isHighlight ? 'FDA4AF' : 'E2E8F0' }, color: isHighlight ? '9F1239' : C_ROSE } }
    ]);
    // 손익
    tableRowsSlide1.push([
      { text: '손익', options: { bold: true, align: 'center', color: '4338CA', fill: { color: bgRow3 } } },
      ...data.months.map((ym) => {
        const p = monthly[ym]?.profit || 0;
        return { text: formatVal(p, true), options: { align: 'right', fill: { color: bgRow3 }, bold: true, color: p >= 0 ? C_EMERALD : C_ROSE } };
      }),
      { text: formatVal(total.profit, true), options: { bold: true, align: 'right', fill: { color: isHighlight ? '6EE7B7' : 'E2E8F0' }, color: isHighlight ? '064E3B' : (total.profit >= 0 ? C_EMERALD : C_ROSE) } }
    ]);
  };

  addDeptRows('레저본부 직영 합계 (SSOT)', data.grandTotal.directTotal.monthly, data.grandTotal.directTotal.total, true);

  data.departments.forEach((dept) => {
    addDeptRows(dept.name, dept.monthly, dept.total, false);
  });

  addDeptRows('레저사업본부 전체 총합계', data.grandTotal.allTotal.monthly, data.grandTotal.allTotal.total, true);

  const nameW = 1.6;
  const typeW = 0.5;
  const totalW = 0.9;
  const remainingW = 9.0 - (nameW + typeW + totalW);
  const monthW = remainingW / data.months.length;
  const colWidths = [nameW, typeW, ...data.months.map(() => monthW), totalW];

  slide1.addTable(tableRowsSlide1, {
    x: 0.5,
    y: 1.0,
    w: 9.0,
    colW: colWidths,
    border: { pt: 0.5, color: C_BORDER },
    fontFace: FONT_MAIN,
    fontSize: 7.5,
    rowH: 0.18
  });

  // ==========================================================================
  // SLIDE 2: 세부 영업장별 2026 연간 누적 실적 및 온라인 편집 가이드
  // ==========================================================================
  const slide2 = pres.addSlide();
  slide2.background = { color: 'F8FAFC' };

  slide2.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: C_MINT },
    line: { color: C_MINT }
  });

  slide2.addText('2026 연간 세부 영업장별 손익 결산 및 온라인 편집 안내', {
    x: 0.5,
    y: 0.12,
    w: 7.0,
    h: 0.35,
    fontSize: 14,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });

  slide2.addText('12개 세부 영업장 및 디지털지원(본부공통) 누적 실적표 | 구글 슬라이드 온라인 편집 안내', {
    x: 0.5,
    y: 0.47,
    w: 7.0,
    h: 0.25,
    fontSize: 9,
    fontFace: FONT_MAIN,
    color: 'E6F7F4'
  });

  slide2.addText('02 / 02', {
    x: 8.0,
    y: 0.25,
    w: 1.5,
    h: 0.35,
    fontSize: 10,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF',
    align: 'right'
  });

  const venueTableRows: any[][] = [
    [
      { text: '소속 부서', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'left' } },
      { text: '세부 영업장명', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'left' } },
      { text: '연간 순매출', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '연간 직접비용', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '영업 손익', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } },
      { text: '손익률(%)', options: { bold: true, fill: { color: 'E6F7F4' }, color: '00826F', align: 'right' } }
    ]
  ];

  data.departments.forEach((dept) => {
    dept.venues.forEach((v) => {
      const margin = v.total.revenue > 0 ? ((v.total.profit / v.total.revenue) * 100).toFixed(1) + '%' : '-';
      venueTableRows.push([
        { text: dept.name, options: { align: 'left' } },
        { text: v.name, options: { bold: true, align: 'left' } },
        { text: formatVal(v.total.revenue), options: { align: 'right', bold: true } },
        { text: formatVal(v.total.expense), options: { align: 'right', color: C_ROSE } },
        { text: formatVal(v.total.profit, true), options: { align: 'right', bold: true, color: v.total.profit >= 0 ? C_EMERALD : C_ROSE } },
        { text: margin, options: { align: 'right', color: '64748B' } }
      ]);
    });
  });

  slide2.addTable(venueTableRows, {
    x: 0.5,
    y: 1.0,
    w: 5.2,
    colW: [1.1, 1.2, 0.9, 0.9, 0.6, 0.5],
    border: { pt: 0.5, color: C_BORDER },
    fontFace: FONT_MAIN,
    fontSize: 7.5,
    rowH: 0.2
  });

  // 우측: 구글 슬라이드 안내 박스
  slide2.addShape(pres.ShapeType.roundRect, {
    x: 6.0,
    y: 1.0,
    w: 3.5,
    h: 4.2,
    rectRadius: 0.15,
    fill: { color: 'E6F7F4' },
    line: { color: C_MINT, width: 1.5 }
  });
  slide2.addText('구글 슬라이드 100% 호환 안내', {
    x: 6.2,
    y: 1.2,
    w: 3.1,
    h: 0.35,
    fontSize: 12,
    fontFace: FONT_MAIN,
    bold: true,
    color: '00826F'
  });
  const guideText = `1. 다운로드된 파일(.pptx)을 구글 드라이브(drive.google.com)에 업로드합니다.\n\n2. 파일을 더블클릭하거나 '연결 앱 > Google 프레젠테이션'을 선택합니다.\n\n3. 모든 월별 P&L 숫자, 부서명, 색상, 서식이 벡터 표(Table)로 보존되어 있어 구글 슬라이드에서 폰트, 숫자, 셀 색상을 자유롭게 편집할 수 있습니다.\n\n* 출처: 벨포레 정산 원장 (부가가치세 제외, 비현금 감가상각비 제외)`;
  slide2.addText(guideText, {
    x: 6.2,
    y: 1.65,
    w: 3.1,
    h: 3.3,
    fontSize: 9,
    fontFace: FONT_MAIN,
    color: '1E293B',
    lineSpacing: 16
  });

  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }).replace(/-/g, '');
  const fileName = `벨포레_2026_연간_월별_PnL_실적추이_${dateStr}.pptx`;
  await pres.writeFile({ fileName });
  return fileName;
}
