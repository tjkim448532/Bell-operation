import { NextRequest, NextResponse } from 'next/server';
import { sendStaffNotification, getPetforetConfig } from '@/lib/solapi';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let recipients: { name: string; phone: string }[] = body.recipients || [];

    // 만약 직접 지정된 수신자가 없다면 등록된 활성 직원 목록 자동 조회
    if (recipients.length === 0) {
      const config = await getPetforetConfig();
      recipients = (config.staffRecipients || [])
        .filter((s) => s.active && s.phone)
        .map((s) => ({ name: s.name, phone: s.phone }));
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { status: 'error', message: '문자를 수신할 직원의 연락처가 등록되어 있지 않습니다. [수신 직원 관리]에서 번호를 등록해 주세요.' },
        { status: 400 }
      );
    }

    if (!body.messageText || !body.messageText.trim()) {
      return NextResponse.json(
        { status: 'error', message: '발송할 문자 내용이 비어 있습니다.' },
        { status: 400 }
      );
    }

    const result = await sendStaffNotification({
      recipients,
      messageText: body.messageText,
    });

    return NextResponse.json({
      status: result.success ? 'success' : 'error',
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results,
    });
  } catch (error: any) {
    console.error('POST /api/petforet/send-message error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || '직원 알림 문자 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
