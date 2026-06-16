import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { parseExpenseBuffer } from '@/lib/parser';
import https from 'https';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || !url.includes('docs.google.com/spreadsheets')) {
      return NextResponse.json({ success: false, error: '유효한 구글 스프레드시트 링크가 아닙니다.' }, { status: 400 });
    }

    // Extract sheet ID and format export URL
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return NextResponse.json({ success: false, error: '링크에서 시트 ID를 찾을 수 없습니다.' }, { status: 400 });
    }
    const sheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

    // Download the file into a buffer
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      https.get(exportUrl, (response) => {
        if (response.statusCode === 307 || response.statusCode === 302) {
          https.get(response.headers.location!, (res) => {
            const chunks: any[] = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
          });
        } else {
          const chunks: any[] = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        }
      }).on('error', reject);
    });

    // Fetch mappings and filters from Firestore
    const mappingDoc = await db.collection('settings').doc('teamMapping').get();
    const teamMapping = mappingDoc.exists ? mappingDoc.data() || {} : {};

    const expenseFiltersDoc = await db.collection('settings').doc('expenseFilters').get();
    const expenseFilters = expenseFiltersDoc.exists ? (expenseFiltersDoc.data()?.filters || []) : [];

    // Parse the downloaded buffer
    const records = await parseExpenseBuffer(buffer, `GoogleSheet_${sheetId}`, teamMapping, expenseFilters);

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: '데이터를 파싱하지 못했습니다. 형식이 맞는지 확인해주세요.' }, { status: 400 });
    }

    // Save to Firestore
    const batch = db.batch();
    const collectionRef = db.collection('expenses');
    records.forEach(record => {
      const docRef = collectionRef.doc(record.id);
      batch.set(docRef, record, { merge: true });
    });
    
    await batch.commit();

    return NextResponse.json({ success: true, message: `성공적으로 ${records.length}건의 데이터를 모든 시트에서 동기화했습니다.` });
  } catch (error) {
    console.error('Error syncing google sheet:', error);
    return NextResponse.json({ success: false, error: '구글 시트 연동 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
