import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { parseRevenueBuffer, parseExpenseBuffer, parseRoomDataBuffer } from '@/lib/parser';

async function clearMonthsData(collectionName: string, months: string[]) {
  if (!months || months.length === 0) return;
  for (const month of months) {
    const snapshot = await db.collection(collectionName).where('month', '==', month).get();
    if (!snapshot.empty) {
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
      const ref = db.collection(collectionName).doc(id);
      batch.set(ref, data);
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
      const filtersSnapshot = await db.collection('revenue_filters').get();
      const revenueFilters: string[] = [];
      filtersSnapshot.forEach((doc: any) => revenueFilters.push(doc.data().term));

      records = await parseRevenueBuffer(buffer, filename, mappingDict, revenueFilters, projectOverrides);
      
      // Safe-Wipe Algorithm
      const monthCounts = records.reduce((acc, r) => {
        if (r.month) acc[r.month] = (acc[r.month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const targetMonths = Object.keys(monthCounts).filter(m => monthCounts[m] > 5);
      if (targetMonths.length === 0 && records.length > 0) {
        const primaryMonth = Object.keys(monthCounts).sort((a, b) => monthCounts[b] - monthCounts[a])[0];
        targetMonths.push(primaryMonth);
      }

      await clearMonthsData('revenues', targetMonths);
      await batchWrite('revenues', records);
      
      return NextResponse.json({ success: true, count: records.length, message: `구글 시트 동기화 완료! 매출 데이터 ${records.length}건 성공.` });
    } else if (type === 'expense') {
      const filtersSnapshot = await db.collection('expense_filters').get();
      const expenseFilters: string[] = [];
      filtersSnapshot.forEach((doc: any) => expenseFilters.push(doc.data().term));

      records = await parseExpenseBuffer(buffer, filename, mappingDict, expenseFilters, projectOverrides);
      
      // Safe-Wipe Algorithm
      const monthCounts = records.reduce((acc, r) => {
        if (r.month) acc[r.month] = (acc[r.month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const targetMonths = Object.keys(monthCounts).filter(m => monthCounts[m] > 5);
      if (targetMonths.length === 0 && records.length > 0) {
        const primaryMonth = Object.keys(monthCounts).sort((a, b) => monthCounts[b] - monthCounts[a])[0];
        targetMonths.push(primaryMonth);
      }

      await clearMonthsData('expenses', targetMonths);
      await batchWrite('expenses', records);
      
      return NextResponse.json({ success: true, count: records.length, message: `구글 시트 동기화 완료! 일반 비용 데이터 ${records.length}건 성공.` });
    } else if (type === 'common_expense') {
      const filtersSnapshot = await db.collection('expense_filters').get();
      const expenseFilters: string[] = [];
      filtersSnapshot.forEach((doc: any) => expenseFilters.push(doc.data().term));

      records = await parseExpenseBuffer(buffer, filename, mappingDict, expenseFilters, projectOverrides);
      
      // 태깅: 팀 매핑 무의미하므로 전사공용으로 고정
      records = records.map(r => ({ ...r, team: '전사공용', isCommonExpense: true }));

      // Safe-Wipe Algorithm
      const monthCounts = records.reduce((acc, r) => {
        if (r.month) acc[r.month] = (acc[r.month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const targetMonths = Object.keys(monthCounts).filter(m => monthCounts[m] > 5);
      if (targetMonths.length === 0 && records.length > 0) {
        const primaryMonth = Object.keys(monthCounts).sort((a, b) => monthCounts[b] - monthCounts[a])[0];
        targetMonths.push(primaryMonth);
      }

      await clearMonthsData('common_expenses', targetMonths);
      await batchWrite('common_expenses', records);
      
      return NextResponse.json({ success: true, count: records.length, message: `구글 시트 동기화 완료! 전사 공통비용 데이터 ${records.length}건 성공.` });
    } else if (type === 'room_data') {
      records = await parseRoomDataBuffer(buffer, filename);
      
      // Safe-Wipe Algorithm
      const monthCounts = records.reduce((acc, r) => {
        if (r.month) acc[r.month] = (acc[r.month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const targetMonths = Object.keys(monthCounts).filter(m => monthCounts[m] > 5);
      if (targetMonths.length === 0 && records.length > 0) {
        const primaryMonth = Object.keys(monthCounts).sort((a, b) => monthCounts[b] - monthCounts[a])[0];
        targetMonths.push(primaryMonth);
      }

      await clearMonthsData('room_data', targetMonths);
      await batchWrite('room_data', records);
      
      return NextResponse.json({ success: true, count: records.length, message: `구글 시트 동기화 완료! 객실 원본 데이터 ${records.length}건 성공.` });
    } else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Google Sheet Sync Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
