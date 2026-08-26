import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const startMonth = searchParams.get('startMonth');
    const yearParam = searchParams.get('year');
    const targetYear = yearParam || (startDate ? startDate.split('-')[0] : (startMonth ? startMonth.split('-')[0] : String(new Date().getFullYear())));

    let docRef = db.collection('goals').doc(targetYear);
    let docSnap = await docRef.get();

    if (!docSnap.exists && targetYear !== '2026') {
      // Fallback to latest available goals doc if specific year doc not created yet
      const fallbackRef = db.collection('goals').doc('2026');
      const fallbackSnap = await fallbackRef.get();
      if (fallbackSnap.exists) {
        docSnap = fallbackSnap;
      }
    }

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
