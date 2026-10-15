# 벨포레 인사·급여·회계 시스템 절대 무결성 수칙 (Workspace Rules — SSOT)

## 🚨 1. 암묵적 최우선 전제 지시어 ( 전수 로직 감사 및 실측 검증 명령 )
이 워크스페이스(`e:\앱\인사`)의 모든 작업에는 항상 다음 지시어가 최우선 적용된다:

> **[전수 로직 감사 및 실측 검증 명령]**
> 단순히 코드를 눈으로 읽고 "문제없다"고 거짓 보고하는 것을 전면 금지한다.
> 1. 백엔드(`src/lib/firebase/hrFirestoreService.ts`)와 프론트엔드(`src/app/page.tsx`)의 모든 정산 수식, 전표 분개, 엑셀 입출력, 인라인 수정/삭제, 문서 ID 정합성, UI 네비게이션 상태를 전수 조사하라.
> 2. 중도입사/퇴사 일할계산, 일용직 비과세·세액공제·추가수당, 실습생 4대보험, 팀장 코나카드 전표, 연말정산 음수 환급 전표 등 엣지케이스를 `scripts/verify-phase1-engine.cjs` 샌드박스로 실제 돌려서 1원 단위 델타(`Δ = 0원`)를 검증하라.
> 3. `npm run test-engine`과 `npm run build`를 통과한 실제 터미널 `Stdout` 로그만 증거로 보고하라.

---

## ⚖️ 2. 회계·급여 복식부기 및 다차원 합계 불변식 (0-Variance Invariants)

1. **급여대장(Payroll Matrix) 가로 산식 불변식 (`Δ = 0원`)**:
   - 모든 행(개인행 · 3개 법인 소계 · 고용형태별 소계 · 전사 총계)에서 다음 두 등식이 1원 오차 없이 성립해야 한다:
     - `grossPay - totalDeduction === netPay` (`세전총급여 - 공제합계 = 실지급액`)
     - `grossPay + totalEmployerBurden + teamLeaderKonaAllowance === totalCompanyCost` (`세전총급여 + 4대보험사업주부담 + 팀장코나수당 = 총인건비`)
2. **급여대장 31개 전 컬럼 세로 다차원 합산 불변식 (`Δ = 0원`)**:
   - `headcount`, `basePay`, `positionAllowance`, `overtimePay`, `bonusPay`, `specialAllowance`, `otherTaxableAllowance`, `mealAllowanceTaxFree`, `carAllowanceTaxFree`, `teamLeaderKonaAllowance`, `taxableIncome`, `nonTaxableIncome`, `grossPay`, `npWorkerDeduction`, `hiWorkerDeduction`, `ltciWorkerDeduction`, `eiWorkerDeduction`, `incomeTaxDeduction`, `localIncomeTaxDeduction`, `dormDeduction`, `mealDeduction`, `otherDeduction`, `totalDeduction`, `netPay`, `npEmployerBurden`, `hiEmployerBurden`, `ltciEmployerBurden`, `eiEmployerBurden`, `iacEmployerBurden`, `totalEmployerBurden`, `totalCompanyCost` 31개 전 필드에서:
     - `개인행 합산 === 3개 법인 소계 합산 === 고용형태 소계 합산 === 전사 총계(grandTotal)` (`Δ = 0원`)
3. **더존 아마란스 회계전표(Vouchers) 대차평균 불변식 (`Δ = 0원`)**:
   - `totalDebit === totalCredit` (`voucherBalanceCheck.varianceDelta === 0`, `isBalanced === true`)
   - 연말정산 세금 환급(`withholdingTax < 0`) 또는 초과 공제(`netPayable < 0`) 등 음수 버킷 발생 시, 전표 라인을 누락시키지 말고 반드시 차변(`DEBIT`) ↔ 대변(`CREDIT`)을 반전시키고 `Math.abs(amount)`로 분개하여 대차평균을 유지한다.
   - 팀장 코나카드 복지수당(`teamLeaderKonaAllowance`)은 반드시 차변 `81200 복리후생비(팀장코나카드)` / 대변 `25302 미지급비용(코나카드충전액)`으로 분개하여 8xxxx 비용계정 전표 합계가 `grandTotal.totalCompanyCost`와 1원 단위까지 일치하도록 한다.

---

## 🔢 3. 세법·4대보험·부동소수점·파서 무결성 수칙

