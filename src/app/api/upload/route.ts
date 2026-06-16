import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { parseRevenueBuffer, parseExpenseBuffer } from '@/lib/parser';

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
async function clearMonthsData(collectionPath: string, months: string[]) {
  if (!months || months.length === 0) return;
  for (const month of months) {
    const snapshot = await db.collection(collectionPath).where('month', '==', month).get();
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
        records = await parseRevenueBuffer(buffer, filename, mappingDict, projectOverrides);
        const uniqueMonths = Array.from(new Set(records.map(r => r.month).filter(Boolean))) as string[];
        await clearMonthsData('revenues', uniqueMonths);
        await batchWrite('revenues', records);
        return NextResponse.json({ success: true, count: records.length, message: `기존 데이터 삭제 완료! 새로운 매출 데이터 ${records.length}건이 성공적으로 덮어쓰기 되었습니다.` });
      } 
      else if (type === 'expense') {
        const filtersSnapshot = await db.collection('expense_filters').get();
        const expenseFilters: string[] = [];
        filtersSnapshot.forEach((doc: any) => expenseFilters.push(doc.data().term));

        records = await parseExpenseBuffer(buffer, filename, mappingDict, expenseFilters);
        const uniqueMonths = Array.from(new Set(records.map(r => r.month).filter(Boolean))) as string[];
        await clearMonthsData('expenses', uniqueMonths);
        await batchWrite('expenses', records);
        return NextResponse.json({ success: true, count: records.length, message: `기존 데이터 삭제 완료! 새로운 비용 데이터 ${records.length}건이 성공적으로 덮어쓰기 되었습니다.` });
      }
    else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
