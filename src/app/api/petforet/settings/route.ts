import { NextRequest, NextResponse } from 'next/server';
import { getPetforetConfig, savePetforetConfig } from '@/lib/solapi';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getPetforetConfig();

    // 최근 발송 이력 50건 조회
    let logs: any[] = [];
    if (db) {
      try {
        const snap = await db
          .collection('petforet_notification_logs')
          .orderBy('timestamp', 'desc')
          .limit(50)
          .get();

        snap.forEach((doc: any) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
      } catch (err) {
        console.error('Failed to fetch petforet logs:', err);
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        config: {
          ...config,
          apiSecretMasked: config.apiSecret
            ? config.apiSecret.slice(0, 4) + '****************'
            : '',
          hasApiSecret: !!config.apiSecret,
        },
        logs,
      },
    });
  } catch (error: any) {
    console.error('GET /api/petforet/settings error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || '설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const updatePayload: any = {};
    if (typeof body.salesActive === 'boolean') updatePayload.salesActive = body.salesActive;
    if (typeof body.salesNotice === 'string') updatePayload.salesNotice = body.salesNotice;
    if (typeof body.useKakaoAlimtalk === 'boolean') updatePayload.useKakaoAlimtalk = body.useKakaoAlimtalk;
    if (typeof body.senderNumber === 'string') updatePayload.senderNumber = body.senderNumber;
    if (typeof body.apiKey === 'string') updatePayload.apiKey = body.apiKey;
    if (typeof body.pfId === 'string') updatePayload.pfId = body.pfId;
    if (typeof body.templateId === 'string') updatePayload.templateId = body.templateId;
    if (typeof body.staffMessageTemplate === 'string') updatePayload.staffMessageTemplate = body.staffMessageTemplate;
    if (Array.isArray(body.staffRecipients)) updatePayload.staffRecipients = body.staffRecipients;

    // apiSecret이 새로 입력된 경우에만(마스킹되지 않은 실제 값) 저장
    if (body.apiSecret && !body.apiSecret.includes('****')) {
      updatePayload.apiSecret = body.apiSecret;
    }

    await savePetforetConfig(updatePayload);

    return NextResponse.json({
      status: 'success',
      message: '직원 수신 연락처 및 알림 설정이 성공적으로 저장되었습니다.',
    });
  } catch (error: any) {
    console.error('POST /api/petforet/settings error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || '설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
