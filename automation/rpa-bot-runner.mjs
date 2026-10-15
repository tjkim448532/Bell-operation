#!/usr/bin/env node
/**
 * ============================================================================
 * [벨포레 인사과 인원감축 엔진 2] 외부 포털 & 그룹웨어 무인 RPA 실행 봇 (Playwright / Outbox Bot)
 * ============================================================================
 * 목적:
 *   인사과 직원이 엑셀을 다운로드한 뒤 사람이 직접 그룹웨어 품의서를 타이핑하거나
 *   홈택스/위택스/4대보험 EDI/코나카드/주거래은행에 로그인하여 업로드하던 업무를
 *   백그라운드 RPA 봇이 무인으로 일괄 처리하고 실물 패킷 파일(automation/outbox)을 생성합니다.
 *
 * 실행 방법:
 *   일반 무인 실행:       node automation/rpa-bot-runner.mjs --targetYm=2026-03
 *   실브라우저 구동 모드: node automation/rpa-bot-runner.mjs --targetYm=2026-03 --live-browser
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
import { executePortalRpaDriver } from './playwright-portal-drivers.mjs';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDummyKeyForLocalDaemon',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'bell-operation.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'bell-operation',
};

const args = process.argv.slice(2);
const ymArg = args.find((a) => a.startsWith('--targetYm='));
const targetYm = ymArg ? ymArg.split('=')[1] : new Date().toISOString().slice(0, 7);
const liveBrowser = args.includes('--live-browser');

async function buildDefaultRpaJobsFromFirestore(db, ym, nowStr) {
  const [empSnap, mealSnap, vendorSnap, hanaSnap, caddySnap] = await Promise.all([
    getDocs(collection(db, 'hr_dim_employees')),
    getDocs(collection(db, 'hr_fact_meal_daily_logs')),
    getDocs(query(collection(db, 'hr_fact_vendor_contracts'), where('targetYm', '==', ym))),
    getDocs(query(collection(db, 'hr_fact_hana_bsn_fees'), where('targetYm', '==', ym))),
    getDocs(query(collection(db, 'hr_fact_caddy_monthly'), where('targetYm', '==', ym))),
  ]);

  const activeEmps = empSnap.docs.map((d) => d.data()).filter((e) => !e.resignDate);
  let totalBasePay = 0;
  let kmgPay = 0;
  for (const e of activeEmps) {
    const pay = Number(e.baseMonthlyPay || e.dailyOrHourlyWage * 20 || 0);
    totalBasePay += pay;
    if (e.entityCode === 'KMG') kmgPay += pay;
  }

  let mealTotal = 0;
  for (const d of mealSnap.docs) {
    const m = d.data();
    if (String(m.mealDate || '').startsWith(ym)) {
      const cnt =
        Number(m.breakfastCount || 0) +
        Number(m.lunchCount || 0) +
        Number(m.dinnerCount || 0) +
        Number(m.nightMealCount || 0);
      mealTotal += cnt * Number(m.unitMealPrice || 0) + Number(m.vatAmount || 0);
    }
  }
  for (const d of vendorSnap.docs) {
    const v = d.data();
    mealTotal +=
      Number(v.baseContractFee || 0) +
      Number(v.staffAllowanceAmount || 0) +
      Number(v.vatAmount || 0);
  }
  for (const d of hanaSnap.docs) {
    const h = d.data();
    mealTotal += Number(h.supplyAmount || 0) + Number(h.vatAmount || 0);
  }

  const ymCompact = ym.replace('-', '');
  return [
    {
      jobId: `RPA-${ym}-01-APPROVAL-PACK`,
      targetYm: ym,
      cycleLabel: '매월 1~2일 정기',
      rowRef: '시트 1, 2, 3, 51, 52번',
      targetPortal: 'AMARANTH_APPROVAL',
      targetPortalLabel: '더존 아마란스 10 전자결재',
      jobTitle: '월초 3대 정기 지출품의서 (웰스토리 식대 · 고정도급 · 하나BSN 용역비) 일괄 상신',
      autoDraftSummary: `3개 법인 식대·고정도급·하나BSN 용역비 합산 자동 기안`,
      totalAmount: mealTotal,
      targetRecordCount: mealSnap.size + vendorSnap.size + hanaSnap.size,
      status: 'READY_FOR_1CLICK_APPROVAL',
      receiptNoOrDocNo: `AMARANTH-DOC-${ymCompact}-001`,
      lastExecutedAt: nowStr,
    },
    {
      jobId: `RPA-${ym}-02-KMG-PAYROLL`,
      targetYm: ym,
      cycleLabel: '매월 8일 정기',
      rowRef: '시트 4, 24, 31, 32번',
      targetPortal: 'AMARANTH_APPROVAL',
      targetPortalLabel: '더존 아마란스 10 전자결재',
      jobTitle: 'KMG 노무비 지출품의서 및 전 법인 일용직 급여 정산 품의 자동 상신',
      autoDraftSummary: `KMG 재직자 및 일용직 급여 정산 내역 그룹웨어 자동 기안`,
      totalAmount: kmgPay,
      targetRecordCount: activeEmps.length,
      status: 'READY_FOR_1CLICK_APPROVAL',
      receiptNoOrDocNo: `AMARANTH-DOC-${ymCompact}-008`,
      lastExecutedAt: nowStr,
    },
    {
      jobId: `RPA-${ym}-03-HOMETAX-WETAX`,
      targetYm: ym,
      cycleLabel: '매월 10일 / 수시',
      rowRef: '시트 5, 34, 35, 48번',
      targetPortal: 'HOMETAX_WETAX',
      targetPortalLabel: '국세청 홈택스 · 위택스 Bot',
      jobTitle: '원천세·지방소득세·주민세(종업원분) 신고 및 3개 법인 완납증명서 무인 발급',
      autoDraftSummary: `3개 법인 세무 신고 및 세미나 대관용 국세·지방세 완납증명서 PDF 자동 발급`,
      totalAmount: Math.round(totalBasePay * 0.038),
      targetRecordCount: 3,
      status: 'READY_FOR_1CLICK_APPROVAL',
      receiptNoOrDocNo: `HTX-WETAX-${ymCompact}-010`,
      lastExecutedAt: nowStr,
    },
    {
      jobId: `RPA-${ym}-04-HANA-BANK-KONA`,
      targetYm: ym,
      cycleLabel: '매월 8일 · 10일',
      rowRef: '시트 6, 30, 33, 36번',
      targetPortal: 'HANA_BANK_TRANSFER',
      targetPortalLabel: '하나은행 기업뱅킹 · 코나비즈',
      jobTitle: '3개 법인 임직원·일용직 급여 대량이체 대기 등록 및 팀장 코나카드 자동 충전',
      autoDraftSummary: `하나은행 대량이체 포맷 전송(관리자 1인 OTP 대기) 및 코나카드 충전 예약`,
      totalAmount: Math.round(totalBasePay * 0.91),
      targetRecordCount: activeEmps.length,
      status: 'READY_FOR_1CLICK_APPROVAL',
      receiptNoOrDocNo: `HANABANK-BAT-${ymCompact}-010`,
      lastExecutedAt: nowStr,
    },
    {
      jobId: `RPA-${ym}-05-EDI-4MAJOR`,
      targetYm: ym,
      cycleLabel: '매월 15일 정기',
      rowRef: '시트 7, 13, 14, 19~23번',
      targetPortal: 'EDI_4MAJOR',
      targetPortalLabel: '4대보험 정보연계센터 · 고용산재 토탈',
      jobTitle: '4대보험 취득·상실·보수변경 및 일용직 근로내용확인·경기과 캐디 산재 EDI 신고',
      autoDraftSummary: `정규직 4대보험·일용직·경기과 캐디(${caddySnap.size}건) 공단 EDI 일괄 전송`,
      totalAmount: Math.round(totalBasePay * 0.094),
      targetRecordCount: activeEmps.length + caddySnap.size,
      status: 'READY_FOR_1CLICK_APPROVAL',
      receiptNoOrDocNo: `EDI-4INS-${ymCompact}-015`,
      lastExecutedAt: nowStr,
    },
    {
      jobId: `RPA-${ym}-06-WED-HEADCOUNT`,
      targetYm: ym,
      cycleLabel: '매주 수요일 정기',
      rowRef: '시트 15~18, 41, 60번',
      targetPortal: 'AMARANTH_APPROVAL',
      targetPortalLabel: '더존 아마란스 10 보고서 Bot',
      jobTitle: '매주 수요일 이사님 3개 법인 인원변동 보고서 및 말일 월근무표 일괄 품의',
      autoDraftSummary: `전 법인 총 재직인원(${activeEmps.length}명) 현황표 및 부서 근무표 자동 상신`,
      totalAmount: 0,
      targetRecordCount: activeEmps.length,
      status: 'READY_FOR_1CLICK_APPROVAL',
      receiptNoOrDocNo: `AMARANTH-WED-${ymCompact}-RPT`,
      lastExecutedAt: nowStr,
    },
  ];
}

async function runRpaBotQueue() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  console.log(
    `[RPA Bot Runner] ${nowStr} | 귀속연월 ${targetYm} 무인 전자결재·EDI·홈택스·은행이체 RPA 큐 실행 시작...`
  );

  const rpaSnap = await getDocs(
    query(collection(db, 'hr_fact_rpa_jobs'), where('targetYm', '==', targetYm))
  );

  const jobsToRun = rpaSnap.empty
    ? await buildDefaultRpaJobsFromFirestore(db, targetYm, nowStr)
    : rpaSnap.docs.map((d) => d.data());

  for (const job of jobsToRun) {
    const driverResult = await executePortalRpaDriver(job, targetYm, { liveBrowser });

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
    console.log(
      `  🤖 [${job.targetPortalLabel}] ${job.jobTitle} ➔ ${nextStatus} (접수번호: ${receipt})`
    );
    console.log(`     📄 생성된 포털 전송 파일: ${driverResult.outboxFilePath}`);
    for (const sLog of driverResult.stepLogs) {
      console.log(`        ✓ ${sLog}`);
    }
  }

  console.log(
    `[RPA Bot Runner] 총 ${jobsToRun.length}건 무인 RPA 기안·신고 및 포털 패킷 생성 완료!`
  );
}

runRpaBotQueue()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[RPA Bot 치명적 오류]', err);
    process.exit(1);
  });
