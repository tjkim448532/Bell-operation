import { db } from '@/lib/firebaseAdmin';

export interface StaffRecipient {
  id: string;
  name: string;
  phone: string;
  role?: string;
  active: boolean;
}

export interface PetforetNotificationConfig {
  apiKey: string;
  apiSecret: string;
  senderNumber: string;
  useKakaoAlimtalk: boolean;
  pfId: string;
  templateId: string;
  staffMessageTemplate: string;
  purchaseMessageTemplate: string;
  staffRecipients: StaffRecipient[];
  autoDispatchEnabled: boolean;
  salesActive: boolean;
  salesNotice: string;
}

export const DEFAULT_PURCHASE_MESSAGE_TEMPLATE = `[벨포레 펫포레] 신규 결제 완료 알림

새로운 펫포레 이용권 예약/결제가 확인되었습니다.

■ 구매 내역
- 예약번호: #{예약번호}
- 고객명: #{고객명}
- 연락처: #{고객연락처}
- 상품명: #{상품명}
- 결제금액: #{결제금액}원
- 구매일시: #{구매일시}

※ MS > TICKET&PARK > 타임테이블 > 타임티켓 조회 메뉴로 들어가신 후, 업장을 펫포레로 선택하고 조회 바랍니다.`;

export const DEFAULT_STAFF_MESSAGE_TEMPLATE = `[벨포레 펫포레] #{날짜} 당일 예약 및 미결제 확인 안내

오늘 펫포레 예약 현황입니다. 현장 데스크에서는 미결제 고객 입장 시 결제 여부를 반드시 확인해 주시기 바랍니다.

■ 당일 예약 현황 요약
- 총 예약: #{총예약건수}건 (#{총예약금액}원)
- 결제 완료: #{결제완료건수}건 (#{결제완료금액}원)
- 미결제 확인: #{미결제건수}건 (#{미결제금액}원)

■ 미결제 예약 명단
#{미결제고객명단}

※ 고객 내장 시 POS에서 결제 여부를 대조해 주세요.`;

/**
 * Firestore settings/petforet 설정 조회 (환경 변수 fallback 포함)
 */
export async function getPetforetConfig(): Promise<PetforetNotificationConfig> {
  const defaultConfig: PetforetNotificationConfig = {
    apiKey: process.env.SOLAPI_API_KEY || '',
    apiSecret: process.env.SOLAPI_API_SECRET || '',
    senderNumber: process.env.SOLAPI_SENDER || '043-123-4567',
    useKakaoAlimtalk: process.env.SOLAPI_USE_KAKAO === 'true',
    pfId: process.env.SOLAPI_PFID || '',
    templateId: process.env.SOLAPI_TEMPLATE_ID || '',
    staffMessageTemplate: DEFAULT_STAFF_MESSAGE_TEMPLATE,
    purchaseMessageTemplate: DEFAULT_PURCHASE_MESSAGE_TEMPLATE,
    staffRecipients: [
      { id: 'staff_1', name: '펫포레 현장 담당자', phone: '010-0000-0000', role: '현장 운영', active: true }
    ],
    autoDispatchEnabled: true,
    salesActive: true,
    salesNotice: '정상 운영 중입니다.',
  };

  if (!db) {
    return defaultConfig;
  }

  try {
    const docSnap = await db.collection('settings').doc('petforet').get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        apiKey: data.apiKey || defaultConfig.apiKey,
        apiSecret: data.apiSecret || defaultConfig.apiSecret,
        senderNumber: data.senderNumber || defaultConfig.senderNumber,
        useKakaoAlimtalk: typeof data.useKakaoAlimtalk === 'boolean' ? data.useKakaoAlimtalk : defaultConfig.useKakaoAlimtalk,
        pfId: data.pfId || defaultConfig.pfId,
        templateId: data.templateId || defaultConfig.templateId,
        staffMessageTemplate: data.staffMessageTemplate || data.messageTemplate || defaultConfig.staffMessageTemplate,
        purchaseMessageTemplate: data.purchaseMessageTemplate || defaultConfig.purchaseMessageTemplate,
        staffRecipients: Array.isArray(data.staffRecipients) && data.staffRecipients.length > 0
          ? data.staffRecipients
          : defaultConfig.staffRecipients,
        autoDispatchEnabled: typeof data.autoDispatchEnabled === 'boolean' ? data.autoDispatchEnabled : defaultConfig.autoDispatchEnabled,
        salesActive: typeof data.salesActive === 'boolean' ? data.salesActive : defaultConfig.salesActive,
        salesNotice: data.salesNotice || defaultConfig.salesNotice,
      };
    }
  } catch (error) {
    console.error('Error fetching petforet config from Firestore:', error);
  }

  return defaultConfig;
}

