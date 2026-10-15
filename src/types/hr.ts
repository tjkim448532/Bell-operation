export type EntityCode = 'BLACKSTONE' | 'KMG' | 'RAKSANSU';

export type EmploymentType = 'REGULAR' | 'CONTRACT' | 'DAILY' | 'INTERN' | 'CADDY';

export type AdjustmentCategory =
  | 'OVERTIME_PAY'        // 연장/야간/휴일수당 (R25)
  | 'BONUS'               // 상여금 (R27)
  | 'SPECIAL_ALLOWANCE'   // 특별수당 (R27)
  | 'POSITION_ALLOWANCE'  // 직책/보직수당 (R28)
  | 'OTHER_TAXABLE'       // 기타과세수당 (R25)
  | 'DORM_DEDUCTION'      // 기숙사비 공제 (R25)
  | 'MEAL_DEDUCTION'      // 식대 공제 (R25)
  | 'OTHER_DEDUCTION'     // 기타공제 (R25)
  | 'INCOME_TAX_OVERRIDE' // 소득세 정산/수동반영 (R25/R34)
  ;

export interface LegalEntityItem {
  entityCode: EntityCode;
  entityName: string;
  bizRegNo: string;
  repName: string;
  createdAt: string;
}

export interface DepartmentItem {
  deptId: number;
  entityCode: EntityCode;
  deptCode: string;
  deptName: string;
  costCenterCode: string;
  isActive: number;
}

export interface StatutoryRateConfig {
  effectiveYm: string; // YYYY-MM
  npWorkerRate: number;        // 국민연금 근로자 요율
  npEmployerRate: number;      // 국민연금 사업주 요율
  npMinMonthlyIncome: number;  // 국민연금 하한 기준소득월액
  npMaxMonthlyIncome: number;  // 국민연금 상한 기준소득월액
  hiWorkerRate: number;        // 건강보험 근로자 요율
  hiEmployerRate: number;      // 건강보험 사업주 요율
  ltciRateOfHi: number;        // 장기요양보험율 (건강보험료 대비 비율)
  eiWorkerRate: number;        // 고용보험 근로자 실업급여 요율
  eiEmployerRate: number;      // 고용보험 사업주 요율
  iacEmployerRate: number;     // 산재보험 사업주 요율
  dailyTaxFreeLimit: number;   // 일용직 일일 비과세 한도액
  dailyTaxCreditRate: number;  // 일용직 근로소득세액공제율
  dailyBaseTaxRate: number;    // 일용직 원천징수 기본세율
  dailyMinTaxThreshold: number;// 일용직 소액부징수 기준액
  localIncomeTaxRate: number;  // 지방소득세율 (소득세 대비 비율)
  stdIncomeTaxRate: number;    // 일반 근로소득 기준 세율
  // Phase 2 추가 법정 기준 (캐디 경비율, 주민세 종업원분, 장애인고용부담금, 사업소득세율)
  caddyExpenseRate?: number;          // 캐디 산재보험 경비율 (Row 45, 예: 0.273 등 고시 경비율)
  caddyEiWorkerRate?: number;         // 캐디 고용보험 근로자 요율 (Row 12)
  caddyEiEmployerRate?: number;       // 캐디 고용보험 사업주 요율 (Row 12)
  residentTaxRate?: number;           // 주민세 종업원분 세율 (Row 48, 예: 0.005)
  residentTaxExemptionLimit?: number; // 주민세 종업원분 월평균 급여 면세점 기준액 (Row 48)
  businessIncomeTaxRate?: number;     // 3.3% 사업소득 원천징수 기본세율 (Row 49, 예: 0.03)
  disabledMandatoryRate?: number;     // 장애인 의무고용률 (Row 52, 예: 0.031)
  disabledBaseBurdenMonthly?: number; // 장애인 고용부담금 월 부담기초액 (Row 52)
  updatedAt: string;
}

