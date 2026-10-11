import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getNotifiedPurchasesMap } from '@/lib/solapi';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDate = searchParams.get('date') || todayStr;
    const paymentStatus = searchParams.get('paymentStatus') || 'ALL';

    // 1. 공식 백엔드 V6 API 호출 (Strict SSOT)
    const backendBaseUrl = process.env.BACKEND_API_URL || 'https://belleforet-data.vercel.app';
    let backendData: any = null;
    let isBackendReady = false;

    try {
      const res = await fetch(
        `${backendBaseUrl}/api/v6/petforet/reservations?date=${targetDate}&paymentStatus=${paymentStatus}`,
        {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(6000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          backendData = json.data;
          isBackendReady = true;
        }
      }
    } catch (err) {
      console.warn('Backend V6 petforet fetch warning:', err);
      isBackendReady = false;
    }

    // 2. Firestore에 등록된 당일 미결제(UNPAID) 또는 추가 예약 데이터 조회
    let firestoreReservations: any[] = [];
    if (db) {
      try {
        const snap = await db
          .collection('petforet_reservations')
          .where('visitDate', '==', targetDate)
          .get();

        snap.forEach((doc: any) => {
          firestoreReservations.push({ id: doc.id, ...doc.data() });
        });
      } catch (fErr) {
        console.error('Firestore petforet_reservations read error:', fErr);
      }
    }

    // 3. 백엔드 데이터와 Firestore 데이터 지능형 병합 (No Duplicate)
    let combinedReservations: any[] = [];
    if (isBackendReady && backendData?.reservations) {
      combinedReservations = [...backendData.reservations];

      // Firestore의 미결제 건 중 백엔드 목록에 없는 건만 추가
      const existingIds = new Set(combinedReservations.map((r) => r.reservationId));
      for (const fItem of firestoreReservations) {
        if (!existingIds.has(fItem.reservationId)) {
          combinedReservations.push(fItem);
        }
      }
    } else {
      combinedReservations = firestoreReservations;
    }

    // 필터링 적용
    if (paymentStatus !== 'ALL') {
      combinedReservations = combinedReservations.filter(
        (r) => r.paymentStatus === paymentStatus
      );
    }

    // 알림 발송 완료 여부 조회 (Firestore petforet_notified_purchases 대조)
    const allIds = combinedReservations
      .map((r) => r.reservationId || r.orderId)
      .filter(Boolean);
    const notifiedMap = await getNotifiedPurchasesMap(allIds);

    const enrichedReservations = combinedReservations.map((r) => {
      const idKey = r.reservationId || r.orderId;
      const notifInfo = idKey ? notifiedMap[idKey] : null;
      return {
        ...r,
        staffNotified: !!notifInfo,
        staffNotifiedAt: notifInfo?.notifiedAt || null,
        staffNotifiedCount: notifInfo?.staffCount || 0,
        staffNotifiedNames: notifInfo?.staffNames || [],
      };
    });

    // 백엔드 요약이 있고 Firestore 추가 건이 없는 경우 백엔드 완제품 summary 100% 보존
    let finalSummary = backendData?.summary;
    const extraUnpaidCount = firestoreReservations.filter((r) => r.paymentStatus === 'UNPAID').length;

    if (!finalSummary || extraUnpaidCount > 0) {
      const totalCount = enrichedReservations.length;
      const paidCount = enrichedReservations.filter((r) => r.paymentStatus === 'PAID').length;
      const unpaidCount = enrichedReservations.filter((r) => r.paymentStatus === 'UNPAID').length;
      const cancelledCount = enrichedReservations.filter((r) => r.paymentStatus === 'CANCELLED').length;
      const totalAmount = enrichedReservations.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0);
      const paidAmount = enrichedReservations
        .filter((r) => r.paymentStatus === 'PAID')
        .reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0);
      const unpaidAmount = enrichedReservations
        .filter((r) => r.paymentStatus === 'UNPAID')
        .reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0);
      const paymentRate = totalCount > 0 ? Number(((paidCount / totalCount) * 100).toFixed(1)) : 0;

      finalSummary = {
        targetDate,
        totalReservations: totalCount,
        paidCount,
        unpaidCount,
        cancelledCount,
        totalAmount,
        paidAmount,
        unpaidAmount,
        paymentRate,
      };
    }

    // 직원 알림 발송 현황 통계 추가
    const notifiedPaidCount = enrichedReservations.filter((r) => r.paymentStatus === 'PAID' && r.staffNotified).length;
    const unnotifiedPaidCount = enrichedReservations.filter((r) => r.paymentStatus === 'PAID' && !r.staffNotified).length;

    finalSummary = {
      ...finalSummary,
      notifiedPaidCount,
      unnotifiedPaidCount,
    };

    return NextResponse.json({
      status: 'success',
      isBackendReady,
      source: isBackendReady ? 'backend_v6_ssot' : firestoreReservations.length > 0 ? 'firestore_local' : 'waiting',
      message: isBackendReady 
        ? '백엔드 V6 실측 정산 API 및 예약 데이터가 정상 연동되었습니다.' 
        : '백엔드 V6 실측 API 응답 대기 중입니다.',
      data: {
        summary: finalSummary,
        reservations: enrichedReservations,
      },
    });
  } catch (error: any) {
    console.error('GET /api/petforet/reservations error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || '예약 현황 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.customerName || !body.customerPhone) {
      return NextResponse.json(
        { status: 'error', message: '고객명과 전화번호는 필수입니다.' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { status: 'error', message: '데이터베이스 연결이 초기화되지 않았습니다.' },
        { status: 500 }
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const newReservation = {
      reservationId: body.reservationId || `PET-${todayStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      orderDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
      visitDate: body.visitDate || todayStr,
      visitTime: body.visitTime || '10:30',
      customerName: body.customerName,
      customerPhone: body.customerPhone.replace(/[^0-9]/g, ''),
      petType: body.petType || '일반 반려견',
      petCount: Number(body.petCount) || 0,
      productName: body.productName || '펫포레 그라운드 입장권',
      quantity: Number(body.quantity) || 0,
      totalPrice: Number(body.totalPrice) || 0,
      paymentStatus: body.paymentStatus || 'UNPAID',
      paymentDueDate: body.paymentDueDate || `${body.visitDate || todayStr} 09:30:00`,
      paymentUrl: body.paymentUrl || 'https://booking.belleforet.com',
      lastNotifiedAt: null,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('petforet_reservations').add(newReservation);

    return NextResponse.json({
      status: 'success',
      message: '예약 데이터가 성공적으로 등록되었습니다.',
      data: { id: docRef.id, ...newReservation },
    });
  } catch (error: any) {
    console.error('POST /api/petforet/reservations error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || '예약 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