/**
 * Firestore settings/petforet 설정 저장
 */
export async function savePetforetConfig(config: Partial<PetforetNotificationConfig>): Promise<void> {
  if (!db) {
    throw new Error('Firestore DB instance is not available.');
  }

  await db.collection('settings').doc('petforet').set(
    {
      ...config,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * 직원 발송용 메시지 본문 변수 치환
 */
export function formatStaffMessageText(
  template: string,
  data: {
    date: string;
    summary: any;
    unpaidReservations: any[];
  }
): string {
  let text = template || DEFAULT_STAFF_MESSAGE_TEMPLATE;
  const s = data.summary || {};

  text = text.replace(/#\{날짜\}/g, data.date || '-');
  text = text.replace(/#\{총예약건수\}/g, String(s.totalReservations || 0));
  text = text.replace(/#\{총예약금액\}/g, (Number(s.totalAmount) || 0).toLocaleString());
  text = text.replace(/#\{결제완료건수\}/g, String(s.paidCount || 0));
  text = text.replace(/#\{결제완료금액\}/g, (Number(s.paidAmount) || 0).toLocaleString());
  text = text.replace(/#\{미결제건수\}/g, String(s.unpaidCount || 0));
  text = text.replace(/#\{미결제금액\}/g, (Number(s.unpaidAmount) || 0).toLocaleString());

  // 미결제 고객 명단 포맷팅
  let unpaidListText = '';
  if (!data.unpaidReservations || data.unpaidReservations.length === 0) {
    unpaidListText = '(당일 미결제 예약 없음 - 전원 결제 완료)';
  } else {
    unpaidListText = data.unpaidReservations
      .map((r, idx) => {
        const timeStr = r.visitTime ? ` [${r.visitTime}]` : '';
        const phoneStr = r.customerPhone ? ` (${r.customerPhone.slice(-4)})` : '';
        const priceStr = r.totalPrice ? ` - ${(Number(r.totalPrice) || 0).toLocaleString()}원` : '';
        return `${idx + 1}. ${r.customerName}${phoneStr}${timeStr} | ${r.productName || '입장권'}${priceStr}`;
      })
      .join('\n');
  }

  text = text.replace(/#\{미결제고객명단\}/g, unpaidListText);
  return text.trim();
}

/**
 * 신규 구매/결제 발생 알림 메시지 변수 치환
 */
export function formatPurchaseMessageText(
  template: string,
  purchase: {
    reservationId?: string;
    orderId?: string;
    customerName?: string;
    customerPhone?: string;
    productName?: string;
    totalPrice?: number;
    orderDate?: string;
    visitDate?: string;
  }
): string {
  let text = template || DEFAULT_PURCHASE_MESSAGE_TEMPLATE;
  text = text.replace(/#\{예약번호\}/g, purchase.reservationId || purchase.orderId || '-');
  text = text.replace(/#\{주문번호\}/g, purchase.orderId || '-');
  text = text.replace(/#\{고객명\}/g, purchase.customerName || '고객');
  text = text.replace(/#\{고객연락처\}/g, purchase.customerPhone || '-');
  text = text.replace(/#\{상품명\}/g, purchase.productName || '펫포레 이용권');
  text = text.replace(/#\{결제금액\}/g, (Number(purchase.totalPrice) || 0).toLocaleString());
  text = text.replace(/#\{구매일시\}/g, purchase.orderDate || purchase.visitDate || '-');
  return text.trim();
}

/**
 * 구매건 알림 발송 완료 여부 조회 (Firestore petforet_notified_purchases)
 */
export async function getNotifiedPurchasesMap(ids: string[]): Promise<Record<string, {
  notifiedAt: string;
  staffCount: number;
  staffNames: string[];
}>> {
  const result: Record<string, { notifiedAt: string; staffCount: number; staffNames: string[] }> = {};
  if (!db || !ids || ids.length === 0) return result;

  try {
    const validIds = ids.filter(Boolean);
    const chunks: string[][] = [];
    for (let i = 0; i < validIds.length; i += 30) {
      chunks.push(validIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const snap = await db
        .collection('petforet_notified_purchases')
        .where('__name__', 'in', chunk)
        .get();

      snap.forEach((doc: any) => {
        const d = doc.data();
        result[doc.id] = {
          notifiedAt: d.notifiedAt || '',
          staffCount: d.staffCount || 0,
          staffNames: Array.isArray(d.staffNames) ? d.staffNames : [],
        };
      });
    }
  } catch (err) {
    console.error('getNotifiedPurchasesMap error:', err);
  }

  return result;
}

/**
 * 신규 결제 발생 건 직원 발송 (최초 1회 보장 / Idempotent)
 */
export async function sendPurchaseAlertToStaff(purchase: {
  reservationId: string;
  orderId?: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  totalPrice: number;
  orderDate?: string;
  visitDate?: string;
}): Promise<{
  success: boolean;
  skippedAlreadyNotified?: boolean;
  totalRecipients: number;
  succeeded: number;
  failed: number;
  message?: string;
  error?: string;
}> {
  const purchaseId = purchase.reservationId || purchase.orderId;
  if (!purchaseId) {
    return {
      success: false,
      totalRecipients: 0,
      succeeded: 0,
      failed: 0,
      error: '예약번호 또는 주문번호가 누락되었습니다.',
    };
  }

  // 1. 이미 발송된 건인지 확인 (최초 1회 엄수)
  if (db) {
    try {
      const docSnap = await db.collection('petforet_notified_purchases').doc(purchaseId).get();
      if (docSnap.exists) {
        return {
          success: true,
          skippedAlreadyNotified: true,
          totalRecipients: 0,
          succeeded: 0,
          failed: 0,
          message: '이미 발송 완료된 구매건입니다.',
        };
      }
    } catch (checkErr) {
      console.warn('Idempotency check error:', checkErr);
    }
  }

  const config = await getPetforetConfig();
  const activeStaff = (config.staffRecipients || []).filter((s) => s.active && s.phone);
  if (activeStaff.length === 0) {
    return {
      success: false,
      totalRecipients: 0,
      succeeded: 0,
      failed: 0,
      error: '문자를 수신할 활성 직원이 없습니다. 직원 목록을 등록해 주세요.',
    };
  }

  const messageText = formatPurchaseMessageText(config.purchaseMessageTemplate, purchase);
  const sendRes = await sendStaffNotification({
    recipients: activeStaff.map((s) => ({ name: s.name, phone: s.phone })),
    messageText,
  });

  // 2. 발송 완료 기록 저장 (재발송 방지)
  if (db && sendRes.succeeded > 0) {
    try {
      await db.collection('petforet_notified_purchases').doc(purchaseId).set({
        reservationId: purchase.reservationId,
        orderId: purchase.orderId || '',
        customerName: purchase.customerName,
        customerPhone: purchase.customerPhone || '',
        productName: purchase.productName,
        totalPrice: Number(purchase.totalPrice) || 0,
        orderDate: purchase.orderDate || '',
        notifiedAt: new Date().toISOString(),
        staffCount: sendRes.succeeded,
        staffNames: activeStaff.map((s) => s.name),
        status: 'SUCCESS',
      });
    } catch (saveErr) {
      console.error('Failed to record notified purchase in Firestore:', saveErr);
    }
  }

  const firstError = sendRes.error || sendRes.results?.find((r: any) => r.error)?.error;

  return {
    success: sendRes.success,
    skippedAlreadyNotified: false,
    totalRecipients: sendRes.total,
    succeeded: sendRes.succeeded,
    failed: sendRes.failed,
    message: sendRes.message,
    error: sendRes.error || firstError,
  };
}

/**
 * 현장 직원 대상 알림 문자/알림톡 발송 함수
 */
export async function sendStaffNotification(params: {
  recipients: { name: string; phone: string }[];
  messageText: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  total: number;
  succeeded: number;
  failed: number;
  results: any[];
}> {
  const config = await getPetforetConfig();

  // 1. 발송 전 사전 검증 (Root Cause: 빈 값 방어)
  if (!config.apiKey || !config.apiSecret) {
    const errorMsg = '솔라피(Solapi) API Key 또는 Secret이 시스템에 입력되지 않았습니다. 상단 [발송 계정 설정]에서 등록해 주세요.';
    return {
      success: false,
      message: undefined,
      error: errorMsg,
      total: params.recipients.length,
      succeeded: 0,
      failed: params.recipients.length,
      results: [{ error: errorMsg }],
    };
  }

  const cleanSender = (config.senderNumber || '').replace(/[^0-9]/g, '');
  if (!cleanSender) {
    const errorMsg = '사전 등록된 발신번호가 입력되지 않았습니다. 상단 [발송 계정 설정]에서 등록해 주세요.';
    return {
      success: false,
      message: undefined,
      error: errorMsg,
      total: params.recipients.length,
      succeeded: 0,
      failed: params.recipients.length,
      results: [{ error: errorMsg }],
    };
  }

  const sendType = config.useKakaoAlimtalk ? '카카오 알림톡' : '일반 문자(LMS)';
  const results: any[] = [];
  let succeeded = 0;
  let failed = 0;

  try {
    const { SolapiMessageService } = require('solapi');
    const messageService = new SolapiMessageService(config.apiKey, config.apiSecret);

    for (const rec of params.recipients) {
      const cleanPhone = (rec.phone || '').replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        failed++;
        results.push({
          name: rec.name,
          phone: rec.phone,
          success: false,
          error: '유효하지 않은 수신 전화번호입니다.',
        });
        continue;
      }

      const payload: any = {
        to: cleanPhone,
        from: cleanSender,
        text: params.messageText,
      };

      if (config.useKakaoAlimtalk && config.pfId && config.templateId) {
        payload.kakaoOptions = {
          pfId: config.pfId,
          templateId: config.templateId,
        };
      }

      try {
        const response = await messageService.send(payload);
        succeeded++;
        results.push({
          name: rec.name,
          phone: cleanPhone,
          success: true,
          type: sendType,
          data: response,
        });

        // Firestore 감사 로그
        if (db) {
          try {
            await db.collection('petforet_notification_logs').add({
              timestamp: new Date().toISOString(),
              target: 'STAFF',
              staffName: rec.name,
              staffPhone: cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3'),
              sendType,
              success: true,
              messagePreview: params.messageText.slice(0, 100) + '...',
            });
          } catch (logErr) {
            console.error('Failed to log staff notification:', logErr);
          }
        }
      } catch (sendErr: any) {
        failed++;

        const solapiErrorCode = sendErr.errorCode || sendErr.code || (sendErr.response?.data?.errorCode) || "UNKNOWN_ERROR";
        const solapiErrorMessage = sendErr.errorMessage || sendErr.message || (sendErr.response?.data?.errorMessage) || "알 수 없는 솔라피 통신 에러";

        console.error(`❌ [솔라피 문자 발송 실패] Code: ${solapiErrorCode}, Msg: ${solapiErrorMessage}`);

        // 친절한 사용자 안내 에러 메시지로 변환
        let userFriendlyError = solapiErrorMessage;
        if (solapiErrorCode === "NotRegisteredSenderId") {
          userFriendlyError = `솔라피에 등록되지 않은 발신번호입니다. (${config.senderNumber})`;
        } else if (solapiErrorCode === "InvalidApiKey") {
          userFriendlyError = "솔라피 API Key가 유효하지 않습니다. 키를 다시 확인해 주세요.";
        } else if (solapiErrorCode === "BalanceNotEnough") {
          userFriendlyError = "솔라피 충전 잔액이 부족하여 발송할 수 없습니다.";
        } else if (solapiErrorCode === "TemplateNotApproved") {
          userFriendlyError = "카카오 템플릿 심사가 승인되지 않았습니다. (일반 문자로 발송 설정을 변경하세요)";
        } else if (solapiErrorCode === "ValidationError" || solapiErrorCode === "InvalidParameters") {
          userFriendlyError = `발송 파라미터 오류: ${solapiErrorMessage}`;
        }

        results.push({
          name: rec.name,
          phone: cleanPhone,
          success: false,
          error: userFriendlyError,
          rawErrorCode: solapiErrorCode,
        });

        if (db) {
          try {
            await db.collection('petforet_notification_logs').add({
              timestamp: new Date().toISOString(),
              target: 'STAFF',
              staffName: rec.name,
              staffPhone: cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3'),
              sendType,
              success: false,
              errorCode: solapiErrorCode,
              error: userFriendlyError,
            });
          } catch (logErr) {
            console.error('Failed to log staff notification error:', logErr);
          }
        }
      }
    }

    const firstError = results.find((r) => r.error)?.error;

    return {
      success: succeeded > 0,
      message: succeeded > 0 ? (config.useKakaoAlimtalk ? '카카오 알림톡 발송 성공' : '일반 문자 발송 성공') : undefined,
      error: succeeded === 0 ? (firstError || '문자 발송 실패') : undefined,
      total: params.recipients.length,
      succeeded,
      failed,
      results,
    };
  } catch (initErr: any) {
    console.error('Solapi service init error:', initErr);
    return {
      success: false,
      message: undefined,
      error: initErr?.message || '솔라피 서비스 초기화 실패',
      total: params.recipients.length,
      succeeded: 0,
      failed: params.recipients.length,
      results: [{ error: initErr?.message || '솔라피 서비스 초기화 실패' }],
    };
  }
}
