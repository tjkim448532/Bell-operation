import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { RawExpenseRow, allocateExpenses } from '@/lib/financeEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get('yearMonth') || '2026-08';

    if (db) {
      const snapshot = await db.collection('expenses_v2')
        .where('yearMonth', '==', yearMonth)
        .get();

      if (!snapshot.empty) {
        const expenses: RawExpenseRow[] = [];
        snapshot.forEach((doc: any) => {
          expenses.push(doc.data() as RawExpenseRow);
        });
        return NextResponse.json({ success: true, yearMonth, expenses });
      }
    }

    // 업로드된 실제 데이터가 없을 때는 임의 더미 숫자를 일절 생성하지 않고 정직하게 빈 배열 반환
    return NextResponse.json({
      success: true,
      yearMonth,
      expenses: [],
      isEmpty: true,
    });
  } catch (error: any) {
    console.error('Error in GET expenses/monthly:', error);
    return NextResponse.json({
      success: true,
      yearMonth: '2026-08',
      expenses: [],
      error: error.message,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { yearMonth, expenses, partMetrics } = body;

    if (!yearMonth || !Array.isArray(expenses)) {
      return NextResponse.json(
        { success: false, error: '올바른 yearMonth 및 비용 배열(expenses)이 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 비용 안분 및 검증마스터 실행 (임의 하드코딩 대체 금지)
    const metricsToUse = Array.isArray(partMetrics) && partMetrics.length > 0 
      ? partMetrics 
      : [];

    const { allocations, audit } = allocateExpenses(expenses, metricsToUse);

    // 2. Firestore에 저장 (배치 처리)
    if (db) {
      const batch = db.batch();

      // 기존 해당 월 데이터 삭제
      const oldDocs = await db.collection('expenses_v2')
        .where('yearMonth', '==', yearMonth)
        .get();
      
      oldDocs.forEach((doc: any) => batch.delete(doc.ref));

      // 신규 데이터 추가
      expenses.forEach((item: RawExpenseRow, idx: number) => {
        const ref = db.collection('expenses_v2').doc(`exp_${yearMonth.replace('-', '')}_${String(idx + 1).padStart(4, '0')}`);
        batch.set(ref, {
          ...item,
          yearMonth,
          updatedAt: new Date().toISOString(),
        });
      });

      // 검증 마스터 감사 로그 기록
      const auditRef = db.collection('validation_master_logs').doc(`audit_${yearMonth.replace('-', '')}`);
      batch.set(auditRef, {
        ...audit,
        yearMonth,
        itemCount: expenses.length,
        verifiedAt: new Date().toISOString(),
      });

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      yearMonth,
      count: expenses.length,
      audit,
    });
  } catch (error: any) {
    console.error('Error in POST expenses/monthly:', error);
    return NextResponse.json(
      { success: false, error: error.message || '비용 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
