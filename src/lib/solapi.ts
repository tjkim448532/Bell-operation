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
  staffRecipients: StaffRecipient[];
  salesActive: boolean;
  salesNotice: string;
}

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
    staffRecipients: [
      { id: 'staff_1', name: '펫포레 현장 담당자', phone: '010-0000-0000', role: '현장 운영', active: true }
    ],
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
        staffRecipients: Array.isArray(data.staffRecipients) && data.staffRecipients.length > 0
          ? data.staffRecipients
          : defaultConfig.staffRecipients,
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
 * 현장 직원 대상 알림 문자/알림톡 발송 함수
 */
export async function sendStaffNotification(params: {
  recipients: { name: string; phone: string }[];
  messageText: string;
}): Promise<{
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: any[];
}> {
  const config = await getPetforetConfig();

  // 솔라피 인증키 확인
  if (!config.apiKey || !config.apiSecret) {
    return {
      success: false,
      total: params.recipients.length,
      succeeded: 0,
      failed: params.recipients.length,
      results: [{ error: '솔라피 API Key 또는 Secret이 설정되지 않았습니다. [설정] 메뉴에서 등록해 주세요.' }],
    };
  }

  const cleanSender = (config.senderNumber || '').replace(/[^0-9]/g, '');
  if (!cleanSender) {
    return {
      success: false,
      total: params.recipients.length,
      succeeded: 0,
      failed: params.recipients.length,
      results: [{ error: '사전 등록된 솔라피 발신번호가 설정되지 않았습니다.' }],
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
        results.push({
          name: rec.name,
          phone: cleanPhone,
          success: false,
          error: sendErr?.message || String(sendErr),
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
              error: sendErr?.message || String(sendErr),
            });
          } catch (logErr) {
            console.error('Failed to log staff notification error:', logErr);
          }
        }
      }
    }

    return {
      success: succeeded > 0,
      total: params.recipients.length,
      succeeded,
      failed,
      results,
    };
  } catch (initErr: any) {
    console.error('Solapi service init error:', initErr);
    return {
      success: false,
      total: params.recipients.length,
      succeeded: 0,
      failed: params.recipients.length,
      results: [{ error: initErr?.message || '솔라피 서비스 초기화 실패' }],
    };
  }
}
