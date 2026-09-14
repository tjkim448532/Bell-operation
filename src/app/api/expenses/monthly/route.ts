import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { RawExpenseRow, allocateExpenses } from '@/lib/financeEngine';

export const dynamic = 'force-dynamic';

function getClientDb() {
  try {
    const { initializeApp, getApps, getApp } = require('firebase/app');
    const { getFirestore } = require('firebase/firestore');
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "bell-operation.firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bell-operation",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "bell-operation.firebasestorage.app",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "593133920835",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:593133920835:web:61f25b39170b2f62ce6af6",
    };
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const yearMonthParam = searchParams.get('yearMonth');

    let targetMonths: string[] = [];
    if (startDate && endDate) {
      const start = startDate.substring(0, 7);
      const end = endDate.substring(0, 7);
      const [startY, startM] = start.split('-').map(Number);
      const [endY, endM] = end.split('-').map(Number);

      let curY = startY;
      let curM = startM;
      while (curY < endY || (curY === endY && curM <= endM)) {
        targetMonths.push(`${curY}-${String(curM).padStart(2, '0')}`);
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
      }
    } else if (yearMonthParam) {
      targetMonths = [yearMonthParam];
    } else {
      targetMonths = ['2026-08'];
    }

    const displayYm = targetMonths.length === 1 
      ? targetMonths[0] 
      : `${targetMonths[0]} ~ ${targetMonths[targetMonths.length - 1]}`;

    if (db) {
      try {
        let snapshot: any;
        if (targetMonths.length === 1) {
          snapshot = await db.collection('expenses_v2')
            .where('yearMonth', '==', targetMonths[0])
            .get();
        } else {
          snapshot = await db.collection('expenses_v2')
            .where('yearMonth', 'in', targetMonths.slice(0, 30))
            .get();
        }

        if (snapshot && !snapshot.empty) {
          const expenses: RawExpenseRow[] = [];
          snapshot.forEach((doc: any) => {
            expenses.push(doc.data() as RawExpenseRow);
          });
          return NextResponse.json({ 
            success: true, 
            yearMonth: displayYm, 
            months: targetMonths,
            isMultiMonth: targetMonths.length > 1,
            expenses 
          });
        }
      } catch (adminErr: any) {
        console.warn('Admin Firestore failed, falling back to Client SDK:', adminErr.message);
      }
    }

    // Client SDK Fallback (로컬 개발 환경 및 서비스 계정 부재 시 작동 보장)
    const clientDb = getClientDb();
    if (clientDb) {
      const { collection, query, where, getDocs } = require('firebase/firestore');
      let q: any;
      if (targetMonths.length === 1) {
        q = query(collection(clientDb, 'expenses_v2'), where('yearMonth', '==', targetMonths[0]));
      } else {
        q = query(collection(clientDb, 'expenses_v2'), where('yearMonth', 'in', targetMonths.slice(0, 30)));
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        const expenses: RawExpenseRow[] = [];
        snap.forEach((doc: any) => {
          expenses.push(doc.data() as RawExpenseRow);
        });
        return NextResponse.json({ 
          success: true, 
          yearMonth: displayYm, 
          months: targetMonths,
          isMultiMonth: targetMonths.length > 1,
          expenses 
        });
      }
    }

    // 업로드된 실제 데이터가 없을 때는 임의 더미 숫자를 일절 생성하지 않고 정직하게 빈 배열 반환
    return NextResponse.json({
      success: true,
      yearMonth: displayYm,
      months: targetMonths,
      isMultiMonth: targetMonths.length > 1,
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
    let saved = false;
    if (db) {
      try {
        const oldDocs = await db.collection('expenses_v2')
          .where('yearMonth', '==', yearMonth)
          .get();
        
        const CHUNK_SIZE = 400;
        const allDeletes = oldDocs.docs;
        for (let i = 0; i < allDeletes.length; i += CHUNK_SIZE) {
          const b = db.batch();
          allDeletes.slice(i, i + CHUNK_SIZE).forEach((d: any) => b.delete(d.ref));
          await b.commit();
        }

        // 신규 데이터 청크 추가
        for (let i = 0; i < expenses.length; i += CHUNK_SIZE) {
          const b = db.batch();
          const chunk = expenses.slice(i, i + CHUNK_SIZE);
          chunk.forEach((item: RawExpenseRow, cIdx: number) => {
            const ref = db.collection('expenses_v2').doc(`exp_${yearMonth.replace('-', '')}_${String(i + cIdx + 1).padStart(4, '0')}`);
            b.set(ref, {
              ...item,
              yearMonth,
              updatedAt: new Date().toISOString(),
            });
          });
          await b.commit();
        }

        // 검증 마스터 감사 로그 기록
        const auditRef = db.collection('validation_master_logs').doc(`audit_${yearMonth.replace('-', '')}`);
        await auditRef.set({
          ...audit,
          yearMonth,
          itemCount: expenses.length,
          verifiedAt: new Date().toISOString(),
        });

        saved = true;
      } catch (adminErr: any) {
        console.warn('Admin Firestore save failed, falling back to Client SDK:', adminErr.message);
      }
    }

    if (!saved) {
      const clientDb = getClientDb();
      if (clientDb) {
        const { collection, query, where, getDocs, writeBatch, doc } = require('firebase/firestore');
        const oldQ = query(collection(clientDb, 'expenses_v2'), where('yearMonth', '==', yearMonth));
        const oldSnap = await getDocs(oldQ);
        const CHUNK_SIZE = 400;
        const delRefs: any[] = [];
        oldSnap.forEach((d: any) => delRefs.push(d.ref));

        for (let i = 0; i < delRefs.length; i += CHUNK_SIZE) {
          const b = writeBatch(clientDb);
          delRefs.slice(i, i + CHUNK_SIZE).forEach((r: any) => b.delete(r));
          await b.commit();
        }

        for (let i = 0; i < expenses.length; i += CHUNK_SIZE) {
          const b = writeBatch(clientDb);
          const chunk = expenses.slice(i, i + CHUNK_SIZE);
          chunk.forEach((item: RawExpenseRow, cIdx: number) => {
            const r = doc(clientDb, 'expenses_v2', `exp_${yearMonth.replace('-', '')}_${String(i + cIdx + 1).padStart(4, '0')}`);
            b.set(r, {
              ...item,
              yearMonth,
              updatedAt: new Date().toISOString(),
            });
          });
          await b.commit();
        }

        const auditRef = doc(clientDb, 'validation_master_logs', `audit_${yearMonth.replace('-', '')}`);
        const auditBatch = writeBatch(clientDb);
        auditBatch.set(auditRef, {
          ...audit,
          yearMonth,
          itemCount: expenses.length,
          verifiedAt: new Date().toISOString(),
        });
        await auditBatch.commit();
      }
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

    let deletedCount = 0;
    if (db) {
      try {
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
          deletedCount = expenseDocs.size;
        }

        return NextResponse.json({
          success: true,
          message: `${yearMonth}월 데이터가 정상 삭제되었습니다.`,
          deletedYearMonth: yearMonth,
          deletedCount,
        });
      } catch (adminErr: any) {
        console.warn('Admin Firestore delete failed, falling back to Client SDK:', adminErr.message);
      }
    }

    // Client SDK Fallback for delete
    const clientDb = getClientDb();
    if (clientDb) {
      const { collection, query, where, getDocs, writeBatch, doc } = require('firebase/firestore');
      const auditRef = doc(clientDb, 'validation_master_logs', `audit_${yearMonth.replace('-', '')}`);
      const bAudit = writeBatch(clientDb);
      bAudit.delete(auditRef);
      await bAudit.commit().catch(() => {});

      const expenseQ = query(collection(clientDb, 'expenses_v2'), where('yearMonth', '==', yearMonth));
      const expenseSnap = await getDocs(expenseQ);
      deletedCount = expenseSnap.size;

      const delRefs: any[] = [];
      expenseSnap.forEach((d: any) => delRefs.push(d.ref));

      const chunkSize = 400;
      for (let i = 0; i < delRefs.length; i += chunkSize) {
        const b = writeBatch(clientDb);
        delRefs.slice(i, i + chunkSize).forEach((r: any) => b.delete(r));
        await b.commit();
      }

      return NextResponse.json({
        success: true,
        message: `${yearMonth}월 데이터가 정상 삭제되었습니다.`,
        deletedYearMonth: yearMonth,
        deletedCount,
      });
    }

    return NextResponse.json({
      success: false,
      error: '데이터베이스 연결 실패',
    }, { status: 500 });
  } catch (error: any) {
    console.error('Error in DELETE expenses/monthly:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
