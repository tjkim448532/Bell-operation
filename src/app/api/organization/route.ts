import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface PartHeadcount {
  partName: string;
  regularCount: number;   // 정규직
  contractCount: number;  // 계약/촉탁직
  partTimeCount: number;  // 단기/아르바이트
  totalHeadcount: number; // 총 인원
  managerName: string;    // 파트장/담당자
  laborCost: number;      // 총 인건비
  revenue: number;        // 파트 매출
}

// 레저본부 5대 파트별 표준 조직 및 인력 현황 데이터
const LEISURE_ORGANIZATION_DATA: PartHeadcount[] = [
  {
    partName: '액티비티',
    regularCount: 6,
    contractCount: 8,
    partTimeCount: 14,
    totalHeadcount: 28,
    managerName: '김태진 본부장 / 박팀장',
    laborCost: 42000000,
    revenue: 125000000,
  },
  {
    partName: '목장',
    regularCount: 4,
    contractCount: 5,
    partTimeCount: 6,
    totalHeadcount: 15,
    managerName: '이팀장',
    laborCost: 28000000,
    revenue: 85000000,
  },
  {
    partName: '마리나',
    regularCount: 3,
    contractCount: 4,
    partTimeCount: 5,
    totalHeadcount: 12,
    managerName: '정팀장',
    laborCost: 22000000,
    revenue: 60000000,
  },
  {
    partName: '미디어아트',
    regularCount: 4,
    contractCount: 3,
    partTimeCount: 4,
    totalHeadcount: 11,
    managerName: '최팀장',
    laborCost: 24000000,
    revenue: 75000000,
  },
  {
    partName: '모토아레나',
    regularCount: 3,
    contractCount: 4,
    partTimeCount: 6,
    totalHeadcount: 13,
    managerName: '강팀장',
    laborCost: 25000000,
    revenue: 50000000,
  },
];

export async function GET(request: NextRequest) {
  try {
    const totalStaff = LEISURE_ORGANIZATION_DATA.reduce((sum, p) => sum + p.totalHeadcount, 0);
    const totalRegular = LEISURE_ORGANIZATION_DATA.reduce((sum, p) => sum + p.regularCount, 0);
    const totalContract = LEISURE_ORGANIZATION_DATA.reduce((sum, p) => sum + p.contractCount, 0);
    const totalPartTime = LEISURE_ORGANIZATION_DATA.reduce((sum, p) => sum + p.partTimeCount, 0);
    const totalLabor = LEISURE_ORGANIZATION_DATA.reduce((sum, p) => sum + p.laborCost, 0);
    const totalRev = LEISURE_ORGANIZATION_DATA.reduce((sum, p) => sum + p.revenue, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalStaff,
        totalRegular,
        totalContract,
        totalPartTime,
        totalLabor,
        totalRev,
        productivityPerCapita: totalStaff > 0 ? Math.round(totalRev / totalStaff) : 0,
        laborCostRatio: totalRev > 0 ? Number(((totalLabor / totalRev) * 100).toFixed(1)) : 0,
      },
      parts: LEISURE_ORGANIZATION_DATA.map((p) => ({
        ...p,
        productivityPerCapita: p.totalHeadcount > 0 ? Math.round(p.revenue / p.totalHeadcount) : 0,
        laborCostRatio: p.revenue > 0 ? Number(((p.laborCost / p.revenue) * 100).toFixed(1)) : 0,
        costPerCapita: p.totalHeadcount > 0 ? Math.round(p.laborCost / p.totalHeadcount) : 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching organization data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
