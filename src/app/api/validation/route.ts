import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export interface MonthlyAuditRecord {
  yearMonth: string;
  totalExcelSum: number;
  totalAllocatedSum: number;
  delta: number;
  isZeroVariance: boolean;
  status: 'VERIFIED' | 'DISCREPANCY';
  itemCount: number;
  verifiedAt: string;
  leisureRevenue: number;
  operatingProfit: number;
}

export async function GET(request: NextRequest) {
  try {
    if (db) {
      const snapshot = await db.collection('validation_master_logs')
        .orderBy('yearMonth', 'desc')
        .get();

      if (!snapshot.empty) {
        const records: MonthlyAuditRecord[] = [];
        snapshot.forEach((doc: any) => {
          records.push(doc.data() as MonthlyAuditRecord);
        });
        return NextResponse.json({ success: true, records });
      }
    }

    // 실제 Firestore에 감사 로그가 아직 없을 때는 임의 더미 데이터 없이 빈 배열 반환
    return NextResponse.json({
      success: true,
      records: [],
      isEmpty: true,
    });
  } catch (error: any) {
    console.error('Error fetching validation audit logs:', error);
    return NextResponse.json({
      success: true,
      records: [],
      error: error.message,
    });
  }
}
