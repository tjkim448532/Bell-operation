import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export interface MonthlyAuditRecord {
  yearMonth: string;
  totalExcelSum: number;
  totalDirectSum?: number;
  totalAllocatedSum: number;
  outsourcedSum?: number;
  depreciationSum?: number;
  reconstitutedSum?: number;
  delta: number;
  isZeroVariance: boolean;
  status: 'VERIFIED' | 'DISCREPANCY';
  itemCount: number;
  verifiedAt: string;
  leisureRevenue: number;
  operatingProfit: number;
}

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

async function fetchPureDirectLeisureRevenueForMonth(yearMonth: string): Promise<number> {
  try {
    const [y, m] = yearMonth.split('-').map(Number);
    if (!y || !m) return 0;
    const lastDay = new Date(y, m, 0).getDate();
    const startDate = `${yearMonth}-01`;
    const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const token = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

    const res = await fetch(
      `${backendBase}/api/v6/report/daily-sales?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { 'x-m2m-token': token },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return 0;
    const json = await res.json().catch(() => null);
    const rawCategories: any[] = json?.data || [];

    const ticket = rawCategories.find((c: any) => c.category_code === 'TICKET');
    if (!ticket) return 0;

    let amusementActual = 0;
    let hasGiftShopInTicket = false;
    ticket.teams?.forEach((t: any) => {
      const teamName = t.team_name || '레저본부';
      if (teamName !== '레저본부' && teamName !== '미분류') return;
      t.parts?.forEach((p: any) => {
        if (p.part_name === '놀이동산') {
          amusementActual += Number(p.subtotal?.todayActual || 0);
        }
        p.venues?.forEach((v: any) => {
          if (v.venue_name === '미디어-기프트샵') {
            hasGiftShopInTicket = true;
          }
        });
      });
    });

    let giftActual = 0;
    if (!hasGiftShopInTicket) {
      const goods = rawCategories.find((c: any) => c.category_code === 'GOODS');
      goods?.teams?.forEach((t: any) => {
        t.parts?.forEach((p: any) => {
          p.venues?.forEach((v: any) => {
            if (v.venue_name === '미디어-기프트샵') {
              giftActual += Number(v.subtotal?.todayActual || 0);
            }
          });
        });
      });
    }

    const catActual = Number(ticket.subtotal?.todayActual || 0);
    return Math.max(0, catActual - amusementActual + giftActual);
  } catch {
    return 0;
  }
}

async function enrichAuditRecords(records: MonthlyAuditRecord[]): Promise<MonthlyAuditRecord[]> {
  return Promise.all(
    records.map(async (rec) => {
      let leisureRevenue = Number(rec.leisureRevenue || 0);
      if (rec.yearMonth) {
        const liveRevenue = await fetchPureDirectLeisureRevenueForMonth(rec.yearMonth);
        if (liveRevenue > 0) {
          leisureRevenue = liveRevenue;
        }
      }
      const allocated = Number(rec.totalAllocatedSum || 0);
      const operatingProfit = leisureRevenue - allocated;
      return {
        ...rec,
        leisureRevenue,
        operatingProfit,
      };
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    if (db) {
      try {
        const snapshot = await db.collection('validation_master_logs')
          .orderBy('yearMonth', 'desc')
          .get();

        if (!snapshot.empty) {
          const rawRecords: MonthlyAuditRecord[] = [];
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            const outsourced = data.outsourcedSum || 0;
            const depr = data.depreciationSum || 0;
            const allocated = data.totalAllocatedSum || 0;
            const reconstituted = data.reconstitutedSum ?? (allocated + outsourced + depr);
            const totalExcelSum = data.rawExcelSum ?? data.totalExcelSum ?? reconstituted;
            rawRecords.push({
              ...data,
              totalExcelSum,
              outsourcedSum: outsourced,
              depreciationSum: depr,
              reconstitutedSum: reconstituted,
            } as MonthlyAuditRecord);
          });
          const records = await enrichAuditRecords(rawRecords);
          return NextResponse.json({ success: true, records });
        }
      } catch (adminErr: any) {
        console.warn('Admin Firestore failed, falling back to Client SDK:', adminErr.message);
      }
    }

    const clientDb = getClientDb();
    if (clientDb) {
      const { collection, getDocs, query, orderBy } = require('firebase/firestore');
      const q = query(collection(clientDb, 'validation_master_logs'), orderBy('yearMonth', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const rawRecords: MonthlyAuditRecord[] = [];
        snap.forEach((doc: any) => {
          const data = doc.data();
          const outsourced = data.outsourcedSum || 0;
          const depr = data.depreciationSum || 0;
          const allocated = data.totalAllocatedSum || 0;
          const reconstituted = data.reconstitutedSum ?? (allocated + outsourced + depr);
          const totalExcelSum = data.rawExcelSum ?? data.totalExcelSum ?? reconstituted;
          rawRecords.push({
            ...data,
            totalExcelSum,
            outsourcedSum: outsourced,
            depreciationSum: depr,
            reconstitutedSum: reconstituted,
          } as MonthlyAuditRecord);
        });
        const records = await enrichAuditRecords(rawRecords);
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
      try {
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
      } catch (adminErr: any) {
        console.warn('Admin delete failed, falling back to Client SDK:', adminErr.message);
      }
    }

    const clientDb = getClientDb();
    if (clientDb) {
      const { collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');
      const auditDocId = `audit_${yearMonth.replace('-', '')}`;
      await deleteDoc(doc(clientDb, 'validation_master_logs', auditDocId)).catch(() => {});

      const auditQuery = query(collection(clientDb, 'validation_master_logs'), where('yearMonth', '==', yearMonth));
      const auditSnap = await getDocs(auditQuery);
      for (const d of auditSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }

      const expQuery = query(collection(clientDb, 'expenses_v2'), where('yearMonth', '==', yearMonth));
      const expSnap = await getDocs(expQuery);
      for (const d of expSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `${yearMonth}월 검증 기록 및 전표(${expSnap.size}건)가 정상적으로 삭제되었습니다.`,
        deletedYearMonth: yearMonth,
        deletedCount: expSnap.size,
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
