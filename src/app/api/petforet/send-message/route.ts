import { NextRequest, NextResponse } from 'next/server';
import { sendSmartNotification, NotificationVariables } from '@/lib/solapi';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: NotificationVariables[] = Array.isArray(body.items)
      ? body.items
      : body.phone
      ? [body]
      : [];

    if (items.length === 0) {
      return NextResponse.json(
        { status: 'error', message: '발송 대상 데이터가 전달되지 않았습니다.' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      const res = await sendSmartNotification(item);
      results.push({
        reservationId: item.reservationId,
        customerName: item.customerName,
        phone: item.phone,
        success: res.success,
        type: res.type,
        error: res.error || null,
      });

      if (res.success) {
        succeeded++;
        // Firestore 예약 문서가 있는 경우 lastNotifiedAt 업데이트
        if (db && item.reservationId) {
          try {
            const querySnap = await db
              .collection('petforet_reservations')
              .where('reservationId', '==', item.reservationId)
              .get();

            querySnap.forEach((doc: any) => {
              doc.ref.update({
                lastNotifiedAt: new Date().toISOString(),
                lastNotifyType: res.type,
              });
            });
          } catch (updateErr) {
            console.error('Failed to update reservation lastNotifiedAt:', updateErr);
          }
        }
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      status: failed === 0 ? 'success' : succeeded > 0 ? 'partial' : 'error',
      total: items.length,
      succeeded,
      failed,
      results,
    });
  } catch (error: any) {
    console.error('POST /api/petforet/send-message error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || '메시지 발송 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
