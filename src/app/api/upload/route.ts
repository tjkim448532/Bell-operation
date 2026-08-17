import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { parseRevenueBuffer, parseExpenseBuffer, parseRoomDataBuffer } from '@/lib/parser';

// Helper to write large batches
async function batchWrite(collectionPath: string, records: any[]) {
  const chunks = [];
  for (let i = 0; i < records.length; i += 500) {
    chunks.push(records.slice(i, i + 500));
  }
  
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((record) => {
      const { id, ...data } = record;
      const docRef = id ? db.collection(collectionPath).doc(id) : db.collection(collectionPath).doc();
      batch.set(docRef, { ...data, createdAt: new Date().toISOString() });
    });
    await batch.commit();
  }
}

// Helper to clear existing data for the months being uploaded to prevent duplicates
async function clearMonthsData(collectionPath: string, months: string[]): Promise<number> {
  if (!months || months.length === 0) return 0;
  let totalDeleted = 0;
  for (const month of months) {
    const snapshot = await db.collection(collectionPath).where('month', '==', month).get();
    if (!snapshot.empty) {
      totalDeleted += snapshot.size;
      const chunks = [];
      let currentChunk: any[] = [];
      snapshot.docs.forEach((doc: any) => {
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
  return totalDeleted;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;

    // Fetch custom team mappings from database
    const mappingsSnapshot = await db.collection('team_mappings').get();
    const mappingDict: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      mappingDict[data.columnName] = data.teamName;
    });

    let records: any[] = [];

    // Fetch Manual Overrides
    const overridesSnapshot = await db.collection('projectOverrides').get();
    const projectOverrides: Record<string, string> = {};
    overridesSnapshot.forEach((doc: any) => {
      projectOverrides[doc.id] = doc.data().override_project;
    });

    if (type === 'revenue') {
      return NextResponse.json({ success: true, count: 0, message: `매출 데이터는 백엔드(V5 API)와 실시간으로 연동되어 별도의 수동 업로드가 필요하지 않습니다.` });
    }
    else if (type === 'expense') {
      const filtersSnapshot = await db.collection('expense_filters').get();
      const expenseFilters: string[] = [];
      filtersSnapshot.forEach((doc: any) => expenseFilters.push(doc.data().term));

      records = await parseExpenseBuffer(buffer, filename, mappingDict, expenseFilters, projectOverrides);
      
      // Safe-Wipe Algorithm: 파싱된 모든 유효 연/월 추출
      const targetMonths = Array.from(new Set(records.map((r: any) => r.month).filter(Boolean)));
      if (targetMonths.length === 0 && records.length > 0) {
        targetMonths.push(new Date().toISOString().slice(0, 7));
      }

      const deletedCount = await clearMonthsData('expenses', targetMonths);
      await batchWrite('expenses', records);

      const totalAmount = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

      // Audit Trail (감사 로그) 기록
      try {
        await db.collection('upload_history').add({
          type: 'expense',
          uploadMethod: 'file',
          filename: filename,
          targetMonths: targetMonths,
          deletedCount: deletedCount,
          insertedCount: records.length,
          totalAmount: totalAmount,
          uploadedAt: new Date().toISOString(),
          timestamp: Date.now()
        });
      } catch (logErr) {
        console.error('Failed to write upload audit log:', logErr);
      }

      return NextResponse.json({ 
        success: true, 
        count: records.length, 
        months: targetMonths, 
        deletedCount: deletedCount,
        insertedCount: records.length,
        totalAmount: totalAmount,
        message: `[무결성 보장] 기존 데이터 ${deletedCount}건을 안전하게 교체하고, 최신 일반 비용 ${records.length}건(총액 ₩${Math.round(totalAmount).toLocaleString()})이 덮어쓰기 되었습니다.` 
      });
    }
    else if (type === 'common_expense') {
      const filtersSnapshot = await db.collection('expense_filters').get();
      const expenseFilters: string[] = [];
      filtersSnapshot.forEach((doc: any) => expenseFilters.push(doc.data().term));

      records = await parseExpenseBuffer(buffer, filename, mappingDict, expenseFilters, projectOverrides);
      records = records.map(r => ({ ...r, team: '전사공용', isCommonExpense: true }));

      const targetMonths = Array.from(new Set(records.map((r: any) => r.month).filter(Boolean)));
      if (targetMonths.length === 0 && records.length > 0) {
        targetMonths.push(new Date().toISOString().slice(0, 7));
      }

      const deletedCount = await clearMonthsData('common_expenses', targetMonths);
      await batchWrite('common_expenses', records);

      const totalAmount = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

      // Audit Trail (감사 로그) 기록
      try {
        await db.collection('upload_history').add({
          type: 'common_expense',
          uploadMethod: 'file',
          filename: filename,
          targetMonths: targetMonths,
          deletedCount: deletedCount,
          insertedCount: records.length,
          totalAmount: totalAmount,
          uploadedAt: new Date().toISOString(),
          timestamp: Date.now()
        });
      } catch (logErr) {
        console.error('Failed to write upload audit log:', logErr);
      }

      return NextResponse.json({ 
        success: true, 
        count: records.length, 
        months: targetMonths, 
        deletedCount: deletedCount,
        insertedCount: records.length,
        totalAmount: totalAmount,
        message: `[무결성 보장] 기존 공통비용 ${deletedCount}건을 교체하고, 최신 공통비용 ${records.length}건(총액 ₩${Math.round(totalAmount).toLocaleString()})이 안전하게 저장되었습니다.` 
      });
    }
    else if (type === 'room_data') {
      return NextResponse.json({ success: true, count: 0, message: `객실 판매 데이터는 백엔드(V5 API)와 실시간으로 연동되어 별도의 수동 업로드가 필요하지 않습니다.` });
    }
    else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
