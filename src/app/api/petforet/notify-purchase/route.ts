import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { sendPurchaseAlertToStaff } from '@/lib/solapi';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, reservationId, purchase, autoAllUnnotified } = body;

    // 1. 단일 구매건 직접 전달받아 발송하는 경우
    if (purchase && (purchase.reservationId || purchase.orderId)) {
      const res = await sendPurchaseAlertToStaff(purchase);
      if (res.skippedAlreadyNotified) {
        return NextResponse.json({
          success: true,
          status: 'success',
          processed: 1,
          notified: 0,
          skippedAlreadyNotified: true,
          details: [res],
          message: '이미 직원에게 알림이 발송된 구매건입니다. (중복 발송 방지됨)',
        });
      }

      if (res.succeeded > 0) {
        return NextResponse.json({
          success: true,
          status: 'success',
          processed: 1,
          notified: 1,
          skippedAlreadyNotified: false,
          details: [res],
          message: `직원 총 ${res.totalRecipients}명 중 ${res.succeeded}명에게 신규 구매 알림이 발송되었습니다.`,
        });
      }

      return NextResponse.json({
        success: false,
        status: 'error',
        processed: 1,
        notified: 0,
        skippedAlreadyNotified: false,
        details: [res],
        error: res.error || '구매 알림 발송에 실패했습니다.',
      });
    }

    // 2. 단일 reservationId로 발송 요청한 경우 -> 백엔드 또는 Firestore에서 조회 후 발송
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDate = date || todayStr;

    // 백엔드 V6 실측 API 호출
    const backendBaseUrl = process.env.BACKEND_API_URL || 'https://belleforet-data.vercel.app';
    let targetReservations: any[] = [];

    try {
      const res = await fetch(
        `${backendBaseUrl}/api/v6/petforet/reservations?date=${targetDate}&paymentStatus=PAID`,
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.data?.reservations) {
          targetReservations = json.data.reservations;
        }
      }
    } catch (err) {
      console.warn('Backend fetch error in notify-purchase:', err);
    }

    // Firestore 결제완료 건도 병합
    if (db) {
      try {
        const snap = await db
          .collection('petforet_reservations')
          .where('visitDate', '==', targetDate)
          .where('paymentStatus', '==', 'PAID')
          .get();

        const existingIds = new Set(targetReservations.map((r) => r.reservationId));
        snap.forEach((doc: any) => {
          const d = { id: doc.id, ...doc.data() };
          if (!existingIds.has(d.reservationId)) {
            targetReservations.push(d);
          }
        });
      } catch (fErr) {
        console.error('Firestore read error in notify-purchase:', fErr);
      }
    }

    // 특정 reservationId 지정된 경우 필터링
    if (reservationId) {
      targetReservations = targetReservations.filter(
        (r) => r.reservationId === reservationId || r.orderId === reservationId
      );
    }

    if (targetReservations.length === 0) {
      return NextResponse.json({
        status: 'success',
        processed: 0,
        notified: 0,
        skippedAlreadyNotified: 0,
        message: '발송 대상 결제 완료 내역이 없습니다.',
      });
    }

    // 발송 실행 (각 건별 최초 1회 엄수)
    const results: any[] = [];
    let newlyNotified = 0;
    let skippedCount = 0;

    for (const item of targetReservations) {
      const sendRes = await sendPurchaseAlertToStaff({
        reservationId: item.reservationId,
        orderId: item.orderId,
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        productName: item.productName,
        totalPrice: Number(item.totalPrice) || 0,
        orderDate: item.orderDate,
        visitDate: item.visitDate,
      });

      if (sendRes.skippedAlreadyNotified) {
        skippedCount++;
      } else if (sendRes.succeeded > 0) {
        newlyNotified++;
      }
      results.push({
        reservationId: item.reservationId,
        customerName: item.customerName,
        ...sendRes,
      });
    }

    const hasFailures = results.some((r) => r.failed > 0 && r.succeeded === 0);
    const firstError = results.find((r) => r.error)?.error;

    return NextResponse.json({
      success: newlyNotified > 0 || (skippedCount > 0 && targetReservations.length === skippedCount),
      status: 'success',
      processed: targetReservations.length,
      notified: newlyNotified,
      skippedAlreadyNotified: skippedCount,
      details: results,
      message: newlyNotified > 0
        ? `신규 구매건 ${newlyNotified}건에 대해 직원 문자 발송이 완료되었습니다. (이미 발송된 ${skippedCount}건 제외)`
        : skippedCount > 0
        ? `모든 결제 건(${skippedCount}건)이 이미 직원에게 발송 완료된 상태입니다.`
        : '발송할 수 있는 결제 완료 건이 없습니다.',
      error: newlyNotified === 0 && skippedCount === 0 && hasFailures ? firstError : undefined,
    });
  } catch (error: any) {
    console.error('POST /api/petforet/notify-purchase error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: error?.message || '구매 알림 발송 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