export interface EmployeeMasterItem {
  empId: number;
  empNo: string;
  empName: string;
  employmentType: EmploymentType;
  entityCode: EntityCode;
  entityName?: string;
  deptId: number;
  deptName?: string;
  costCenterCode?: string;
  positionTitle: string;
  hireDate: string;          // YYYY-MM-DD
  resignDate: string | null; // YYYY-MM-DD or null
  probationEndDate: string | null; // 입사 3개월 도래일 (R11)
  baseMonthlyPay: number;    // 월 기본급/보수월액 (정규/계약/실습생)
  mealAllowanceTaxFree: number; // 비과세 식대
  carAllowanceTaxFree: number;  // 비과세 자가운전보조금
  dailyOrHourlyWage: number;    // 일용직 일당 또는 시급
  isTeamLeader: number;         // 팀장 보직수당 대상 여부 (0 | 1)
  teamLeaderAllowance: number;  // 팀장 보직수당 (R28)
  konaCardNo: string | null;    // 코나카드 사원증 번호 (R29)
  bankCode: string | null;
  bankName: string | null;
  accountNo: string | null;
  accountHolder: string | null;
  email: string | null;
  phone: string | null;
  dormitoryRoom: string | null; // 기숙사 호실 (R10 지원팀 유창우 팀장 전달용)
  carNumber: string | null;     // 임직원 차량번호 (R39)
  npExempt: number;
  hiExempt: number;
  eiExempt: number;
  // Phase 2 장애인 고용부담금(Row 52) 산출용
  disabilityGrade?: 'NONE' | 'MILD' | 'SEVERE'; // 비장애, 경증(1배수), 중증(2배수)
}

export interface DailyWorkerLogItem {
  logId: number;
  targetYm: string;
  workDate: string;
  empId: number;
  empNo: string;
  empName: string;
  entityCode: EntityCode;
  deptId: number;
  deptName: string;
  workHours: number;
  dailyGrossPay: number;
  approvalDocNo: string | null;
  notes: string | null;
}

export interface PayrollAdjustmentItem {
  adjId: number;
  targetYm: string;
  empId: number;
  empNo: string;
  empName: string;
  entityCode: EntityCode;
  deptName: string;
  category: AdjustmentCategory;
  amount: number;
  approvalDocNo: string | null;
  notes: string | null;
}

export interface MappingCandidateItem {
  candidateId: number;
  sourceType: 'EMPLOYEE_NAME' | 'DEPARTMENT_NAME' | 'ADJUSTMENT_CATEGORY';
  rawText: string;
  contextJson: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  mappedTargetId: string | null;
  createdAt: string;
}

export interface PayrollLedgerRow {
  rowId: string;
  isSubtotal: boolean;
  isGrandTotal: boolean;
  subtotalType: 'NONE' | 'ENTITY' | 'EMPLOYMENT_TYPE' | 'GRAND_TOTAL';
  targetYm: string;
  entityCode: EntityCode | 'ALL';
  entityName: string;
  deptId: number | null;
  deptName: string;
  costCenterCode: string;
  empId: number | null;
  empNo: string;
  empName: string;
  employmentType: EmploymentType | 'ALL';
  employmentTypeName: string;
  positionTitle: string;
  hireDate: string | null;
  resignDate: string | null;
  calendarDaysInMonth: number;
  payableDays: number;
  isProrated: number;
  prorateFormulaDesc: string;
  basePay: number;
  mealAllowanceTaxFree: number;
  carAllowanceTaxFree: number;
  positionAllowance: number;
  overtimePay: number;
  bonusPay: number;
  specialAllowance: number;
  otherTaxableAllowance: number;
  dailyWorkDays: number;
  dailyTotalGross: number;
  taxableIncome: number;
  nonTaxableIncome: number;
  grossPay: number;
  npWorkerDeduction: number;
  hiWorkerDeduction: number;
  ltciWorkerDeduction: number;
  eiWorkerDeduction: number;
  incomeTaxDeduction: number;
  localIncomeTaxDeduction: number;
  dormDeduction: number;
  mealDeduction: number;
  otherDeduction: number;
  totalDeduction: number;
  netPay: number;
  npEmployerBurden: number;
  hiEmployerBurden: number;
  ltciEmployerBurden: number;
  eiEmployerBurden: number;
  iacEmployerBurden: number;
  totalEmployerBurden: number;
  totalCompanyCost: number;
  teamLeaderKonaAllowance: number;
  prevGrossPay: number | null;
  deltaGrossPay: number | null;
  deltaRatePct: number | null;
  auditFlag: string;
  auditReason: string;
  headcount: number;
}