1. **IEEE-754 부동소수점 언더플로 방어 (`+ 1e-7`)**:
   - 원단위 절사(`truncateOnesDigit`) 및 일용직 근로소득세(`dayTaxable * dailyBaseTaxRate * (1 - dailyTaxCreditRate)`) 등 모든 소수점 요율 곱셈 후 `Math.floor` 시 `+ 1e-7`을 적용하여 `1349.9999999999998`이 `1349`로 절사되는 부동소수점 오차를 원천 차단한다.
2. **일용직(`DAILY`) 및 현장실습생(`INTERN`) 정산 규칙**:
   - 일용직(`DAILY`)은 `isProrated = 0`, `payableDays = dailyWorkDays`로 고정하며, 일당 외 추가수당(`positionAllowance`, `overtimePay`, `bonusPay`, `specialAllowance`, `otherTaxableAllowance`)이 누락 없이 `taxableIncome`, `grossPay`, 전표에 합산되어야 한다.
   - 현장실습생(`INTERN`)도 `npExempt === 0`, `hiExempt === 0`이고 `taxableIncome > 0`이면 국민연금·건강보험·장기요양보험을 정상 산출한다.
   - 소득세 환급(`incomeTaxDeduction < 0`) 발생 시 지방소득세(`localIncomeTaxDeduction`)도 동일하게 `-truncateOnesDigit(Math.abs(incomeTaxDeduction) * localIncomeTaxRate)`로 음수(환급) 산출한다.
3. **콤마·통화기호 안전 파서 (`parseSafeNumber`)**:
   - 엑셀 일괄 업로드, 수당/공제 입력, HITL 매핑 승인 시 `Number(val)` 직접 호출을 금지하고 반드시 `parseSafeNumber`를 통해 콤마(`,`), 통화기호(`원`), 공백을 제거하여 `NaN` 오염을 차단한다.

---

## 🔗 4. Firestore 문서키 · 자동 부트스트랩 · 연쇄 정산 수칙

1. **법정 마스터 자동 부트스트랩**:
   - `ensureBaseLegalEntities()`(3개 법인)와 `ensureBaseStatutoryRates()`(표준 법정요율 24개 항목)를 통해 초기 상태에서도 정산 엔진이 중단 없이 동작해야 한다.
2. **복합 문서키 및 채번 규칙 통일**:
   - `COL_DAILY_LOGS` 문서 ID: `${workDate}_${empId}` (인라인 수정/삭제 시 `logId` 역추적 지원)
   - `COL_PROVISIONING` 문서 ID: `${targetYm}_${empId}`
   - 신규 ID 채번 시 `snap.size + 1` 사용을 금지하고 반드시 기존 최대 ID 기준 `maxId + 1`을 사용한다.
3. **데이터 변경 시 자동 재정산(`tryAutoRunPayrollSettlement`)**:
   - 임직원 등록/수정, 보수월액 변경, 일용직 출근기록, 수당/공제, 퇴직금 정산 시 반드시 활성 귀속연월(`targetYm`)에 대해 `tryAutoRunPayrollSettlement(targetYm)`가 실행되어야 한다.

---

## 🖥️ 5. 프론트엔드 UI 상태 및 검증 의무

1. **프랑켄슈타인 가드 (`scripts/integrity-check.cjs`) 엄수**:
   - `.reduce(` 사용 금지 (`for...of` 루프 사용), 숫자 폴백 `|| 숫자` 금지 (`??` 사용), JSX 내 하드코딩 금액 문자열 금지.
2. **화면/포털 전환 초기화 및 데이터 표 상시 노출**:
   - `zeroTouchSubView` 초기값은 `'COLLECTOR_AUDIT'`으로 유지하여 `1-1` 진입 시 다중 서브뷰 중첩 렌더링을 방지한다.
   - `navigateToWorkspace` 및 단계 이동 시 `portalViewMode = 'ADMIN_HQ'`, `isSelfOnboardStandaloneView = false`, `showIndividualAddForm = false`로 초기화한다.
   - 데이터 조회 테이블(Table)은 `showIndividualAddForm`(개별 입력폼 토글) 블록 바깥에 배치하여 언제나 즉시 보이도록 유지한다.
3. **완료 보고 전 필수 실행 명령**:
   - 모든 코드 수정 후 반드시 아래 두 명령을 실제 실행하고 터미널 `Stdout`을 확인한 뒤 보고한다:
     - `npm run test-engine` (`node scripts/verify-phase1-engine.cjs` — 240개 항목 `FAIL: 0건`)
     - `npm run build` (`node scripts/integrity-check.cjs && next build` — 무결성 가드 및 TypeScript 빌드 통과)
