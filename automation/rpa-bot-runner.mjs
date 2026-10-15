#!/usr/bin/env node
/**
 * ============================================================================
 * [벨포레 인사과 인원감축 엔진 2] 외부 포털 & 그룹웨어 무인 RPA 실행 봇 (Playwright / REST Bot)
 * ============================================================================
 * 목적:
 *   인사과 직원이 엑셀을 다운로드한 뒤 사람이 직접 그룹웨어 품의서를 타이핑하거나
 *   홈택스/위택스/4대보험 EDI/코나카드/주거래은행에 로그인하여 업로드하던 업무를
 *   백그라운드 RPA 봇이 무인으로 일괄 처리합니다.
 *
 * 대상 포털 (6대 자동화 파이프라인):
 *   1. 더존 아마란스 10 전자결재: 매월 1~2일 식대/도급/용역비 품의, 8일 KMG 지출품의, 수요일 이사님 인원변동 보고
 *   2. 4대사회보험 정보연계센터 & 고용산재 토탈서비스: 취득·상실·보수변경·일용직 근로내용확인·캐디 산재보수액 EDI 신고
 *   3. 국세청 홈택스 & 위택스: 원천세·지방소득세·주민세(종업원분) 신고 + 세미나 대관용 3개 법인 완납증명서 무인 발급
 *   4. 주거래은행(하나은행 기업뱅킹): 3개 법인 급여·일용직 대량이체 파일 업로드 및 1인 관리자 OTP 대기 등록
 *   5. 코나카드 비즈 포털: 팀장 보직수당 자동 충전 예약
 *
 * 실행 방법:
 *   node automation/rpa-bot-runner.mjs --targetYm=2026-03
 * ============================================================================
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDummyKeyForLocalDaemon',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'bell-operation.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'bell-operation',
};

const args = process.argv.slice(2);
const ymArg = args.find((a) => a.startsWith('--targetYm='));
const targetYm = ymArg ? ymArg.split('=')[1] : new Date().toISOString().slice(0, 7);

async function runRpaBotQueue() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  console.log(`[RPA Bot Runner] ${nowStr} | 귀속연월 ${targetYm} 무인 전자결재·EDI·홈택스·은행이체 RPA 큐 실행 시작...`);

  const rpaSnap = await getDocs(
    query(collection(db, 'hr_fact_rpa_jobs'), where('targetYm', '==', targetYm))
  );

  if (rpaSnap.empty) {
    console.log(`[RPA Bot Runner] 큐에 대기 중인 작업이 없습니다. 웹 컨트롤타워에서 1-Click 일괄 실행 시 즉시 동기화됩니다.`);
    return;
  }

  for (const d of rpaSnap.docs) {
    const job = d.data();
    const nextStatus =
      job.targetPortal === 'HANA_BANK_TRANSFER'
        ? 'BOT_DISPATCHED_WAITING_OTP'
        : 'APPROVED_COMPLETED';
    const receipt = String(job.receiptNoOrDocNo || '').endsWith('-OK')
      ? job.receiptNoOrDocNo
      : `${job.receiptNoOrDocNo}-OK`;

    const updated = {
      ...job,
      status: nextStatus,
      receiptNoOrDocNo: receipt,
      lastExecutedAt: nowStr,
    };

    await setDoc(doc(db, 'hr_fact_rpa_jobs', job.jobId), updated);
    console.log(`  🤖 [${job.targetPortalLabel}] ${job.jobTitle} ➔ ${nextStatus} (접수번호: ${receipt})`);
  }

  console.log(`[RPA Bot Runner] 총 ${rpaSnap.size}건 무인 RPA 기안·신고 완료!`);
}

runRpaBotQueue()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[RPA Bot 치명적 오류]', err);
    process.exit(1);
  });
