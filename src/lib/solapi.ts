import { db } from '@/lib/firebaseAdmin';

export interface PetforetNotificationConfig {
  apiKey: string;
  apiSecret: string;
  senderNumber: string;
  useKakaoAlimtalk: boolean;
  pfId: string;
  templateId: string;
  messageTemplate: string;
  salesActive: boolean;
  salesNotice: string;
}

export interface NotificationVariables {
  phone: string;
  customerName: string;
  reservationId: string;
  visitDate: string;
  visitTime?: string;
  productName: string;
  totalPrice: number;
  paymentDueDate?: string;
  paymentUrl?: string;
}

export const DEFAULT_MESSAGE_TEMPLATE = `[벨포레 펫포레 예약 결제 안내]
#{고객명}님, 오늘 벨포레 펫포레 방문 예약이 접수되어 있습니다.

원활한 시설 이용 및 입장을 위해 방문 전 온라인 사전 결제를 완료해 주시기 바랍니다.

■ 예약 상세 내역
- 예약번호: #{예약번호}
- 이용일시: #{이용일자} #{이용시간}
- 예약상품: #{예약상품}
- 결제금액: #{결제금액}원
- 결제기한: #{결제기한}까지

아래 결제 링크를 누르시면 안전하고 빠른 결제가 가능합니다.
▶ 결제 링크: #{결제링크}

감사합니다.`;

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
    messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
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
        messageTemplate: data.messageTemplate || defaultConfig.messageTemplate,
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
 * 메시지 본문 변수 치환
 */
export function formatMessageText(template: string, vars: NotificationVariables): string {
  let text = template || DEFAULT_MESSAGE_TEMPLATE;
  text = text.replace(/#\{고객명\}/g, vars.customerName || '고객');
  text = text.replace(/#\{예약번호\}/g, vars.reservationId || '-');
  text = text.replace(/#\{이용일자\}/g, vars.visitDate || '-');
  text = text.replace(/#\{이용시간\}/g, vars.visitTime || '');
  text = text.replace(/#\{예약상품\}/g, vars.productName || '펫포레 시설 이용권');
  text = text.replace(/#\{결제금액\}/g, (vars.totalPrice || 0).toLocaleString());
  text = text.replace(/#\{결제기한\}/g, vars.paymentDueDate || '당일 오전 10:00');
  text = text.replace(/#\{결제링크\}/g, vars.paymentUrl || 'https://booking.belleforet.com');
  return text.trim();
}

/**
 * 통합 발송 함수 (알림톡 & LMS 자동 스위칭)
 */
export async function sendSmartNotification(vars: NotificationVariables): Promise<{
  success: boolean;
  type: string;
  data?: any;
  error?: string;
}> {
  const config = await getPetforetConfig();

  // 전화번호 숫자만 추출
  const cleanPhone = (vars.phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      type: '오류',
      error: `유효하지 않은 수신 전화번호입니다: ${vars.phone}`,
    };
  }

  // 솔라피 인증키 확인
  if (!config.apiKey || !config.apiSecret) {
    return {
      success: false,
      type: '인증 필요',
      error: '솔라피 API Key 또는 Secret이 설정되지 않았습니다. [설정] 메뉴에서 등록해 주세요.',
    };
  }

  // 발신번호 확인
  const cleanSender = (config.senderNumber || '').replace(/[^0-9]/g, '');
  if (!cleanSender) {
    return {
      success: false,
      type: '설정 오류',
      error: '사전 등록된 솔라피 발신번호가 설정되지 않았습니다.',
    };
  }

  const messageText = formatMessageText(config.messageTemplate, vars);
  const sendType = config.useKakaoAlimtalk ? '카카오 알림톡' : '일반 문자(LMS)';

  try {
    // Solapi SDK 동적 로드 (서버 사이드)
    const { SolapiMessageService } = require('solapi');
    const messageService = new SolapiMessageService(config.apiKey, config.apiSecret);

    const payload: any = {
      to: cleanPhone,
      from: cleanSender,
      text: messageText,
    };

    if (config.useKakaoAlimtalk && config.pfId && config.templateId) {
      payload.kakaoOptions = {
        pfId: config.pfId,
        templateId: config.templateId,
      };

      if (vars.paymentUrl) {
        payload.kakaoOptions.buttons = [
          {
            buttonType: 'WL',
            buttonName: '모바일 결제하기',
            linkMo: vars.paymentUrl,
            linkPc: vars.paymentUrl,
          },
        ];
      }
    }

    const response = await messageService.send(payload);

    // Firestore 발송 성공 로그 기록
    if (db) {
      try {
        await db.collection('petforet_notification_logs').add({
          timestamp: new Date().toISOString(),
          reservationId: vars.reservationId,
          customerName: vars.customerName,
          customerPhone: cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3'),
          sendType,
          success: true,
          productName: vars.productName,
          totalPrice: vars.totalPrice,
          response: typeof response === 'object' ? JSON.stringify(response) : String(response),
        });
      } catch (logErr) {
        console.error('Failed to write petforet log:', logErr);
      }
    }

    return {
      success: true,
      type: sendType,
      data: response,
    };
  } catch (error: any) {
    console.error('❌ 솔라피 발송 실패:', error?.message || error);

    // Firestore 발송 실패 로그 기록
    if (db) {
      try {
        await db.collection('petforet_notification_logs').add({
          timestamp: new Date().toISOString(),
          reservationId: vars.reservationId,
          customerName: vars.customerName,
          customerPhone: cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3'),
          sendType,
          success: false,
          error: error?.message || String(error),
        });
      } catch (logErr) {
        console.error('Failed to write petforet failure log:', logErr);
      }
    }

    return {
      success: false,
      type: sendType,
      error: error?.message || '메시지 발송에 실패했습니다.',
    };
  }
}