export interface CostAllocationVoucherRow {
  voucherId: number;
  targetYm: string;
  entityCode: EntityCode;
  entityName: string;
  deptId: number;
  deptName: string;
  costCenterCode: string;
  accountCode: string;
  accountName: string;
  drCr: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
}

export interface ProbationTargetItem {
  empId: number;
  empNo: string;
  empName: string;
  entityName: string;
  deptName: string;
  hireDate: string;
  probationEndDate: string;
  daysRemaining: number;
  step1AccommodationDraft: string;
  step2FreeStayDraft: string;
}

export interface DormitoryResigneeItem {
  empId: number;
  empNo: string;
  empName: string;
  entityName: string;
  deptName: string;
  resignDate: string;
  dormitoryRoom: string;
  dispatchPeriod: 'FIRST_HALF_15TH' | 'SECOND_HALF_EOM';
}

// ============================================================
// Phase 2 추가 인터페이스: 캐디 신고, 보수월액 변경, 사업소득, 퇴직금, 세무신고 마트
// ============================================================

export interface CaddyMonthlyRecordItem {
  recordId: number;
  targetYm: string;
  empId: number;
  empNo: string;
  caddyName: string;
  entityCode: EntityCode;
  roundCount: number;            // 당월 라운딩 횟수
  totalCaddyFeeIncome: number;   // 경기과 집계 캐디피 총수입금액 (Row 44 과세자료 신고용)
  expenseRateApplied: number;    // 적용 경비율 (Row 45)
  expenseDeductionAmount: number;// 경비 공제액
  reportedMonthlyRemuneration: number; // 경비율 제외 산재보험 신고 월보수액 (Row 45)
  eiWorkerDeduction: number;     // 캐디 고용보험료 근로자부담 (Row 12)
  eiEmployerBurden: number;      // 캐디 고용보험료 사업주부담 (Row 12)
  iacEmployerBurden: number;     // 캐디 산재보험료 사업주부담 (Row 45)
  hireOrLeaveStatus: 'ACTIVE' | 'NEW_ACQUIRE' | 'LOSS_LEAVE'; // 입·이직 신고 구분 (Row 12)
  eventDate: string | null;
  notes: string | null;
}

export interface SalaryChangeNoticeItem {
  changeId: number;
  targetYm: string;
  changeDate: string;
  empId: number;
  empNo: string;
  empName: string;
  entityCode: EntityCode;
  deptName: string;
  previousMonthlyPay: number;
  newMonthlyPay: number;
  deltaPay: number;
  changeReason: string;
}

export interface BusinessIncomeRecordItem {
  bizIncomeId: number;
  targetYm: string;
  paymentDate: string;
  entityCode: EntityCode;
  earnerName: string;
  earnerRegNoMasked: string;
  incomeTypeName: string; // 예: 강사료, 자문료, 프리랜서 용역
  grossAmount: number;
  incomeTaxWithheld: number;
  localTaxWithheld: number;
  netPaidAmount: number;
}

export interface SeveranceSettlementItem {
  severanceId: number;
  targetYm: string;
  empId: number;
  empNo: string;
  empName: string;
  entityCode: EntityCode;
  entityName: string;
  deptName: string;
  hireDate: string;
  resignDate: string;
  paymentDeadlineDate: string; // 퇴직 후 14일 이내 기한 (Row 42)
  serviceDays: number;         // 총 재직일수
  last3MonthsTotalDays: number;// 퇴직 전 3개월 실제 달력일수 (89~92일 동적 계산)
  last3MonthsWages: number;    // 퇴직 전 3개월 임금 총액
  annualBonusTotal: number;    // 연간 상여금 총액
  unusedAnnualLeavePay: number;// 미사용 연차수당
  dailyAverageWage: number;    // 1일 평균임금
  dailyOrdinaryWage: number;   // 1일 통상임금
  appliedDailyWage: number;    // 실제 적용 1일 임금 (평균 vs 통상 중 큰 금액)
  grossSeverancePay: number;   // 세전 퇴직금 산출액
  retirementIncomeTax: number; // 퇴직소득세
  retirementLocalTax: number;  // 퇴직지방소득세
  netSeverancePay: number;     // 실지급 퇴직금
  createdAt: string;
}

