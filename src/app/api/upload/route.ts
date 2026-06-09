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
      const docRef = db.collection(collectionPath).doc();
      batch.set(docRef, { ...record, createdAt: new Date().toISOString() });
    });
    await batch.commit();
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

    if (type === 'revenue') {
      // Fetch custom team mappings from database
      const mappingsSnapshot = await db.collection('team_mappings').get();
      const mappingDict: Record<string, string> = {};
      mappingsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        mappingDict[data.columnName] = data.teamName;
      });

      const records = await parseRevenueBuffer(buffer, filename, mappingDict);
      
      // Store in DB
      await batchWrite('revenues', records);

      return NextResponse.json({ success: true, count: records.length, message: `Successfully imported ${records.length} revenue records.` });
    } 
    else if (type === 'expense') {
      const records = await parseExpenseBuffer(buffer, filename);
      
      await batchWrite('expenses', records);

      return NextResponse.json({ success: true, count: records.length, message: `Successfully imported ${records.length} expense records.` });
    } 
    else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
