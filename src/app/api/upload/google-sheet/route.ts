import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { parseRevenueBuffer, parseExpenseBuffer, parseRoomDataBuffer } from '@/lib/parser';

async function clearMonthsData(collectionName: string, months: string[]): Promise<number> {
  if (!months || months.length === 0) return 0;
  let totalDeleted = 0;
  for (const month of months) {
    const snapshot = await db.collection(collectionName).where('month', '==', month).get();
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

async function batchWrite(collectionName: string, records: any[]) {
  const chunks = [];
  for (let i = 0; i < records.length; i += 500) {
    chunks.push(records.slice(i, i + 500));
  }
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((record: any) => {
      const { id, ...data } = record;
      const ref = id ? db.collection(collectionName).doc(id) : db.collection(collectionName).doc();
      batch.set(ref, { ...data, updatedAt: new Date().toISOString() });
    });
    await batch.commit();
  }
}

export async function POST(request: Request) {
  try {
    const { url, type } = await request.json();

    if (!url || !type) {
      return NextResponse.json({ error: 'URL and type are required' }, { status: 400 });
    }

    // Extract spreadsheet ID
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return NextResponse.json({ error: '유효한 구글 스프레드시트 링크가 아닙니다.' }, { status: 400 });
    }
    const spreadsheetId = match[1];

    // Download as XLSX
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: '구글 시트 다운로드 실패. 시트가 "링크가 있는 모든 사용자에게 공개" 상태인지 확인해주세요.' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `GoogleSheet_${spreadsheetId}.xlsx`;

    // Fetch dependencies
    const mappingsSnapshot = await db.collection('team_mappings').get();
    const mappingDict: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      mappingDict[doc.data().columnName] = doc.data().teamName;
    });

    const overridesSnapshot = await db.collection('projectOverrides').get();
    const projectOverrides: Record<string, string> = {};
    overridesSnapshot.forEach((doc: any) => {
      projectOverrides[doc.id] = doc.data().override_project;
    });

    let records: any[] = [];

    if (type === 'revenue') {
      return NextResponse.json({ success: true, count: 0, message: `매출 데이터는 백엔드(V6 API)와 실시간으로 연동되어 별도의 수동 업로드가 필요하지 않습니다.` });
    } else if (type === 'expense') {
      const filtersSnapshot = await db.collection('expense_filters').get();
      const expenseFilters: string[] = [];
      filtersSnapshot.forEach((doc: any) => expenseFilters.push(doc.data().term));

      records = await parseExpenseBuffer(buffer, filename, mappingDict, expenseFilters, projectOverrides);
      
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
          uploadMethod: 'googlesheet',
          spreadsheetId: spreadsheetId,
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
        message: `[무결성 보장] 구글 시트 동기화 완료! 기존 ${deletedCount}건 교체 및 최신 일반 비용 ${records.length}건(총액 ₩${Math.round(totalAmount).toLocaleString()})이 덮어쓰기 되었습니다.` 
      });
    } else if (type === 'common_expense') {
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
          uploadMethod: 'googlesheet',
          spreadsheetId: spreadsheetId,
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
        message: `[무결성 보장] 구글 시트 동기화 완료! 기존 ${deletedCount}건 교체 및 최신 공통비용 ${records.length}건(총액 ₩${Math.round(totalAmount).toLocaleString()})이 안전하게 저장되었습니다.` 
      });
    } else if (type === 'room_data') {
      return NextResponse.json({ success: true, count: 0, message: `객실 판매 데이터는 백엔드(V6 API)와 실시간으로 연동되어 별도의 수동 업로드가 필요하지 않습니다.` });
    } else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Google Sheet Sync Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