export interface Phase2TaxFilingSummary {
  targetYm: string;
  // 1. 주간/월간 4대보험 취득·상실·보수월액변경 (Row 7, 9, 14)
  ediAcquireTargets: EmployeeMasterItem[];
  ediLossTargets: Array<{
    emp: EmployeeMasterItem;
    currentYearTotalCompensation: number;
    unusedLeaveNote: string;
  }>;
  ediSalaryChanges: SalaryChangeNoticeItem[];
  // 2. 원천세 / 지방세 특별징수 / 주민세 종업원분 법인별 집계 (Row 46, 47, 48)
  entityTaxSummaries: Array<{
    entityCode: EntityCode;
    entityName: string;
    regularHeadcount: number;
    regularTaxableGross: number;
    regularIncomeTax: number;
    regularLocalTax: number;
    dailyHeadcount: number;
    dailyGross: number;
    dailyIncomeTax: number;
    dailyLocalTax: number;
    severanceHeadcount: number;
    severanceGross: number;
    severanceIncomeTax: number;
    severanceLocalTax: number;
    bizIncomeHeadcount: number;
    bizIncomeGross: number;
    bizIncomeTax: number;
    bizLocalTax: number;
    totalWithholdingIncomeTax: number; // 원천세 합계 (Row 46)
    totalSpecialLocalTax: number;      // 지방세 특별징수 합계 (Row 47)
    residentTaxBaseTaxablePayroll: number; // 주민세 종업원분 과세표준 (Row 48)
    residentTaxExemptYn: boolean;          // 면세점 이하 여부
    residentTaxAmount: number;             // 주민세(종업원분) 산출세액 (Row 48)
    // 장애인 고용부담금 (Row 52)
    eligibleRegularEmployeeCount: number;
    mandatoryDisabledQuota: number;
    recognizedDisabledCount: number; // 경증 1배수 + 중증 2배수
    shortfallDisabledCount: number;
    estimatedMonthlyDisabledLevy: number;
  }>;
}

// ============================================================
// Phase 3 추가 인터페이스: 입퇴사 프로비저닝(R3~R8, R13, R23, R35, R39),
// 식수관리·삼성웰스토리·블랙스톤/KMG 식대품의(R19~R22),
// 고정거래처 도급비·직원수당(R37), 하나BSN 용역비(R38)
// ============================================================

export interface OnboardingProvisioningItem {
  provisionId: number;
  targetYm: string;
  empId: number;
  empNo: string;
  empName: string;
  entityCode: EntityCode;
  entityName: string;
  deptName: string;
  employmentType: EmploymentType;
  workflowType: 'ONBOARDING' | 'OFFBOARDING' | 'INTERN_PLACEMENT';
  eventDate: string;
  amaranthErpRegistered: boolean;       // R3: ERP(더존 아마란스) 입사자 등록
  recruitmentNoticeIssued: boolean;     // R4, R5: 채용 품의 및 채용통지서, 입사 안내
  laborContractSigned: boolean;         // R6: 근로계약서 체결
  emailAccountRequested: boolean;       // R6: 그룹웨어 전자메일 신청서 진행
  idCardIssued: boolean;                // R6: 사원증(코나카드) 발급
  vehicleRegistered: boolean;           // R6, R39: 차량등록증/임직원 차량 등록
  mealFingerprintRegistered: boolean;   // R23: 식수체크용 지문 등록 (캐디, 임직원 신규채용자)
  resignationApprovalSubmitted: boolean;// R8: 퇴사자 인사정보 등록 및 사직서 품의
  internSchoolName: string | null;      // R13, R35: 취업연계 고등학교/담당자명
  internMentorName: string | null;      // R13, R35: 부서 배치 안내 및 현장교사
  completedStepsCount: number;
  totalStepsCount: number;
  notes: string | null;
}

