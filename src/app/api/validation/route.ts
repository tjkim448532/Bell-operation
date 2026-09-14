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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let yearMonth = searchParams.get('yearMonth');

    if (!yearMonth) {
      const body = await request.json().catch(() => ({}));
      yearMonth = body.yearMonth;
    }

    if (!yearMonth) {
      return NextResponse.json(
        { success: false, error: '삭제할 yearMonth 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    if (db) {
      // 1. validation_master_logs 해당 월 감사 로그 삭제
      const auditDocId = `audit_${yearMonth.replace('-', '')}`;
      await db.collection('validation_master_logs').doc(auditDocId).delete().catch(() => {});

      const auditQuery = await db.collection('validation_master_logs')
        .where('yearMonth', '==', yearMonth)
        .get();
      if (!auditQuery.empty) {
        const auditBatch = db.batch();
        auditQuery.forEach((doc: any) => auditBatch.delete(doc.ref));
        await auditBatch.commit();
      }

      // 2. expenses_v2 해당 월의 모든 전표 일괄 삭제 (500개 배치 제한 청킹)
      const expenseDocs = await db.collection('expenses_v2')
        .where('yearMonth', '==', yearMonth)
        .get();

      if (!expenseDocs.empty) {
        const docs = expenseDocs.docs;
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const b = db.batch();
          chunk.forEach((d: any) => b.delete(d.ref));
          await b.commit();
        }
      }

      return NextResponse.json({
        success: true,
        message: `${yearMonth}월 검증 기록 및 전표(${expenseDocs.size}건)가 정상적으로 삭제되었습니다.`,
        deletedYearMonth: yearMonth,
        deletedCount: expenseDocs.size,
      });
    }

    return NextResponse.json({
      success: false,
      error: '데이터베이스 연결 실패',
    }, { status: 500 });
  } catch (error: any) {
    console.error('Error deleting validation audit record:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
