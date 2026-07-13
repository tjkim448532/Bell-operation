import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let result = [];
    
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