export interface VehicleRegistrationItem {
  vehicleRegId: number;
  targetYm: string;
  regDate: string;
  vehicleType: 'EMPLOYEE' | 'VISITOR'; // R39: 임직원 차량 번호 등록, 내방객 차량 등록
  entityCode: EntityCode;
  deptName: string;
  ownerOrVisitorName: string;
  carNumber: string;
  carModel: string;
  visitPurpose: string;
  contactPhone: string;
  registeredInParkingSystem: boolean;
}

export interface MealDailyLogItem {
  mealLogId: number;
  targetYm: string;
  mealDate: string;
  entityCode: EntityCode; // R22: 블랙스톤, KMG, 락산수 식대비 분리 집계
  entityName: string;
  deptId: number;
  deptName: string;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  nightMealCount: number;
  totalMealCount: number;
  unitMealPrice: number;
  supplyAmount: number;
  vatAmount: number;
  totalMealCost: number;
  notes: string | null;
}

export interface WeeklyMenuNoticeItem {
  menuNoticeId: number;
  targetYm: string;
  weekLabel: string; // 예: 10월 3주차
  startDate: string;
  endDate: string;
  groupwareNoticeNo: string;
  welstoryMenuSummary: string;
  postedAt: string;
}

export interface VendorMonthlyContractItem {
  vendorContractId: number;
  targetYm: string;
  entityCode: EntityCode;
  entityName: string;
  deptId: number;
  deptName: string;
  vendorName: string;             // R37: 고정 거래처명
  contractTitle: string;          // 도급 계약 건명
  baseContractFee: number;        // 고정 도급비 공급가액
  staffAllowanceAmount: number;   // 직원수당 납부액
  supplyAmount: number;           // 합산 공급가액
  vatAmount: number;              // 부가세액
  totalInvoiceAmount: number;     // 세금계산서 합계금액
  taxInvoiceNo: string;
  approvalDocTitle: string;
}

export interface HanaBsnServiceFeeItem {
  serviceFeeId: number;
  targetYm: string;
  entityCode: EntityCode;         // R38: 락산수, KMG 용역비 지급 품의(하나BSN)
  entityName: string;
  deptId: number;
  deptName: string;
  costCenterCode: string;
  dispatchedHeadcount: number;    // 부서별 파견/용역 인원수
  supplyAmount: number;           // 용역비 공급가액
  vatAmount: number;              // 부가세액
  totalFeeAmount: number;         // 용역비 합계액
  invoiceNo: string;
  approvalDocTitle: string;
}

export interface Phase3OperationsSummary {
  targetYm: string;
  onboardingCompletedCount: number;
  onboardingPendingCount: number;
  mealEntitySummaries: Array<{
    entityCode: EntityCode;
    entityName: string;
    breakfastTotal: number;
    lunchTotal: number;
    dinnerTotal: number;
    nightMealTotal: number;
    totalMealCount: number;
    totalSupplyAmount: number;
    totalVatAmount: number;
    totalMealCost: number;
  }>;
  mealGrandTotalCount: number;
  mealGrandTotalSupply: number;
  mealGrandTotalVat: number;
  mealGrandTotalCost: number;
  vendorTotalBaseFee: number;
  vendorTotalStaffAllowance: number;
  vendorTotalSupply: number;
  vendorTotalVat: number;
  vendorTotalInvoice: number;
  hanaBsnRaksansuTotal: number;
  hanaBsnKmgTotal: number;
  hanaBsnBlackstoneTotal: number;
  hanaBsnGrandTotal: number;
}

// ============================================================
// Phase 4 추가 인터페이스: 근태·월근무표·연차·휴무(R15~R18),
// 인원변동현황 이사보고(R41), 주간업무보고·팀장파트장 휴무(R60),
// 연말정산(R34), 휴가지원·건강검진·완납증명·제증명·원천징수영수증(R53~R57),
// 5대 법정의무교육(R58), 산업재해조사표 30일 기한(R59), IT센터 협업(R61)
// ============================================================

