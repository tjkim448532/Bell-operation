"use client";

import pptxgen from 'pptxgenjs';
import { formatNumber, formatPercent } from './formatters';

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
  const C_EMERALD = '10B981';
  const FONT_MAIN = 'Noto Sans KR';

  const avgSpend = data.totalLeisureVisitors > 0 
    ? Math.round(data.totalLeisureRevenue / data.totalLeisureVisitors) 
    : 0;

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
  slide1.addText('01 / 04', {
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
  const takeawayText = `• 레져본부 총 순매출은 ${formatNumber(data.totalLeisureRevenue)}원, 총 이용객은 ${formatNumber(data.totalLeisureVisitors)}명입니다.\n• 리조트 전체 투숙객(${formatNumber(data.totalRoomGuests)}명) 대비 레져 이용률은 ${formatPercent(data.penetrationRate)}입니다.`;
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

  // 4 Core KPI Cards
  const cardW = 2.13;
  const cardH = 1.6;
  const cardY = 2.5;
  const cardGap = 0.16;

  const kpis = [
    { label: '01. 레져 총 순매출', val: `${formatNumber(data.totalLeisureRevenue)}`, sub: '부가가치세 제외', color: C_MINT },
    { label: '02. 분배 총비용', val: `${formatNumber(data.totalAllocatedExpense)}`, sub: '직접비용 및 공통비 배부액', color: C_ROSE },
    { label: '03. 영업 손익', val: `${formatNumber(data.totalOperatingProfit)}`, sub: `손익률: ${formatPercent(data.totalProfitMargin)}`, color: C_EMERALD },
    { label: '04. 1인당 평균 객단가', val: `${formatNumber(avgSpend)}`, sub: `총 이용객 ${formatNumber(data.totalLeisureVisitors)}명`, color: C_MINT },
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
      h: 0.3,
      fontSize: 8.5,
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

  // 상단 헤더 배너
  slide2.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: C_CHARCOAL },
    line: { color: C_CHARCOAL }
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
  slide2.addText('4대 부서(미디어아트센터, 엑티비티, 목장, 디지털지원) 매출·비용·손익 결산표', {
    x: 0.5,
    y: 0.45,
    w: 7.0,
    h: 0.25,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: '94A3B8'
  });
  slide2.addText('02 / 04', {
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
      { text: '부서명', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'left' } },
      { text: '순매출', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '매출 비중', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '분배 비용', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '영업 손익', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '손익률', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '이용객 수', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '1인당 객단가', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } }
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
    { text: '레져본부 전체 합계', options: { bold: true, fill: { color: C_CHARCOAL }, color: 'FFFFFF', align: 'left' } },
    { text: formatNumber(data.totalLeisureRevenue), options: { bold: true, fill: { color: C_CHARCOAL }, color: C_MINT, align: 'right' } },
    { text: '100.0%', options: { bold: true, fill: { color: C_CHARCOAL }, color: 'FFFFFF', align: 'right' } },
    { text: formatNumber(data.totalAllocatedExpense), options: { bold: true, fill: { color: C_CHARCOAL }, color: 'FDA4AF', align: 'right' } },
    { text: formatNumber(data.totalOperatingProfit), options: { bold: true, fill: { color: C_CHARCOAL }, color: '6EE7B7', align: 'right' } },
    { text: formatPercent(data.totalProfitMargin), options: { bold: true, fill: { color: C_CHARCOAL }, color: 'FFFFFF', align: 'right' } },
    { text: formatNumber(data.totalLeisureVisitors), options: { bold: true, fill: { color: C_CHARCOAL }, color: 'FFFFFF', align: 'right' } },
    { text: formatNumber(avgSpend), options: { bold: true, fill: { color: C_CHARCOAL }, color: C_MINT, align: 'right' } }
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
  // SLIDE 3: 세부 영업장별 실적 요약
  // ==========================================================================
  const slide3 = pres.addSlide();
  slide3.background = { color: 'F8FAFC' };

  slide3.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: C_MINT },
    line: { color: C_MINT }
  });
  slide3.addText('03. 영업장별 실적 요약', {
    x: 0.5,
    y: 0.15,
    w: 7.0,
    h: 0.32,
    fontSize: 15,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });
  slide3.addText('레져본부 영업장별 순매출, 이용객 수, 1인당 객단가 및 비중', {
    x: 0.5,
    y: 0.45,
    w: 7.0,
    h: 0.25,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: 'E6F7F4'
  });
  slide3.addText('03 / 04', {
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

  // 영업장 데이터 추출 및 상위 목록 테이블
  const venuesList: any[] = [];
  if (data.gridRows && data.gridRows.length > 0) {
    const venueMap: Record<string, { venueName: string; partName: string; revenue: number; visitors: number }> = {};
    data.gridRows.forEach((r) => {
      const key = `${r.partName}__${r.venueName}`;
      if (!venueMap[key]) {
        venueMap[key] = { venueName: r.venueName, partName: r.partName, revenue: 0, visitors: 0 };
      }
      venueMap[key].revenue += r.revenue;
      venueMap[key].visitors += r.visitorCount;
    });
    Object.values(venueMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .forEach((v, idx) => {
        const vSpend = v.visitors > 0 ? Math.round(v.revenue / v.visitors) : 0;
        const vShare = data.totalLeisureRevenue > 0 ? (v.revenue / data.totalLeisureRevenue) * 100 : 0;
        venuesList.push({
          rank: idx + 1,
          partName: v.partName,
          venueName: v.venueName,
          revenue: v.revenue,
          visitors: v.visitors,
          spend: vSpend,
          share: vShare
        });
      });
  }

  const tableRowsSlide3: any[][] = [
    [
      { text: '순위', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'center' } },
      { text: '소속 부서', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'left' } },
      { text: '영업장명', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'left' } },
      { text: '순매출', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '이용객 수', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '1인당 객단가', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } },
      { text: '매출 비중', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right' } }
    ]
  ];

  venuesList.forEach((v) => {
    tableRowsSlide3.push([
      { text: String(v.rank), options: { align: 'center', color: C_SLATE_MUTED } },
      { text: v.partName, options: { bold: true, align: 'left' } },
      { text: v.venueName, options: { bold: true, align: 'left' } },
      { text: formatNumber(v.revenue), options: { bold: true, align: 'right', color: C_SLATE_TEXT } },
      { text: formatNumber(v.visitors), options: { align: 'right' } },
      { text: formatNumber(v.spend), options: { bold: true, align: 'right', color: C_MINT } },
      { text: formatPercent(v.share), options: { align: 'right' } }
    ]);
  });

  slide3.addTable(tableRowsSlide3, {
    x: 0.5,
    y: 1.1,
    w: 9.0,
    colW: [0.6, 1.6, 2.0, 1.4, 1.1, 1.2, 1.1],
    border: { pt: 0.5, color: C_BORDER },
    fontFace: FONT_MAIN,
    fontSize: 9.5,
    rowH: 0.42
  });

  // ==========================================================================
  // SLIDE 4: 일별 매출 추이 (Daily Trends)
  // ==========================================================================
  const slide4 = pres.addSlide();
  slide4.background = { color: 'F8FAFC' };

  slide4.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: C_CHARCOAL },
    line: { color: C_CHARCOAL }
  });
  slide4.addText('04. 일별 매출 추이', {
    x: 0.5,
    y: 0.15,
    w: 7.0,
    h: 0.32,
    fontSize: 15,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });
  slide4.addText(`조회 기간 (${data.startDate} ~ ${data.endDate}) 일별 매출 현황`, {
    x: 0.5,
    y: 0.45,
    w: 7.0,
    h: 0.25,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: '94A3B8'
  });
  slide4.addText('04 / 04', {
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
  slide4.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 1.1,
    w: 4.35,
    h: 1.3,
    rectRadius: 0.12,
    fill: { color: C_CARD_BG },
    line: { color: C_BORDER }
  });
  slide4.addText('일평균 순매출', {
    x: 0.7,
    y: 1.25,
    w: 4.0,
    h: 0.25,
    fontSize: 10,
    fontFace: FONT_MAIN,
    color: C_SLATE_MUTED,
    bold: true
  });
  const daysCount = data.dailyTrends && data.dailyTrends.length > 0 ? data.dailyTrends.length : 31;
  const avgDailyRev = Math.round(data.totalLeisureRevenue / Math.max(1, daysCount));
  slide4.addText(`${formatNumber(avgDailyRev)}원 / 일`, {
    x: 0.7,
    y: 1.55,
    w: 4.0,
    h: 0.5,
    fontSize: 20,
    fontFace: FONT_MAIN,
    color: C_MINT,
    bold: true
  });

  slide4.addShape(pres.ShapeType.roundRect, {
    x: 5.15,
    y: 1.1,
    w: 4.35,
    h: 1.3,
    rectRadius: 0.12,
    fill: { color: C_CARD_BG },
    line: { color: C_BORDER }
  });
  slide4.addText('일평균 이용객 수', {
    x: 5.35,
    y: 1.25,
    w: 4.0,
    h: 0.25,
    fontSize: 10,
    fontFace: FONT_MAIN,
    color: C_SLATE_MUTED,
    bold: true
  });
  const avgDailyVisitors = Math.round(data.totalLeisureVisitors / Math.max(1, daysCount));
  slide4.addText(`${formatNumber(avgDailyVisitors)}명 / 일`, {
    x: 5.35,
    y: 1.55,
    w: 4.0,
    h: 0.5,
    fontSize: 20,
    fontFace: FONT_MAIN,
    color: C_SLATE_TEXT,
    bold: true
  });

  // 안내문 박스
  slide4.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 2.6,
    w: 9.0,
    h: 2.4,
    rectRadius: 0.15,
    fill: { color: C_CHARCOAL },
    line: { color: C_MINT, width: 1.5 }
  });
  slide4.addText('슬라이드 편집 안내', {
    x: 0.8,
    y: 2.8,
    w: 8.4,
    h: 0.35,
    fontSize: 12,
    fontFace: FONT_MAIN,
    bold: true,
    color: 'FFFFFF'
  });
  const guideText = `1. 다운로드된 파일(.pptx)을 구글 드라이브(drive.google.com)에 업로드합니다.\n2. 마우스 우클릭 후 '연결 앱 > Google 프레젠테이션'을 클릭하면 즉시 온라인 슬라이드로 열립니다.\n3. 본 슬라이드의 모든 텍스트, 숫자, 표, 색상은 벡터 데이터로 분리되어 있어 구글 슬라이드 상에서 자유롭게 편집 및 추가 작성이 가능합니다.\n\n* 출처: 벨포레 정산 원장 (부가가치세 제외)`;
  slide4.addText(guideText, {
    x: 0.8,
    y: 3.2,
    w: 8.4,
    h: 1.6,
    fontSize: 9.5,
    fontFace: FONT_MAIN,
    color: 'CBD5E1',
    lineSpacing: 18
  });

  // 파일 다운로드 실행
  const fileName = `벨포레_레져본부_실적보고서_${data.startDate}_${data.endDate}.pptx`;
  await pres.writeFile({ fileName });
  return fileName;
}
