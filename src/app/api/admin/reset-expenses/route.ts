import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    let result = [];
    
    // 특정 월 선택 초기화 요청 시 (예: ?month=2026-07)
    if (month && month.length === 7) {
      let totalDeleted = 0;
      for (const coll of ['expenses', 'common_expenses']) {
        const snap = await db.collection(coll).where('month', '==', month).get();
        if (!snap.empty) {
          totalDeleted += snap.size;
          const chunks = [];
          let currentChunk: any[] = [];
          snap.docs.forEach((doc: any) => {
            currentChunk.push(doc);
            if (currentChunk.length === 500) {
              chunks.push(currentChunk);
              currentChunk = [];
            }
          });
          if (currentChunk.length > 0) chunks.push(currentChunk);
          
          for (const chunk of chunks) {
            const batch = db.batch();
            chunk.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();
          }
        }
      }

      await db.collection('upload_history').add({
        type: 'monthly_reset',
        targetMonth: month,
        deletedCount: totalDeleted,
        resetAt: new Date().toISOString(),
        timestamp: Date.now()
      });

      return NextResponse.json({ 
        success: true, 
        month, 
        deletedCount: totalDeleted, 
        message: `${month}월의 비용 데이터 총 ${totalDeleted}건이 안전하게 삭제(초기화)되었습니다.` 
      });
    }

    // 1. Delete ALL team_mappings
    const mapSnap = await db.collection('team_mappings').get();
    const batch1 = db.batch();
    mapSnap.forEach((doc: any) => {
      batch1.delete(doc.ref);
    });
    await batch1.commit();
    result.push(`Deleted ${mapSnap.size} team_mappings`);

    // 2. Change ALL expenses team to '기타'
    const expSnap = await db.collection('expenses').get();
    let batchCount = 0;
    let batch = db.batch();
    
    for (let i = 0; i < expSnap.docs.length; i++) {
      const doc = expSnap.docs[i];
      batch.update(doc.ref, { team: '기타' });
      batchCount++;
      
      if (batchCount === 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await batch.commit();
    }
    result.push(`Updated ${expSnap.size} expenses to '기타'`);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