export interface MonthlyWorkScheduleItem {
  scheduleId: number;
  targetYm: string;
  entityCode: EntityCode;
  entityName: string;
  deptId: number;
  deptName: string;
  totalHeadcount: number;
  scheduledWorkDaysTotal: number;
  scheduledOffDaysTotal: number;
  plannedOvertimeHours: number;
  submissionStatus: 'SUBMITTED' | 'APPROVED_FINAL'; // R15 취합 -> R16 말일 최종취합본 품의
  approvalDocNo: string;
  submittedAt: string;
}

export interface LeaveAndOffDayLedgerItem {
  leaveLedgerId: number;
  targetYm: string;
  empId: number;
  empNo: string;
  empName: string;
  entityCode: EntityCode;
  entityName: string;
  deptName: string;
  hireDate: string;
  // R17: 연차 확인 및 잔여 확인 관리(품의 및 연차대장)
  annualLeaveGranted: number;
  annualLeaveUsed: number;
  annualLeaveRemaining: number;
  // R18: 휴무 사용 및 잔여휴무 관리(품의 및 마감근무표)
  monthlyOffGranted: number;
  monthlyOffUsed: number;
  monthlyOffRemaining: number;
  approvalDocNo: string | null;
  updatedAt: string;
}

export interface WeeklyDeptReportItem {
  reportId: number;
  targetYm: string;
  reportWeekLabel: string; // 예: 10월 3주차 (수·목·금 취합)
  reportDate: string;      // 수요일 기준일
  entityCode: EntityCode;
  entityName: string;
  deptId: number;
  deptName: string;
  authorName: string;
  thisWeekAchievements: string; // R60: 주간업무보고 금주 실적
  nextWeekPlans: string;        // R60: 주간업무보고 차주 계획
  managerOffDaysSchedule: string; // R60: 팀장/파트장 휴무일 취합 보고
  submittedAt: string;
}

export type SupportAndCertCategory =
  | 'YEAR_END_TAX_DOC'       // R34: 연말정산 자료 수합 및 반영 (12/31 재직자 기준)
  | 'VACATION_SUPPORT'       // R53: 근로자 휴가지원사업 신청/진행
  | 'HEALTH_CHECKUP_EDI'     // R54: 직장 건강검진 명단 확인 (건강보험 EDI 등록/삭제)
  | 'TAX_CLEARANCE_CERT'     // R55: 완납증명서 발급(4대보험, 국세, 지방세) - 세일즈본부 세미나 관련
  | 'EMPLOYMENT_CAREER_CERT' // R56: 재직, 경력, 퇴직증명서 발급 (제증명 품의 확인 후)
  | 'WITHHOLDING_RECEIPT'    // R57: 근로소득 원천징수영수증 및 원천징수부 발급
  ;

export interface CertificateAndWelfareItem {
  recordId: number;
  targetYm: string;
  category: SupportAndCertCategory;
  categoryLabel: string;
  requestDate: string;
  entityCode: EntityCode;
  entityName: string;
  empId: number | null;
  empNo: string;
  empNameOrRequester: string;
  deptName: string;
  purposeOrDetail: string; // 예: 세일즈본부 세미나 입찰용 4대보험/국세/지방세 완납증명, 은행제출용 등
  approvalDocNo: string;
  settlementAmount: number; // 연말정산 환급/추징액 또는 휴가지원 분담금 등
  status: 'COMPLETED' | 'IN_PROGRESS';
}

export interface MandatoryTrainingItem {
  trainingId: number;
  targetYear: string;
  empId: number;
  empNo: string;
  empName: string;
  entityCode: EntityCode;
  entityName: string;
  deptName: string;
  // R58: 5대 법정의무교육 (11월 진행 ~ 12월 완료)
  sexualHarassmentDone: boolean;   // 1. 성희롱 예방교육
  workplaceBullyingDone: boolean;  // 2. 직장내 괴롭힘 예방교육
  personalInfoDone: boolean;       // 3. 개인정보 보호교육
  retirementPensionDone: boolean;  // 4. 퇴직연금 교육
  industrialSafetyDone: boolean;   // 5. 산업안전보건 교육
  completedCount: number;
  isAllCompleted: boolean;
  updatedAt: string;
}

