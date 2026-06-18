import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const docRef = db.collection('goals').doc('2026');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // Return empty structure if not synced yet
      return NextResponse.json({ 
        success: true, 
        data: {}, 
        revenue: {},
        visitors: { target: {}, actual: {} },
        utilization: { target: {}, actual: {} },
        lastSyncedAt: null
      });
    }

    const dataObj = docSnap.data();

    return NextResponse.json({ 
      success: true, 
      data: dataObj?.revenue || {}, // Keep this for backward compatibility
      revenue: dataObj?.revenue || {},
      visitors: dataObj?.visitors || { target: {}, actual: {} },
      utilization: dataObj?.utilization || { target: {}, actual: {} },
      lastSyncedAt: dataObj?.lastSyncedAt || null
    });

  } catch (error: any) {
    console.error('Goals fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
