#!/usr/bin/env node

/**
 * 🔬 [FULL-STACK E2E & ZERO-VARIANCE LOGIC VERIFICATION SUITE]
 * 벨포레 인사(HR) 자동화 시스템 전수 로직 · 수학적 불변식(Δ=0원) · 라이브 Firestore 실측 검증
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

// TypeScript(.ts) 모듈 실시간 트랜스파일 로더 등록 (@/* 경로 별칭 지원)
const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.join(process.cwd(), 'src', request.slice(2));
    if (fs.existsSync(mapped + '.ts')) return mapped + '.ts';
    if (fs.existsSync(mapped + '.tsx')) return mapped + '.tsx';
    return origResolveFilename.call(this, mapped, parent, isMain, options);
  }
  if ((request.startsWith('./') || request.startsWith('../')) && parent && parent.filename) {
    const baseDir = path.dirname(parent.filename);
    const candidateTs = path.resolve(baseDir, request + '.ts');
    if (fs.existsSync(candidateTs)) return candidateTs;
  }
  return origResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(transpiled.outputText, filename);
};

const { doc, setDoc, deleteDoc } = require('firebase/firestore');
const { firestoreDb } = require('../src/lib/firebase/client.ts');
const hrService = require('../src/lib/firebase/hrFirestoreService.ts');

let passCount = 0;
let failCount = 0;

function assertEqual(label, actual, expected, unit = '') {
  const isOk = actual === expected;
  const delta =
    typeof actual === 'number' && typeof expected === 'number' ? actual - expected : null;
  if (isOk) {
    passCount += 1;
    console.log(
      `  [PASS] ${label}: 실측=${
        typeof actual === 'number' ? actual.toLocaleString() : actual
      }${unit} | 기준=${
        typeof expected === 'number' ? expected.toLocaleString() : expected
      }${unit}${delta !== null ? ` (Δ = ${delta}${unit})` : ''}`
    );
  } else {
    failCount += 1;
    console.error(
      `  [FAIL] ${label}: 실측=${actual}${unit} !== 기준=${expected}${unit}${
        delta !== null ? ` (Δ = ${delta}${unit})` : ''
      }`
    );
  }
}

function assertTrue(label, condition, detail = '') {
  if (condition) {
    passCount += 1;
    console.log(`  [PASS] ${label}${detail ? `: ${detail}` : ''}`);
  } else {
    failCount += 1;
    console.error(`  [FAIL] ${label}${detail ? `: ${detail}` : ''}`);
  }
}

const SUM_FIELDS = [
  'headcount',
  'basePay',
  'positionAllowance',
  'overtimePay',
  'bonusPay',
  'specialAllowance',
  'otherTaxableAllowance',
  'mealAllowanceTaxFree',
  'carAllowanceTaxFree',
  'teamLeaderKonaAllowance',
  'taxableIncome',
  'nonTaxableIncome',
  'grossPay',
  'npWorkerDeduction',
  'hiWorkerDeduction',
  'ltciWorkerDeduction',
  'eiWorkerDeduction',
  'incomeTaxDeduction',
  'localIncomeTaxDeduction',
  'dormDeduction',
  'mealDeduction',
  'otherDeduction',
  'totalDeduction',
  'netPay',
  'npEmployerBurden',
  'hiEmployerBurden',
  'ltciEmployerBurden',
  'eiEmployerBurden',
  'iacEmployerBurden',
  'totalEmployerBurden',
  'totalCompanyCost',
];

function verifyMatrixAndVouchers(stateObj, tagPrefix) {
  const empRows = stateObj.matrixRows.filter((r) => !r.isSubtotal && !r.isGrandTotal);
  const gt = stateObj.grandTotal;

  for (const field of SUM_FIELDS) {
    let empSum = 0;
    for (const r of empRows) empSum += Number(r[field] ?? 0);
    let entitySum = 0;
    for (const s of stateObj.entitySubtotals) entitySum += Number(s[field] ?? 0);
    let empTypeSum = 0;
    for (const s of stateObj.employmentSubtotals) empTypeSum += Number(s[field] ?? 0);
    const gtVal = gt ? Number(gt[field] ?? 0) : 0;
    const unit = field === 'headcount' ? '명' : '원';

    assertEqual(`${tagPrefix} 개인행 합산 vs 전사총계 [${field}]`, empSum, gtVal, unit);
    assertEqual(`${tagPrefix} 3개 법인 소계 합산 vs 전사총계 [${field}]`, entitySum, gtVal, unit);
    assertEqual(`${tagPrefix} 고용형태 소계 합산 vs 전사총계 [${field}]`, empTypeSum, gtVal, unit);
  }

  let horizontalMismatchCount = 0;
  for (const r of stateObj.matrixRows) {
    const expectedNet = r.grossPay - r.totalDeduction;
    const expectedCost =
      r.grossPay + r.totalEmployerBurden + r.teamLeaderKonaAllowance;
    if (r.netPay !== expectedNet || r.totalCompanyCost !== expectedCost) {
      horizontalMismatchCount += 1;
    }
  }
  assertEqual(
    `${tagPrefix} 전 행(개인·소계·총계) 가로 산식(Gross - Ded = Net, Gross + Burden + Kona = TotalCost) 불일치 건수`,
    horizontalMismatchCount,
    0,
    '건'
  );

  let calcDebit = 0;
  let calcCredit = 0;
  let expenseClass8Sum = 0;
  let negativeOrZeroVoucherLineCount = 0;
  for (const v of stateObj.vouchers) {
    if (v.amount <= 0) negativeOrZeroVoucherLineCount += 1;
    if (v.drCr === 'DEBIT') calcDebit += v.amount;
    else calcCredit += v.amount;
    if (String(v.accountCode).startsWith('8')) {
      expenseClass8Sum += v.drCr === 'DEBIT' ? v.amount : -v.amount;
    }
  }

  const gtTotalCompanyCost = gt ? gt.totalCompanyCost : 0;
  assertEqual(`${tagPrefix} 전표 차변(DEBIT) 실측 합계 vs voucherBalanceCheck.totalDebit`, calcDebit, stateObj.voucherBalanceCheck.totalDebit, '원');
  assertEqual(`${tagPrefix} 전표 대변(CREDIT) 실측 합계 vs voucherBalanceCheck.totalCredit`, calcCredit, stateObj.voucherBalanceCheck.totalCredit, '원');
  assertEqual(`${tagPrefix} 전표 차변 총계 vs 대변 총계 (대차차액 Δ)`, calcDebit, calcCredit, '원');
  assertEqual(`${tagPrefix} voucherBalanceCheck.varianceDelta`, stateObj.voucherBalanceCheck.varianceDelta, 0, '원');
  assertEqual(`${tagPrefix} voucherBalanceCheck.isBalanced`, stateObj.voucherBalanceCheck.isBalanced, true);
  assertEqual(`${tagPrefix} 비용계정(80100~81200) 전표 합계 vs 급여대장 전사 총인건비(totalCompanyCost)`, expenseClass8Sum, gtTotalCompanyCost, '원');
  assertEqual(`${tagPrefix} 전표 라인 중 0원 이하 비정상 금액 건수`, negativeOrZeroVoucherLineCount, 0, '건');
}

async function runVerification() {
  console.log('================================================================================');
  console.log('🔬 [BELLEFORET HR FULL-CODEBASE LOGIC & ZERO-VARIANCE VERIFICATION]');
  console.log('================================================================================');

  const targetYm = '2026-03';

  // ---------------------------------------------------------------------------
  // 1. 라이브 Firestore 월간 정산 엔진(runFirestorePayrollSettlement) 및 상태 조회(fetchAllHrState)
  // ---------------------------------------------------------------------------
  console.log(`\n[검증 1] 라이브 Firestore 월간 급여·전표 정산 엔진 실행 (귀속연월: ${targetYm})`);
  const settleRes = await hrService.runFirestorePayrollSettlement(targetYm);
  const state = await hrService.fetchAllHrState(targetYm);

  assertTrue(
    '3개 법인 마스터(BLACKSTONE, KMG, RAKSANSU) 로드',
    state.entities.length === 3,
    state.entities.map((e) => `${e.entityCode}(${e.entityName})`).join(', ')
  );
  assertTrue(
    '법정 요율 마스터(COL_RATES) 자동 부트스트랩 및 로드',
    state.rates.length > 0,
    `적용 시작월=${state.rates[0].effectiveYm}, 국민연금=${state.rates[0].npWorkerRate}, 건강보험=${state.rates[0].hiWorkerRate}`
  );
  assertEqual(
    '정산된 급여대장 인원수 일치',
    settleRes.settledCount,
    state.grandTotal ? state.grandTotal.headcount : 0,
    '명'
  );

  // ---------------------------------------------------------------------------
  // 2. 라이브 급여대장(Matrix) & 전표(Vouchers) 0-Variance (Δ=0원) 검증
  // ---------------------------------------------------------------------------
  console.log(`\n[검증 2] 라이브(${targetYm}) 급여대장 다차원 합계 및 회계전표 0-Variance (Δ = 0원) 검증`);
  verifyMatrixAndVouchers(state, `[라이브 ${targetYm}]`);

  // ---------------------------------------------------------------------------
  // 3. Phase 2 / Phase 3 / Phase 4 / Phase 5 요약 지표 교차 검증
  // ---------------------------------------------------------------------------
  console.log(`\n[검증 3] Phase 2~5 원천세 · 4대보험 · 식수/도급 · 근무표/연차 · 마감알림 교차 검증`);
  const p2 = state.phase2Summary;
  const p3 = state.phase3Summary;
  const p4 = state.phase4Summary;
  const p5 = state.phase5Summary;

  let bizGrossEntitySum = 0;
  for (const es of p2.entityTaxSummaries) {
    bizGrossEntitySum += es.bizIncomeGross;
  }
  let bizGrossRawSum = 0;
  for (const b of state.businessIncomes) {
    bizGrossRawSum += b.grossAmount;
  }
  assertEqual('Phase 2 법인별 사업소득 지급총액 합산 vs 원천 레코드 합산', bizGrossEntitySum, bizGrossRawSum, '원');

  let mealCostSum = 0;
  for (const m of state.mealDailyLogs) mealCostSum += m.totalMealCost;
  assertEqual('Phase 3 구내식당(웰스토리) 식대비 총액 교차 검증', p3.mealGrandTotalCost, mealCostSum, '원');

  let vendorInvoiceSum = 0;
  for (const vc of state.vendorContracts) vendorInvoiceSum += vc.totalInvoiceAmount;
  assertEqual('Phase 3 고정거래처 도급비 총액 교차 검증', p3.vendorTotalInvoice, vendorInvoiceSum, '원');

  let leaveGrantedSum = 0;
  let leaveUsedSum = 0;
  let leaveRemSum = 0;
  for (const l of state.leaveLedgers) {
    leaveGrantedSum += l.annualLeaveGranted;
    leaveUsedSum += l.annualLeaveUsed;
    leaveRemSum += l.annualLeaveRemaining;
  }
  assertEqual('Phase 4 연차 총발생일수 교차 검증', p4.totalAnnualLeaveGranted, leaveGrantedSum, '일');
  assertEqual('Phase 4 연차 총사용일수 교차 검증', p4.totalAnnualLeaveUsed, leaveUsedSum, '일');
  assertEqual('Phase 4 연차 잔여일수(발생-사용) 교차 검증', p4.totalAnnualLeaveRemaining, leaveRemSum, '일');
  assertEqual('Phase 5 법정·정기 마감 일정 알림(D-Day) 개수', p5.deadlineAlerts.length, 9, '건');

  // ---------------------------------------------------------------------------
  // 4. 격리된 샌드박스 연월(2099-12) 3개 법인 · 3대 고용형태 · 엣지케이스 E2E 실측 정산 검증
  // ---------------------------------------------------------------------------
  console.log(`\n[검증 4] 샌드박스(2099-12) 3개 법인 실측 정산 검증 (중도입사 일할계산 · 팀장코나 · 일용직세금/수당 · 실습생4대보험 · 세금환급 음수전표)`);
  const testYm = '2099-12';
  const testDeptId = 999901;
  const testEmp1Id = 999901; // 정규직 (2099-12-16 중도입사 16/31일 일할계산 + 팀장코나수당 100,000 + 연말정산 소득세환급 -150,000)
  const testEmp2Id = 999902; // 일용직 (일당 200,000원 * 2일 + 상여금 50,000 + 직책수당 30,000)
  const testEmp3Id = 999903; // 현장실습생 (월 2,000,000원 + 식대 100,000원, 4대보험 정상 가입 npExempt=0, hiExempt=0)
  const testAdj1Id = 99990101;
  const testAdj2Id = 99990102;
  const testAdj3Id = 99990103;

  try {
    await setDoc(doc(firestoreDb, 'hr_dim_departments', String(testDeptId)), {
      deptId: testDeptId,
      entityCode: 'BLACKSTONE',
      deptCode: 'TEST-VERIFY-99',
      deptName: '검증샌드박스팀',
      costCenterCode: 'CC-9999',
      isActive: 1,
    });

    await setDoc(doc(firestoreDb, 'hr_dim_employees', String(testEmp1Id)), {
      empId: testEmp1Id,
      empNo: 'TEST-9901',
      empName: '김검증(정규중도입사)',
      employmentType: 'REGULAR',
      entityCode: 'BLACKSTONE',
      deptId: testDeptId,
      positionTitle: '팀장',
      hireDate: '2099-12-16', // 31일 중 16일 재직
      resignDate: null,
      probationEndDate: '2100-03-15',
      baseMonthlyPay: 3100000, // 16/31 일할 = 정확히 1,600,000원
      mealAllowanceTaxFree: 200000, // 16/31 일할 = floor(200,000 * 16 / 31) = 103,225원
      carAllowanceTaxFree: 0,
      dailyOrHourlyWage: 0,
      isTeamLeader: 1,
      teamLeaderAllowance: 100000, // 팀장 코나카드 100,000원
      konaCardNo: '9490-0000-0000-9901',
      bankCode: '081',
      bankName: '하나은행',
      accountNo: '111-222-33333',
      accountHolder: '김검증',
      email: null,
      phone: null,
      dormitoryRoom: null,
      carNumber: null,
      npExempt: 0,
      hiExempt: 0,
      eiExempt: 0,
      disabilityGrade: 'NONE',
    });

    await setDoc(doc(firestoreDb, 'hr_dim_employees', String(testEmp2Id)), {
      empId: testEmp2Id,
      empNo: 'TEST-9902',
      empName: '이일용(일용직검증)',
      employmentType: 'DAILY',
      entityCode: 'KMG',
      deptId: testDeptId,
      positionTitle: '일용사원',
      hireDate: '2099-12-20',
      resignDate: null,
      probationEndDate: null,
      baseMonthlyPay: 0,
      mealAllowanceTaxFree: 0,
      carAllowanceTaxFree: 0,
      dailyOrHourlyWage: 200000,
      isTeamLeader: 0,
      teamLeaderAllowance: 0,
      konaCardNo: null,
      bankCode: '081',
      bankName: '하나은행',
      accountNo: '222-333-44444',
      accountHolder: '이일용',
      email: null,
      phone: null,
      dormitoryRoom: null,
      carNumber: null,
      npExempt: 1,
      hiExempt: 1,
      eiExempt: 0,
      disabilityGrade: 'NONE',
    });

    await setDoc(doc(firestoreDb, 'hr_dim_employees', String(testEmp3Id)), {
      empId: testEmp3Id,
      empNo: 'TEST-9903',
      empName: '박실습(실습생검증)',
      employmentType: 'INTERN',
      entityCode: 'RAKSANSU',
      deptId: testDeptId,
      positionTitle: '실습생',
      hireDate: '2099-12-01',
      resignDate: null,
      probationEndDate: null,
      baseMonthlyPay: 2000000,
      mealAllowanceTaxFree: 100000,
      carAllowanceTaxFree: 0,
      dailyOrHourlyWage: 0,
      isTeamLeader: 0,
      teamLeaderAllowance: 0,
      konaCardNo: null,
      bankCode: '081',
      bankName: '하나은행',
      accountNo: '333-444-55555',
      accountHolder: '박실습',
      email: null,
      phone: null,
      dormitoryRoom: null,
      carNumber: null,
      npExempt: 0,
      hiExempt: 0,
      eiExempt: 0,
      disabilityGrade: 'NONE',
    });

    // 일용직 2일 출근 (각 200,000원 -> 일일 비과세 150,000 제외 과세 50,000 * 6% * 45% = 1,350원 -> 10원절사 1,350원 * 2일 = 2,700원)
    await setDoc(doc(firestoreDb, 'hr_fact_daily_logs', `2099-12-21_${testEmp2Id}`), {
      logId: 99990201,
      targetYm: testYm,
      workDate: '2099-12-21',
      empId: testEmp2Id,
      empNo: 'TEST-9902',
      empName: '이일용(일용직검증)',
      entityCode: 'KMG',
      deptId: testDeptId,
      deptName: '검증샌드박스팀',
      workHours: 8,
      dailyGrossPay: 200000,
      approvalDocNo: 'VERIFY-DAILY-1',
      notes: '검증용 1일차',
    });
    await setDoc(doc(firestoreDb, 'hr_fact_daily_logs', `2099-12-22_${testEmp2Id}`), {
      logId: 99990202,
      targetYm: testYm,
      workDate: '2099-12-22',
      empId: testEmp2Id,
      empNo: 'TEST-9902',
      empName: '이일용(일용직검증)',
      entityCode: 'KMG',
      deptId: testDeptId,
      deptName: '검증샌드박스팀',
      workHours: 8,
      dailyGrossPay: 200000,
      approvalDocNo: 'VERIFY-DAILY-2',
      notes: '검증용 2일차',
    });

    // 김검증: 연말정산 소득세 환급(-150,000원) -> 지방소득세 -15,000원 자동 연동 및 음수 예수금 차대변 반전 검증
    await setDoc(doc(firestoreDb, 'hr_fact_adjustments', String(testAdj1Id)), {
      adjId: testAdj1Id,
      targetYm: testYm,
      empId: testEmp1Id,
      empNo: 'TEST-9901',
      empName: '김검증(정규중도입사)',
      entityCode: 'BLACKSTONE',
      deptName: '검증샌드박스팀',
      category: 'INCOME_TAX_OVERRIDE',
      amount: -150000,
      approvalDocNo: 'VERIFY-ADJ-1',
      notes: '연말정산 환급 검증',
    });

    // 이일용: 일용직 상여금(50,000원) + 직책수당(30,000원) 누락 없이 합산되는지 검증
    await setDoc(doc(firestoreDb, 'hr_fact_adjustments', String(testAdj2Id)), {
      adjId: testAdj2Id,
      targetYm: testYm,
      empId: testEmp2Id,
      empNo: 'TEST-9902',
      empName: '이일용(일용직검증)',
      entityCode: 'KMG',
      deptName: '검증샌드박스팀',
      category: 'BONUS',
      amount: 50000,
      approvalDocNo: 'VERIFY-ADJ-2',
      notes: '일용직 상여금 검증',
    });
    await setDoc(doc(firestoreDb, 'hr_fact_adjustments', String(testAdj3Id)), {
      adjId: testAdj3Id,
      targetYm: testYm,
      empId: testEmp2Id,
      empNo: 'TEST-9902',
      empName: '이일용(일용직검증)',
      entityCode: 'KMG',
      deptName: '검증샌드박스팀',
      category: 'POSITION_ALLOWANCE',
      amount: 30000,
      approvalDocNo: 'VERIFY-ADJ-3',
      notes: '일용직 직책수당 검증',
    });

    await hrService.runFirestorePayrollSettlement(testYm);
    const sbState = await hrService.fetchAllHrState(testYm);

    const rowEmp1 = sbState.matrixRows.find((r) => r.empId === testEmp1Id);
    const rowEmp2 = sbState.matrixRows.find((r) => r.empId === testEmp2Id);
    const rowEmp3 = sbState.matrixRows.find((r) => r.empId === testEmp3Id);

    // 4-1. 정규직 중도입사(16/31일) 일할계산 + 세금환급(-150,000원 / 지방세 -15,000원) + 코나카드(100,000원)
    assertEqual('김검증(정규중도입사) 일할계산 기본급(3,100,000 * 16/31)', rowEmp1.basePay, 1600000, '원');
    assertEqual('김검증(정규중도입사) 일할계산 비과세식대(floor(200,000 * 16/31))', rowEmp1.mealAllowanceTaxFree, 103225, '원');
    assertEqual('김검증(정규중도입사) 소득세 환급 반영', rowEmp1.incomeTaxDeduction, -150000, '원');
    assertEqual('김검증(정규중도입사) 지방소득세 10% 자동 환급 반영', rowEmp1.localIncomeTaxDeduction, -15000, '원');
    assertEqual('김검증(정규중도입사) 팀장 코나카드 복지수당 반영', rowEmp1.teamLeaderKonaAllowance, 100000, '원');

    // 4-2. 일용직 일당(400,000) + 상여금(50,000) + 직책수당(30,000) = 480,000원 & isProrated=0
    assertEqual('이일용(일용직) isProrated 오탐 방지(0)', rowEmp2.isProrated, 0);
    assertEqual('이일용(일용직) 출근일수(payableDays)', rowEmp2.payableDays, 2, '일');
    assertEqual('이일용(일용직) 과세급여(일당40만+상여5만+직책3만)', rowEmp2.taxableIncome, 480000, '원');
    assertEqual('이일용(일용직) 세전총급여(grossPay)', rowEmp2.grossPay, 480000, '원');
    assertEqual('이일용(일용직) 일용근로소득세(1,350원 * 2일)', rowEmp2.incomeTaxDeduction, 2700, '원');
    assertEqual('이일용(일용직) 지방소득세(270원)', rowEmp2.localIncomeTaxDeduction, 270, '원');

    // 4-3. 현장실습생(INTERN) 4대보험(국민연금·건강보험) 정상 산출 확인
    assertEqual('박실습(실습생) 국민연금 근로자부담금(2,000,000 * 4.5%)', rowEmp3.npWorkerDeduction, 90000, '원');
    assertEqual('박실습(실습생) 건강보험 근로자부담금(2,000,000 * 3.545% 원단위절사)', rowEmp3.hiWorkerDeduction, 70900, '원');

    // 4-4. 샌드박스(2099-12) 31개 전 컬럼 다차원 합계(개인 vs 법인소계 vs 고용형태소계 vs 전사총계) 및 전표 대차평균(Δ=0원) 검증
    verifyMatrixAndVouchers(sbState, `[샌드박스 ${testYm}]`);
  } finally {
    // 샌드박스(2099-12) 테스트 데이터 완전 삭제 (라이브 DB 무오염 복원)
    await deleteDoc(doc(firestoreDb, 'hr_dim_departments', String(testDeptId)));
    await deleteDoc(doc(firestoreDb, 'hr_dim_employees', String(testEmp1Id)));
    await deleteDoc(doc(firestoreDb, 'hr_dim_employees', String(testEmp2Id)));
    await deleteDoc(doc(firestoreDb, 'hr_dim_employees', String(testEmp3Id)));
    await deleteDoc(doc(firestoreDb, 'hr_fact_daily_logs', `2099-12-21_${testEmp2Id}`));
    await deleteDoc(doc(firestoreDb, 'hr_fact_daily_logs', `2099-12-22_${testEmp2Id}`));
    await deleteDoc(doc(firestoreDb, 'hr_fact_adjustments', String(testAdj1Id)));
    await deleteDoc(doc(firestoreDb, 'hr_fact_adjustments', String(testAdj2Id)));
    await deleteDoc(doc(firestoreDb, 'hr_fact_adjustments', String(testAdj3Id)));
    await deleteDoc(doc(firestoreDb, 'hr_mat_payroll_summaries', testYm));
  }

  // ---------------------------------------------------------------------------
  // 5. 백엔드 & 프론트엔드 1차(42건) + 2차 심층 감사(16건) 총 58대 핵심 코드 수정 사항 정적 검증
  // ---------------------------------------------------------------------------
  console.log(`\n[검증 5] 백엔드 & 프론트엔드 1차(42건) + 2차 심층 감사(16건) 총 58대 로직 수정 코드베이스 검증`);
  const hrServiceSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/firebase/hrFirestoreService.ts'),
    'utf8'
  );
  const pageSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/page.tsx'), 'utf8');

  assertTrue(
    'ensureBaseStatutoryRates 자동 부트스트랩 로직 적용 확인',
    hrServiceSrc.includes('export async function ensureBaseStatutoryRates()')
  );
  assertTrue(
    'truncateOnesDigit 및 일용직 세액 산출 부동소수점 언더플로(1e-7) 방어 적용 확인',
    hrServiceSrc.includes('Math.floor((amount + 1e-7) / 10) * 10')
  );
  assertTrue(
    'pushVoucher 음수 차대변 반전 로직 적용 확인',
    hrServiceSrc.includes("const effectiveDrCr: 'DEBIT' | 'CREDIT' =") &&
      hrServiceSrc.includes('Math.abs(amount)')
  );
  assertTrue(
    '팀장 코나카드 전표(81200 / 25302) 분개 로직 적용 확인',
    hrServiceSrc.includes("'81200'") && hrServiceSrc.includes("'25302'")
  );
  assertTrue(
    '일용직(DAILY) 직책수당·상여금 합산 및 isProrated=0 분리 확인',
    /taxableIncome\s*=\s*dailyTotalGross\s*\+\s*positionAllowance\s*\+\s*overtimePay\s*\+\s*bonusPay/.test(
      hrServiceSrc
    ) && hrServiceSrc.includes('`일용근무(${dailyWorkDays}일)`')
  );
  assertTrue(
    '소득세 환급(incomeTaxDeduction < 0) 시 지방소득세 10% 환급 연동 확인',
    /-truncateOnesDigit\(\s*Math\.abs\(incomeTaxDeduction\)\s*\*\s*applicableRate\.localIncomeTaxRate\s*\)/.test(
      hrServiceSrc
    )
  );
  assertTrue(
    'parseSafeNumber 콤마·통화기호 안전 파서 export 및 프론트엔드/백엔드 공용 적용 확인',
    hrServiceSrc.includes('export function parseSafeNumber(') &&
      pageSrc.includes('parseSafeNumber,')
  );
  assertTrue(
    'nextUniqueTimeId 단조 증가 고유 ID 생성기 적용으로 밀리초 루프 ID 충돌 원천 차단 확인',
    hrServiceSrc.includes('function nextUniqueTimeId(): number')
  );
  assertTrue(
    '일용직(DAILY) 무출근 월이라도 기숙사비·식대·기타공제·소득세조정이 있으면 정산 누락 방지 확인',
    hrServiceSrc.includes('dormDeduction === 0 &&') &&
      hrServiceSrc.includes('mealDeduction === 0 &&') &&
      hrServiceSrc.includes('!hasTaxOverride')
  );
  assertTrue(
    '글로벌 기본값 일괄 적용(applyGlobalDefaultsToAllEmployeesInFirestore) 시 차량 미보유자 비과세 차량유지비 0원 방어 확인',
    hrServiceSrc.includes('const eligibleCarTaxFree = hasCar ? cfg.defaultCarAllowanceTaxFree : 0;')
  );
  assertTrue(
    '수습 3개월 만료 대상(probationTargets) 산출 및 직원 저장 시 일용직(DAILY)·캐디(CADDY) 제외 확인',
    hrServiceSrc.includes("e.employmentType !== 'DAILY'") &&
      hrServiceSrc.includes("e.employmentType !== 'CADDY'")
  );
  assertTrue(
    'KMG 지출내역 엑셀 다운로드(kmg-expenditure) 및 요약 16열 뷰에서 KMG 소계행 기본급+일용급 합산 일치 확인',
    hrServiceSrc.includes('기본급_일용급: r.basePay + r.dailyTotalGross') &&
      pageSrc.includes('formatNumber(r.basePay + r.dailyTotalGross)')
  );
  assertTrue(
    '중도입퇴사 일할계산·캐디 경비공제·퇴직금 평균임금·장애인 의무고용인원 산출 시 + 1e-7 부동소수점 절사 오차 방어 확인',
    hrServiceSrc.includes('(emp.baseMonthlyPay * payableDays) / daysInMonth + 1e-7') &&
      hrServiceSrc.includes('gross * expenseRate + 1e-7') &&
      hrServiceSrc.includes('eligibleRegularEmployeeCount * mandatoryRate + 1e-7')
  );
  assertTrue(
    '셀프 입사포털(submitSelfOnboardingInFirestore) 고용형태별 기본급/일당·비과세·4대보험 예외·연차대장 분기 확인',
    hrServiceSrc.includes('carAllowanceTaxFree: isRegularLike && hasCar ? cfg.defaultCarAllowanceTaxFree : 0') &&
      hrServiceSrc.includes('npExempt: isDaily || isCaddy ? 1 : 0')
  );
  assertTrue(
    '법정요율 저장(handleSaveRates) 시 빈 입력칸이 캐디 경비율·주민세 면세점·장애인 부담금 등 8대 특수요율을 0으로 덮어쓰지 않도록 보호',
    pageSrc.includes('const rateVal = (raw: string | undefined, fallback: number): number =>') &&
      pageSrc.includes('baseRate?.residentTaxExemptionLimit ?? 150000000')
  );
  assertTrue(
    '개별 절세쪼개기(handleSplitSingleEmpRowTaxFree) 및 [상세수정] 클릭 시 인라인 편집값(rowEdit) 유실 방지 확인',
    pageSrc.includes('const effectiveCarNo =') &&
      pageSrc.includes('baseMonthlyPay: rowEdit.baseMonthlyPay ?? String(e.baseMonthlyPay)')
  );
  assertTrue(
    'COL_DAILY_LOGS 및 COL_PROVISIONING 복합 문서키(${workDate}_${empId}, ${targetYm}_${empId}) 통일 확인',
    hrServiceSrc.includes('`${input.workDate}_${emp.empId}`') &&
      hrServiceSrc.includes('doc(firestoreDb, COL_PROVISIONING, `${targetYm}_${empId}`)')
  );
  assertTrue(
    '초기 zeroTouchSubView 상태가 COLLECTOR_AUDIT으로 설정되어 1-1 화면 다중 중첩 렌더링 방지',
    /const\s*\[zeroTouchSubView,\s*setZeroTouchSubView\]\s*=\s*useState<[\s\S]*?>\('COLLECTOR_AUDIT'\)/.test(
      pageSrc
    )
  );
  assertTrue(
    'navigateToWorkspace에서 portalViewMode, isSelfOnboardStandaloneView, showIndividualAddForm 초기화 보장',
    pageSrc.includes("setPortalViewMode('ADMIN_HQ')") &&
      pageSrc.includes('setIsSelfOnboardStandaloneView(false)') &&
      pageSrc.includes('setShowIndividualAddForm(false)')
  );
  assertTrue(
    'ESSENTIAL_5(핵심 5단계) 모드에서 이전/다음 단계 네비게이션이 navigableStepPages를 기준으로 동작',
    pageSrc.includes('const navigableStepPages =') &&
      pageSrc.includes('navigableStepPages[currentNavigableIndex - 1]') &&
      pageSrc.includes('navigableStepPages[currentNavigableIndex + 1]')
  );
  assertTrue(
    'scrollToIndividualWorkArea가 [data-individual-form-anchor="true"]로 정확히 스크롤',
    pageSrc.includes("'[data-individual-form-anchor=\"true\"]'")
  );
  assertTrue(
    '부서장 포털(DEPT_PORTAL) 주간업무보고서 금주 실적(thisWeekAchievements) / 차주 계획(nextWeekPlans) 분리',
    pageSrc.includes('value={weeklyReportForm.thisWeekAchievements}') &&
      pageSrc.includes('value={weeklyReportForm.nextWeekPlans}')
  );
  assertTrue(
    '임직원 등록/수정 시 차량 미보유자 비과세 차량유지비 0원 처리 및 법인-부서 동기화',
    pageSrc.includes("const hasCar = empForm.carNumber.trim() !== '';") &&
      pageSrc.includes('.filter((d) => d.entityCode === empForm.entityCode)')
  );
  assertTrue(
    '5-1 온보딩 6단계 및 5-4 5대 법정의무교육 완료 체크마크(✓) 및 화살표(→) 정상 표출',
    pageSrc.includes("{p.amaranthErpRegistered ? '✓' : '⏳'}") &&
      pageSrc.includes("{mt.sexualHarassmentDone ? '✓' : '⬜'}") &&
      pageSrc.includes('입사: {p.hireDate} → 3개월 만료: {p.probationEndDate}')
  );

  console.log('\n================================================================================');
  console.log(`📊 [최종 검증 결과 요약] 총 ${passCount + failCount}개 항목 검증 | PASS: ${passCount}건 | FAIL: ${failCount}건`);
  console.log('================================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('❌ 검증 스크립트 실행 오류:', err);
  process.exit(1);
});