export interface IndustrialAccidentReportItem {
  accidentId: number;
  targetYm: string;
  accidentDate: string;
  filingDeadlineDate: string; // R59: 사고 발생 후 30일 이내 법정 제출기한 자동 계산
  entityCode: EntityCode;
  entityName: string;
  deptName: string;
  empId: number;
  empNo: string;
  empName: string;
  accidentSummary: string;
  internalApprovalDocNo: string; // 사고발생보고서 품의 번호
  filingStatus: 'REPORT_APPROVED' | 'SUBMITTED_TO_MOL'; // 품의 확인 ➔ 산업재해조사표 접수 완료
}

export interface ItCenterTicketItem {
  ticketId: number;
  targetYm: string;
  requestDate: string;
  entityCode: EntityCode;
  deptName: string;
  requesterName: string;
  issueType: 'GROUPWARE_ERROR' | 'ORG_CHART_SYNC' | 'EMP_INFO_CORRECTION' | 'SYSTEM_AUTH'; // R61
  issueDescription: string;
  resolutionStatus: 'REQUESTED' | 'RESOLVED';
}

export interface Phase4PortalSummary {
  targetYm: string;
  // R15, R16, R17, R18 근태·연차·휴무 요약
  scheduleSubmittedDeptsCount: number;
  scheduleApprovedDeptsCount: number;
  totalAnnualLeaveGranted: number;
  totalAnnualLeaveUsed: number;
  totalAnnualLeaveRemaining: number;
  totalOffDaysRemaining: number;
  // R41 매주 수요일 임직원 인원변동현황 이사님 보고용 사전 집계
  entityHeadcountReports: Array<{
    entityCode: EntityCode;
    entityName: string;
    activeRegularCount: number;
    activeContractCount: number;
    activeInternCount: number;
    activeDailyCount: number;
    activeCaddyCount: number;
    totalActiveHeadcount: number;
    monthlyNewHiresCount: number;
    monthlyResigneesCount: number;
    netChangeCount: number;
  }>;
  grandTotalActiveHeadcount: number;
  grandTotalMonthlyNewHires: number;
  grandTotalMonthlyResignees: number;
  // R60, R34, R53~R61 요약 카운트
  weeklyReportCount: number;
  certAndWelfareCount: number;
  trainingAllCompletedCount: number;
  trainingPendingCount: number;
  accidentReportCount: number;
  itTicketCount: number;
}

// ============================================================================
// [Phase 5] 엑셀 일괄 인제스천(Bulk Import) & 법정·정기 데드라인(D-Day) 컨트롤타워
// ============================================================================

export type BulkImportTargetType =
  | 'EMPLOYEES_BULK'    // 더존 아마란스 임직원 명부 일괄 업로드 (R3~R14, R25~R29, R52)
  | 'DAILY_LOGS_BULK'   // 부서별 일용직 투입일지 일괄 업로드 (R24, R30, R43)
  | 'CADDY_BULK'        // 경기과 캐디 라운딩·입이직 일괄 업로드 (R12, R44, R45)
  | 'MEAL_LOGS_BULK'    // 삼성웰스토리 일일 식수현황 일괄 업로드 (R19, R21, R22)
  ;

export interface BulkImportHistoryItem {
  importId: number;
  targetYm: string;
  importType: BulkImportTargetType;
  importTypeLabel: string;
  fileName: string;
  totalRows: number;
  importedRows: number;
  isolatedHitlRows: number; // 미분류 부서/항목으로 인해 HITL 매핑 후보로 격리된 건수
  importedAt: string;
}

export type DeadlineUrgencyLevel = 'URGENT_D_DAY' | 'UPCOMING' | 'COMPLETED_OK';

export interface DeadlineAlertItem {
  alertCode: string;
  rowRef: string;          // 예: Row 42, Row 59, Row 40 등
  cycleLabel: string;      // 예: 매월 1~2일, 매월 8일, 매월 10일, 매월 15일, 매주 수요일, 퇴직 후 14일 이내, 사고 후 30일 이내
  title: string;
  description: string;
  dueDateLabel: string;
  daysRemaining: number;   // D-Day 남은 일수 (0이면 D-Day 당일, 음수면 기한 경과)
  urgency: DeadlineUrgencyLevel;
  targetTab: string;       // 바로가기 탭 코드
  currentCountOrStatus: string;
}

