import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { RawExpenseRow, allocateExpenses } from '@/lib/financeEngine';

export const dynamic = 'force-dynamic';

// 초기 표준 템플릿 데이터 (엑셀 미업로드 시 또는 시뮬레이션용)
const DEFAULT_INITIAL_EXPENSES: RawExpenseRow[] = [
  { accountCode: '51101', accountName: '급여(정직원)', macroCategory: '인건비', rawDepartment: '루지/액티비티', amount: 35000000, memo: '정규직 급여' },
  { accountCode: '51102', accountName: '상여금', macroCategory: '인건비', rawDepartment: '루지/액티비티', amount: 5000000, memo: '상여금' },
  { accountCode: '51101', accountName: '급여(정직원)', macroCategory: '인건비', rawDepartment: '벨포레 목장', amount: 28000000, memo: '정규직 급여' },
  { accountCode: '51201', accountName: '지급임차료', macroCategory: '지급수수료', rawDepartment: '마리나 클럽', amount: 15000000, memo: '선박 계류 및 임차' },
  { accountCode: '51301', accountName: '시설유지비', macroCategory: '일반경비', rawDepartment: '모토아레나', amount: 12000000, memo: '트랙 정비 및 카트 점검' },
  { accountCode: '51401', accountName: '콘텐츠 사용료', macroCategory: '지급수수료', rawDepartment: '미디어아트센터', amount: 18000000, memo: '미디어 라이선스' },
  { accountCode: '51501', accountName: '레저본부 공통운영비', macroCategory: '일반경비', rawDepartment: '레저본부공통', amount: 25000000, memo: '본부 총괄 경비' },
  { accountCode: '51601', accountName: '공통 시설감가상각비', macroCategory: '감가상각비', rawDepartment: '레저본부공통', amount: 47420000, memo: '레저 시설 감가' },
];

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

    // DB에 아직 데이터가 없으면 초기 표준 템플릿 반환
    return NextResponse.json({
      success: true,
      yearMonth,
      expenses: DEFAULT_INITIAL_EXPENSES,
      isInitialDefault: true,
    });
  } catch (error: any) {
    console.error('Error in GET expenses/monthly:', error);
    return NextResponse.json({
      success: true,
      yearMonth: '2026-08',
      expenses: DEFAULT_INITIAL_EXPENSES,
      fallback: true,
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

    // 1. 비용 안분 및 검증마스터 실행
    const defaultMetrics = partMetrics || [
      { partName: '액티비티', revenue: 120000000, visitors: 6500 },
      { partName: '목장', revenue: 85000000, visitors: 8500 },
      { partName: '마리나', revenue: 60000000, visitors: 2500 },
      { partName: '미디어아트', revenue: 75000000, visitors: 4200 },
      { partName: '모토아레나', revenue: 50000000, visitors: 1800 },
    ];

    const { allocations, audit } = allocateExpenses(expenses, defaultMetrics);

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