export interface Phase5ControlTowerSummary {
  targetYm: string;
  referenceDate: string;
  urgentAlertCount: number;
  upcomingAlertCount: number;
  completedAlertCount: number;
  totalBulkImportCount: number;
  totalBulkImportedRows: number;
  totalBulkIsolatedHitlRows: number;
  deadlineAlerts: DeadlineAlertItem[];
}

// ============================================================================
// [Phase 6] 스마트 무인 자동화 통합 엔진 전용: 무인 수집 데몬 · RPA 자동기안/신고 봇 · 이상치 감사
// ============================================================================

export type RpaTargetPortalType =
  | 'AMARANTH_GROUPWARE'   // 더존 아마란스 10 전자결재 자동 기안 (식대·도급·하나BSN·8일KMG·10일급여·수요일보고)
  | 'EDI_4MAJOR_INSURANCE' // 4대보험 정보연계센터 취득·상실·보수변경·캐디산재·일용직 EDI 무인 신고
  | 'HOMETAX_WETAX_TAX'    // 홈택스·위택스 원천세·지방세·주민세 신고 및 3개 법인 완납증명서 무인 발급
  | 'HANA_BANK_TRANSFER'   // 하나은행 기업뱅킹 3개 법인 급여·일용직 노무비 대량이체 대기 등록
  | 'KONA_CARD_BIZ'        // 코나카드 비즈 관리자 팀장 보직수당 자동 충전 예약
  | 'WELSTORY_PORTAL';     // 삼성웰스토리 식수 발주 및 법인별 식대 정산서 자동 송신

export interface RpaJobQueueItem {
  jobId: string;
  targetYm: string;
  targetPortal: RpaTargetPortalType;
  targetPortalLabel: string;
  rowRef: string;
  cycleLabel: string;
  jobTitle: string;
  autoDraftSummary: string;
  totalAmount: number;
  targetRecordCount: number;
  status: 'READY_FOR_1CLICK_APPROVAL' | 'BOT_DISPATCHED_WAITING_OTP' | 'APPROVED_COMPLETED';
  receiptNoOrDocNo: string;
  lastExecutedAt: string;
}

export type CollectorSourceSystemType =
  | 'POS_GOLF_CADDY'
  | 'TERMINAL_MEAL_WELSTORY'
  | 'GATE_PARKING_LPR'
  | 'AMARANTH_HR_SYNC';

export interface CollectorFeedLogItem {
  feedId: number;
  targetYm: string;
  sourceSystem: CollectorSourceSystemType;
  sourceSystemLabel: string;
  rowRef: string;
  fetchedCount: number;
  insertedCount: number;
  isolatedHitlCount: number;
  syncMode: 'DAEMON_CRON' | 'EVENT_WEBHOOK' | 'API_PULL';
  syncedAt: string;
  summaryMessage: string;
}

export interface AnomalyAuditItem {
  anomalyId: string;
  severity: 'COMPLETED_OK' | 'ACTION_REQUIRED';
  category:
    | 'PRO_RATA_CHECK'
    | 'VOUCHER_VARIANCE'
    | 'PROBATION_EXPIRY'
    | 'DORM_SETTLEMENT'
    | 'HITL_UNMAPPED'
    | 'STATUTORY_DEADLINE';
  title: string;
  detail: string;
  targetTab: string;
  rowRef: string;
}

export interface HeadcountReductionSummary {
  targetYm: string;
  selfOnboardedCount: number;
  collectorTotalSyncedRecords: number;
  rpaTotalJobsCount: number;
  rpaCompletedOrDispatchedCount: number;
  rpaPendingApprovalCount: number;
  anomalyActionRequiredCount: number;
  estimatedMonthlyHoursSaved: number;
  targetHrHeadcount: number;
  anomalyItems: AnomalyAuditItem[];
}

