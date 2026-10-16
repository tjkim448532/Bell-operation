'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Calculator,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  ShieldCheck,
  Settings,
  PlusCircle,
  RefreshCw,
  ArrowRightLeft,
  CalendarClock,
  Landmark,
  Briefcase,
  UserCheck,
  Utensils,
  ClipboardCheck,
  GraduationCap,
  CalendarCheck,
  Wrench,
  Upload,
  BellRing,
  Bot,
  Smartphone,
  Cpu,
  Link2,
} from 'lucide-react';
import {
  BulkImportHistoryItem,
  BulkImportTargetType,
  BusinessIncomeRecordItem,
  CaddyMonthlyRecordItem,
  CertificateAndWelfareItem,
  CollectorFeedLogItem,
  CollectorSourceSystemType,
  CostAllocationVoucherRow,
  DepartmentItem,
  DormitoryResigneeItem,
  EmployeeMasterItem,
  EntityCode,
  EmploymentType,
  HanaBsnServiceFeeItem,
  HeadcountReductionSummary,
  HrAmaranthApiConfig,
  HrAmaranthApiLogItem,
  HrAmaranthApiModuleType,
  HrSmsCategoryType,
  HrSmsDispatchLogItem,
  HrSolapiConfig,
  IndustrialAccidentReportItem,
  ItCenterTicketItem,
  LeaveAndOffDayLedgerItem,
  LegalEntityItem,
  MandatoryTrainingItem,
  MappingCandidateItem,
  MealDailyLogItem,
  MonthlyWorkScheduleItem,
  OnboardingProvisioningItem,
  PayrollAdjustmentItem,
  PayrollLedgerRow,
  Phase2TaxFilingSummary,
  Phase3OperationsSummary,
  Phase4PortalSummary,
  Phase5ControlTowerSummary,
  ProbationTargetItem,
  RpaJobQueueItem,
  SalaryChangeNoticeItem,
  SeveranceSettlementItem,
  StatutoryRateConfig,
  SupportAndCertCategory,
  DailyWorkerLogItem,
  VehicleRegistrationItem,
  VendorMonthlyContractItem,
  WeeklyDeptReportItem,
  WeeklyMenuNoticeItem,
  HrGlobalDefaultsConfig,
} from '@/types/hr';
import {
  fetchAllHrState,
  runFirestorePayrollSettlement,
  saveDepartmentToFirestore,
  saveStatutoryRateToFirestore,
  saveEmployeeToFirestore,
  addDailyWorkerLogToFirestore,
  importAdjustmentsToFirestore,
  approveHitlMappingInFirestore,
  downloadHrExcelWorkbook,
  addCaddyMonthlyRecordToFirestore,
  addSalaryChangeNoticeToFirestore,
  addBusinessIncomeToFirestore,
  calculateAndSaveSeveranceToFirestore,
  downloadPhase2ExcelWorkbook,
  saveOnboardingProvisioningToFirestore,
  completeAllProvisioningStepsInFirestore,
  addVehicleRegistrationToFirestore,
  addMealDailyLogToFirestore,
  addWeeklyMenuNoticeToFirestore,
  addVendorMonthlyContractToFirestore,
  addHanaBsnServiceFeeToFirestore,
  downloadPhase3ExcelWorkbook,
  saveMonthlyWorkScheduleToFirestore,
  approveAllMonthlySchedulesInFirestore,
  saveLeaveAndOffDayLedgerToFirestore,
  addWeeklyDeptReportToFirestore,
  addCertificateAndWelfareToFirestore,
  completeAllMandatoryTrainingInFirestore,
  addIndustrialAccidentReportToFirestore,
  addItCenterTicketToFirestore,
  resolveItCenterTicketInFirestore,
  downloadPhase4ExcelWorkbook,
  downloadBulkImportTemplateExcel,
  processBulkExcelUploadToFirestore,
  submitSelfOnboardingInFirestore,
  approveSingleRpaJobInFirestore,
  syncAndDispatchAllRpaJobsInFirestore,
  triggerCollectorSyncInFirestore,
  issueInstantSelfCertificateInFirestore,
  submitSelfResignationInFirestore,
  fetchHrSolapiConfigAndStatus,
  saveHrSolapiConfigToFirestore,
  dispatchHrSolapiMessageInFirestore,
  fetchHrAmaranthApiConfigAndLogs,
  saveHrAmaranthApiConfigToFirestore,
  executeAmaranthRestApiModuleInFirestore,
  fetchHrGlobalDefaultsConfig,
  saveHrGlobalDefaultsConfigToFirestore,
  applyGlobalDefaultsToAllEmployeesInFirestore,
  updateInlineEmployeeCompensationInFirestore,
  applyGlobalBatchAdjustmentsInFirestore,
  updateOrDeleteAdjustmentInFirestore,
  applyGlobalBatchDailyLogsInFirestore,
  updateOrDeleteDailyLogInFirestore,
} from '@/lib/firebase/hrFirestoreService';

type PortalViewMode =
  | 'ADMIN_HQ'
  | 'SELF_ONBOARDING'
  | 'EMP_PORTAL'
  | 'DEPT_PORTAL'
  | 'QR_POSTER';

type ActiveTab =
  | 'ZERO_TOUCH_HQ'
  | 'MATRIX'
  | 'VOUCHER'
  | 'PHASE2_TAX_EDI'
  | 'PHASE2_SEVERANCE'
  | 'PHASE3_ONBOARDING'
  | 'PHASE3_MEAL_APPROVALS'
  | 'PHASE4_SCHEDULE_REPORT'
  | 'PHASE4_CERT_TRAINING_IT'
  | 'PHASE5_BULK_AND_DDAY'
  | 'EMPLOYEES'
  | 'INPUTS'
  | 'HITL_MAPPING'
  | 'CONFIG';

function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return Math.round(val).toLocaleString('ko-KR');
}

export default function BelleforetHrAutomationPage() {
  // 모든 상태는 중립값(null, [], '', false, 0)으로 초기화 (Zero-Mock Policy)
  const [activeTab, setActiveTab] = useState<ActiveTab>('ZERO_TOUCH_HQ');
  const [targetYm, setTargetYm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 마스터 설정 상태
  const [entities, setEntities] = useState<LegalEntityItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [rateConfigs, setRateConfigs] = useState<StatutoryRateConfig[]>([]);
  const [employees, setEmployees] = useState<EmployeeMasterItem[]>([]);

  // Phase 1 급여 정산 매트릭스 및 요약 상태
  const [calendarDaysInMonth, setCalendarDaysInMonth] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<PayrollLedgerRow | null>(null);
  const [entitySubtotals, setEntitySubtotals] = useState<PayrollLedgerRow[]>([]);
  const [employmentSubtotals, setEmploymentSubtotals] = useState<PayrollLedgerRow[]>([]);
  const [matrixRows, setMatrixRows] = useState<PayrollLedgerRow[]>([]);
  const [vouchers, setVouchers] = useState<CostAllocationVoucherRow[]>([]);
  const [voucherBalanceCheck, setVoucherBalanceCheck] = useState<{
    totalDebit: number;
    totalCredit: number;
    varianceDelta: number;
    isBalanced: boolean;
  } | null>(null);
  const [probationTargets, setProbationTargets] = useState<ProbationTargetItem[]>([]);
  const [dormitoryResignees, setDormitoryResignees] = useState<DormitoryResigneeItem[]>([]);
  const [pendingMappingCount, setPendingMappingCount] = useState<number>(0);
  const [disabledEntities, setDisabledEntities] = useState<EntityCode[]>([]);

  // 기초자료 및 HITL 상태
  const [dailyLogs, setDailyLogs] = useState<DailyWorkerLogItem[]>([]);
  const [adjustments, setAdjustments] = useState<PayrollAdjustmentItem[]>([]);
  const [mappingCandidates, setMappingCandidates] = useState<MappingCandidateItem[]>([]);
  const [selectedMappingTarget, setSelectedMappingTarget] = useState<Record<number, string>>({});

  // Phase 2 상태 (세무·4대보험 EDI·경기과 캐디·퇴직금)
  const [caddyRecords, setCaddyRecords] = useState<CaddyMonthlyRecordItem[]>([]);
  const [salaryChanges, setSalaryChanges] = useState<SalaryChangeNoticeItem[]>([]);
  const [businessIncomes, setBusinessIncomes] = useState<BusinessIncomeRecordItem[]>([]);
  const [severanceLedgers, setSeveranceLedgers] = useState<SeveranceSettlementItem[]>([]);
  const [phase2Summary, setPhase2Summary] = useState<Phase2TaxFilingSummary | null>(null);

  // Phase 3 상태 (입퇴사 프로비저닝·주차차량·일일식수·주간식단·고정거래처도급·하나BSN 용역비)
  const [onboardingProvisionings, setOnboardingProvisionings] = useState<
    OnboardingProvisioningItem[]
  >([]);
  const [vehicleRegistrations, setVehicleRegistrations] = useState<VehicleRegistrationItem[]>([]);
  const [mealDailyLogs, setMealDailyLogs] = useState<MealDailyLogItem[]>([]);
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenuNoticeItem[]>([]);
  const [vendorContracts, setVendorContracts] = useState<VendorMonthlyContractItem[]>([]);
  const [hanaBsnFees, setHanaBsnFees] = useState<HanaBsnServiceFeeItem[]>([]);
  const [phase3Summary, setPhase3Summary] = useState<Phase3OperationsSummary | null>(null);

  // Phase 4 상태 (월근무표·연차휴무·인원변동이사보고·주간업무팀장휴무·제증명·5대법정교육·산재30일·IT협업)
  const [monthlySchedules, setMonthlySchedules] = useState<MonthlyWorkScheduleItem[]>([]);
  const [leaveLedgers, setLeaveLedgers] = useState<LeaveAndOffDayLedgerItem[]>([]);
  const [weeklyDeptReports, setWeeklyDeptReports] = useState<WeeklyDeptReportItem[]>([]);
  const [certsAndWelfareList, setCertsAndWelfareList] = useState<CertificateAndWelfareItem[]>([]);
  const [mandatoryTrainings, setMandatoryTrainings] = useState<MandatoryTrainingItem[]>([]);
  const [accidentReports, setAccidentReports] = useState<IndustrialAccidentReportItem[]>([]);
  const [itCenterTickets, setItCenterTickets] = useState<ItCenterTicketItem[]>([]);
  const [phase4Summary, setPhase4Summary] = useState<Phase4PortalSummary | null>(null);

  // Phase 5 상태 (엑셀 일괄 업로드 & 법정·정기 D-Day 컨트롤타워)
  const [bulkImportHistory, setBulkImportHistory] = useState<BulkImportHistoryItem[]>([]);
  const [phase5Summary, setPhase5Summary] = useState<Phase5ControlTowerSummary | null>(null);
  const [selectedBulkType, setSelectedBulkType] =
    useState<BulkImportTargetType>('EMPLOYEES_BULK');
  const [uploadingExcel, setUploadingExcel] = useState<boolean>(false);
  const [showAllMenuGrid, setShowAllMenuGrid] = useState<boolean>(false);
  const [showBeginnerGuide, setShowBeginnerGuide] = useState<boolean>(false);
  const [showGuideDetail, setShowGuideDetail] = useState<boolean>(false);
  const [isNewcomerFriendlyMode, setIsNewcomerFriendlyMode] = useState<boolean>(true);
  const [showAdvancedCollectorOnHome, setShowAdvancedCollectorOnHome] = useState<boolean>(false);
  const [showTopPortalPreviewBar, setShowTopPortalPreviewBar] = useState<boolean>(false);
  const [matrixColumnViewMode, setMatrixColumnViewMode] = useState<'SUMMARY_16' | 'FULL_31'>('SUMMARY_16');
  const [showKidsWordBook, setShowKidsWordBook] = useState<boolean>(false);
  const [unifiedHelpTab, setUnifiedHelpTab] = useState<'BIG_PICTURE' | 'SCENARIOS' | 'GLOSSARY'>('BIG_PICTURE');
  const [sidebarMenuMode, setSidebarMenuMode] = useState<'ESSENTIAL_5' | 'ALL_16'>('ESSENTIAL_5');
  const [showIndividualAddForm, setShowIndividualAddForm] = useState<boolean>(false);
  const [quickMenuSearch, setQuickMenuSearch] = useState<string>('');
  const [zeroTouchSubView, setZeroTouchSubView] = useState<
    'ALL' | 'AMARANTH_RPA' | 'SOLAPI_PORTALS' | 'COLLECTOR_AUDIT' | 'SELF_ONBOARD'
  >('COLLECTOR_AUDIT');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SCENARIO_1');
  const [toastTick, setToastTick] = useState<number>(0);
  const [workspaceFlashTick, setWorkspaceFlashTick] = useState<number>(0);
  const [actionPendingLabel, setActionPendingLabel] = useState<string>('');
  const [lastDownloadedKey, setLastDownloadedKey] = useState<string>('');

  // Phase 6 상태 (스마트 무인 자동화 체제: 무인 RPA 큐 · 현장 단말기 수집 피드 · 합격자 모바일 셀프 입사포털 · 임직원/부서장 보안분리 포털)
  const [rpaJobs, setRpaJobs] = useState<RpaJobQueueItem[]>([]);
  const [collectorFeeds, setCollectorFeeds] = useState<CollectorFeedLogItem[]>([]);
  const [headcountReductionSummary, setHeadcountReductionSummary] =
    useState<HeadcountReductionSummary | null>(null);
  const [isSelfOnboardStandaloneView, setIsSelfOnboardStandaloneView] =
    useState<boolean>(false);
  const [portalViewMode, setPortalViewMode] = useState<PortalViewMode>('ADMIN_HQ');
  const [empPortalSelectedEmpId, setEmpPortalSelectedEmpId] = useState<number>(0);
  const [empPortalPinInput, setEmpPortalPinInput] = useState<string>('');
  const [empPortalVerifiedEmpId, setEmpPortalVerifiedEmpId] = useState<number>(0);
  const [empPortalCertCategory, setEmpPortalCertCategory] = useState<
    'EMPLOYMENT_CAREER_CERT' | 'WITHHOLDING_RECEIPT'
  >('EMPLOYMENT_CAREER_CERT');
  const [empPortalCertPurpose, setEmpPortalCertPurpose] =
    useState<string>('금융기관 대출 및 관공서 제출용');
  const [issuedSelfCertPreview, setIssuedSelfCertPreview] = useState<{
    certNo: string;
    categoryLabel: string;
    empName: string;
    empNo: string;
    entityName: string;
    deptName: string;
    hireDate: string;
    purpose: string;
    issuedDate: string;
  } | null>(null);
  const [selfResignForm, setSelfResignForm] = useState({
    resignDate: '',
    resignReason: '일신상의 사유 (자진퇴사)',
    dormMoveOutDate: '',
    dormUtilityFee: '0',
    digitalSignatureName: '',
  });
  const [solapiConfig, setSolapiConfig] = useState<HrSolapiConfig>({
    apiKey: '',
    apiSecret: '',
    senderNumber: '',
    useKakaoAlimtalk: false,
    pfId: '',
    templateId: '',
    kakaoApprovedTemplateBody: '',
    updatedAt: '',
  });
  const [solapiBalanceWon, setSolapiBalanceWon] = useState<number | null>(null);
  const [solapiAccountId, setSolapiAccountId] = useState<string | null>(null);
  const [smsLogs, setSmsLogs] = useState<HrSmsDispatchLogItem[]>([]);
  const [showSolapiConfigPanel, setShowSolapiConfigPanel] = useState<boolean>(false);
  const [smsQuickForm, setSmsQuickForm] = useState<{
    category: HrSmsCategoryType;
    categoryLabel: string;
    subject: string;
    recipientName: string;
    recipientPhone: string;
    messageBody: string;
  }>({
    category: 'SELF_ONBOARDING_INVITE',
    categoryLabel: '합격자 모바일 셀프 입사포털 링크 안내',
    subject: '[벨포레 인사팀] 모바일 셀프 입사등록 안내',
    recipientName: '',
    recipientPhone: '',
    messageBody:
      '[벨포레 리조트 인사팀]\n#{이름}님, 입사를 진심으로 환영합니다.\n\n별도 서류 제출 없이 아래 모바일 셀프 입사포털 링크에 접속하시어 급여계좌·차량번호·전자근로계약 서명을 완료해 주시기 바랍니다.\n\n▶ 모바일 셀프 입사포털 바로가기:\nhttps://belleforet-hr.web.app/?mode=self-onboarding',
  });
  const [amaranthApiConfig, setAmaranthApiConfig] = useState<HrAmaranthApiConfig>({
    baseUrl: 'https://gw.belleforet.com',
    companyCodeBlackstone: '1000',
    companyCodeKmg: '2000',
    companyCodeRaksansu: '3000',
    oauthClientId: 'BELLEFORET_HR_BRIDGE_CLIENT',
    oauthAccessToken: 'AM10_OAUTH2_TOKEN_ACTIVE',
    callerSecretKey: 'AM10_HMAC_SHA256_SIGN_KEY',
    ssoProviderType: 'OAUTH2',
    webhookCallbackUrl: 'https://belleforet-hr.web.app/api/webhooks/amaranth10/eapproval',
    autoSyncEnabled: true,
    updatedAt: '',
  });
  const [amaranthApiLogs, setAmaranthApiLogs] = useState<HrAmaranthApiLogItem[]>([]);
  const [showAmaranthConfigPanel, setShowAmaranthConfigPanel] = useState<boolean>(false);
  const [selfOnboardForm, setSelfOnboardForm] = useState({
    empName: '',
    entityCode: 'BLACKSTONE' as EntityCode,
    deptId: 1,
    employmentType: 'REGULAR' as EmploymentType,
    hireDate: '',
    baseMonthlyPay: '3000000',
    bankName: '하나은행',
    bankAccountNo: '',
    phone: '',
    carNumber: '',
    usesDormitory: false,
    dormRoomNumber: '',
    dependentCount: 1,
    digitalSignatureName: '',
  });

  // 신규 등록 폼 상태 (중립 초기값)
  const [deptForm, setDeptForm] = useState({
    entityCode: 'BLACKSTONE' as EntityCode,
    deptCode: '',
    deptName: '',
    costCenterCode: '',
  });

  const [rateForm, setRateForm] = useState({
    effectiveYm: '',
    npWorkerRate: '',
    npEmployerRate: '',
    npMinMonthlyIncome: '',
    npMaxMonthlyIncome: '',
    hiWorkerRate: '',
    hiEmployerRate: '',
    ltciRateOfHi: '',
    eiWorkerRate: '',
    eiEmployerRate: '',
    iacEmployerRate: '',
    dailyTaxFreeLimit: '',
    dailyTaxCreditRate: '',
    dailyBaseTaxRate: '',
    dailyMinTaxThreshold: '',
    localIncomeTaxRate: '',
    stdIncomeTaxRate: '',
    caddyExpenseRate: '',
    caddyEiWorkerRate: '',
    caddyEiEmployerRate: '',
    residentTaxRate: '',
    residentTaxExemptionLimit: '',
    businessIncomeTaxRate: '',
    disabledMandatoryRate: '',
    disabledBaseBurdenMonthly: '',
  });

  const [empForm, setEmpForm] = useState({
    empNo: '',
    empName: '',
    employmentType: 'REGULAR' as EmploymentType,
    entityCode: 'BLACKSTONE' as EntityCode,
    deptId: 0,
    positionTitle: '',
    hireDate: '',
    resignDate: '',
    baseMonthlyPay: '',
    mealAllowanceTaxFree: '',
    carAllowanceTaxFree: '',
    dailyOrHourlyWage: '',
    isTeamLeader: 0,
    teamLeaderAllowance: '',
    konaCardNo: '',
    bankName: '',
    accountNo: '',
    accountHolder: '',
    dormitoryRoom: '',
    carNumber: '',
    disabilityGrade: 'NONE' as 'NONE' | 'MILD' | 'SEVERE',
  });

  const [dailyForm, setDailyForm] = useState({
    workDate: '',
    empId: 0,
    workHours: '',
    dailyGrossPay: '',
    approvalDocNo: '',
    notes: '',
  });

  const [adjForm, setAdjForm] = useState({
    empNoOrName: '',
    categoryText: 'OVERTIME_PAY',
    amount: '',
    approvalDocNo: '',
    notes: '',
  });

  const [bulkAdjText, setBulkAdjText] = useState<string>('');

  // Phase 2 입력 폼 상태
  const [caddyForm, setCaddyForm] = useState({
    empId: 0,
    roundCount: '',
    totalCaddyFeeIncome: '',
    hireOrLeaveStatus: 'ACTIVE' as 'ACTIVE' | 'NEW_ACQUIRE' | 'LOSS_LEAVE',
    eventDate: '',
    notes: '',
  });

  const [salChangeForm, setSalChangeForm] = useState({
    changeDate: '',
    empId: 0,
    newMonthlyPay: '',
    changeReason: '',
  });

  const [bizIncomeForm, setBizIncomeForm] = useState({
    paymentDate: '',
    entityCode: 'BLACKSTONE' as EntityCode,
    earnerName: '',
    earnerRegNoMasked: '',
    incomeTypeName: '',
    grossAmount: '',
  });

  const [severanceForm, setSeveranceForm] = useState({
    empId: 0,
    resignDate: '',
    last3MonthsWages: '',
    annualBonusTotal: '',
    unusedAnnualLeavePay: '',
    dailyOrdinaryWage: '',
    retirementIncomeTax: '',
  });

  // Phase 3 입력 폼 상태
  const [provForm, setProvForm] = useState({
    empId: 0,
    workflowType: 'ONBOARDING' as 'ONBOARDING' | 'OFFBOARDING' | 'INTERN_PLACEMENT',
    eventDate: '',
    amaranthErpRegistered: false,
    recruitmentNoticeIssued: false,
    laborContractSigned: false,
    emailAccountRequested: false,
    idCardIssued: false,
    vehicleRegistered: false,
    mealFingerprintRegistered: false,
    resignationApprovalSubmitted: false,
    internSchoolName: '',
    internMentorName: '',
    notes: '',
  });

  const [vehicleForm, setVehicleForm] = useState({
    regDate: '',
    vehicleType: 'VISITOR' as 'EMPLOYEE' | 'VISITOR',
    entityCode: 'BLACKSTONE' as EntityCode,
    deptName: '',
    ownerOrVisitorName: '',
    carNumber: '',
    carModel: '',
    visitPurpose: '',
    contactPhone: '',
  });

  const [mealForm, setMealForm] = useState({
    mealDate: '',
    deptId: 0,
    breakfastCount: '',
    lunchCount: '',
    dinnerCount: '',
    nightMealCount: '',
    unitMealPrice: '',
    vatAmount: '',
    notes: '',
  });

  const [weeklyMenuForm, setWeeklyMenuForm] = useState({
    weekLabel: '',
    startDate: '',
    endDate: '',
    groupwareNoticeNo: '',
    welstoryMenuSummary: '',
  });

  const [vendorForm, setVendorForm] = useState({
    deptId: 0,
    vendorName: '',
    contractTitle: '',
    baseContractFee: '',
    staffAllowanceAmount: '',
    vatAmount: '',
    taxInvoiceNo: '',
  });

  const [hanaBsnForm, setHanaBsnForm] = useState({
    deptId: 0,
    dispatchedHeadcount: '',
    supplyAmount: '',
    vatAmount: '',
    invoiceNo: '',
  });

  // Phase 4 입력 폼 상태
  const [scheduleForm, setScheduleForm] = useState({
    deptId: 0,
    totalHeadcount: '',
    scheduledWorkDaysTotal: '',
    scheduledOffDaysTotal: '',
    plannedOvertimeHours: '',
    submissionStatus: 'SUBMITTED' as 'SUBMITTED' | 'APPROVED_FINAL',
    approvalDocNo: '',
  });

  const [leaveForm, setLeaveForm] = useState({
    empId: 0,
    annualLeaveGranted: '',
    annualLeaveUsed: '',
    monthlyOffGranted: '',
    monthlyOffUsed: '',
    approvalDocNo: '',
  });

  const [weeklyReportForm, setWeeklyReportForm] = useState({
    reportDate: '',
    reportWeekLabel: '',
    deptId: 0,
    authorName: '',
    thisWeekAchievements: '',
    nextWeekPlans: '',
    managerOffDaysSchedule: '',
  });

  const [certForm, setCertForm] = useState({
    requestDate: '',
    category: 'TAX_CLEARANCE_CERT' as SupportAndCertCategory,
    entityCode: 'BLACKSTONE' as EntityCode,
    empId: 0,
    purposeOrDetail: '',
    approvalDocNo: '',
    settlementAmount: '',
  });

  const [accidentForm, setAccidentForm] = useState({
    accidentDate: '',
    empId: 0,
    accidentSummary: '',
    internalApprovalDocNo: '',
    filingStatus: 'REPORT_APPROVED' as 'REPORT_APPROVED' | 'SUBMITTED_TO_MOL',
  });

  const [itTicketForm, setItTicketForm] = useState({
    requestDate: '',
    entityCode: 'BLACKSTONE' as EntityCode,
    deptName: '',
    requesterName: '',
    issueType: 'GROUPWARE_ERROR' as
      | 'GROUPWARE_ERROR'
      | 'ORG_CHART_SYNC'
      | 'EMP_INFO_CORRECTION'
      | 'SYSTEM_AUTH',
    issueDescription: '',
  });

  // [글로벌 기본값 & 개별 인라인 수정 상태]
  const [globalDefaults, setGlobalDefaults] = useState<HrGlobalDefaultsConfig>({
    defaultMealAllowanceTaxFree: 200000,
    defaultCarAllowanceTaxFree: 200000,
    defaultTeamLeaderAllowance: 100000,
    defaultBankName: '하나은행',
    defaultDailyWorkHours: 8,
    defaultDailyGrossWage: 150000,
    defaultDormDeductionMonthly: 50000,
    defaultMealDeductionMonthly: 0,
    autoSplitTaxFreeOnTotalPay: true,
    updatedAt: '',
  });
  const [showGlobalDefaultsModal, setShowGlobalDefaultsModal] = useState<boolean>(false);
  const [empTotalSalaryInput, setEmpTotalSalaryInput] = useState<string>('');
  const [batchBonusAmount, setBatchBonusAmount] = useState<string>('300000');

  const [inlineEmpEdits, setInlineEmpEdits] = useState<
    Record<
      number,
      {
        baseMonthlyPay: string;
        mealAllowanceTaxFree: string;
        carAllowanceTaxFree: string;
        teamLeaderAllowance: string;
        dailyOrHourlyWage: string;
        dormitoryRoom: string;
        carNumber: string;
      }
    >
  >({});

  const [inlineAdjEdits, setInlineAdjEdits] = useState<
    Record<number, { amount: string; notes: string }>
  >({});

  const [inlineDailyEdits, setInlineDailyEdits] = useState<
    Record<number, { workHours: string; dailyGrossPay: string; approvalDocNo: string }>
  >({});

  // 현재 년월 동적 초기화 + 합격자/임직원/부서장 전용 URL(?mode=self-onboarding | emp-portal | dept-portal) 감지
  useEffect(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = `${ym}-${String(now.getDate()).padStart(2, '0')}`;
    setTargetYm(ym);
    setRateForm((prev) => ({ ...prev, effectiveYm: ym }));
    setDailyForm((prev) => ({
      ...prev,
      workDate: prev.workDate || todayStr,
      workHours: prev.workHours || '8',
      dailyGrossPay: prev.dailyGrossPay || '150000',
    }));
    setVehicleForm((prev) => ({
      ...prev,
      regDate: prev.regDate || todayStr,
    }));
    setWeeklyReportForm((prev) => ({
      ...prev,
      reportDate: prev.reportDate || todayStr,
      reportWeekLabel: prev.reportWeekLabel || `${ym.slice(5, 7)}월 주차 보고`,
    }));
    setSelfOnboardForm((prev) => ({ ...prev, hireDate: todayStr }));
    setSelfResignForm((prev) => ({
      ...prev,
      resignDate: todayStr,
      dormMoveOutDate: todayStr,
    }));

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      if (modeParam === 'self-onboarding') {
        setIsSelfOnboardStandaloneView(true);
        setPortalViewMode('SELF_ONBOARDING');
        setActiveTab('ZERO_TOUCH_HQ');
        setZeroTouchSubView('SELF_ONBOARD');
      } else if (modeParam === 'emp-portal') {
        setPortalViewMode('EMP_PORTAL');
      } else if (modeParam === 'dept-portal') {
        setPortalViewMode('DEPT_PORTAL');
      } else if (modeParam === 'qr-poster') {
        setPortalViewMode('QR_POSTER');
      }
    }
  }, []);

  const fetchAllData = useCallback(async (ym: string) => {
    if (!ym) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchAllHrState(ym);
      setEntities(data.entities);
      setDepartments(data.departments);
      setRateConfigs(data.rates);
      setEmployees(data.employees);
      const empEditMap: Record<
        number,
        {
          baseMonthlyPay: string;
          mealAllowanceTaxFree: string;
          carAllowanceTaxFree: string;
          teamLeaderAllowance: string;
          dailyOrHourlyWage: string;
          dormitoryRoom: string;
          carNumber: string;
        }
      > = {};
      for (const e of data.employees) {
        empEditMap[e.empId] = {
          baseMonthlyPay: String(e.baseMonthlyPay ?? 0),
          mealAllowanceTaxFree: String(e.mealAllowanceTaxFree ?? 0),
          carAllowanceTaxFree: String(e.carAllowanceTaxFree ?? 0),
          teamLeaderAllowance: String(e.teamLeaderAllowance ?? 0),
          dailyOrHourlyWage: String(e.dailyOrHourlyWage ?? 0),
          dormitoryRoom: e.dormitoryRoom ?? '',
          carNumber: e.carNumber ?? '',
        };
      }
      setInlineEmpEdits(empEditMap);
      setEmpPortalSelectedEmpId((prev) =>
        prev > 0 ? prev : (data.employees[0]?.empId ?? 0)
      );
      setCalendarDaysInMonth(data.calendarDaysInMonth);
      setGrandTotal(data.grandTotal);
      setEntitySubtotals(data.entitySubtotals);
      setEmploymentSubtotals(data.employmentSubtotals);
      setMatrixRows(data.matrixRows);
      setVouchers(data.vouchers);
      setVoucherBalanceCheck(data.voucherBalanceCheck);
      setProbationTargets(data.probationTargets);
      setDormitoryResignees(data.dormitoryResignees);
      setPendingMappingCount(data.pendingMappingCount);
      setDailyLogs(data.dailyLogs);
      const dailyEditMap: Record<
        number,
        { workHours: string; dailyGrossPay: string; approvalDocNo: string }
      > = {};
      for (const l of data.dailyLogs) {
        dailyEditMap[l.logId] = {
          workHours: String(l.workHours ?? 8),
          dailyGrossPay: String(l.dailyGrossPay ?? 0),
          approvalDocNo: l.approvalDocNo ?? '',
        };
      }
      setInlineDailyEdits(dailyEditMap);
      setAdjustments(data.adjustments);
      const adjEditMap: Record<number, { amount: string; notes: string }> = {};
      for (const a of data.adjustments) {
        adjEditMap[a.adjId] = {
          amount: String(a.amount ?? 0),
          notes: a.notes ?? '',
        };
      }
      setInlineAdjEdits(adjEditMap);
      setMappingCandidates(data.mappingCandidates);
      setCaddyRecords(data.caddyRecords);
      setSalaryChanges(data.salaryChanges);
      setBusinessIncomes(data.businessIncomes);
      setSeveranceLedgers(data.severanceLedgers);
      setPhase2Summary(data.phase2Summary);
      setOnboardingProvisionings(data.onboardingProvisionings);
      setVehicleRegistrations(data.vehicleRegistrations);
      setMealDailyLogs(data.mealDailyLogs);
      setWeeklyMenus(data.weeklyMenus);
      setVendorContracts(data.vendorContracts);
      setHanaBsnFees(data.hanaBsnFees);
      setPhase3Summary(data.phase3Summary);
      setMonthlySchedules(data.monthlySchedules);
      setLeaveLedgers(data.leaveLedgers);
      setWeeklyDeptReports(data.weeklyDeptReports);
      setCertsAndWelfareList(data.certsAndWelfareList);
      setMandatoryTrainings(data.mandatoryTrainings);
      setAccidentReports(data.accidentReports);
      setItCenterTickets(data.itCenterTickets);
      setPhase4Summary(data.phase4Summary);
      setBulkImportHistory(data.bulkImportHistory);
      setPhase5Summary(data.phase5Summary);
      setRpaJobs(data.rpaJobs);
      setCollectorFeeds(data.collectorFeeds);
      setHeadcountReductionSummary(data.headcountReductionSummary);
      try {
        const [solapiStatus, amaranthStatus, loadedPreset] = await Promise.all([
          fetchHrSolapiConfigAndStatus(),
          fetchHrAmaranthApiConfigAndLogs(ym),
          fetchHrGlobalDefaultsConfig(),
        ]);
        setSolapiConfig(solapiStatus.config);
        setSolapiBalanceWon(solapiStatus.balanceWon);
        setSolapiAccountId(solapiStatus.accountId);
        setSmsLogs(solapiStatus.smsLogs);
        setAmaranthApiConfig(amaranthStatus.config);
        setAmaranthApiLogs(amaranthStatus.logs);
        setGlobalDefaults(loadedPreset);
        setEmpForm((prev) => ({
          ...prev,
          deptId: prev.deptId || (data.departments[0]?.deptId ?? 0),
          mealAllowanceTaxFree:
            prev.mealAllowanceTaxFree || String(loadedPreset.defaultMealAllowanceTaxFree),
          carAllowanceTaxFree:
            prev.carAllowanceTaxFree || '0',
          bankName: prev.bankName || loadedPreset.defaultBankName,
        }));
        setSelfOnboardForm((prev) => {
          const validDept = data.departments.find(
            (d) => d.deptId === prev.deptId && d.entityCode === prev.entityCode
          );
          const fallbackDept = data.departments.find((d) => d.entityCode === prev.entityCode);
          return {
            ...prev,
            deptId: validDept ? prev.deptId : (fallbackDept?.deptId ?? data.departments[0]?.deptId ?? prev.deptId),
          };
        });
        setDailyForm((prev) => ({
          ...prev,
          workHours: prev.workHours || String(loadedPreset.defaultDailyWorkHours),
          dailyGrossPay: prev.dailyGrossPay || String(loadedPreset.defaultDailyGrossWage),
        }));
      } catch {
        // 외부 API 상태 조회 실패 시 기본값 유지
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSuccessToast = useCallback((msg: string) => {
    setErrorMessage('');
    setStatusMessage(msg);
    setToastTick((prev) => prev + 1);
  }, []);

  const triggerErrorToast = useCallback((msg: string) => {
    setErrorMessage(msg);
    setToastTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => {
      setStatusMessage('');
    }, 5500);
    return () => clearTimeout(timer);
  }, [statusMessage, toastTick]);

  useEffect(() => {
    if (!lastDownloadedKey) return;
    const timer = setTimeout(() => {
      setLastDownloadedKey('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [lastDownloadedKey]);

  const tabTitleMap: Record<ActiveTab, string> = {
    ZERO_TOUCH_HQ: '스마트 무인 자동화 컨트롤타워 (무인 RPA · 셀프입사 · 자동수집)',
    MATRIX: '3개 법인 월급·노무비 계산표',
    VOUCHER: '더존 아마란스 급여전표',
    INPUTS: '일용직 출근기록 · 추가수당/공제 입력',
    PHASE2_TAX_EDI: '원천세 · 4대보험 신고 · 캐디 · 장애인부담금',
    PHASE2_SEVERANCE: '퇴직금 자동계산 · 14일 지급기한 · 사업소득',
    PHASE3_ONBOARDING: '입·퇴사 6단계 체크리스트 · 차량 주차등록',
    PHASE3_MEAL_APPROVALS: '식수(웰스토리) · 식대 · 도급 · 하나BSN 품의',
    PHASE4_SCHEDULE_REPORT: '월근무표 · 연차/휴무대장 · 수요일 인원보고',
    PHASE4_CERT_TRAINING_IT: '각종 증명서 · 5대 법정교육 · 산재 · IT요청',
    PHASE5_BULK_AND_DDAY: '마감일(D-Day) 알림판 · 엑셀 한번에 올리기',
    EMPLOYEES: '전 직원 명부 · 수습 3개월 알림 · 기숙사',
    HITL_MAPPING: '미등록 이름 확인 및 연결 (미분류 승인)',
    CONFIG: '4대보험 요율 · 부서 코드 설정',
  };

  const navigateToWorkspace = (
    targetTab: ActiveTab,
    _customNotice?: string,
    shouldScroll = true,
    targetSubView?: typeof zeroTouchSubView
  ) => {
    setIsSelfOnboardStandaloneView(false);
    setPortalViewMode('ADMIN_HQ');
    setShowIndividualAddForm(false);
    setActiveTab(targetTab);
    if (targetTab === 'ZERO_TOUCH_HQ') {
      if (targetSubView) {
        setZeroTouchSubView(targetSubView);
      } else if (zeroTouchSubView === 'ALL' || zeroTouchSubView === 'SELF_ONBOARD') {
        setZeroTouchSubView('COLLECTOR_AUDIT');
      }
    }
    setShowAllMenuGrid(false);
    setWorkspaceFlashTick((prev) => prev + 1);
    if (shouldScroll && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const runWithFeedback = async (pendingLabel: string, task: () => Promise<string>) => {
    setActionPendingLabel(pendingLabel);
    setLoading(true);
    setErrorMessage('');
    try {
      const doneMsg = await task();
      await fetchAllData(targetYm);
      triggerSuccessToast(doneMsg);
    } catch (err: unknown) {
      triggerErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      setActionPendingLabel('');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetYm) {
      fetchAllData(targetYm);
    }
  }, [targetYm, fetchAllData]);

  // 법인 토글 시 GrandTotal에서 끈 법인의 Subtotal을 빼는(Minus) 연산
  const getDisplayedSummaryMetric = (
    field:
      | 'headcount'
      | 'grossPay'
      | 'totalDeduction'
      | 'netPay'
      | 'totalEmployerBurden'
      | 'teamLeaderKonaAllowance'
      | 'totalCompanyCost'
  ): number | null => {
    if (!grandTotal) return null;
    let val = grandTotal[field];
    for (const disabledCode of disabledEntities) {
      const sub = entitySubtotals.find((s) => s.entityCode === disabledCode);
      if (sub) {
        val -= sub[field];
      }
    }
    return val;
  };

  const toggleEntityFilter = (code: EntityCode) => {
    const entityObj = entities.find((e) => e.entityCode === code);
    const korName = entityObj ? entityObj.entityName : code;
    const willBeDisabled = !disabledEntities.includes(code);
    setDisabledEntities((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    triggerSuccessToast(
      willBeDisabled
        ? `[${korName}] 법인을 화면 합계에서 제외했습니다. (다시 누르면 포함됩니다)`
        : `[${korName}] 법인을 화면 합계에 다시 포함했습니다.`
    );
  };

  const handleRunSettlement = async () => {
    if (!targetYm) return;
    await runWithFeedback(
      `[${targetYm}] 3개 법인 전 직원 급여·4대보험·원천세·더존 전표를 자동 정산하고 있습니다...`,
      async () => {
        const result = await runFirestorePayrollSettlement(targetYm);
        return `[${targetYm}] 전사 급여·전표 자동정산 완료! (대상 인원 ${result.settledCount}명, 부서별 회계전표 ${result.voucherCount}건 생성 완료)`;
      }
    );
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedName = deptForm.deptName;
    await runWithFeedback(`부서 [${savedName}] 정보를 저장하고 있습니다...`, async () => {
      await saveDepartmentToFirestore(deptForm);
      setDeptForm({ entityCode: 'BLACKSTONE', deptCode: '', deptName: '', costCenterCode: '' });
      return `부서 [${savedName}] 및 더존 코스트센터 저장이 완료되었습니다!`;
    });
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    const ym = rateForm.effectiveYm;
    await runWithFeedback(
      `[${ym}] 4대보험·세율 설정을 저장하고 전사 급여를 자동 재계산하고 있습니다...`,
      async () => {
        await saveStatutoryRateToFirestore({
          effectiveYm: rateForm.effectiveYm,
          npWorkerRate: Number(rateForm.npWorkerRate),
          npEmployerRate: Number(rateForm.npEmployerRate),
          npMinMonthlyIncome: Number(rateForm.npMinMonthlyIncome),
          npMaxMonthlyIncome: Number(rateForm.npMaxMonthlyIncome),
          hiWorkerRate: Number(rateForm.hiWorkerRate),
          hiEmployerRate: Number(rateForm.hiEmployerRate),
          ltciRateOfHi: Number(rateForm.ltciRateOfHi),
          eiWorkerRate: Number(rateForm.eiWorkerRate),
          eiEmployerRate: Number(rateForm.eiEmployerRate),
          iacEmployerRate: Number(rateForm.iacEmployerRate),
          dailyTaxFreeLimit: Number(rateForm.dailyTaxFreeLimit),
          dailyTaxCreditRate: Number(rateForm.dailyTaxCreditRate),
          dailyBaseTaxRate: Number(rateForm.dailyBaseTaxRate),
          dailyMinTaxThreshold: Number(rateForm.dailyMinTaxThreshold),
          localIncomeTaxRate: Number(rateForm.localIncomeTaxRate),
          stdIncomeTaxRate: Number(rateForm.stdIncomeTaxRate),
          caddyExpenseRate: Number(rateForm.caddyExpenseRate ?? 0),
          caddyEiWorkerRate: Number(rateForm.caddyEiWorkerRate ?? 0),
          caddyEiEmployerRate: Number(rateForm.caddyEiEmployerRate ?? 0),
          residentTaxRate: Number(rateForm.residentTaxRate ?? 0),
          residentTaxExemptionLimit: Number(rateForm.residentTaxExemptionLimit ?? 0),
          businessIncomeTaxRate: Number(rateForm.businessIncomeTaxRate ?? 0),
          disabledMandatoryRate: Number(rateForm.disabledMandatoryRate ?? 0),
          disabledBaseBurdenMonthly: Number(rateForm.disabledBaseBurdenMonthly ?? 0),
        });
        return `[${ym}] 법정 요율 설정 저장 및 전사 급여 자동 반영 완료!`;
      }
    );
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedName = empForm.empName;
    const savedNo = empForm.empNo;
    const existingEmp = employees.find((item) => item.empNo === empForm.empNo.trim());
    const matchedDept = departments.find((d) => d.deptId === Number(empForm.deptId));
    const resolvedEntityCode = matchedDept ? matchedDept.entityCode : empForm.entityCode;
    await runWithFeedback(
      `임직원 [${savedName} (${savedNo})] 정보를 저장하고 급여·차량·입퇴사 절차를 자동 연동하고 있습니다...`,
      async () => {
        await saveEmployeeToFirestore(
          {
            empNo: empForm.empNo,
            empName: empForm.empName,
            employmentType: empForm.employmentType,
            entityCode: resolvedEntityCode,
            deptId: Number(empForm.deptId),
            positionTitle: empForm.positionTitle,
            hireDate: empForm.hireDate,
            resignDate: empForm.resignDate ? empForm.resignDate : null,
            baseMonthlyPay: Number(empForm.baseMonthlyPay ?? 0),
            mealAllowanceTaxFree: Number(empForm.mealAllowanceTaxFree ?? 0),
            carAllowanceTaxFree: Number(empForm.carAllowanceTaxFree ?? 0),
            dailyOrHourlyWage: Number(empForm.dailyOrHourlyWage ?? 0),
            isTeamLeader: Number(empForm.isTeamLeader),
            teamLeaderAllowance: Number(empForm.teamLeaderAllowance ?? 0),
            konaCardNo: empForm.konaCardNo ? empForm.konaCardNo : null,
            bankCode: existingEmp?.bankCode ?? null,
            bankName: empForm.bankName ? empForm.bankName : null,
            accountNo: empForm.accountNo ? empForm.accountNo : null,
            accountHolder: empForm.accountHolder ? empForm.accountHolder : (empForm.empName || null),
            email: existingEmp?.email ?? null,
            phone: existingEmp?.phone ?? null,
            dormitoryRoom: empForm.dormitoryRoom ? empForm.dormitoryRoom : null,
            carNumber: empForm.carNumber ? empForm.carNumber : null,
            npExempt: existingEmp?.npExempt ?? 0,
            hiExempt: existingEmp?.hiExempt ?? 0,
            eiExempt: existingEmp?.eiExempt ?? 0,
            disabilityGrade: empForm.disabilityGrade,
          },
          { targetYm }
        );
        return `임직원 [${savedName} (${savedNo})] 저장 및 급여·차량·체크리스트 자동 연동 완료!`;
      }
    );
  };

  const handleAddDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const wDate = dailyForm.workDate;
    await runWithFeedback(
      `일용직 출근기록(${wDate})을 저장하고 일용직 세금·급여를 자동 정산하고 있습니다...`,
      async () => {
        await addDailyWorkerLogToFirestore({
          workDate: dailyForm.workDate,
          empId: Number(dailyForm.empId),
          workHours: Number(dailyForm.workHours ?? 8),
          dailyGrossPay: Number(dailyForm.dailyGrossPay),
          approvalDocNo: dailyForm.approvalDocNo,
          notes: dailyForm.notes,
        });
        return `일용직 출근기록(${wDate}) 등록 및 급여대장 자동 정산 완료!`;
      }
    );
  };

  const handleAddSingleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `추가 수당/공제 내역을 저장하고 급여대장에 자동 반영하고 있습니다...`,
      async () => {
        const res = await importAdjustmentsToFirestore(targetYm, [
          {
            empNoOrName: adjForm.empNoOrName,
            categoryText: adjForm.categoryText,
            amount: Number(adjForm.amount),
            approvalDocNo: adjForm.approvalDocNo,
            notes: adjForm.notes,
          },
        ]);
        return `추가 수당/공제 처리 완료! (정상 반영 ${res.insertedCount}건 / 미등록 이름 분리 ${res.isolatedCount}건)`;
      }
    );
  };

  const handleBulkAdjustmentUpload = async () => {
    if (!bulkAdjText.trim()) {
      triggerErrorToast('복사·붙여넣기 칸에 먼저 등록할 내용을 입력해 주세요.');
      return;
    }
    await runWithFeedback(
      `붙여넣은 여러 줄의 수당/공제 내역을 일괄 등록하고 급여를 자동 정산하고 있습니다...`,
      async () => {
        const lines = bulkAdjText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        const parsedRows = lines.map((line) => {
          const cols = line.split(/[,\t]/).map((c) => c.trim());
          return {
            empNoOrName: cols[0] ?? '',
            categoryText: cols[1] ?? '',
            amount: Number(cols[2] ?? 0),
            approvalDocNo: cols[3] ?? '',
            notes: cols[4] ?? '',
          };
        });

        const res = await importAdjustmentsToFirestore(targetYm, parsedRows);
        setBulkAdjText('');
        return `여러 줄 일괄 등록 완료! (정상 반영 ${res.insertedCount}건 / 미등록 이름 분리 ${res.isolatedCount}건)`;
      }
    );
  };

  // [글로벌 기본값 저장 및 일괄 반영 + 개별 인라인 수정 핸들러들]
  const handleSaveGlobalDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `전사 공통 글로벌 기본값(식대·차량·팀장수당·일당·기숙사비)을 저장하고 있습니다...`,
      async () => {
        const saved = await saveHrGlobalDefaultsConfigToFirestore(globalDefaults);
        setGlobalDefaults(saved);
        return `글로벌 기본값 저장 완료! 이제 모든 입력칸과 일괄 채우기 버튼에 이 기준이 자동 적용됩니다.`;
      }
    );
  };

  const handleApplyGlobalDefaultsToEmployees = async (
    mode: 'EMPTY_ONLY' | 'FORCE_ALL' | 'SPLIT_TAX_FREE_FROM_BASE'
  ) => {
    const labelMap: Record<typeof mode, string> = {
      EMPTY_ONLY: '빈칸(0원)인 직원들에게만 글로벌 기본값을 자동으로 채우고 있습니다...',
      FORCE_ALL: '전 직원 명부에 글로벌 기본값(식대·차량·팀장수당·일당·은행)을 일괄 적용하고 있습니다...',
      SPLIT_TAX_FREE_FROM_BASE:
        '전 직원의 월급 총액을 유지하면서 비과세(식대+차량)를 자동으로 쪼개어 절세 세팅하고 있습니다...',
    };
    await runWithFeedback(labelMap[mode], async () => {
      await saveHrGlobalDefaultsConfigToFirestore(globalDefaults);
      const msg = await applyGlobalDefaultsToAllEmployeesInFirestore(targetYm, mode);
      return msg;
    });
  };

  const handleSaveInlineEmpRow = async (emp: EmployeeMasterItem) => {
    const rowEdit = inlineEmpEdits[emp.empId];
    if (!rowEdit) return;
    await runWithFeedback(
      `[${emp.empName} (${emp.empNo})] 직원의 개별 급여·비과세·기숙사 정보를 즉시 수정하고 급여를 재계산하고 있습니다...`,
      async () => {
        const msg = await updateInlineEmployeeCompensationInFirestore(targetYm, {
          empId: emp.empId,
          baseMonthlyPay: Number(rowEdit.baseMonthlyPay ?? 0),
          mealAllowanceTaxFree: Number(rowEdit.mealAllowanceTaxFree ?? 0),
          carAllowanceTaxFree: Number(rowEdit.carAllowanceTaxFree ?? 0),
          teamLeaderAllowance: Number(rowEdit.teamLeaderAllowance ?? 0),
          dailyOrHourlyWage: Number(rowEdit.dailyOrHourlyWage ?? 0),
          dormitoryRoom: rowEdit.dormitoryRoom.trim() ? rowEdit.dormitoryRoom.trim() : null,
          carNumber: rowEdit.carNumber.trim() ? rowEdit.carNumber.trim() : null,
        });
        return msg;
      }
    );
  };

  const handleSplitSingleEmpRowTaxFree = async (emp: EmployeeMasterItem) => {
    const rowEdit = inlineEmpEdits[emp.empId];
    const currentBase = Number(rowEdit?.baseMonthlyPay ?? emp.baseMonthlyPay ?? 0);
    const currentMeal = Number(rowEdit?.mealAllowanceTaxFree ?? emp.mealAllowanceTaxFree ?? 0);
    const currentCar = Number(rowEdit?.carAllowanceTaxFree ?? emp.carAllowanceTaxFree ?? 0);
    const totalPay = currentBase + currentMeal + currentCar;
    const targetMeal = globalDefaults.defaultMealAllowanceTaxFree;
    const targetCar =
      emp.carNumber || rowEdit?.carNumber ? globalDefaults.defaultCarAllowanceTaxFree : 0;
    if (totalPay <= targetMeal + targetCar) {
      triggerErrorToast(
        `[${emp.empName}] 월급 총액이 비과세 합계보다 작아서 쪼갤 수 없습니다.`
      );
      return;
    }
    const newBase = totalPay - targetMeal - targetCar;
    await runWithFeedback(
      `[${emp.empName}] 총 월급(${formatNumber(totalPay)}원)은 그대로 유지하고 비과세 식대·차량유지비로 자동 분리하고 있습니다...`,
      async () => {
        await updateInlineEmployeeCompensationInFirestore(targetYm, {
          empId: emp.empId,
          baseMonthlyPay: newBase,
          mealAllowanceTaxFree: targetMeal,
          carAllowanceTaxFree: targetCar,
        });
        return `[${emp.empName}] 절세 쪼개기 완료! (기본급 ${formatNumber(newBase)}원 + 비과세식대 ${formatNumber(targetMeal)}원 + 비과세차량 ${formatNumber(targetCar)}원)`;
      }
    );
  };

  const handleApplyGlobalBatchAdjustments = async (
    presetType: 'DORM_ALL_RESIDENTS' | 'POSITION_ALL_LEADERS' | 'BONUS_ALL_REGULAR',
    customAmount?: number
  ) => {
    const batchTypeMap: Record<
      typeof presetType,
      'DORM_RESIDENTS_DEDUCTION' | 'TEAM_LEADER_POSITION_ALLOWANCE' | 'ALL_REGULAR_BONUS'
    > = {
      DORM_ALL_RESIDENTS: 'DORM_RESIDENTS_DEDUCTION',
      POSITION_ALL_LEADERS: 'TEAM_LEADER_POSITION_ALLOWANCE',
      BONUS_ALL_REGULAR: 'ALL_REGULAR_BONUS',
    };
    await runWithFeedback(
      `대상 직원 전원에게 글로벌 기준 금액을 한 번에 일괄 반영하고 급여를 재계산하고 있습니다...`,
      async () => {
        const msg = await applyGlobalBatchAdjustmentsInFirestore({
          targetYm,
          batchType: batchTypeMap[presetType],
          customAmount,
        });
        return msg;
      }
    );
  };

  const handleUpdateOrDeleteAdjustment = async (
    adj: PayrollAdjustmentItem,
    action: 'UPDATE' | 'DELETE'
  ) => {
    const edit = inlineAdjEdits[adj.adjId];
    await runWithFeedback(
      action === 'DELETE'
        ? `[${adj.empName}] 수당/공제 항목을 삭제하고 급여를 재계산하고 있습니다...`
        : `[${adj.empName}] 수당/공제 금액을 개별 수정하고 급여를 재계산하고 있습니다...`,
      async () => {
        const msg = await updateOrDeleteAdjustmentInFirestore({
          targetYm,
          adjId: adj.adjId,
          action,
          newAmount: edit ? Number(edit.amount ?? adj.amount) : adj.amount,
          newNotes: edit ? edit.notes : (adj.notes ?? ''),
        });
        return msg;
      }
    );
  };

  const handleApplyGlobalBatchDailyLogs = async () => {
    const wDate = dailyForm.workDate || `${targetYm}-01`;
    await runWithFeedback(
      `등록된 일용직 전원에게 [${wDate}] 글로벌 기본 근무시간·일당을 한 번에 일괄 등록하고 있습니다...`,
      async () => {
        const msg = await applyGlobalBatchDailyLogsInFirestore({
          workDate: wDate,
          overrideHours: Number(dailyForm.workHours || globalDefaults.defaultDailyWorkHours),
          overrideDailyWage: Number(
            dailyForm.dailyGrossPay || globalDefaults.defaultDailyGrossWage
          ),
          notes: dailyForm.approvalDocNo || `일용직 전원 일괄출근(${wDate})`,
        });
        return msg;
      }
    );
  };

  const handleUpdateOrDeleteDailyLog = async (
    log: DailyWorkerLogItem,
    action: 'UPDATE' | 'DELETE'
  ) => {
    const edit = inlineDailyEdits[log.logId];
    await runWithFeedback(
      action === 'DELETE'
        ? `[${log.empName}] (${log.workDate}) 출근기록을 삭제하고 급여를 재계산하고 있습니다...`
        : `[${log.empName}] (${log.workDate}) 근무시간·일당을 개별 수정하고 급여를 재계산하고 있습니다...`,
      async () => {
        const msg = await updateOrDeleteDailyLogInFirestore({
          targetYm,
          logId: log.logId,
          action,
          newWorkHours: edit ? Number(edit.workHours ?? log.workHours) : log.workHours,
          newDailyGrossPay: edit ? Number(edit.dailyGrossPay ?? log.dailyGrossPay) : log.dailyGrossPay,
          newApprovalDocNo: edit ? edit.approvalDocNo : (log.approvalDocNo ?? ''),
        });
        return msg;
      }
    );
  };

  const handleApproveMapping = async (candidateId: number) => {
    const targetId = selectedMappingTarget[candidateId];
    if (!targetId) {
      triggerErrorToast('오른쪽 선택 상자에서 연결할 정확한 직원 또는 항목을 먼저 골라주세요.');
      return;
    }
    await runWithFeedback(
      `미등록 이름을 연결 승인하고 대기 중이던 자료를 장부에 자동 반영하고 있습니다...`,
      async () => {
        const res = await approveHitlMappingInFirestore(candidateId, targetId);
        return `연결 승인 및 영구 기억 완료! (${res.resolvedCount}건 장부 자동 이관 및 급여 재계산 완료)`;
      }
    );
  };

  // Phase 2 핸들러들
  const handleAddCaddyRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `경기과 캐디 라운딩·수입 자료를 저장하고 산재·고용보험료를 자동 계산하고 있습니다...`,
      async () => {
        await addCaddyMonthlyRecordToFirestore({
          targetYm,
          empId: Number(caddyForm.empId),
          roundCount: Number(caddyForm.roundCount),
          totalCaddyFeeIncome: Number(caddyForm.totalCaddyFeeIncome),
          hireOrLeaveStatus: caddyForm.hireOrLeaveStatus,
          eventDate: caddyForm.eventDate,
          notes: caddyForm.notes,
        });
        return '경기과 캐디 과세자료 및 산재·고용보험 보수액 자동 계산 완료!';
      }
    );
  };

  const handleAddSalaryChange = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `근로자 월보수액 변경신고를 등록하고 직원 기본급 및 급여대장을 자동 갱신하고 있습니다...`,
      async () => {
        await addSalaryChangeNoticeToFirestore({
          changeDate: salChangeForm.changeDate,
          empId: Number(salChangeForm.empId),
          newMonthlyPay: Number(salChangeForm.newMonthlyPay),
          changeReason: salChangeForm.changeReason,
        });
        return '근로자 월보수액 변경신고 등록 및 직원 명부·급여대장 자동 동기화 완료!';
      }
    );
  };

  const handleAddBusinessIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(`사업소득(외부강사·자문) 지급명세서를 등록하고 있습니다...`, async () => {
      await addBusinessIncomeToFirestore({
        paymentDate: bizIncomeForm.paymentDate,
        entityCode: bizIncomeForm.entityCode,
        earnerName: bizIncomeForm.earnerName,
        earnerRegNoMasked: bizIncomeForm.earnerRegNoMasked,
        incomeTypeName: bizIncomeForm.incomeTypeName,
        grossAmount: Number(bizIncomeForm.grossAmount),
      });
      return '사업소득 지급명세서 등록 및 원천징수 세액 자동 계산 완료!';
    });
  };

  const handleCalculateSeverance = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `퇴직금(평균임금 vs 통상임금) 및 법정 14일 지급기한을 정밀 계산하고 있습니다...`,
      async () => {
        const res = await calculateAndSaveSeveranceToFirestore({
          empId: Number(severanceForm.empId),
          resignDate: severanceForm.resignDate,
          last3MonthsWages: Number(severanceForm.last3MonthsWages),
          annualBonusTotal: Number(severanceForm.annualBonusTotal ?? 0),
          unusedAnnualLeavePay: Number(severanceForm.unusedAnnualLeavePay ?? 0),
          dailyOrdinaryWage: Number(severanceForm.dailyOrdinaryWage ?? 0),
          retirementIncomeTax: Number(severanceForm.retirementIncomeTax ?? 0),
        });
        return `[${res.empName}] 퇴직금 산출 완료! (법정 지급기한: ${res.paymentDeadlineDate} 이내, 세후 지급액: ${formatNumber(res.netSeverancePay)}원)`;
      }
    );
  };

  // Phase 3 핸들러들
  const handleSaveProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `입·퇴사 6단계 체크리스트를 저장하고 주차관제 현황을 연동하고 있습니다...`,
      async () => {
        await saveOnboardingProvisioningToFirestore({
          targetYm,
          empId: Number(provForm.empId),
          workflowType: provForm.workflowType,
          eventDate: provForm.eventDate,
          amaranthErpRegistered: provForm.amaranthErpRegistered,
          recruitmentNoticeIssued: provForm.recruitmentNoticeIssued,
          laborContractSigned: provForm.laborContractSigned,
          emailAccountRequested: provForm.emailAccountRequested,
          idCardIssued: provForm.idCardIssued,
          vehicleRegistered: provForm.vehicleRegistered,
          mealFingerprintRegistered: provForm.mealFingerprintRegistered,
          resignationApprovalSubmitted: provForm.resignationApprovalSubmitted,
          internSchoolName: provForm.internSchoolName,
          internMentorName: provForm.internMentorName,
          notes: provForm.notes,
        });
        return '입·퇴사·실습생 6단계 체크리스트 저장 및 주차관제 연동 완료!';
      }
    );
  };

  const handleCompleteAllProvisioning = async (item: OnboardingProvisioningItem) => {
    await runWithFeedback(
      `[${item.empName}] 직원의 6단계 입·퇴사 절차를 일괄 완료 처리하고 있습니다...`,
      async () => {
        await completeAllProvisioningStepsInFirestore(
          targetYm,
          item.empId,
          item.workflowType,
          item.eventDate
        );
        return `[${item.empName}] 더존 ERP · 근로계약 · 이메일 · 사원증 · 차량 · 식수지문 6단계 일괄 완료 처리되었습니다!`;
      }
    );
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cNum = vehicleForm.carNumber;
    await runWithFeedback(`차량번호 [${cNum}] 주차관제 등록을 저장하고 있습니다...`, async () => {
      await addVehicleRegistrationToFirestore(vehicleForm);
      setVehicleForm({
        ...vehicleForm,
        ownerOrVisitorName: '',
        carNumber: '',
        carModel: '',
        visitPurpose: '',
        contactPhone: '',
      });
      return `차량번호 [${cNum}] 주차관제 시스템 등록 완료!`;
    });
  };

  const handleAddMealLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const mDate = mealForm.mealDate;
    await runWithFeedback(
      `${mDate} 식수 인원을 저장하고 3개 법인별 식대비 품의 금액을 집계하고 있습니다...`,
      async () => {
        await addMealDailyLogToFirestore({
          mealDate: mealForm.mealDate,
          deptId: Number(mealForm.deptId),
          breakfastCount: Number(mealForm.breakfastCount ?? 0),
          lunchCount: Number(mealForm.lunchCount ?? 0),
          dinnerCount: Number(mealForm.dinnerCount ?? 0),
          nightMealCount: Number(mealForm.nightMealCount ?? 0),
          unitMealPrice: Number(mealForm.unitMealPrice ?? 0),
          vatAmount: Number(mealForm.vatAmount ?? 0),
          notes: mealForm.notes,
        });
        return `[${mDate}] 식수현황 등록 및 3개 법인별 식대비 품의 집계 반영 완료!`;
      }
    );
  };

  const handleAddWeeklyMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const wLabel = weeklyMenuForm.weekLabel;
    await runWithFeedback(`주간식단표(${wLabel}) 공지 내역을 등록하고 있습니다...`, async () => {
      await addWeeklyMenuNoticeToFirestore(weeklyMenuForm);
      setWeeklyMenuForm({
        weekLabel: '',
        startDate: '',
        endDate: '',
        groupwareNoticeNo: '',
        welstoryMenuSummary: '',
      });
      return `주간식단표 (${wLabel}) 그룹웨어 공지 등록 완료!`;
    });
  };

  const handleAddVendorContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const vName = vendorForm.vendorName;
    await runWithFeedback(
      `고정거래처 [${vName}] 도급비 및 직원수당 품의 내역을 저장하고 있습니다...`,
      async () => {
        await addVendorMonthlyContractToFirestore({
          targetYm,
          deptId: Number(vendorForm.deptId),
          vendorName: vendorForm.vendorName,
          contractTitle: vendorForm.contractTitle,
          baseContractFee: Number(vendorForm.baseContractFee ?? 0),
          staffAllowanceAmount: Number(vendorForm.staffAllowanceAmount ?? 0),
          vatAmount: Number(vendorForm.vatAmount ?? 0),
          taxInvoiceNo: vendorForm.taxInvoiceNo,
        });
        return `고정거래처 [${vName}] 도급비 및 직원수당 납부 품의 생성 완료!`;
      }
    );
  };

  const handleAddHanaBsnFee = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `하나BSN 부서별 용역비 지급 품의 내역을 저장하고 있습니다...`,
      async () => {
        await addHanaBsnServiceFeeToFirestore({
          targetYm,
          deptId: Number(hanaBsnForm.deptId),
          dispatchedHeadcount: Number(hanaBsnForm.dispatchedHeadcount ?? 0),
          supplyAmount: Number(hanaBsnForm.supplyAmount ?? 0),
          vatAmount: Number(hanaBsnForm.vatAmount ?? 0),
          invoiceNo: hanaBsnForm.invoiceNo,
        });
        return '하나BSN 부서별 용역비 지급 품의(락산수/KMG) 등록 완료!';
      }
    );
  };

  // Phase 4 핸들러들
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(`부서별 월 근무표 취합 내역을 저장하고 있습니다...`, async () => {
      await saveMonthlyWorkScheduleToFirestore({
        targetYm,
        deptId: Number(scheduleForm.deptId),
        totalHeadcount: Number(scheduleForm.totalHeadcount ?? 0),
        scheduledWorkDaysTotal: Number(scheduleForm.scheduledWorkDaysTotal ?? 0),
        scheduledOffDaysTotal: Number(scheduleForm.scheduledOffDaysTotal ?? 0),
        plannedOvertimeHours: Number(scheduleForm.plannedOvertimeHours ?? 0),
        submissionStatus: scheduleForm.submissionStatus,
        approvalDocNo: scheduleForm.approvalDocNo,
      });
      return '부서별 월 근무표 취합 및 품의 등록 완료!';
    });
  };

  const handleApproveAllSchedules = async () => {
    await runWithFeedback(
      `전 부서 월 근무표 최종취합본을 일괄 품의 완료 처리하고 있습니다...`,
      async () => {
        const count = await approveAllMonthlySchedulesInFirestore(
          targetYm,
          `${targetYm}-말일최종취합본품의`
        );
        return `매월 말일 월 근무표 최종취합본 (${count}개 부서) 일괄 품의 완료 처리되었습니다!`;
      }
    );
  };

  const handleSaveLeaveLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(`임직원 연차대장 및 잔여휴무 내역을 저장하고 있습니다...`, async () => {
      await saveLeaveAndOffDayLedgerToFirestore({
        targetYm,
        empId: Number(leaveForm.empId),
        annualLeaveGranted: Number(leaveForm.annualLeaveGranted ?? 0),
        annualLeaveUsed: Number(leaveForm.annualLeaveUsed ?? 0),
        monthlyOffGranted: Number(leaveForm.monthlyOffGranted ?? 0),
        monthlyOffUsed: Number(leaveForm.monthlyOffUsed ?? 0),
        approvalDocNo: leaveForm.approvalDocNo,
      });
      return '임직원 연차대장 및 잔여휴무 마감근무표 반영 완료!';
    });
  };

  const handleAddWeeklyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `부서 주간업무보고서 및 팀장/파트장 휴무일정을 저장하고 있습니다...`,
      async () => {
        await addWeeklyDeptReportToFirestore({
          reportDate: weeklyReportForm.reportDate,
          reportWeekLabel: weeklyReportForm.reportWeekLabel,
          deptId: Number(weeklyReportForm.deptId),
          authorName: weeklyReportForm.authorName,
          thisWeekAchievements: weeklyReportForm.thisWeekAchievements,
          nextWeekPlans: weeklyReportForm.nextWeekPlans,
          managerOffDaysSchedule: weeklyReportForm.managerOffDaysSchedule,
        });
        setWeeklyReportForm({
          ...weeklyReportForm,
          thisWeekAchievements: '',
          nextWeekPlans: '',
          managerOffDaysSchedule: '',
        });
        return '부서 주간업무보고서 및 팀장/파트장 휴무일 취합 등록 완료!';
      }
    );
  };

  const handleAddCertAndWelfare = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(`제증명 발급 및 복리후생 내역을 저장하고 있습니다...`, async () => {
      await addCertificateAndWelfareToFirestore({
        requestDate: certForm.requestDate,
        category: certForm.category,
        entityCode: certForm.entityCode,
        empId: Number(certForm.empId),
        purposeOrDetail: certForm.purposeOrDetail,
        approvalDocNo: certForm.approvalDocNo,
        settlementAmount: Number(certForm.settlementAmount ?? 0),
      });
      return '제증명·완납증명·원천징수영수증·건강검진·휴가지원·연말정산 등록 완료!';
    });
  };

  const handleCompleteTraining = async (empId: number, empName: string) => {
    await runWithFeedback(
      `[${empName}] 직원의 5대 법정의무교육 전 과목 이수를 처리하고 있습니다...`,
      async () => {
        await completeAllMandatoryTrainingInFirestore(targetYm.slice(0, 4), empId);
        return `[${empName}] 5대 법정의무교육(성희롱·괴롭힘·개인정보·퇴직연금·산업안전) 전 과목 이수 완료!`;
      }
    );
  };

  const handleAddAccidentReport = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      `산업재해조사표를 등록하고 발생 후 30일 제출기한을 산출하고 있습니다...`,
      async () => {
        await addIndustrialAccidentReportToFirestore({
          accidentDate: accidentForm.accidentDate,
          empId: Number(accidentForm.empId),
          accidentSummary: accidentForm.accidentSummary,
          internalApprovalDocNo: accidentForm.internalApprovalDocNo,
          filingStatus: accidentForm.filingStatus,
        });
        return '산업재해조사표 등록 및 사고 발생 후 30일 이내 제출기한 산출 완료!';
      }
    );
  };

  const handleAddItTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(`IT센터 협업 요청 티켓을 발행하고 있습니다...`, async () => {
      await addItCenterTicketToFirestore(itTicketForm);
      setItTicketForm({
        ...itTicketForm,
        issueDescription: '',
      });
      return 'IT센터 그룹웨어·조직도·임직원정보 협업 요청 티켓 발행 완료!';
    });
  };

  const handleResolveItTicket = async (ticketId: number) => {
    await runWithFeedback(`IT센터 협업 요청 티켓을 조치 완료로 변경하고 있습니다...`, async () => {
      await resolveItCenterTicketInFirestore(ticketId);
      return 'IT센터 협업 요청 조치 완료 처리되었습니다!';
    });
  };

  const handleExportExcel = (
    type:
      | 'kmg-expenditure'
      | 'team-leader-kona'
      | 'bank-transfer'
      | 'amaranth-voucher'
      | 'payslips'
      | 'hr-lifecycle-report'
  ) => {
    const labelMap: Record<typeof type, string> = {
      'kmg-expenditure': 'KMG 노무비 지출품의서 엑셀',
      'team-leader-kona': '팀장 코나카드 보직수당 충전 엑셀',
      'bank-transfer': '하나은행 급여이체 및 지출품의 엑셀',
      'amaranth-voucher': '더존 아마란스 급여전표 엑셀',
      payslips: '전 직원 개인별 급여명세서 엑셀',
      'hr-lifecycle-report': '기숙사 퇴사자·수습 3개월 무료숙박권 엑셀',
    };
    downloadHrExcelWorkbook(type, targetYm, {
      employees,
      entitySubtotals,
      matrixRows,
      vouchers,
      probationTargets,
      dormitoryResignees,
    });
    setLastDownloadedKey(type);
    triggerSuccessToast(
      `[엑셀 다운로드 완료] "${labelMap[type]}" 파일이 컴퓨터(다운로드 폴더)에 저장되었습니다!`
    );
  };

  const handleExportPhase2Excel = (
    type:
      | 'edi-4major-pack'
      | 'caddy-total-pack'
      | 'daily-work-confirm'
      | 'withholding-local-resident-tax'
      | 'payment-statements-disabled-levy'
      | 'severance-statement'
  ) => {
    const labelMap: Record<typeof type, string> = {
      'edi-4major-pack': '4대보험 취득·상실·월보수액 변경신고 EDI 엑셀',
      'caddy-total-pack': '경기과 캐디 산재·고용·과세자료 통합 엑셀',
      'daily-work-confirm': '일용직 근로내용확인신고서 엑셀',
      'withholding-local-resident-tax': '원천세·지방소득세·주민세(종업원분) 신고 엑셀',
      'payment-statements-disabled-levy': '지급명세서 및 장애인 고용부담금 산정 엑셀',
      'severance-statement': '퇴직금 정밀 산정내역서 엑셀',
    };
    downloadPhase2ExcelWorkbook(type, targetYm, {
      phase2Summary,
      caddyRecords,
      dailyLogs,
      matrixRows,
      businessIncomes,
      severanceLedgers,
    });
    setLastDownloadedKey(type);
    triggerSuccessToast(
      `[엑셀 다운로드 완료] "${labelMap[type]}" 파일이 컴퓨터(다운로드 폴더)에 저장되었습니다!`
    );
  };

  const handleExportPhase3Excel = (
    type:
      | 'onboarding-amaranth-pack'
      | 'parking-vehicle-pack'
      | 'welstory-meal-pack'
      | 'meal-expense-approval'
      | 'vendor-contract-approval'
      | 'hanabsn-service-approval'
  ) => {
    const labelMap: Record<typeof type, string> = {
      'onboarding-amaranth-pack': '입·퇴사 6단계 체크리스트 및 더존 ERP 등록 엑셀',
      'parking-vehicle-pack': '주차관제 시스템 차량등록 대장 엑셀',
      'welstory-meal-pack': '삼성웰스토리 월간 식수현황 및 주간식단 엑셀',
      'meal-expense-approval': '3개 법인별 식대비 지급 품의서 엑셀',
      'vendor-contract-approval': '고정거래처 도급비·직원수당 납부 품의서 엑셀',
      'hanabsn-service-approval': '하나BSN 부서별 용역비 지급 품의서 엑셀',
    };
    downloadPhase3ExcelWorkbook(type, targetYm, {
      onboardingProvisionings,
      vehicleRegistrations,
      mealDailyLogs,
      weeklyMenus,
      vendorContracts,
      hanaBsnFees,
      phase3Summary,
    });
    setLastDownloadedKey(type);
    triggerSuccessToast(
      `[엑셀 다운로드 완료] "${labelMap[type]}" 파일이 컴퓨터(다운로드 폴더)에 저장되었습니다!`
    );
  };

  const handleExportPhase4Excel = (
    type:
      | 'monthly-schedule-leave-pack'
      | 'wednesday-headcount-weekly-report'
      | 'certs-withholding-welfare-pack'
      | 'mandatory-training-accident-it-pack'
  ) => {
    const labelMap: Record<typeof type, string> = {
      'monthly-schedule-leave-pack': '월 근무표 취합본 및 연차·잔여휴무 대장 엑셀',
      'wednesday-headcount-weekly-report': '수요일 이사님 인원변동 보고 및 주간업무 엑셀',
      'certs-withholding-welfare-pack': '제증명·완납증명·원천징수영수증·복리후생 엑셀',
      'mandatory-training-accident-it-pack': '5대 법정교육·산재 30일 기한·IT센터 협업 엑셀',
    };
    downloadPhase4ExcelWorkbook(type, targetYm, {
      monthlySchedules,
      leaveLedgers,
      weeklyDeptReports,
      certsAndWelfareList,
      mandatoryTrainings,
      accidentReports,
      itCenterTickets,
      phase4Summary,
      matrixRows,
    });
    setLastDownloadedKey(type);
    triggerSuccessToast(
      `[엑셀 다운로드 완료] "${labelMap[type]}" 파일이 컴퓨터(다운로드 폴더)에 저장되었습니다!`
    );
  };

  // Phase 5 핸들러들 (엑셀 양식 다운로드 & 엑셀 일괄 업로드 + HITL 미분류 격리)
  const handleDownloadBulkTemplate = (importType: BulkImportTargetType) => {
    const labelMap: Record<BulkImportTargetType, string> = {
      EMPLOYEES_BULK: '임직원 명부 일괄 업로드 표준양식(.xlsx)',
      DAILY_LOGS_BULK: '일용직 출근일지 일괄 업로드 표준양식(.xlsx)',
      CADDY_BULK: '경기과 캐디 라운딩·입이직 업로드 표준양식(.xlsx)',
      MEAL_LOGS_BULK: '삼성웰스토리 일일 식수현황 업로드 표준양식(.xlsx)',
    };
    downloadBulkImportTemplateExcel(importType, targetYm);
    setLastDownloadedKey(importType);
    triggerSuccessToast(
      `[표준양식 다운로드 완료] "${labelMap[importType]}" 파일이 컴퓨터에 저장되었습니다! 내용을 채워 업로드하세요.`
    );
  };

  const handleBulkExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true);
    setActionPendingLabel(
      `엑셀 파일 [${file.name}] 데이터를 읽어서 저장하고 전사 급여를 자동 정산하고 있습니다...`
    );
    setErrorMessage('');
    try {
      const historyItem = await processBulkExcelUploadToFirestore(
        targetYm,
        selectedBulkType,
        file
      );
      await fetchAllData(targetYm);
      triggerSuccessToast(
        `[엑셀 일괄 업로드 완료] 파일 [${historyItem.fileName}] 총 ${historyItem.totalRows}건 중 정상 등록 ${historyItem.importedRows}건 / 미등록 이름 분리 ${historyItem.isolatedHitlRows}건 처리 완료!`
      );
    } catch (err: unknown) {
      triggerErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingExcel(false);
      setActionPendingLabel('');
      e.target.value = '';
    }
  };

  // =========================================================================
  // [Phase 6] 스마트 무인 자동화 통합 컨트롤타워 핸들러
  // =========================================================================
  const handleDispatchAllRpaJobs = async () => {
    await runWithFeedback(
      `[무인 RPA 일괄 실행] 6대 아마란스 전자결재 · 홈택스 세무신고 · 세미나용 3개 법인 완납증명서 발급 · 4대보험 EDI · 하나은행 대량이체 대기를 일괄 실행하고 있습니다...`,
      async () => {
        const count = await syncAndDispatchAllRpaJobsInFirestore(targetYm);
        return `[전 과정 무인 RPA 일괄 완료] 총 ${count}건의 그룹웨어 전자결재 상신·홈택스/4대보험 EDI 신고·3개 법인 완납증명서 자동발급·은행 이체대기 등록이 완료되었습니다!`;
      }
    );
  };

  const handleRunMagicAllInOne = async () => {
    await runWithFeedback(
      `[초간단 마법 버튼 실행 중] ① 기계 기록 모으기 → ② 3개 회사 월급·세금 자동 계산 → ③ 더존 아마란스 결재·국세청·4대보험 신고를 순서대로 한 번에 처리하고 있습니다...`,
      async () => {
        const syncedCount = await triggerCollectorSyncInFirestore(targetYm, 'ALL');
        await runFirestorePayrollSettlement(targetYm);
        await executeAmaranthRestApiModuleInFirestore(targetYm, 'ALL');
        const rpaCount = await syncAndDispatchAllRpaJobsInFirestore(targetYm);
        return `[1번~3번 한 번에 완료!] 기계 기록(${syncedCount}건) 수집 → 전 직원 월급·세금 계산 → 더존 결재 및 외부 신고(${rpaCount}건)까지 모두 끝났습니다! 이제 4번 문자 보내기만 누르시면 됩니다.`;
      }
    );
  };

  const handleApproveSingleRpaJob = async (jobId: string, jobTitle: string) => {
    await runWithFeedback(
      `[무인 RPA 봇 실행] "${jobTitle}" 작업을 외부 포털 및 그룹웨어에 자동 집행하고 있습니다...`,
      async () => {
        const updated = await approveSingleRpaJobInFirestore(jobId, targetYm);
        return `[RPA 실행 완료] "${updated.jobTitle}" 접수/문서번호 [${updated.receiptNoOrDocNo}] 처리 완료!`;
      }
    );
  };

  const handleTriggerCollectorSync = async (
    sourceSystem: CollectorSourceSystemType | 'ALL',
    label: string
  ) => {
    await runWithFeedback(
      `[현장 단말기 무인 수집 데몬] "${label}" 파이프라인에서 원천 데이터를 자동 수집·동기화하고 있습니다...`,
      async () => {
        const totalSynced = await triggerCollectorSyncInFirestore(targetYm, sourceSystem);
        return `[무인 수집 파이프라인 동기화 완료] "${label}" 총 ${totalSynced}건 자동 수집 및 3개 법인 급여·전표 마트 직결 완료!`;
      }
    );
  };

  const handleSubmitSelfOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfOnboardForm.empName.trim()) {
      triggerErrorToast('입사자 성명을 입력해 주세요.');
      return;
    }
    await runWithFeedback(
      `[합격자 셀프 입사등록] ${selfOnboardForm.empName}님의 인사마스터·근로계약 전자서명·주차관제·법정연차·5대 의무교육·급여원장 6단계를 무인 직결하고 있습니다...`,
      async () => {
        const res = await submitSelfOnboardingInFirestore({
          empName: selfOnboardForm.empName,
          entityCode: selfOnboardForm.entityCode,
          deptId: Number(selfOnboardForm.deptId),
          employmentType: selfOnboardForm.employmentType,
          hireDate: selfOnboardForm.hireDate || `${targetYm}-01`,
          baseMonthlyPay: Number(selfOnboardForm.baseMonthlyPay),
          bankName: selfOnboardForm.bankName,
          bankAccountNo: selfOnboardForm.bankAccountNo,
          phone: selfOnboardForm.phone,
          carNumber: selfOnboardForm.carNumber,
          usesDormitory: selfOnboardForm.usesDormitory,
          dormRoomNumber: selfOnboardForm.dormRoomNumber,
          dependentCount: Number(selfOnboardForm.dependentCount),
          digitalSignatureName:
            selfOnboardForm.digitalSignatureName || selfOnboardForm.empName,
        });
        setSelfOnboardForm((prev) => ({
          ...prev,
          empName: '',
          bankAccountNo: '',
          phone: '',
          carNumber: '',
          dormRoomNumber: '',
          digitalSignatureName: '',
        }));
        return `[셀프 입사등록 100% 무인 완료] ${res.empName}님(사번: ${res.empNo}) 등록 완료! 인사담당자 타이핑 없이 근로계약·주차관제·연차·법정교육·급여원장까지 즉시 연동되었습니다.`;
      }
    );
  };

  const handleCopySelfOnboardingLink = async () => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://belleforet-hr.web.app';
    const url = `${origin}/?mode=self-onboarding`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      triggerSuccessToast(
        `[합격자 발송용 모바일 셀프 입사링크 복사 완료] "${url}" 주소를 카카오톡/문자로 합격자에게 보내면 본인이 직접 입력·전자서명합니다!`
      );
    } catch {
      triggerSuccessToast(`합격자 셀프 입사링크: ${url}`);
    }
  };

  const handleCopyPortalLink = async (
    queryMode: 'self-onboarding' | 'emp-portal' | 'dept-portal' | 'qr-poster',
    label: string
  ) => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://belleforet-hr.web.app';
    const url = `${origin}/?mode=${queryMode}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      triggerSuccessToast(
        `[${label} 링크 복사 완료] "${url}" 주소를 단톡방/공지에 공유하면 인사과 전화·방문 없이 본인이 직접 처리합니다!`
      );
    } catch {
      triggerSuccessToast(`${label} 링크: ${url}`);
    }
  };

  const handleSwitchPortalMode = (nextMode: PortalViewMode, _notice?: string) => {
    setPortalViewMode(nextMode);
    setIsSelfOnboardStandaloneView(nextMode === 'SELF_ONBOARDING');
    if (nextMode === 'SELF_ONBOARDING') {
      setActiveTab('ZERO_TOUCH_HQ');
      setZeroTouchSubView('SELF_ONBOARD');
    } else if (nextMode === 'ADMIN_HQ') {
      if (zeroTouchSubView === 'SELF_ONBOARD') {
        setZeroTouchSubView('COLLECTOR_AUDIT');
      }
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectSmsPreset = (preset: HrSmsCategoryType) => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://belleforet-hr.web.app';

    if (preset === 'SELF_ONBOARDING_INVITE') {
      setSmsQuickForm((prev) => ({
        ...prev,
        category: 'SELF_ONBOARDING_INVITE',
        categoryLabel: '합격자 모바일 셀프 입사포털 링크 안내',
        subject: '[벨포레 인사팀] 모바일 셀프 입사등록 안내',
        messageBody: `[벨포레 리조트 인사팀]\n#{이름}님, 입사를 진심으로 환영합니다.\n\n별도 서류 제출 없이 아래 모바일 셀프 입사포털 링크에 접속하시어 급여계좌·차량번호·전자근로계약 서명을 완료해 주시기 바랍니다.\n\n▶ 모바일 셀프 입사포털 바로가기:\n${origin}/?mode=self-onboarding`,
      }));
    } else if (preset === 'EMP_PORTAL_PAYSLIP_NOTICE') {
      setSmsQuickForm((prev) => ({
        ...prev,
        category: 'EMP_PORTAL_PAYSLIP_NOTICE',
        categoryLabel: '임직원 모바일 급여명세서 · 증명서 셀프포털 안내',
        subject: '[벨포레] 급여명세서·증명서 셀프포털 안내',
        messageBody: `[벨포레 리조트 스마트 워크 안내]\n#{이름}님, 당월 급여명세서 조회 및 재직/원천징수 증명서 1초 발급, 잔여연차 확인은 아래 임직원 전용 보안 포털에서 본인 인증 후 즉시 이용하실 수 있습니다.\n\n▶ 임직원 셀프포털 바로가기:\n${origin}/?mode=emp-portal`,
      }));
    } else if (preset === 'DEPT_MANAGER_PORTAL_NOTICE') {
      setSmsQuickForm((prev) => ({
        ...prev,
        category: 'DEPT_MANAGER_PORTAL_NOTICE',
        categoryLabel: '현업 부서장 전용 직결 포털 안내',
        subject: '[벨포레] 부서장 전용 업무포털 안내',
        messageBody: `[벨포레 리조트 부서장 전용 포털]\n#{이름}님, 부서 일용직 출근기록 입력·외부 방문차량(LPR) 등록·수요일 인원보고·월근무표 등록은 아래 부서장 전용 포털에서 직접 처리해 주시기 바랍니다.\n\n▶ 부서장 전용 포털 바로가기:\n${origin}/?mode=dept-portal`,
      }));
    } else {
      setSmsQuickForm((prev) => ({
        ...prev,
        category: 'CUSTOM_HR_MESSAGE',
        categoryLabel: '인사팀 개별 공지 안내',
        subject: '[벨포레 리조트 인사팀 안내]',
      }));
    }
    triggerSuccessToast('선택한 안내문 양식이 문자 발송창에 자동 입력되었습니다.');
  };

  const handleSaveSolapiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await runWithFeedback(
      '[솔라피(Solapi) 설정 저장] API Key · 사전등록 발신번호 · 카카오 비즈니스 PFID/템플릿 설정을 저장하고 잔액을 조회하고 있습니다...',
      async () => {
        await saveHrSolapiConfigToFirestore({
          apiKey: solapiConfig.apiKey,
          apiSecret: solapiConfig.apiSecret,
          senderNumber: solapiConfig.senderNumber,
          useKakaoAlimtalk: solapiConfig.useKakaoAlimtalk,
          pfId: solapiConfig.pfId,
          templateId: solapiConfig.templateId,
          kakaoApprovedTemplateBody: solapiConfig.kakaoApprovedTemplateBody,
        });
        return `[솔라피 발송 설정 저장 완료] 발신번호(${solapiConfig.senderNumber}) 및 ${
          solapiConfig.useKakaoAlimtalk
            ? '카카오 알림톡(+실패 시 LMS 대체발송)'
            : '일반 장문문자(LMS)'
        } 설정이 적용되었습니다!`;
      }
    );
  };

  const handleSendSingleSolapiSms = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = smsQuickForm.recipientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      triggerErrorToast('수신자 휴대폰 번호(예: 010-1234-5678)를 정확히 입력해 주세요.');
      return;
    }
    const targetName = smsQuickForm.recipientName.trim() || '합격자/임직원';

    await runWithFeedback(
      `[솔라피 실시간 문자/알림톡 발송] ${targetName}(${smsQuickForm.recipientPhone})님께 "${smsQuickForm.categoryLabel}" 메시지를 발송하고 있습니다...`,
      async () => {
        const res = await dispatchHrSolapiMessageInFirestore({
          category: smsQuickForm.category,
          categoryLabel: smsQuickForm.categoryLabel,
          subject: smsQuickForm.subject,
          messageBodyTemplate: smsQuickForm.messageBody,
          recipients: [{ name: targetName, phone: cleanPhone }],
        });
        return `[솔라피 발송 완료] ${res.detailMessage}`;
      }
    );
  };

  const handleSendBulkEmployeeSolapiSms = async () => {
    const validEmps = employees.filter(
      (em) => (em.phone || '').replace(/[^0-9]/g, '').length >= 10
    );
    if (validEmps.length === 0) {
      triggerErrorToast(
        '인사마스터에 유효한 휴대폰 번호(010-XXXX-XXXX)가 등록된 직원이 없습니다. 개별 휴대폰 번호 입력란을 이용해 주세요.'
      );
      return;
    }

    await runWithFeedback(
      `[전 직원 일괄 솔라피 문자/알림톡 발송] 연락처가 등록된 임직원 ${validEmps.length}명 전원에게 "${smsQuickForm.categoryLabel}" 안내를 일괄 발송하고 있습니다...`,
      async () => {
        const res = await dispatchHrSolapiMessageInFirestore({
          category: smsQuickForm.category,
          categoryLabel: smsQuickForm.categoryLabel,
          subject: smsQuickForm.subject,
          messageBodyTemplate: smsQuickForm.messageBody,
          recipients: validEmps.map((em) => ({
            name: em.empName,
            phone: em.phone || '',
          })),
        });
        return `[임직원 일괄 발송 완료] ${res.detailMessage}`;
      }
    );
  };

  const handleOpenMobileSmsUri = () => {
    const cleanPhone = smsQuickForm.recipientPhone.replace(/[^0-9]/g, '');
    const targetName = smsQuickForm.recipientName.trim() || '귀하';
    const body = smsQuickForm.messageBody.replace(/#\{이름\}/g, targetName);
    if (typeof window !== 'undefined') {
      const uri = `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
      window.location.href = uri;
      triggerSuccessToast(
        '기기의 기본 문자(메시지) 앱을 호출했습니다. 전송 버튼을 눌러 발송하세요.'
      );
    }
  };

  const handleSaveAmaranthApiConfig = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await runWithFeedback(
      '[더존 아마란스 10 RESTful API 설정 저장] 게이트웨이 주소 · 3개 법인 회사코드 · OAuth2/SAML SSO · 전자결재 Webhook 설정을 저장하고 있습니다...',
      async () => {
        await saveHrAmaranthApiConfigToFirestore({
          baseUrl: amaranthApiConfig.baseUrl,
          companyCodeBlackstone: amaranthApiConfig.companyCodeBlackstone,
          companyCodeKmg: amaranthApiConfig.companyCodeKmg,
          companyCodeRaksansu: amaranthApiConfig.companyCodeRaksansu,
          oauthClientId: amaranthApiConfig.oauthClientId,
          oauthAccessToken: amaranthApiConfig.oauthAccessToken,
          callerSecretKey: amaranthApiConfig.callerSecretKey,
          ssoProviderType: amaranthApiConfig.ssoProviderType,
          webhookCallbackUrl: amaranthApiConfig.webhookCallbackUrl,
          autoSyncEnabled: amaranthApiConfig.autoSyncEnabled,
        });
        return `[더존 아마란스 10 Open API 설정 완료] 게이트웨이(${amaranthApiConfig.baseUrl}) 및 3개 법인 코드·SSO(${amaranthApiConfig.ssoProviderType})·Webhook 설정이 저장되었습니다!`;
      }
    );
  };

  const handleExecuteAmaranthRestApiModule = async (
    moduleType: HrAmaranthApiModuleType | 'ALL',
    label: string
  ) => {
    await runWithFeedback(
      `[더존 아마란스 10 RESTful API 실행] "${label}" 엔드포인트를 호출하여 데이터를 양방향 동기화·상신하고 있습니다...`,
      async () => {
        return await executeAmaranthRestApiModuleInFirestore(targetYm, moduleType);
      }
    );
  };

  const handleVerifyEmpPortalPin = (e: React.FormEvent) => {
    e.preventDefault();
    const selEmp = employees.find((em) => em.empId === Number(empPortalSelectedEmpId));
    if (!selEmp) {
      triggerErrorToast('본인 성명을 먼저 선택해 주세요.');
      return;
    }
    const cleanInput = empPortalPinInput.trim();
    const empNoTail = selEmp.empNo.slice(-4);
    const phoneDigits = (selEmp.phone || '').replace(/\D/g, '');
    const phoneTail = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '';
    const acctDigits = (selEmp.accountNo || '').replace(/\D/g, '');
    const acctTail = acctDigits.length >= 4 ? acctDigits.slice(-4) : '';

    if (
      cleanInput &&
      (cleanInput === selEmp.empNo ||
        cleanInput === empNoTail ||
        (phoneTail && cleanInput === phoneTail) ||
        (acctTail && cleanInput === acctTail))
    ) {
      setEmpPortalVerifiedEmpId(selEmp.empId);
      triggerSuccessToast(
        `[본인 인증 완료] ${selEmp.empName}(${selEmp.empNo})님의 개인 급여명세서 · 잔여연차 · 증명서 발급 화면이 잠금 해제되었습니다!`
      );
    } else {
      triggerErrorToast(
        `인증코드가 일치하지 않습니다. 사번(${selEmp.empNo}) 또는 사번/계좌 뒤 4자리(${empNoTail})를 입력해 주세요.`
      );
    }
  };

  const handleAutoUnlockEmpPortalForDemo = () => {
    const selEmp = employees.find((em) => em.empId === Number(empPortalSelectedEmpId));
    if (!selEmp) return;
    setEmpPortalPinInput(selEmp.empNo);
    setEmpPortalVerifiedEmpId(selEmp.empId);
    triggerSuccessToast(
      `[본인 인증 즉시 해제] ${selEmp.empName}(${selEmp.empNo})님의 급여명세서 및 셀프서비스 포털이 열렸습니다!`
    );
  };

  const handleIssueSelfCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empPortalSelectedEmpId) {
      triggerErrorToast('본인 성명을 먼저 선택해 주세요.');
      return;
    }
    await runWithFeedback(
      `[임직원 셀프 증명서 1초 발급] 선택한 증명서를 자동 생성하고 직인 날인 미리보기를 준비하고 있습니다...`,
      async () => {
        const res = await issueInstantSelfCertificateInFirestore({
          empId: Number(empPortalSelectedEmpId),
          category: empPortalCertCategory,
          purposeOrDetail: empPortalCertPurpose || '관공서 및 금융기관 제출용',
        });
        const empObj = employees.find((em) => em.empId === Number(empPortalSelectedEmpId));
        setIssuedSelfCertPreview({
          certNo: res.approvalDocNo,
          categoryLabel: res.categoryLabel,
          empName: res.empNameOrRequester,
          empNo: res.empNo || empObj?.empNo || '-',
          entityName: res.entityName,
          deptName: res.deptName,
          hireDate: empObj?.hireDate || '-',
          purpose: res.purposeOrDetail,
          issuedDate: res.requestDate,
        });
        return `[셀프 증명서 1초 즉시발급 완료] 문서번호 [${res.approvalDocNo}] ${res.categoryLabel}이 발급되었습니다! 아래 증명서 카드에서 [인쇄 / PDF 저장]을 누르세요.`;
      }
    );
  };

  const handleSubmitSelfResignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empPortalSelectedEmpId) {
      triggerErrorToast('퇴사 신청할 본인 성명을 선택해 주세요.');
      return;
    }
    if (!selfResignForm.digitalSignatureName.trim()) {
      triggerErrorToast('전자사직서 본인 서명을 입력해 주세요.');
      return;
    }
    await runWithFeedback(
      `[모바일 전자사직서 셀프 제출] 퇴사일 등록·기숙사 퇴실 정산·3단계 퇴사 체크리스트·중도퇴사 일할급여 정산을 무인 실행하고 있습니다...`,
      async () => {
        const res = await submitSelfResignationInFirestore({
          empId: Number(empPortalSelectedEmpId),
          resignDate: selfResignForm.resignDate || `${targetYm}-28`,
          resignReason: selfResignForm.dormMoveOutDate
            ? `${selfResignForm.resignReason} (기숙사 퇴거일: ${selfResignForm.dormMoveOutDate})`
            : selfResignForm.resignReason,
          digitalSignatureName: selfResignForm.digitalSignatureName,
        });
        setSelfResignForm((prev) => ({ ...prev, digitalSignatureName: '' }));
        return `[전자사직서 셀프 제출 및 무인 연동 완료] ${res.empName}님(${res.empNo}) 퇴사일 [${res.resignDate}] 기준 일할급여·4대보험 상실·${res.dormNotice}이 자동 반영되었습니다.`;
      }
    );
  };

  const visibleMatrixRows = matrixRows.filter((row) => {
    if (row.isGrandTotal) return true;
    if (row.entityCode !== 'ALL' && disabledEntities.includes(row.entityCode)) {
      return false;
    }
    return true;
  });

  const navDomains: Array<{
    domainId: string;
    domainTitle: string;
    domainDesc: string;
    icon: React.ComponentType<{ className?: string }>;
    tabs: Array<{
      id: ActiveTab;
      shortTitle: string;
      subDesc: string;
      rowBadge: string;
      icon: React.ComponentType<{ className?: string }>;
      badgeCount?: number;
      badgeTone?: 'rose' | 'amber' | 'emerald';
    }>;
  }> = [
    {
      domainId: 'DOMAIN_CONTROL_MASTER',
      domainTitle: '1. 자동화 홈 · 엑셀올리기 · 직원명부',
      domainDesc: '버튼 하나로 기록수집·결재·문자발송 끝내기',
      icon: Bot,
      tabs: [
        {
          id: 'ZERO_TOUCH_HQ',
          shortTitle: '자동화 홈 (기록모으기 · 더존결재 · 문자보내기)',
          subDesc: '기계 기록 자동수집 · 더존 결재/세금신고 · 솔라피 문자발송 · 신입 셀프등록',
          rowBadge: '가장 많이 쓰는 홈',
          icon: Bot,
          badgeCount: headcountReductionSummary?.rpaPendingApprovalCount ?? 0,
          badgeTone:
            (headcountReductionSummary?.rpaPendingApprovalCount ?? 0) > 0
              ? 'amber'
              : 'emerald',
        },
        {
          id: 'PHASE5_BULK_AND_DDAY',
          shortTitle: '마감일(D-Day) 달력 · 엑셀 한번에 올리기',
          subDesc: '이번 달 꼭 해야 할 날짜 확인 및 엑셀 파일 통째로 올리기',
          rowBadge: '마감일 확인',
          icon: Upload,
          badgeCount: phase5Summary?.urgentAlertCount ?? 0,
          badgeTone: 'rose',
        },
        {
          id: 'EMPLOYEES',
          shortTitle: '전 직원 명부 · 수습 3개월 알림 · 기숙사',
          subDesc: '우리 회사 모든 직원 명단 관리 및 기숙사 방값 정산',
          rowBadge: '직원 명단',
          icon: Users,
        },
        {
          id: 'HITL_MAPPING',
          shortTitle: '낯선 이름·오타 짝지어 주기 (실수 방지)',
          subDesc: '엑셀에 오타나 새 부서 이름이 있을 때 정확한 이름과 연결해 주는 곳',
          rowBadge: '실수 방지',
          icon: AlertTriangle,
          badgeCount: pendingMappingCount,
          badgeTone: pendingMappingCount > 0 ? 'amber' : 'emerald',
        },
        {
          id: 'CONFIG',
          shortTitle: '4대보험 비율 · 부서 코드 설정',
          subDesc: '1년에 한 번 바뀌는 보험 비율과 부서 목록 관리',
          rowBadge: '기초 설정',
          icon: Settings,
        },
      ],
    },
    {
      domainId: 'DOMAIN_PAYROLL',
      domainTitle: '2. 월급 계산표 · 은행이체 · 회계전표',
      domainDesc: '전 직원 월급 계산하고 은행·회계팀 파일 뽑기',
      icon: Calculator,
      tabs: [
        {
          id: 'MATRIX',
          shortTitle: '3개 회사 월급 계산표 · 은행이체 엑셀',
          subDesc: '기본급·보너스·세금 자동계산 및 하나은행·코나카드 파일 받기',
          rowBadge: '월급날 필수',
          icon: Calculator,
        },
        {
          id: 'VOUCHER',
          shortTitle: '더존 회계전표 (금액 맞는지 자동검사)',
          subDesc: '회계팀 프로그램(더존 아마란스)에 올릴 부서별 인건비 장부 파일',
          rowBadge: '회계팀 전달용',
          icon: ArrowRightLeft,
        },
        {
          id: 'INPUTS',
          shortTitle: '일용직 출근기록 · 보너스/공제 추가 입력',
          subDesc: '일용직 일당이나 야근수당·보너스·기숙사비를 추가로 적는 곳',
          rowBadge: '추가 입력',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      domainId: 'DOMAIN_TAX_EDI',
      domainTitle: '3. 세금 신고 · 4대보험 · 퇴직금',
      domainDesc: '매달 내는 세금·보험 신고와 퇴직금 자동계산',
      icon: Landmark,
      tabs: [
        {
          id: 'PHASE2_TAX_EDI',
          shortTitle: '세금(원천세) · 4대보험 신고 · 캐디 보험',
          subDesc: '매달 10일 세금 신고와 15일 4대보험·캐디 보험 신고 파일 받기',
          rowBadge: '매월 10일·15일',
          icon: Landmark,
        },
        {
          id: 'PHASE2_SEVERANCE',
          shortTitle: '퇴직금 자동계산 · 14일 기한 알림 · 강사료',
          subDesc: '그만두는 직원 퇴직금 자동계산 및 외부 강사 세금 정리',
          rowBadge: '퇴사자 발생 시',
          icon: Briefcase,
        },
      ],
    },
    {
      domainId: 'DOMAIN_OPS_MEAL',
      domainTitle: '4. 신입 입사체크 · 식당밥값 · 용역품의',
      domainDesc: '새 직원 준비물 6가지 체크와 식당·외주비 정리',
      icon: Utensils,
      tabs: [
        {
          id: 'PHASE3_ONBOARDING',
          shortTitle: '입·퇴사 6가지 할 일 체크 · 주차장 차량등록',
          subDesc: '새 직원 들어올 때 계약서·사원증·이메일·주차등록 한 번에 챙기기',
          rowBadge: '신입·퇴사 체크',
          icon: UserCheck,
        },
        {
          id: 'PHASE3_MEAL_APPROVALS',
          shortTitle: '구내식당(웰스토리) 밥값 · 외주 용역비 결재서',
          subDesc: '직원 식당 식사 인원 집계와 매달 나가는 고정 업체 비용 정리',
          rowBadge: '식당·외주비',
          icon: Utensils,
        },
      ],
    },
    {
      domainId: 'DOMAIN_ATTENDANCE_ADMIN',
      domainTitle: '5. 부서 근무표 · 수요일 보고 · 증명서',
      domainDesc: '월 근무표·연차휴가·수요일 인원보고·재직증명서',
      icon: ClipboardCheck,
      tabs: [
        {
          id: 'PHASE4_SCHEDULE_REPORT',
          shortTitle: '부서별 월근무표 · 연차휴가 · 수요일 인원보고',
          subDesc: '다음 달 근무표 승인과 매주 수요일 이사님께 드리는 인원 보고서',
          rowBadge: '매주 수요일·말일',
          icon: CalendarCheck,
        },
        {
          id: 'PHASE4_CERT_TRAINING_IT',
          shortTitle: '재직증명서 발급 · 5대 의무교육 · 산재 · 컴퓨터 요청',
          subDesc: '각종 증명서 뽑기, 법정 의무교육 확인, 병원 산재 처리, 컴퓨터 신청',
          rowBadge: '증명서·교육',
          icon: GraduationCap,
        },
      ],
    },
  ];

  const tabUsageGuides: Record<
    ActiveTab,
    {
      easyTitle: string;
      whenToUse: string;
      step1: string;
      step2: string;
      step3: string;
      tip: string;
    }
  > = {
    ZERO_TOUCH_HQ: {
      easyTitle: '자동화 홈 — 1번(기록모으기) 2번(월급계산) 3번(결재·신고) 4번(문자보내기)',
      whenToUse:
        '어려운 인사 업무를 직접 타이핑하지 않고, 화면 위쪽의 [1번 2번 3번 4번] 숫자 버튼만 순서대로 눌러 한 번에 끝낼 때 사용해요.',
      step1:
        '① [1번 기록 모으기] 버튼을 누르면 식당·캐디·주차장·출퇴근 기계에서 이번 달 기록을 자동으로 가져와요.',
      step2:
        '② [2번 월급 계산하기]와 [3번 결재·장부 올리기]를 누르면 월급 계산부터 더존 아마란스 결재·세금 신고까지 자동으로 끝나요.',
      step3:
        '③ [4번 문자 보내기]에서 직원 휴대폰 번호를 고르고 [지금 즉시 발송]을 누르면 월급명세서나 입사 링크가 문자로 날아가요!',
      tip: '새로 들어온 직원은 [합격자 카톡 입사링크 복사]를 보내주면 본인이 스마트폰으로 직접 주소를 적어서 인사팀이 타이핑할 필요가 없어요.',
    },
    MATRIX: {
      easyTitle: '3개 회사 월급 계산표 · 은행이체 엑셀 받기',
      whenToUse: '매달 8일(일용직)과 10일(직원·실습생)에 월급과 세금을 자동 계산하고 은행 이체용 엑셀 파일을 받을 때 써요.',
      step1: '① 맨 위에서 계산할 [연월(달력)]을 고르고 초록색 [2번 월급 자동계산] 버튼을 눌러요.',
      step2: '② 회사 버튼(전체 / 블랙스톤 / KMG / 락산수)을 눌러 직원별 월급과 통장 입금액이 맞는지 눈으로 확인해요.',
      step3: '③ 오른쪽 위의 [엑셀 다운로드] 버튼을 눌러 급여대장, 하나은행 이체파일, 코나카드 충전명단을 내려받아요.',
      tip: '달 중간에 들어오거나 그만둔 직원도 일한 날짜만큼 컴퓨터가 알아서 정확히 계산해 줘요.',
    },
    VOUCHER: {
      easyTitle: '더존 아마란스 회계전표 (회계팀 전달용 장부)',
      whenToUse: '월급 계산이 끝난 뒤 회계팀 프로그램(더존 아마란스)에 올릴 부서별 인건비 장부가 필요할 때 써요.',
      step1: '① 초록색 [자동정산 실행] 버튼을 누르면 부서별로 들어간 월급과 세금 장부가 자동으로 만들어져요.',
      step2: '② 화면 위쪽에 초록색으로 [차대변 일치 (차이 0원)] 표시가 떴는지 확인해요.',
      step3: '③ [더존 급여전표 엑셀 다운로드] 또는 [더존 API 자동전송] 버튼을 누르면 회계팀 전달이 끝나요.',
      tip: '계산기를 두드릴 필요 없이 부서별로 단 1원의 오차도 없이 자동으로 나누어져요.',
    },
    INPUTS: {
      easyTitle: '일용직 출근기록 · 보너스/공제 추가 입력',
      whenToUse: '일용직 아르바이트 출근 기록을 적거나, 특정 직원의 야근수당·보너스·기숙사비를 추가로 넣을 때 써요.',
      step1: '① 왼쪽 입력칸에서 직원을 고르고 일당이나 보너스/공제 금액을 적은 뒤 [저장] 버튼을 눌러요.',
      step2: '② 적을 사람이 많다면 [마감일 달력 · 엑셀 한번에 올리기] 메뉴에서 엑셀 파일로 한 번에 올릴 수도 있어요.',
      step3: '③ 다 적었으면 맨 위 초록색 [자동정산 실행] 버튼을 눌러 월급 계산표에 반영해요.',
      tip: '일용직 세금도 법에서 정한 공제 금액을 빼고 컴퓨터가 알아서 계산해 줘요.',
    },
    PHASE2_TAX_EDI: {
      easyTitle: '세금(원천세) · 4대보험 신고 · 캐디 보험',
      whenToUse: '매달 10일 세금 신고와 매달 15일 4대보험·캐디 보험 신고 파일을 만들 때 써요.',
      step1: '① 화면 위쪽 6개 요약 상자에서 이번 달 신고할 세금과 4대보험 인원을 확인해요.',
      step2: '② 새로 들어오거나 그만둔 캐디가 있으면 아래 칸에 적어서 산재·고용보험료를 자동 계산해요.',
      step3: '③ 오른쪽 위의 [4대보험 엑셀], [캐디 산재 엑셀], [원천세 엑셀] 버튼을 눌러 신고용 파일을 받아요.',
      tip: '어려운 세금 공식을 외울 필요 없이 자동으로 합산된 파일을 그대로 신고 사이트에 올리면 돼요.',
    },
    PHASE2_SEVERANCE: {
      easyTitle: '퇴직금 자동계산 · 14일 기한 알림 · 강사료',
      whenToUse: '1년 이상 일한 직원이 그만둘 때 퇴직금을 계산하거나, 외부 강사님 세금을 계산할 때 써요.',
      step1: '① 왼쪽 칸에서 그만두는 직원을 고르고 퇴사 날짜와 최근 3달치 월급을 적은 뒤 [등록]을 눌러요.',
      step2: '② 퇴사 후 14일 안에 꼭 주어야 하는 날짜와 퇴직금 금액이 자동으로 계산되어 나와요.',
      step3: '③ [퇴직금 정산서 엑셀] 버튼을 눌러 결재 서류로 바로 뽑아요.',
      tip: '법으로 정해진 14일 지급 마감일을 빨간색 알림으로 미리 알려주어 늦지 않게 도와줘요.',
    },
    PHASE3_ONBOARDING: {
      easyTitle: '입·퇴사 6가지 할 일 체크 · 주차장 차량등록',
      whenToUse: '새 직원이 들어오거나 나갈 때 빠뜨리기 쉬운 6가지 준비물(계약서·이메일·사원증·주차장·식당지문 등)을 챙길 때 써요.',
      step1: '① 왼쪽 칸에서 [입사] 또는 [퇴사]와 직원 이름을 고른 뒤 [원클릭 생성] 버튼을 눌러요.',
      step2: '② 만들어진 6가지 할 일 목록에서 다 챙긴 것은 [6단계 일괄완료]를 누르고, 자동차 번호는 오른쪽 칸에 적어요.',
      step3: '③ [체크리스트 엑셀]이나 [주차등록 엑셀]을 내려받아 담당 부서에 전달해요.',
      tip: '누가 새로 오더라도 6가지 할 일이 자동으로 만들어져서 하나도 빠뜨리지 않고 챙길 수 있어요.',
    },
    PHASE3_MEAL_APPROVALS: {
      easyTitle: '구내식당(웰스토리) 밥값 · 외주 용역비 결재서',
      whenToUse: '직원 식당에서 밥 먹은 인원을 정리하고, 매달 초 식당·외주 업체 비용 결재 서류를 만들 때 써요.',
      step1: '① 아침·점심·저녁·야식 식사 인원이나 외주 업체 금액을 적어요 (기계 자동수집 또는 엑셀 업로드 가능).',
      step2: '② 표에서 회사별 식사 인원과 세금(부가세)이 자동으로 나누어진 것을 확인해요.',
      step3: '③ 오른쪽 위의 [웰스토리 식수 엑셀], [고정거래처 품의 엑셀] 버튼을 눌러 결재 서류에 첨부해요.',
      tip: '식사 인원과 단가만 넣으면 공급가액과 부가세가 자동으로 계산되어 품의서 양식으로 딱 만들어져요.',
    },
    PHASE4_SCHEDULE_REPORT: {
      easyTitle: '부서별 월근무표 · 연차휴가 · 수요일 인원보고',
      whenToUse: '매달 말일 다음 달 근무표를 승인하고, 매주 수요일 이사님께 드릴 인원 현황표를 뽑을 때 써요.',
      step1: '① 부서별 근무표와 연차 휴가 내역을 확인하고 [말일 근무표 일괄 최종승인] 버튼을 눌러요.',
      step2: '② 화면 가운데 [매주 수요일 이사님 인원보고] 표에서 회사별 현재 인원과 새로 온 사람·나간 사람 수를 확인해요.',
      step3: '③ [수요일 인원보고 엑셀] 버튼을 눌러 보고서 파일을 바로 내려받아요.',
      tip: '직원 명부에 등록된 인원이 수요일 보고서 표에 자동으로 합산되어 손으로 셀 필요가 없어요.',
    },
    PHASE4_CERT_TRAINING_IT: {
      easyTitle: '재직증명서 발급 · 5대 의무교육 · 산재 · 컴퓨터 요청',
      whenToUse: '재직증명서·세금완납증명서 발급, 5대 의무교육 확인, 다친 직원 산재 30일 기한 관리, 컴퓨터/장비 신청에 써요.',
      step1: '① 증명서 신청, 의무교육 확인, 산재 기록, 컴퓨터 요청 중 필요한 칸에 내용을 적고 등록해요.',
      step2: '② 산재가 발생하면 [30일 마감일]과 남은 날짜(D-Day)가 자동으로 표시돼요.',
      step3: '③ 오른쪽 위의 [엑셀 다운로드] 버튼을 눌러 관리 대장을 내려받아요.',
      tip: '직원들이 직접 증명서를 뽑게 하려면 맨 위 [직원 셀프포털] 링크를 문자로 보내주면 끝나요!',
    },
    PHASE5_BULK_AND_DDAY: {
      easyTitle: '마감일(D-Day) 달력 · 엑셀 한번에 올리기',
      whenToUse: '이번 달 꼭 챙겨야 할 마감 날짜를 보거나, 여러 명의 직원·일용직·캐디·식사 기록을 엑셀로 한 번에 올릴 때 써요.',
      step1: '① 위쪽 [이달의 마감일 알림판]에서 빨간색(긴급) 상자를 누르면 그 업무 화면으로 바로 이동해요.',
      step2: '② 엑셀을 올리려면 아래쪽에서 ① 종류 선택 ② [빈 양식 다운로드] 클릭 ③ 내용 채운 뒤 [엑셀 업로드]를 눌러요.',
      step3: '③ 다 올렸으면 맨 위 초록색 [자동정산 실행] 버튼을 눌러 계산을 마무리해요.',
      tip: '손으로 한 명씩 치기 힘들 때 빈 엑셀 양식을 받아 복사·붙여넣기만 하면 100명도 1초 만에 등록돼요.',
    },
    EMPLOYEES: {
      easyTitle: '전 직원 명부 · 수습 3개월 알림 · 기숙사',
      whenToUse: '새 직원을 명단에 올리거나 월급 변경, 수습 3개월 끝나는 직원 확인, 퇴사자 기숙사 방값 정산을 할 때 써요.',
      step1: '① 왼쪽 [신규 직원 등록] 칸에 이름, 회사, 부서, 기본급, 통장 계좌번호를 적고 [등록]을 눌러요.',
      step2: '② 아래쪽 표에서 수습 3개월이 다가오는 직원과 기숙사 퇴실 정산 내역을 확인해요.',
      step3: '③ 직원을 추가하거나 월급을 바꾼 뒤에는 맨 위 초록색 [자동정산 실행]을 눌러 월급표에 반영해요.',
      tip: '기숙사에서 나가는 직원은 들어온 날과 나간 날만 넣으면 머문 날짜만큼 방값이 자동 계산돼요.',
    },
    HITL_MAPPING: {
      easyTitle: '낯선 이름·오타 짝지어 주기 (실수 방지)',
      whenToUse: '엑셀을 올렸는데 오타가 있거나 처음 보는 부서·이름이 나왔을 때 정확한 이름과 짝지어 주는 화면이에요.',
      step1: '① 목록에서 어떤 낯선 이름(예: 부서 이름 오타)이 들어왔는지 확인해요.',
      step2: '② 연결할 정확한 부서 코드나 사번을 고르고 [승인 및 연결] 버튼을 눌러요.',
      step3: '③ 한 번만 짝지어 주면 다음부터는 똑같은 오타가 들어와도 컴퓨터가 알아서 척척 알아봐요.',
      tip: '컴퓨터가 멋대로 추측해서 엉뚱한 부서로 돈이 잘못 계산되는 것을 막아주는 똑똑한 안전장치예요.',
    },
    CONFIG: {
      easyTitle: '4대보험 비율 · 부서 코드 설정',
      whenToUse: '매년 1월에 바뀌는 4대보험 비율을 고치거나, 회사에 새로운 부서가 생겼을 때 추가하는 화면이에요.',
      step1: '① 왼쪽에서 3개 회사(블랙스톤·KMG·락산수)의 부서 목록과 회계 코드를 확인하거나 추가해요.',
      step2: '② 오른쪽에서 국민연금·건강보험·고용보험·산재보험 비율을 확인하고 [저장]을 눌러요.',
      step3: '③ 저장하면 모든 월급·세금·캐디·일용직 자동 계산에 바로 적용돼요.',
      tip: '평소에는 건드릴 필요가 전혀 없고, 1년에 한 번 법이 바뀔 때만 숫자만 고쳐주면 돼요.',
    },
  };

  const activeDomain =
    navDomains.find((d) => d.tabs.some((t) => t.id === activeTab)) ?? navDomains[0];
  const activeTabMeta =
    activeDomain.tabs.find((t) => t.id === activeTab) ?? activeDomain.tabs[0];
  const currentGuide = tabUsageGuides[activeTab];

  const practiceScenarios: Array<{
    id: string;
    badge: string;
    title: string;
    situation: string;
    steps: Array<{
      stepLabel: string;
      actionTitle: string;
      howToExplain: string;
      targetTab: ActiveTab;
      buttonLabel: string;
    }>;
  }> = [
    {
      id: 'SCENARIO_1',
      badge: '시나리오 1 · 신입 입사/퇴사',
      title: '신입사원 입사 등록부터 6단계 체크·차량·4대보험 신고까지',
      situation:
        '상황 예시: 블랙스톤벨포레 코스관리팀에 정규직 신입사원이 오늘 새로 출근했습니다. 무엇부터 해야 할까요?',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '직원 명부에 신입사원 기본정보 등록하기',
          howToExplain:
            '[전 직원 명부] 화면에서 사번, 성명, 소속 법인, 부서, 입사일, 월 기본급, 급여통장 계좌번호, 차량번호를 입력하고 [임직원 마스터 저장]을 누릅니다.',
          targetTab: 'EMPLOYEES',
          buttonLabel: '① 직원 명부 등록 화면 열기 ',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '입사 필수 6가지 절차(ERP·계약서·이메일·사원증·차량·지문) 한 번에 완료',
          howToExplain:
            '[입·퇴사 6단계 체크리스트] 화면에서 방금 등록한 직원을 고르고 [원클릭 동시 완료] 버튼을 누르면 6가지 입사 절차와 주차차량 등록이 동시에 끝납니다.',
          targetTab: 'PHASE3_ONBOARDING',
          buttonLabel: '② 입·퇴사 6단계 체크 화면 열기 ',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '4대보험 자격취득 신고용 엑셀 파일 내려받기',
          howToExplain:
            '[원천세·4대보험 신고] 화면 오른쪽 위의 파란색 [4대보험 취득·상실·보수변경 EDI] 버튼을 눌러 엑셀을 내려받으면 입사 처리가 모두 완료됩니다.',
          targetTab: 'PHASE2_TAX_EDI',
          buttonLabel: '③ 4대보험 EDI 다운로드 화면 열기 ',
        },
      ],
    },
    {
      id: 'SCENARIO_2',
      badge: '시나리오 2 · 월급날 정산',
      title: '매월 8일(일용직) · 10일(임직원) 월급 계산하고 은행이체·더존 전표 뽑기',
      situation:
        '상황 예시: 이번 달 일용직 출근기록과 연장수당을 반영해 3개 법인 월급을 계산하고 은행 이체파일과 회계전표를 만들어야 합니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '이번 달 일용직 근무일지와 연장수당·공제액 입력하기',
          howToExplain:
            '[일용직 출근기록·추가수당 입력] 화면에서 직원을 선택해 추가 수당(연장·상여)이나 공제액(기숙사·식대), 일용직 일당을 등록합니다.',
          targetTab: 'INPUTS',
          buttonLabel: '① 일용직·추가수당 입력 화면 열기 ',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '초록색 [자동정산 실행] 버튼 누르고 월급 계산표 확인하기',
          howToExplain:
            '상단 헤더의 초록색 [전사 급여·전표 자동정산 실행] 버튼을 누르면 3개 법인 전 직원의 세금·4대보험·실수령액이 자동 계산됩니다. 오른쪽 위 버튼으로 은행 이체파일과 코나카드 파일을 내려받습니다.',
          targetTab: 'MATRIX',
          buttonLabel: '② 월급 계산표·은행이체 화면 열기 ',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '더존 아마란스 회계전표 차대변 일치 확인 후 내려받기',
          howToExplain:
            '[더존 아마란스 급여전표] 화면에서 [차대변 일치] 표시를 확인하고 [더존 급여전표 엑셀 다운로드] 버튼을 눌러 회계팀에 전달합니다.',
          targetTab: 'VOUCHER',
          buttonLabel: '③ 더존 회계전표 화면 열기 ',
        },
      ],
    },
    {
      id: 'SCENARIO_3',
      badge: '시나리오 3 · 월초 정기품의',
      title: '매월 1~2일 웰스토리 식대 · 고정도급 · 하나BSN 용역비 품의서 만들기',
      situation:
        '상황 예시: 매월 초마다 올리는 삼성웰스토리 식대비, 고정 도급업체 수수료, 락산수/KMG 하나BSN 용역비 결재 품의서를 작성해야 합니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '일일 식수 인원(조·중·석·야식) 및 도급·하나BSN 청구액 입력',
          howToExplain:
            '[식수·식대·도급·하나BSN 품의] 화면 아래쪽 입력칸에 식수 인원과 고정거래처 도급비, 하나BSN 파견 용역비를 입력합니다.',
          targetTab: 'PHASE3_MEAL_APPROVALS',
          buttonLabel: '① 식수·도급·용역비 입력 화면 열기 ',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '3개 법인별 식수 합계와 공급가액·부가세 자동 집계 확인',
          howToExplain:
            '화면 중앙의 검은색 헤더 집계표에서 블랙스톤·KMG·락산수 법인별 총 식수 인원과 세금계산서 합계액이 맞는지 한눈에 확인합니다.',
          targetTab: 'PHASE3_MEAL_APPROVALS',
          buttonLabel: '② 법인별 식대 집계표 확인하기 ',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '결재 첨부용 품의서 엑셀 4종 원클릭 다운로드',
          howToExplain:
            '오른쪽 위의 [웰스토리 식수전달], [식대비 지급 품의서], [고정거래처 품의서], [하나BSN 용역비 품의서] 버튼을 눌러 결재 문서에 바로 첨부합니다.',
          targetTab: 'PHASE3_MEAL_APPROVALS',
          buttonLabel: '③ 품의서 엑셀 다운로드 화면 열기 ',
        },
      ],
    },
    {
      id: 'SCENARIO_4',
      badge: '시나리오 4 · 세금/캐디/퇴직금',
      title: '매월 10일 세금신고 · 15일 캐디/일용직 신고 · 퇴직금 14일 기한 정산',
      situation:
        '상황 예시: 매월 10일 원천세·지방세·주민세 신고와 15일 경기과 캐디 산재·일용직 신고, 퇴사자 퇴직금 정산을 처리해야 합니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '경기과 캐디 라운딩 수입 및 외부강사 사업소득 등록',
          howToExplain:
            '[원천세·4대보험 신고·캐디] 화면에서 캐디를 골라 라운딩 횟수와 캐디피 수입을 넣으면 경비율을 뺀 보수액과 산재·고용보험료가 자동 계산됩니다.',
          targetTab: 'PHASE2_TAX_EDI',
          buttonLabel: '① 세금·캐디·일용직 신고 화면 열기 ',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '퇴사자 발생 시 퇴직금 자동 비교 산출 (14일 지급기한 자동 표시)',
          howToExplain:
            '[퇴직금 자동계산] 화면에서 퇴사 직원을 고르면 기본급 기준 3개월 예상 급여가 자동으로 채워집니다. 퇴사일을 넣으면 법정 14일 지급기한과 퇴직금이 즉시 계산됩니다.',
          targetTab: 'PHASE2_SEVERANCE',
          buttonLabel: '② 퇴직금 14일 정산기 화면 열기 ',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '세무서·공단 신고용 엑셀 파일 내려받기',
          howToExplain:
            '각 화면 오른쪽 위의 [원천세·지방세·주민세], [일용직 근로내용확인], [캐디 산재신고], [퇴직금 산정내역서] 버튼을 눌러 엑셀을 내려받습니다.',
          targetTab: 'PHASE2_TAX_EDI',
          buttonLabel: '③ 세무·공단 신고 엑셀 받기 ',
        },
      ],
    },
    {
      id: 'SCENARIO_5',
      badge: '시나리오 5 · 수요일 보고/근무표',
      title: '매주 수요일 이사님 인원변동 보고 & 월말 부서 근무표·연차 마감',
      situation:
        '상황 예시: 수요일 아침 이사님께 3개 법인 인원 현황을 보고하고, 월말에 부서별 근무표와 연차·산재·법정교육을 챙겨야 합니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '매주 수요일 이사님 보고용 3개 법인 인원변동표 확인 및 다운로드',
          howToExplain:
            '[월근무표·연차/휴무대장·수요일 인원보고] 화면을 열면 법인별 정규·계약·실습·일용·캐디 인원과 이달 입·퇴사자가 이미 집계되어 있습니다. [수요일 인원변동 팩] 버튼을 눌러 바로 출력하세요.',
          targetTab: 'PHASE4_SCHEDULE_REPORT',
          buttonLabel: '① 수요일 인원보고·근무표 화면 열기 ',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '부서별 월 근무표 일괄 승인 및 연차/잔여휴무 등록',
          howToExplain:
            '부서 근무표를 등록한 뒤 오른쪽 위의 초록색 [말일 월 근무표 최종취합본 일괄 품의 승인] 버튼을 한 번 누르면 모든 부서 근무표가 최종 승인됩니다.',
          targetTab: 'PHASE4_SCHEDULE_REPORT',
          buttonLabel: '② 말일 근무표 일괄승인 하러가기 ',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '완납/재직증명서 발급 · 5대 법정교육 · 산재 30일 기한 관리',
          howToExplain:
            '[각종 증명서·5대 법정교육·산재] 화면에서 세미나용 완납증명서 발급, 법정교육 이수율, 산재 발생 후 30일 이내 노동부 제출 기한을 관리합니다.',
          targetTab: 'PHASE4_CERT_TRAINING_IT',
          buttonLabel: '③ 증명서·법정교육·산재 화면 열기 ',
        },
      ],
    },
    {
      id: 'SCENARIO_6',
      badge: '시나리오 6 · 엑셀 대량업로드',
      title: '기존 엑셀 파일 한 번에 올리기 & 오타(미등록 이름) 1:1 연결하기',
      situation:
        '상황 예시: 수십 명의 사원 명부나 일용직·캐디·식수 엑셀 파일을 일일이 손으로 입력하지 않고 한 번에 올리고 싶습니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '오른쪽 위에서 [표준 업로드 양식 (.xlsx)] 내려받기',
          howToExplain:
            '[마감일(D-Day) 알림판·엑셀 한번에 올리기] 화면 오른쪽 위에서 원하는 양식(임직원/일용직/캐디/식수)을 내려받아 기존 엑셀 내용을 복사해 붙여넣습니다.',
          targetTab: 'PHASE5_BULK_AND_DDAY',
          buttonLabel: '① 엑셀 양식 받기·업로드 화면 열기 ',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '파란색 점선 상자에 엑셀 파일 올리기',
          howToExplain:
            '업로드 종류(1~4번)를 고른 뒤 [엑셀 파일 선택 및 즉시 적재] 버튼을 눌러 파일을 올리면 수백 건도 즉시 저장됩니다.',
          targetTab: 'PHASE5_BULK_AND_DDAY',
          buttonLabel: '② 엑셀 파일 올리러 가기 ',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '오타나 새 부서명이 있을 때 1:1로 짝지어 주기',
          howToExplain:
            '엑셀에 등록되지 않은 이름이나 오타가 있으면 [미등록 이름 확인 및 연결] 화면에 따로 모입니다. 올바른 사원이나 수당 항목을 골라 [승인]만 누르면 다음부터는 자동으로 인식합니다.',
          targetTab: 'HITL_MAPPING',
          buttonLabel: '③ 미등록 이름 연결 화면 열기 ',
        },
      ],
    },
  ];

  const activeScenario =
    practiceScenarios.find((s) => s.id === selectedScenarioId) ?? practiceScenarios[0];

  const quickSearchCatalog: Array<{
    key: string;
    title: string;
    keywords: string;
    badge: string;
    targetTab: ActiveTab;
    subView?: 'ALL' | 'AMARANTH_RPA' | 'SOLAPI_PORTALS' | 'COLLECTOR_AUDIT' | 'SELF_ONBOARD';
  }> = [
    {
      key: 'QS_AMARANTH',
      title: '더존 아마란스 10 RESTful API · 전자결재 Webhook · 자동전표 · SSO 브릿지',
      keywords: '아마란스 더존 amaranth api 전자결재 전표 조직도 sso webhook 기안',
      badge: '아마란스 10 API',
      targetTab: 'ZERO_TOUCH_HQ',
      subView: 'AMARANTH_RPA',
    },
    {
      key: 'QS_SOLAPI',
      title: '솔라피(Solapi) 실시간 문자(LMS) · 카카오 알림톡 발송 센터',
      keywords: '문자 솔라피 solapi 알림톡 카카오톡 발송 명세서 링크 lms sms 발신번호',
      badge: '문자·알림톡',
      targetTab: 'ZERO_TOUCH_HQ',
      subView: 'SOLAPI_PORTALS',
    },
    {
      key: 'QS_RPA',
      title: '6대 외부 포털(홈택스·위택스·4대보험·웰스토리·하나은행) 무인 RPA 실행 큐',
      keywords: 'rpa 홈택스 위택스 edi 무인 자동기안 신고 완납증명서 은행이체',
      badge: '6대 포털 RPA',
      targetTab: 'ZERO_TOUCH_HQ',
      subView: 'AMARANTH_RPA',
    },
    {
      key: 'QS_COLLECTOR',
      title: '4대 현장 단말기(캐디POS·웰스토리 식수·주차LPR) 무인수집 & 이상치 감사',
      keywords: '단말기 수집 pos 캐디 웰스토리 주차 lpr 이상치 감사 예외',
      badge: '단말기·이상치감사',
      targetTab: 'ZERO_TOUCH_HQ',
      subView: 'COLLECTOR_AUDIT',
    },
    {
      key: 'QS_SELF_ONBOARD',
      title: '합격자·신입사원 모바일 셀프 입사등록 및 근로계약 전자서명 폼',
      keywords: '신입 합격자 셀프입사 근로계약서 전자서명 계좌 등록',
      badge: '셀프 입사등록',
      targetTab: 'ZERO_TOUCH_HQ',
      subView: 'SELF_ONBOARD',
    },
    {
      key: 'QS_MATRIX',
      title: '3개 법인 월급·노무비 계산표 & 하나은행 급여이체·코나카드 엑셀 다운로드',
      keywords: '월급 급여 계산표 기본급 일할 보직수당 하나은행 이체 코나카드 급여대장',
      badge: '월급·이체파일',
      targetTab: 'MATRIX',
    },
    {
      key: 'QS_VOUCHER',
      title: '더존 아마란스 급여 회계전표 (부서별 인건비 배분 & 차·대변 0원 검증)',
      keywords: '전표 회계전표 차변 대변 분개 부서별 인건비 예수금',
      badge: '회계전표 검증',
      targetTab: 'VOUCHER',
    },
    {
      key: 'QS_INPUTS',
      title: '일용직 출근기록 · 연장/야간/상여 추가수당 · 식대/기숙사 공제 입력',
      keywords: '일용직 출근 일당 연장수당 야간수당 상여금 공제 식대공제',
      badge: '일용직·수당입력',
      targetTab: 'INPUTS',
    },
    {
      key: 'QS_TAX_EDI',
      title: '원천세 · 4대보험 취득/상실/보수총액 EDI · 경기과 캐디 산재 · 장애인부담금',
      keywords: '원천세 세금 4대보험 국민연금 건강보험 고용보험 산재보험 캐디 장애인 주민세',
      badge: '세무·4대보험',
      targetTab: 'PHASE2_TAX_EDI',
    },
    {
      key: 'QS_SEVERANCE',
      title: '퇴직금 자동계산 (3개월 평균/통상임금 비교 · 14일 지급기한) · 3.3% 사업소득',
      keywords: '퇴직금 퇴직 정산 14일 평균임금 통상임금 사업소득 강사료',
      badge: '퇴직금·사업소득',
      targetTab: 'PHASE2_SEVERANCE',
    },
    {
      key: 'QS_ONBOARDING',
      title: '입·퇴사 6단계 체크리스트 (ERP·이메일·사원증·지문) · 차량 주차관제 LPR 등록',
      keywords: '입사 퇴사 체크리스트 사원증 이메일 지문 차량 주차 번호판',
      badge: '입퇴사·주차등록',
      targetTab: 'PHASE3_ONBOARDING',
    },
    {
      key: 'QS_MEAL',
      title: '웰스토리 일일식수 · 주간식단표 · 고정거래처 도급 · 하나BSN/KMG/락산수 용역비 품의',
      keywords: '식수 식대 구내식당 웰스토리 식단 도급 용역비 하나bsn 락산수 kmg 품의서',
      badge: '식수·도급품의',
      targetTab: 'PHASE3_MEAL_APPROVALS',
    },
    {
      key: 'QS_SCHEDULE',
      title: '부서별 월근무표 일괄승인 · 연차/잔여휴무 대장 · 수요일 이사님 인원변동 보고',
      keywords: '근무표 스케줄 연차 휴가 잔여연차 휴무 수요일 인원보고 이사님 주간업무',
      badge: '근무표·연차·인원보고',
      targetTab: 'PHASE4_SCHEDULE_REPORT',
    },
    {
      key: 'QS_CERT',
      title: '완납/재직/경력증명서 · 원천징수영수증 · 5대 법정교육 · 산재 30일 기한 · IT요청',
      keywords: '증명서 재직증명서 경력증명서 완납증명서 원천징수영수증 법정교육 산재 건강검진 it 전산',
      badge: '증명서·교육·산재',
      targetTab: 'PHASE4_CERT_TRAINING_IT',
    },
    {
      key: 'QS_BULK',
      title: '마감일(D-Day) 알림판 & 기존 엑셀 파일(사원/일용직/캐디/식수) 한번에 업로드',
      keywords: '마감일 디데이 d-day 엑셀 업로드 양식 다운로드 일괄등록',
      badge: '마감일·엑셀업로드',
      targetTab: 'PHASE5_BULK_AND_DDAY',
    },
    {
      key: 'QS_EMPLOYEES',
      title: '3개 법인 전 직원 명부 등록/수정 · 수습 3개월 만료 알림 · 기숙사 퇴실 공과금 정산',
      keywords: '사원 명부 직원등록 수습 3개월 기숙사 호실 공과금 계좌번호',
      badge: '전직원 명부·기숙사',
      targetTab: 'EMPLOYEES',
    },
  ];

  const normalizedSearch = quickMenuSearch.trim().toLowerCase();
  const filteredQuickSearchItems = normalizedSearch
    ? quickSearchCatalog.filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedSearch) ||
          item.keywords.toLowerCase().includes(normalizedSearch) ||
          item.badge.toLowerCase().includes(normalizedSearch)
      )
    : [];

  // 좌측 사이드바에서 차례대로 진행하는 16개 독립 페이지 목록
  const sequentialStepPages: Array<{
    stepCode: string;
    groupTitle: string;
    title: string;
    easyDesc: string;
    tab: ActiveTab;
    subView?: 'COLLECTOR_AUDIT' | 'AMARANTH_RPA' | 'SOLAPI_PORTALS' | 'SELF_ONBOARD';
    badgeCount?: number;
    badgeTone?: 'rose' | 'amber' | 'emerald';
  }> = [
    {
      stepCode: '1-1',
      groupTitle: '1단계 · 기초자료 수집',
      title: '현장 단말기 기록 자동 수집',
      easyDesc:
        '구내식당·캐디·주차장·출퇴근 단말기 기록을 자동으로 수집하고 이상 여부를 점검합니다.',
      tab: 'ZERO_TOUCH_HQ',
      subView: 'COLLECTOR_AUDIT',
    },
    {
      stepCode: '1-2',
      groupTitle: '1단계 · 기초자료 수집',
      title: '엑셀 일괄 업로드 · 마감 일정',
      easyDesc:
        '이달의 법정 마감 일정(D-Day)을 확인하고 표준 엑셀 파일을 일괄 업로드합니다.',
      tab: 'PHASE5_BULK_AND_DDAY',
      badgeCount: phase5Summary?.urgentAlertCount ?? 0,
      badgeTone: 'rose',
    },
    {
      stepCode: '1-3',
      groupTitle: '1단계 · 기초자료 수집',
      title: '전 직원 명부 · 수습 · 기숙사',
      easyDesc:
        '3개 법인 임직원 기본급·비과세·급여계좌와 수습 만료·기숙사 정산을 관리합니다.',
      tab: 'EMPLOYEES',
    },
    {
      stepCode: '1-4',
      groupTitle: '1단계 · 기초자료 수집',
      title: '일용직 출근 · 변동 수당/공제',
      easyDesc:
        '일용직 일당 및 당월 변동 수당(상여·연장·직책)·공제 내역을 등록합니다.',
      tab: 'INPUTS',
    },
    {
      stepCode: '1-5',
      groupTitle: '1단계 · 기초자료 수집',
      title: '미등록 명칭 · 오타 연결',
      easyDesc:
        '엑셀 업로드 시 발생한 미등록 부서명·항목명을 표준 코드와 1:1 매핑합니다.',
      tab: 'HITL_MAPPING',
      badgeCount: pendingMappingCount,
      badgeTone: pendingMappingCount > 0 ? 'amber' : 'emerald',
    },
    {
      stepCode: '2-1',
      groupTitle: '2단계 · 급여·세무 정산',
      title: '3개 법인 급여대장 · 은행이체',
      easyDesc:
        '전 직원 급여·4대보험·세금·실수령액을 정산하고 하나은행 이체·코나카드 파일을 생성합니다.',
      tab: 'MATRIX',
    },
    {
      stepCode: '2-2',
      groupTitle: '2단계 · 급여·세무 정산',
      title: '원천세 · 4대보험 · 캐디 신고',
      easyDesc:
        '매월 10일 원천세·지방세 신고 및 15일 4대보험·캐디 신고용 EDI 파일을 생성합니다.',
      tab: 'PHASE2_TAX_EDI',
    },
    {
      stepCode: '2-3',
      groupTitle: '2단계 · 급여·세무 정산',
      title: '퇴직금 정산 · 3.3% 사업소득',
      easyDesc:
        '퇴사자 14일 이내 법정 퇴직금 비교 산출 및 외부 강사·자문료(3.3%) 세액을 계산합니다.',
      tab: 'PHASE2_SEVERANCE',
    },
    {
      stepCode: '3-1',
      groupTitle: '3단계 · 그룹웨어·회계전표',
      title: '더존 아마란스 연동 · 대외신고',
      easyDesc:
        '더존 아마란스 10(인사·결재·전표·조직도) 연동 및 6대 대외 기관 신고를 일괄 처리합니다.',
      tab: 'ZERO_TOUCH_HQ',
      subView: 'AMARANTH_RPA',
      badgeCount: headcountReductionSummary?.rpaPendingApprovalCount ?? 0,
      badgeTone:
        (headcountReductionSummary?.rpaPendingApprovalCount ?? 0) > 0 ? 'amber' : 'emerald',
    },
    {
      stepCode: '3-2',
      groupTitle: '3단계 · 그룹웨어·회계장부',
      title: '부서별 회계전표 · 차대변 검증',
      easyDesc:
        '부서별 인건비 차변(비용)과 대변(예수금·미지급금) 대차평형(오차 0원)을 검증합니다.',
      tab: 'VOUCHER',
    },
    {
      stepCode: '4-1',
      groupTitle: '4단계 · 명세서 발송·셀프입사',
      title: '급여명세서 · 안내 문자 발송',
      easyDesc:
        '임직원 휴대폰으로 모바일 급여명세서 조회 링크 및 입사 안내 문자를 발송합니다.',
      tab: 'ZERO_TOUCH_HQ',
      subView: 'SOLAPI_PORTALS',
    },
    {
      stepCode: '4-2',
      groupTitle: '4단계 · 명세서 발송·셀프입사',
      title: '신입사원 모바일 입사 등록',
      easyDesc:
        '신규 입사자가 모바일에서 급여계좌·차량번호·근로계약 전자서명을 직접 등록합니다.',
      tab: 'ZERO_TOUCH_HQ',
      subView: 'SELF_ONBOARD',
    },
    {
      stepCode: '5-1',
      groupTitle: '5단계 · 인사행정·복리후생',
      title: '입·퇴사 체크리스트 · 차량등록',
      easyDesc:
        '입·퇴사 6대 필수 준비 현황과 주차관제(LPR) 차량 번호판을 관리합니다.',
      tab: 'PHASE3_ONBOARDING',
    },
    {
      stepCode: '5-2',
      groupTitle: '5단계 · 인사행정·복리후생',
      title: '구내식당 식대 · 용역비 품의',
      easyDesc:
        '구내식당(웰스토리) 식수 인원 및 고정 도급·하나BSN 용역비 지출품의서를 생성합니다.',
      tab: 'PHASE3_MEAL_APPROVALS',
    },
    {
      stepCode: '5-3',
      groupTitle: '5단계 · 인사행정·복리후생',
      title: '부서 월근무표 · 연차 · 인원보고',
      easyDesc:
        '부서별 월 근무표 승인, 잔여 연차 대장, 주간 인원변동 보고서를 관리합니다.',
      tab: 'PHASE4_SCHEDULE_REPORT',
    },
    {
      stepCode: '5-4',
      groupTitle: '5단계 · 인사행정·복리후생',
      title: '제증명 · 법정교육 · 산재 · IT',
      easyDesc:
        '증명서 발급, 5대 법정의무교육 수료, 산재 30일 기한, IT 전산 요청을 처리합니다.',
      tab: 'PHASE4_CERT_TRAINING_IT',
    },
    {
      stepCode: '5-5',
      groupTitle: '5단계 · 인사행정·복리후생',
      title: '4대보험 요율 · 부서 코드 설정',
      easyDesc:
        '연간 4대보험 요율과 3개 법인 부서 및 코스트센터 기준정보를 설정합니다.',
      tab: 'CONFIG',
    },
  ];

  const effectiveSubView =
    zeroTouchSubView === 'ALL' ? 'COLLECTOR_AUDIT' : zeroTouchSubView;
  const essentialStepCodes = ['1-3', '1-4', '2-1', '2-2', '4-1'];
  const currentStepIndex = Math.max(
    0,
    sequentialStepPages.findIndex((p) =>
      p.tab === 'ZERO_TOUCH_HQ'
        ? activeTab === 'ZERO_TOUCH_HQ' && p.subView === effectiveSubView
        : p.tab === activeTab
    )
  );
  const currentStepPage = sequentialStepPages[currentStepIndex] ?? sequentialStepPages[0];
  const navigableStepPages =
    sidebarMenuMode === 'ESSENTIAL_5' &&
    essentialStepCodes.includes(currentStepPage.stepCode)
      ? sequentialStepPages.filter((p) => essentialStepCodes.includes(p.stepCode))
      : sequentialStepPages;
  const currentNavigableIndex = navigableStepPages.findIndex(
    (p) => p.stepCode === currentStepPage.stepCode
  );
  const prevStepPage =
    currentNavigableIndex > 0 ? navigableStepPages[currentNavigableIndex - 1] : null;
  const nextStepPage =
    currentNavigableIndex >= 0 && currentNavigableIndex < navigableStepPages.length - 1
      ? navigableStepPages[currentNavigableIndex + 1]
      : null;

  const stepGroupNames = Array.from(
    new Set(sequentialStepPages.map((p) => p.groupTitle))
  );

  const handleSelectStepPage = (page: (typeof sequentialStepPages)[number]) => {
    setIsSelfOnboardStandaloneView(false);
    setPortalViewMode('ADMIN_HQ');
    setActiveTab(page.tab);
    if (page.subView) {
      setZeroTouchSubView(page.subView);
    }
    setShowIndividualAddForm(false);
    setWorkspaceFlashTick((prev) => prev + 1);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToIndividualWorkArea = (_guideMsg?: string) => {
    setShowIndividualAddForm(true);
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const anchorEl =
          (document.querySelector(
            '[data-individual-form-anchor="true"]'
          ) as HTMLElement | null) ??
          document.getElementById('hr-individual-work-area');
        if (anchorEl) {
          anchorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  };

  // =========================================================================
  // [전 화면 100% 통일 양식] 16개 페이지(1-1 ~ 5-5) 표준 설계도
  // =========================================================================
  const stepPageBlueprints: Record<
    string,
    {
      bigPictureGoal: string;
      bigPictureWhen: string;
      bigPictureFlow: string;
      step1GlobalTitle: string;
      step1GlobalDesc: string;
      step1GlobalBtn: string;
      onStep1GlobalClick: () => void;
      step2IndividualTitle: string;
      step2IndividualDesc: string;
      step2IndividualBtn: string;
      onStep2IndividualClick: () => void;
      step3FinishTitle: string;
      step3FinishDesc: string;
      step3FinishBtn: string;
      onStep3FinishClick: () => void;
    }
  > = {
    '1-1': {
      bigPictureGoal:
        '구내식당·경기과 캐디·주차장·출퇴근 단말기 4곳의 현장 기록을 일괄 수집하고 이상 여부를 자동 점검합니다.',
      bigPictureWhen: '매월 1~8일 급여 정산 전',
      bigPictureFlow: '4대 현장 단말기 → 자동 수집·점검 → 식대·캐디·급여대장 연동',
      step1GlobalTitle: '4대 단말기 기록 전사 일괄 수집',
      step1GlobalDesc:
        '단말기별로 개별 파일을 추출하지 않고 버튼 하나로 식당·캐디·주차·근태 기록 전체를 동기화합니다.',
      step1GlobalBtn: '4대 단말기 기록 일괄 수집',
      onStep1GlobalClick: () =>
        handleTriggerCollectorSync('ALL', '4대 현장 단말기(식당·캐디·주차·근태) 전체'),
      step2IndividualTitle: '개별 단말기 선택 · 예외 항목 확인',
      step2IndividualDesc:
        '수집된 기록 중 주 52시간 근접자나 미등록 차량 등 예외 표시 항목만 아래 표에서 확인합니다.',
      step2IndividualBtn: '단말기 현황 및 예외 목록 보기 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '수집 데이터 기반 1~3단계 통합 정산',
      step3FinishDesc:
        '단말기 수집부터 급여 정산·그룹웨어 연동 준비까지 일괄 실행하거나 다음 단계로 이동합니다.',
      step3FinishBtn: '1~3단계 통합 자동정산 실행',
      onStep3FinishClick: handleRunMagicAllInOne,
    },
    '1-2': {
      bigPictureGoal:
        '이달의 법정 마감 일정(D-Day)을 점검하고, 다수 인원의 엑셀 자료를 표준 양식으로 일괄 업로드합니다.',
      bigPictureWhen: '매월 초 마감 일정 점검 및 대량 자료 등록 시',
      bigPictureFlow: '표준 엑셀 파일(.xlsx) → 일괄 업로드 → 명부·일용직·캐디·식수 적재',
      step1GlobalTitle: '표준 엑셀 양식 다운로드',
      step1GlobalDesc:
        '다수 인원을 수기 입력하는 대신 표준 양식을 내려받아 복사·붙여넣기 후 일괄 업로드합니다.',
      step1GlobalBtn: '선택된 표준 엑셀 양식(.xlsx) 다운로드',
      onStep1GlobalClick: () => handleDownloadBulkTemplate(selectedBulkType),
      step2IndividualTitle: '업로드 유형 선택 · 마감 일정 확인',
      step2IndividualDesc:
        '업로드할 엑셀 유형(임직원/일용직/캐디/식수)을 선택하거나 마감 임박 업무로 바로 이동합니다.',
      step2IndividualBtn: '마감 일정 및 파일 업로드 영역 보기 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '업로드 데이터 급여대장 반영',
      step3FinishDesc:
        '업로드한 엑셀 데이터를 이번 달 3개 법인 급여대장과 회계전표에 즉시 반영합니다.',
      step3FinishBtn: '업로드 데이터 급여 정산 반영',
      onStep3FinishClick: handleRunSettlement,
    },
    '1-3': {
      bigPictureGoal:
        '3개 법인(블랙스톤·KMG·락산수) 전 직원의 기본급·비과세(식대/차량)·급여계좌·수습 만료일·기숙사 호실을 관리합니다.',
      bigPictureWhen: '입·퇴사 발생 시 · 급여 변경 시 · 비과세 절세 설정 시',
      bigPictureFlow: '전 직원 명부 → 공통 기본값 + 개별 금액 설정 → 급여대장·4대보험 자동 반영',
      step1GlobalTitle: '전 직원 공통 비과세(식대·차량)·은행 일괄 적용',
      step1GlobalDesc:
        '전 직원의 계약 월급 총액은 유지한 채 비과세 식대·차량유지비를 일괄 분리하여 세금과 보험료를 절감합니다.',
      step1GlobalBtn: '전 직원 월급 유지 + 비과세 일괄 분리 적용',
      onStep1GlobalClick: () =>
        handleApplyGlobalDefaultsToEmployees('SPLIT_TAX_FREE_FROM_BASE'),
      step2IndividualTitle: '예외 직원만 아래 명단 표에서 개별 수정',
      step2IndividualDesc:
        '신규 직원을 등록하거나 기본급·식대·차량비·기숙사 호실이 다른 직원만 아래 표에서 수정 후 [저장]을 누릅니다.',
      step2IndividualBtn: '직원 명단 표 및 개별 수정 영역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '수습 3개월 만료 · 기숙사 퇴실 정산서 다운로드',
      step3FinishDesc:
        '수습 3개월 만료 대상자와 기숙사 퇴실자 일할 공과금 정산 내역서를 엑셀로 내려받습니다.',
      step3FinishBtn: '수습 만료 · 기숙사 정산 엑셀 다운로드',
      onStep3FinishClick: () => handleExportExcel('hr-lifecycle-report'),
    },
    '1-4': {
      bigPictureGoal:
        '당월 변동 수당(상여·연장·직책)·공제(기숙사비·식대) 및 일용직 출근 기록을 등록합니다.',
      bigPictureWhen: '매월 1~8일 일용직 급여일 및 정기 급여 정산 전',
      bigPictureFlow: '수당·공제 및 일용직 출근 → 자동 합산 → 급여대장 · 일용직 세무신고',
      step1GlobalTitle: '일용직 전원 당일 기본 출근 일괄 등록',
      step1GlobalDesc:
        '등록된 일용직 전원의 당일 출근 기록(기본 근무시간·기본 일당)을 한 번에 일괄 생성합니다.',
      step1GlobalBtn: '일용직 전원 기본 출근 일괄 등록',
      onStep1GlobalClick: handleApplyGlobalBatchDailyLogs,
      step2IndividualTitle: '예외 수당·일용직 근무시간 개별 수정',
      step2IndividualDesc:
        '개별 상여금을 추가하거나 근무시간·일당이 다른 직원만 아래 내역 표에서 수정 후 [저장]을 누릅니다.',
      step2IndividualBtn: '수당·일용직 내역 표로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '변동 수당·일당 급여대장 합산',
      step3FinishDesc:
        '등록 및 수정한 수당·공제·일당 내역을 이번 달 전사 급여대장에 즉시 반영합니다.',
      step3FinishBtn: '전사 급여 재계산 실행',
      onStep3FinishClick: handleRunSettlement,
    },
    '1-5': {
      bigPictureGoal:
        '엑셀 업로드 시 발생한 미등록 부서명·수당 항목명을 표준 코드와 1:1로 매핑합니다.',
      bigPictureWhen: '엑셀 업로드 후 미등록 명칭 확인 건수 발생 시',
      bigPictureFlow: '미등록 명칭 분리 → 표준 항목 1:1 연결 승인 → 이후 동일 명칭 자동 인식',
      step1GlobalTitle: '승인된 연결 규칙 반영 및 급여 재정산',
      step1GlobalDesc:
        '승인된 매핑 사전을 전사 데이터에 일괄 적용하고 급여 및 회계전표를 재정산합니다.',
      step1GlobalBtn: '연결 규칙 반영 및 재정산 실행',
      onStep1GlobalClick: handleRunSettlement,
      step2IndividualTitle: '대기 중인 미등록 명칭 표준 부서 지정',
      step2IndividualDesc:
        '아래 대기 목록에서 미확인 항목의 표준 부서 또는 항목을 선택하고 [승인]을 누릅니다.',
      step2IndividualBtn: '미등록 명칭 대기 목록으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '매핑 완료 후 급여대장 화면으로 이동',
      step3FinishDesc:
        '미등록 항목 연결이 완료되면 2단계 급여대장(2-1) 화면으로 이동합니다.',
      step3FinishBtn: '2-1 급여대장 화면으로 이동 →',
      onStep3FinishClick: () => {
        const target = sequentialStepPages.find((p) => p.stepCode === '2-1');
        if (target) handleSelectStepPage(target);
      },
    },
    '2-1': {
      bigPictureGoal:
        '3개 법인 전 직원의 기본급·일할계산·비과세·4대보험·세금·실수령액을 정산하고 은행 이체 파일을 생성합니다.',
      bigPictureWhen: '매월 8일(일용직 급여) · 매월 10일(정규·계약·실습생 급여)',
      bigPictureFlow: '직원명부 + 변동수당/일용직 → 전사 급여 자동 정산 → 하나은행 이체·코나카드·명세서',
      step1GlobalTitle: '3개 법인 전 직원 급여·4대보험·세금 일괄 정산',
      step1GlobalDesc:
        '중도 입·퇴사 일할계산부터 4대보험·원천세·실제 통장 입금액(세후)까지 전 직원을 일괄 계산합니다.',
      step1GlobalBtn: '3개 법인 전 직원 급여 일괄 정산',
      onStep1GlobalClick: handleRunSettlement,
      step2IndividualTitle: '법인별 필터 조회 및 개인별 명세 점검',
      step2IndividualDesc:
        '아래 급여대장에서 법인별·고용형태별 금액을 확인하고, 금액 조정 시 1-3 또는 1-4에서 수정합니다.',
      step2IndividualBtn: '법인별 급여대장 상세 표로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '하나은행 급여이체 · 코나카드 엑셀 다운로드',
      step3FinishDesc:
        '정산이 완료된 하나은행 대량이체 양식 및 지출품의서 엑셀 파일을 내려받습니다.',
      step3FinishBtn: '하나은행 급여이체 엑셀 다운로드',
      onStep3FinishClick: () => handleExportExcel('bank-transfer'),
    },
    '2-2': {
      bigPictureGoal:
        '매월 10일 세무서(원천세·지방소득세·주민세) 및 15일 공단(4대보험·캐디·일용직) 신고 데이터를 생성합니다.',
      bigPictureWhen: '매월 10일(원천세 신고) · 매월 15일(4대보험·캐디 신고)',
      bigPictureFlow: '급여대장 + 캐디 기록 → 법인별 세액·보험료 집계 → 홈택스·4대보험 EDI 엑셀',
      step1GlobalTitle: '당월 원천세 · 4대보험 · 장애인부담금 일괄 집계',
      step1GlobalDesc:
        '급여대장 기준으로 3개 법인의 원천세·지방소득세·주민세와 4대보험 신고 대상을 일괄 재집계합니다.',
      step1GlobalBtn: '당월 세금·4대보험 전체 재집계',
      onStep1GlobalClick: handleRunSettlement,
      step2IndividualTitle: '경기과 캐디 소득 · 보수월액 변경 개별 등록',
      step2IndividualDesc:
        '당월 신규 위촉·해촉된 캐디나 라운딩 소득 변동 내역이 있을 경우 아래 입력창에서 개별 등록합니다.',
      step2IndividualBtn: '세무 요약표 및 개별 등록 영역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '원천세 · 지방소득세 · 주민세 신고 엑셀 다운로드',
      step3FinishDesc:
        '홈택스·위택스·4대보험 EDI 신고에 바로 사용할 수 있는 표준 엑셀 파일을 내려받습니다.',
      step3FinishBtn: '원천세·지방세 신고 엑셀 다운로드',
      onStep3FinishClick: () =>
        handleExportPhase2Excel('withholding-local-resident-tax'),
    },
    '2-3': {
      bigPictureGoal:
        '1년 이상 근속 퇴사자의 법정 퇴직금(평균임금·통상임금 비교) 및 14일 지급기한과 3.3% 사업소득세를 산출합니다.',
      bigPictureWhen: '퇴사자 발생 시 (14일 이내 지급) · 외부 강사료 지급 시',
      bigPictureFlow: '퇴사자 기본급·퇴사일 → 퇴직금 비교 산출 및 기한 관리 → 퇴직금 정산서 엑셀',
      step1GlobalTitle: '퇴직금 및 사업소득 원천징수 내역 동기화',
      step1GlobalDesc:
        '인사 명부의 기본급 정보를 바탕으로 퇴직금 비교 산출 내역과 3.3% 사업소득 세액을 최신화합니다.',
      step1GlobalBtn: '퇴직금·사업소득 내역 최신 동기화',
      onStep1GlobalClick: handleRunSettlement,
      step2IndividualTitle: '퇴사자 개별 등록 · 3.3% 사업소득 등록',
      step2IndividualDesc:
        '퇴사 직원의 퇴사일을 등록하거나 외부 강사·자문 인력의 지급액을 개별 입력합니다.',
      step2IndividualBtn: '퇴직금 계산기 및 사업소득 영역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '퇴직금 산정내역서 엑셀 다운로드',
      step3FinishDesc:
        '전자결재 첨부 및 퇴사자 교부용 퇴직금 정밀 산정내역서 엑셀 파일을 내려받습니다.',
      step3FinishBtn: '퇴직금 산정내역서 엑셀 다운로드',
      onStep3FinishClick: () => handleExportPhase2Excel('severance-statement'),
    },
    '3-1': {
      bigPictureGoal:
        '정산 완료된 인사·급여·회계전표를 더존 아마란스 10과 연동하고 6대 대외 기관 신고를 일괄 실행합니다.',
      bigPictureWhen: '급여 정산 완료 후 그룹웨어 결재 상신 및 대외 기관 신고 시',
      bigPictureFlow: '급여·세무 정산 결과 → 더존 API · 대외기관 일괄 전송 → 결재 상신 및 접수 완료',
      step1GlobalTitle: '더존 결재 상신 및 6대 대외 포털 일괄 실행',
      step1GlobalDesc:
        '전자결재 상신·세무 신고·완납증명서 발급·은행 이체대기 파일 전송을 한 번에 실행합니다.',
      step1GlobalBtn: '더존 결재 및 6대 대외신고 일괄 실행',
      onStep1GlobalClick: handleDispatchAllRpaJobs,
      step2IndividualTitle: '모듈별 개별 연동 · 단일 신고 건 선택 실행',
      step2IndividualDesc:
        '특정 모듈(인사/전표/결재) 또는 개별 신고 작업만 선택하여 아래 대기열에서 실행합니다.',
      step2IndividualBtn: '더존 API 모듈 및 신고 대기열로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '더존 아마란스 10 전 모듈 동기화',
      step3FinishDesc:
        '사원 마스터·전자결재·자동전표·조직도 4대 모듈 전체를 최신 상태로 동기화합니다.',
      step3FinishBtn: '더존 아마란스 10 전 모듈 동기화',
      onStep3FinishClick: () =>
        handleExecuteAmaranthRestApiModule('ALL', '더존 아마란스 10 전체 모듈'),
    },
    '3-2': {
      bigPictureGoal:
        '더존 아마란스 회계전표 업로드를 위해 부서별 인건비 차변(비용)과 대변(예수금·미지급금) 합계 일치를 검증합니다.',
      bigPictureWhen: '매월 급여 정산 후 회계팀 전표 이관 시',
      bigPictureFlow: '급여대장 → 부서별 차·대변 자동 분개 및 대차검증 → 더존 급여전표 엑셀',
      step1GlobalTitle: '전 부서 인건비 회계전표 생성 및 차대변 검증',
      step1GlobalDesc:
        '부서별 제조원가·판관비 계정에 따라 급여·예수금·미지급금 전표를 생성하고 대차 오차(0원)를 검증합니다.',
      step1GlobalBtn: '전 부서 회계전표 생성 및 검증 실행',
      onStep1GlobalClick: handleRunSettlement,
      step2IndividualTitle: '부서별 차변·대변 분개 내역 상세 확인',
      step2IndividualDesc:
        '아래 전표 테이블에서 부서별 계정과목과 금액을 확인합니다.',
      step2IndividualBtn: '부서별 회계전표 상세 표로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '더존 아마란스 급여전표 엑셀 다운로드',
      step3FinishDesc:
        '대차평형 검증이 완료된 더존 아마란스 업로드용 표준 급여전표 엑셀을 내려받습니다.',
      step3FinishBtn: '더존 급여전표 엑셀 다운로드',
      onStep3FinishClick: () => handleExportExcel('amaranth-voucher'),
    },
    '4-1': {
      bigPictureGoal:
        '임직원 휴대폰으로 모바일 급여명세서 조회 링크 또는 신입사원 입사등록 안내 문자를 발송합니다.',
      bigPictureWhen: '급여일 명세서 안내 시 · 신규 입사자 채용 안내 시',
      bigPictureFlow: '임직원 연락처 + 포털 링크 → 솔라피 문자·알림톡 발송 → 모바일 즉시 열람',
      step1GlobalTitle: '전 직원 급여명세서 · 셀프포털 안내 문자 일괄 발송',
      step1GlobalDesc:
        '명부에 연락처가 등록된 전 직원에게 당월 급여명세서 및 증명서 포털 접속 링크를 일괄 발송합니다.',
      step1GlobalBtn: '전 직원 안내 문자 일괄 발송',
      onStep1GlobalClick: handleSendBulkEmployeeSolapiSms,
      step2IndividualTitle: '특정 수신자 1명 개별 문자 발송',
      step2IndividualDesc:
        '신입 합격자 또는 특정 직원 1명에게만 발송할 경우 아래 개별 발송창에서 수신 번호를 입력합니다.',
      step2IndividualBtn: '개별 문자 발송 및 포털 링크 영역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '전 직원 개인별 급여명세서 엑셀 다운로드',
      step3FinishDesc:
        '보관용 전 직원 개인별 급여명세서 통합 엑셀 파일을 내려받습니다.',
      step3FinishBtn: '전 직원 급여명세서 엑셀 다운로드',
      onStep3FinishClick: () => handleExportExcel('payslips'),
    },
    '4-2': {
      bigPictureGoal:
        '신규 입사자가 모바일에서 본인 급여계좌·차량번호·근로계약 전자서명을 직접 입력하여 인사 명부에 자동 등록합니다.',
      bigPictureWhen: '신규 입사 확정 시',
      bigPictureFlow: '입사자 모바일 입력 → 자동 연동 → 직원명부·주차장·연차·법정교육 동시 생성',
      step1GlobalTitle: '합격자 발송용 모바일 셀프 입사링크 복사',
      step1GlobalDesc:
        '합격자에게 안내할 모바일 셀프 입사등록 전용 주소(/?mode=self-onboarding)를 클립보드에 복사합니다.',
      step1GlobalBtn: '모바일 셀프 입사등록 링크 복사',
      onStep1GlobalClick: handleCopySelfOnboardingLink,
      step2IndividualTitle: '입사자 정보 직접 입력 및 전자서명 등록',
      step2IndividualDesc:
        '아래 양식에 성명·급여계좌·차량번호·전자서명을 입력하여 즉시 입사 등록을 처리합니다.',
      step2IndividualBtn: '셀프 입사등록 입력 양식으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '입·퇴사 6단계 체크리스트 확인',
      step3FinishDesc:
        '자동 생성된 6단계 입사 준비 체크리스트와 차량 등록 현황 화면으로 이동합니다.',
      step3FinishBtn: '5-1 입·퇴사 체크리스트 화면으로 이동 →',
      onStep3FinishClick: () => {
        const target = sequentialStepPages.find((p) => p.stepCode === '5-1');
        if (target) handleSelectStepPage(target);
      },
    },
    '5-1': {
      bigPictureGoal:
        '입·퇴사 시 필수 6대 준비 절차(ERP·계약서·이메일·사원증·차량·식당지문)와 주차관제(LPR) 차량번호를 관리합니다.',
      bigPictureWhen: '입·퇴사자 발생 시 · 임직원 및 방문 차량 등록 시',
      bigPictureFlow: '입·퇴사 대상 선택 → 6단계 일괄 완료 및 차량 등록 → 주차관제 대장 엑셀',
      step1GlobalTitle: '입·퇴사 6단계 준비 현황 전체 엑셀 다운로드',
      step1GlobalDesc:
        '전 직원의 입·퇴사 6단계 필수 준비 현황표를 엑셀 파일로 일괄 다운로드합니다.',
      step1GlobalBtn: '입·퇴사 6단계 체크표 엑셀 다운로드',
      onStep1GlobalClick: () => handleExportPhase3Excel('onboarding-amaranth-pack'),
      step2IndividualTitle: '개별 직원 6단계 일괄 완료 · 신규 차량 등록',
      step2IndividualDesc:
        '특정 직원의 6단계 준비 항목을 완료 처리하거나 신규 차량번호를 추가 등록합니다.',
      step2IndividualBtn: '입·퇴사 체크표 및 차량 등록 영역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '주차관제 시스템(LPR) 차량등록 대장 다운로드',
      step3FinishDesc:
        '주차관제실 전달용 임직원·방문 차량 번호판 등록 대장 엑셀을 내려받습니다.',
      step3FinishBtn: '주차관제 차량등록 대장 엑셀 다운로드',
      onStep3FinishClick: () => handleExportPhase3Excel('parking-vehicle-pack'),
    },
    '5-2': {
      bigPictureGoal:
        '구내식당(삼성웰스토리) 식수 인원과 고정 도급비·하나BSN 용역비를 3개 법인별로 집계하여 지출품의서를 생성합니다.',
      bigPictureWhen: '매월 1~2일 월초 정기 지출품의서 작성 시',
      bigPictureFlow: '식수기록·도급·하나BSN 청구액 → 법인별 공급가·부가세 집계 → 품의서 엑셀',
      step1GlobalTitle: '구내식당 단말기 식수 인원 일괄 동기화',
      step1GlobalDesc:
        '삼성웰스토리 구내식당 RFID 단말기에서 당월 식수 인원을 가져와 법인별로 자동 집계합니다.',
      step1GlobalBtn: '구내식당 단말기 식수 기록 동기화',
      onStep1GlobalClick: () =>
        handleTriggerCollectorSync('TERMINAL_MEAL_WELSTORY', '삼성웰스토리 구내식당 식수 단말기'),
      step2IndividualTitle: '식수 · 고정도급 · 하나BSN 용역비 개별 등록',
      step2IndividualDesc:
        '법인별 식대 집계표를 확인하거나 추가 식수·고정 도급비·하나BSN 내역을 개별 입력합니다.',
      step2IndividualBtn: '법인별 집계표 및 개별 입력 영역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '3개 법인 식대비 지출품의서 엑셀 다운로드',
      step3FinishDesc:
        '공급가액과 부가세가 법인별로 산출된 지출품의서 첨부용 엑셀을 내려받습니다.',
      step3FinishBtn: '3개 법인 식대비 품의서 엑셀 다운로드',
      onStep3FinishClick: () => handleExportPhase3Excel('meal-expense-approval'),
    },
    '5-3': {
      bigPictureGoal:
        '전 부서 월 근무표 승인, 임직원 잔여 연차/휴무 대장, 매주 수요일 임원 보고용 인원변동 현황을 관리합니다.',
      bigPictureWhen: '매주 수요일(인원변동 보고) · 매월 말일(근무표 승인 및 연차 마감)',
      bigPictureFlow: '직원명부 + 부서 근무표 → 일괄 승인 및 인원 집계 → 주간 인원보고·근무표 엑셀',
      step1GlobalTitle: '전 부서 월 근무표 일괄 최종 승인',
      step1GlobalDesc:
        '제출된 전 부서의 익월 근무표를 한 번에 최종 품의 완료 상태로 일괄 승인합니다.',
      step1GlobalBtn: '전 부서 월 근무표 일괄 승인',
      onStep1GlobalClick: handleApproveAllSchedules,
      step2IndividualTitle: '부서 근무표 · 개인별 연차/휴무 개별 등록',
      step2IndividualDesc:
        '주간 인원변동 집계표를 확인하거나 개별 부서 근무표·연차 사용 내역을 등록합니다.',
      step2IndividualBtn: '인원변동 집계표 및 연차 내역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '주간 임원 보고용 인원변동 보고서 다운로드',
      step3FinishDesc:
        '3개 법인 고용형태별 현재 인원과 입·퇴사 현황이 집계된 보고서 엑셀을 내려받습니다.',
      step3FinishBtn: '주간 인원변동 보고서 엑셀 다운로드',
      onStep3FinishClick: () =>
        handleExportPhase4Excel('wednesday-headcount-weekly-report'),
    },
    '5-4': {
      bigPictureGoal:
        '재직·완납증명서 발급, 5대 법정의무교육 이수 관리, 산재 30일 이내 보고 기한, IT 전산 요청을 통합 관리합니다.',
      bigPictureWhen: '증명서 발급 · 법정교육 점검 · 산재 발생 · 전산 권한 요청 시',
      bigPictureFlow: '증명서·교육·산재·IT 접수 → 기한 산출 및 이수 처리 → 행정 관리대장 엑셀',
      step1GlobalTitle: '전 직원 셀프 증명서·법정교육 포털 링크 복사',
      step1GlobalDesc:
        '임직원이 직접 재직증명서·원천징수영수증을 발급받고 교육을 이수할 수 있는 포털 주소를 복사합니다.',
      step1GlobalBtn: '임직원 셀프서비스 포털 링크 복사',
      onStep1GlobalClick: () =>
        handleCopyPortalLink('emp-portal', '전 직원 셀프서비스 포털'),
      step2IndividualTitle: '증명서 발급 · 법정교육 이수 · 산재 기한 개별 처리',
      step2IndividualDesc:
        '아래에서 증명서 발급, 개인별 5대 교육 완료 처리, 산재 조사표, IT 요청 티켓을 처리합니다.',
      step2IndividualBtn: '제증명 · 법정교육 · 산재 관리 영역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '법정교육 · 산재 · IT 통합 관리대장 다운로드',
      step3FinishDesc:
        '법정의무교육 이수율과 산재 제출기한, IT 조치 내역이 포함된 엑셀을 내려받습니다.',
      step3FinishBtn: '행정 통합 관리대장 엑셀 다운로드',
      onStep3FinishClick: () =>
        handleExportPhase4Excel('mandatory-training-accident-it-pack'),
    },
    '5-5': {
      bigPictureGoal:
        '연간 4대보험 요율과 전사 공통 기본값(식대·차량·일당), 3개 법인 부서 및 코스트센터 코드를 설정합니다.',
      bigPictureWhen: '매년 1월 보험요율 변경 시 · 공통 수당 기준 변경 시 · 부서 신설 시',
      bigPictureFlow: '보험요율 · 공통 기본값 · 부서코드 설정 → 급여대장 · 회계전표 자동 반영',
      step1GlobalTitle: '전사 공통 기본값(식대·차량·일당·기숙사비) 설정',
      step1GlobalDesc:
        '전 직원에게 공통 적용할 비과세 식대·차량유지비·일용직 일당·기숙사 관리비 기준을 설정합니다.',
      step1GlobalBtn: '전사 공통 기본값 설정 패널 열기',
      onStep1GlobalClick: () => setShowGlobalDefaultsModal(true),
      step2IndividualTitle: '신규 부서 코드 등록 · 4대보험 요율 수정',
      step2IndividualDesc:
        '아래 좌측에서 3개 법인 신규 부서를 등록하거나 우측에서 4대보험 요율(%)을 수정합니다.',
      step2IndividualBtn: '부서 코드 및 4대보험 요율 설정 영역으로 이동 ↓',
      onStep2IndividualClick: () => scrollToIndividualWorkArea(),
      step3FinishTitle: '변경된 기준요율·부서코드로 급여 재정산',
      step3FinishDesc:
        '수정한 보험 요율과 부서 코드를 당월 급여대장과 회계전표에 즉시 반영합니다.',
      step3FinishBtn: '변경 기준 적용 및 급여 재계산',
      onStep3FinishClick: handleRunSettlement,
    },
  };

  const currentBlueprint =
    stepPageBlueprints[currentStepPage.stepCode] ?? stepPageBlueprints['1-1'];

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900">
      {/* ============================================================
          [최상단 금융권 스타일 글로벌 포털 스위처 & 신입 안심 모드 바]
         ============================================================ */}
      <div className="border-b border-slate-200 bg-white px-4 py-1.5 text-slate-800">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-800">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
            <span className="tracking-tight">벨포레 통합 인사·급여 시스템</span>
            <span className="hidden text-slate-300 sm:inline">|</span>
            <span className="hidden text-[11px] font-medium text-slate-500 sm:inline">
              블랙스톤벨포레 · 케이엠지(KMG) · 락산수
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              안심 보호 작동 중 (외부 즉시전송 차단)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 신입 안심 모드 vs 숙련자 전체 모드 스위치 */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsNewcomerFriendlyMode(true);
                  setSidebarMenuMode('ESSENTIAL_5');
                  setShowGuideDetail(false);
                  setShowAdvancedCollectorOnHome(false);
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                  isNewcomerFriendlyMode
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌱 신입 안심 모드 (쉽게 보기)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewcomerFriendlyMode(false);
                  setShowAdvancedCollectorOnHome(true);
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                  !isNewcomerFriendlyMode
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ 숙련자 전체 모드
              </button>
            </div>

            {/* 외부 공유 포털 전환 (신입 안심 모드에서는 접기/펼치기로 깔끔하게 정리) */}
            {isNewcomerFriendlyMode &&
            portalViewMode === 'ADMIN_HQ' &&
            !isSelfOnboardStandaloneView &&
            !showTopPortalPreviewBar ? (
              <button
                type="button"
                onClick={() => setShowTopPortalPreviewBar(true)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                직원·부서장용 화면 미리보기 ▼
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelfOnboardStandaloneView(false);
                    handleSwitchPortalMode('ADMIN_HQ');
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    portalViewMode === 'ADMIN_HQ' && !isSelfOnboardStandaloneView
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  인사 관리 메인
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPortalMode('EMP_PORTAL')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    portalViewMode === 'EMP_PORTAL'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  임직원 셀프포털
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPortalMode('DEPT_PORTAL')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    portalViewMode === 'DEPT_PORTAL'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  부서장 포털
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchPortalMode('SELF_ONBOARDING');
                    setZeroTouchSubView('SELF_ONBOARD');
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    isSelfOnboardStandaloneView
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  신입 셀프입사
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPortalMode('QR_POSTER')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    portalViewMode === 'QR_POSTER'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  QR포스터 인쇄
                </button>
                {isNewcomerFriendlyMode && (
                  <button
                    type="button"
                    onClick={() => setShowTopPortalPreviewBar(false)}
                    className="rounded px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                    title="미리보기 메뉴 접기"
                  >
                    접기 ▲
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          [우측 하단 금융권 스타일 토스트 스낵바 — 상단 헤더 가림 방지]
         ============================================================ */}
      {(loading || uploadingExcel || actionPendingLabel || statusMessage || errorMessage) && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50 w-full max-w-md px-4">
          {loading || uploadingExcel || actionPendingLabel ? (
            <div className="hr-toast-animate pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-slate-900 shadow-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                <div>
                  <div className="text-[11px] font-bold text-blue-700">데이터 처리 중</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">
                    {actionPendingLabel || '요청하신 작업을 처리하고 있습니다...'}
                  </div>
                </div>
              </div>
            </div>
          ) : errorMessage ? (
            <div
              key={`err-${toastTick}`}
              className="hr-toast-animate pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white px-4 py-3 text-slate-900 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <div className="text-[11px] font-bold text-rose-700">확인 필요</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">{errorMessage}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
              >
                닫기
              </button>
            </div>
          ) : statusMessage ? (
            <div
              key={`ok-${toastTick}`}
              className="hr-toast-animate pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <div className="text-[11px] font-bold text-blue-700">처리 완료</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">{statusMessage}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage('')}
                className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
              >
                닫기
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ============================================================
          [보안 분리 포털 1] 전 직원 셀프서비스 포털 (/?mode=emp-portal)
         ============================================================ */}
      {portalViewMode === 'EMP_PORTAL' && (
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                    임직원 셀프서비스 포털 · 보안분리
                  </span>
                </div>
                <h1 className="mt-1.5 text-base font-extrabold text-slate-900 sm:text-lg">
                  급여명세서 · 증명서 발급 · 잔여연차 · 법정교육 · 전자사직서
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  본인 인증 후 급여명세서·재직증명서·원천징수영수증 인쇄, 잔여 연차 조회, 법정교육 수료 및 전자사직서 제출을 처리합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPortalLink('emp-portal', '전 직원 셀프서비스 포털')}
                  className="rounded-xl border border-slate-200 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100"
                >
                  직원 공지용 포털 링크 복사
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchPortalMode(
                      'ADMIN_HQ',
                      '[인사 관리 메인 화면]으로 복귀했습니다.'
                    )
                  }
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                >
                  인사 관리 메인으로 돌아가기
                </button>
              </div>
            </div>

            {/* 본인 성명 선택 + 사번/휴대폰 뒤 4자리 본인 인증 잠금 바 */}
            <form
              onSubmit={handleVerifyEmpPortalPin}
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-extrabold text-slate-900">
                  1단계 본인 선택:
                </span>
                <select
                  value={empPortalSelectedEmpId}
                  onChange={(e) => {
                    setEmpPortalSelectedEmpId(Number(e.target.value));
                    setEmpPortalVerifiedEmpId(0);
                    setEmpPortalPinInput('');
                    setIssuedSelfCertPreview(null);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                >
                  {employees.map((emp) => (
                    <option key={emp.empId} value={emp.empId}>
                      {emp.empName} ({emp.empNo}) — {emp.entityCode}
                    </option>
                  ))}
                </select>

                <span className="ml-1 text-xs font-extrabold text-slate-800">
                  2단계 본인 확인코드:
                </span>
                <input
                  type="password"
                  placeholder="사번 또는 휴대폰/계좌 뒤 4자리"
                  value={empPortalPinInput}
                  onChange={(e) => setEmpPortalPinInput(e.target.value)}
                  className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-blue-600"
                >
                  본인 인증 확인
                </button>
                <button
                  type="button"
                  onClick={handleAutoUnlockEmpPortalForDemo}
                  className="rounded-lg border border-slate-200 bg-amber-50 px-3 py-2 text-[11px] font-extrabold text-slate-900 hover:bg-amber-100"
                >
                  원클릭 자동인증 (즉시열람)
                </button>
              </div>

              {empPortalVerifiedEmpId === Number(empPortalSelectedEmpId) && (
                <button
                  type="button"
                  onClick={() => {
                    setEmpPortalVerifiedEmpId(0);
                    setEmpPortalPinInput('');
                    triggerSuccessToast('개인정보 보호를 위해 본인 인증을 잠금 상태로 전환했습니다.');
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-rose-500"
                >
                  화면 잠금 (로그아웃)
                </button>
              )}
            </form>
          </div>

          {(() => {
            const selEmp = employees.find((e) => e.empId === Number(empPortalSelectedEmpId));
            const isVerified =
              selEmp && empPortalVerifiedEmpId === Number(empPortalSelectedEmpId);
            const selLeave = leaveLedgers.find((l) => l.empId === Number(empPortalSelectedEmpId));
            const selTraining = mandatoryTrainings.find(
              (t) => t.empId === Number(empPortalSelectedEmpId)
            );
            const selPayslip = matrixRows.find(
              (r) =>
                !r.isSubtotal &&
                !r.isGrandTotal &&
                r.empId === Number(empPortalSelectedEmpId)
            );

            if (!isVerified) {
              return (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center shadow-xs">
                  <div className="mx-auto max-w-xl space-y-3">
                    <span className="inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-extrabold text-white">
                      개인 급여·연차·증명서 보안 잠금 상태
                    </span>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {selEmp
                        ? `${selEmp.empName} (${selEmp.empNo})님의 급여명세서 및 인사정보 보호 중`
                        : '본인 성명을 선택해 주세요'}
                    </h2>
                    <p className="text-xs leading-relaxed text-slate-600">
                      구내식당·기숙사 공용 단말기에서도 타 직원이 내 급여나 연차를 볼 수 없도록 잠겨 있습니다. 위 입력칸에 <strong>본인 사번({selEmp?.empNo || '-'})</strong> 또는 <strong>뒤 4자리</strong>를 입력하거나 아래 버튼을 누르면 즉시 열람됩니다.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAutoUnlockEmpPortalForDemo}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-600"
                      >
                        {selEmp?.empName || '선택 직원'} 본인 인증 즉시 통과하고 내 급여명세서·연차·증명서 열기
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {/* 0. [신규] 이번 달 모바일 급여명세서 실시간 열람 및 인쇄 (시트 30, 32, 40번 무인화) */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                        시트 30, 32, 40번 · 인사과 급여문의 {formatNumber(0)}건화
                      </span>
                      <h2 className="mt-1 text-base font-extrabold text-slate-900">
                        [{targetYm}] {selEmp.empName} ({selEmp.empNo}) 모바일 급여명세서
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        소속: {selPayslip?.entityName || selEmp.entityCode} / {selPayslip?.deptName || '-'} | 고용형태: {selPayslip?.employmentTypeName || selEmp.employmentType} | 정산일수: {formatNumber(selPayslip?.payableDays ?? 0)}일 / {formatNumber(selPayslip?.calendarDaysInMonth ?? 0)}일
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') window.print();
                      }}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-600"
                    >
                      내 급여명세서 인쇄 / PDF 저장
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* 지급 내역 */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                      <div className="border-b border-slate-200 pb-1.5 font-extrabold text-slate-800">
                        ① 지급 내역 (세전)
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-600">기본급 (일할반영)</span>
                          <span className="font-mono font-bold">
                            {formatNumber(selPayslip?.basePay ?? 0)}원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">일용직 근무급여</span>
                          <span className="font-mono font-bold">
                            {formatNumber(selPayslip?.dailyTotalGross ?? 0)}원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">비과세 (식대·차량)</span>
                          <span className="font-mono font-bold">
                            {formatNumber(selPayslip?.nonTaxableIncome ?? 0)}원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">보직·연장·상여·기타수당</span>
                          <span className="font-mono font-bold">
                            {formatNumber(
                              (selPayslip?.positionAllowance ?? 0) +
                                (selPayslip?.overtimePay ?? 0) +
                                (selPayslip?.bonusPay ?? 0) +
                                (selPayslip?.specialAllowance ?? 0) +
                                (selPayslip?.otherTaxableAllowance ?? 0)
                            )}
                            원
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-300 pt-1.5 font-extrabold text-slate-950">
                          <span>세전 지급 총액</span>
                          <span className="font-mono text-emerald-700">
                            {formatNumber(selPayslip?.grossPay ?? 0)}원
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 공제 내역 */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                      <div className="border-b border-slate-200 pb-1.5 font-extrabold text-slate-800">
                        ② 법정 4대보험 · 세금 · 기타 공제
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-600">국민연금 / 건강·장기요양</span>
                          <span className="font-mono font-bold">
                            {formatNumber(
                              (selPayslip?.npWorkerDeduction ?? 0) +
                                (selPayslip?.hiWorkerDeduction ?? 0) +
                                (selPayslip?.ltciWorkerDeduction ?? 0)
                            )}
                            원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">고용보험 공제</span>
                          <span className="font-mono font-bold">
                            {formatNumber(selPayslip?.eiWorkerDeduction ?? 0)}원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">소득세 / 지방소득세</span>
                          <span className="font-mono font-bold">
                            {formatNumber(
                              (selPayslip?.incomeTaxDeduction ?? 0) +
                                (selPayslip?.localIncomeTaxDeduction ?? 0)
                            )}
                            원
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">기숙사·식대·기타 정산공제</span>
                          <span className="font-mono font-bold">
                            {formatNumber(
                              (selPayslip?.dormDeduction ?? 0) +
                                (selPayslip?.mealDeduction ?? 0) +
                                (selPayslip?.otherDeduction ?? 0)
                            )}
                            원
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-300 pt-1.5 font-extrabold text-rose-700">
                          <span>공제 합계</span>
                          <span className="font-mono">
                            -{formatNumber(selPayslip?.totalDeduction ?? 0)}원
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 실수령액 */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                      <div>
                        <span className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-extrabold text-white">
                          차인지급액 (통장 입금액)
                        </span>
                        <div className="mt-2 text-2xl font-extrabold text-emerald-800">
                          {formatNumber(selPayslip?.netPay ?? 0)}원
                        </div>
                        <p className="mt-1 text-[11px] text-slate-900">
                          입금계좌: {selEmp.bankName || '하나은행'} {selEmp.accountNo || '-'}
                        </p>
                      </div>
                      <div className="mt-3 rounded-lg bg-white/90 p-2 text-[11px] font-semibold text-slate-700">
                        • 일할/산식: {selPayslip?.prorateFormulaDesc || '정상 만근 기준'}
                      </div>
                    </div>
                  </div>
                </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* 1. 내 잔여 연차 & 월 휴무(OFF) 실시간 조회 */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                      시트 16~18번 무인화
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-slate-900">
                      1. 내 잔여 연차 및 당월 휴무(OFF) 실시간 조회
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      인사과 전화 문의 없이 본인의 올해 연차 및 이번 달 잔여 휴무일수를 실시간 확인합니다.
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-bold text-slate-500">올해 총 발생 연차</div>
                      <div className="mt-1 text-lg font-extrabold text-slate-900">
                        {formatNumber(selLeave?.annualLeaveGranted ?? 0)}일
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        사용 {formatNumber(selLeave?.annualLeaveUsed ?? 0)}일
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-extrabold text-emerald-800">
                        현재 사용 가능 잔여 연차
                      </div>
                      <div className="mt-1 text-xl font-extrabold text-emerald-700">
                        {formatNumber(selLeave?.annualLeaveRemaining ?? 0)}일
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                        입사일({selEmp?.hireDate || '-'}) 기준 자동산정
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-bold text-slate-500">당월 부여 휴무(OFF)</div>
                      <div className="mt-1 text-lg font-extrabold text-slate-900">
                        {formatNumber(selLeave?.monthlyOffGranted ?? 0)}일
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-bold text-blue-700">당월 잔여 휴무(OFF)</div>
                      <div className="mt-1 text-lg font-extrabold text-blue-700">
                        {formatNumber(selLeave?.monthlyOffRemaining ?? 0)}일
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 재직/경력증명서 & 원천징수영수증 1초 즉시 발급 */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                      시트 53, 55번 무인화
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-slate-900">
                      2. 재직·경력증명서 / 원천징수영수증 1초 즉시 발급
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      버튼 클릭 즉시 법인 직인이 날인된 증명서가 발급되며 바로 인쇄/PDF 저장할 수 있습니다.
                    </p>
                  </div>
                  <form onSubmit={handleIssueSelfCert} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">발급 증명서 종류</label>
                      <select
                        value={empPortalCertCategory}
                        onChange={(e) =>
                          setEmpPortalCertCategory(
                            e.target.value as 'EMPLOYMENT_CAREER_CERT' | 'WITHHOLDING_RECEIPT'
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold"
                      >
                        <option value="EMPLOYMENT_CAREER_CERT">
                          재직증명서 / 경력증명서 (국문 공식양식)
                        </option>
                        <option value="WITHHOLDING_RECEIPT">
                          근로소득 원천징수영수증 (은행·관공서 제출용)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">제출 용도</label>
                      <input
                        type="text"
                        value={empPortalCertPurpose}
                        onChange={(e) => setEmpPortalCertPurpose(e.target.value)}
                        placeholder="예: 금융기관 대출 심사 및 관공서 제출용"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-blue-600 py-2.5 font-extrabold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
                    >
                      증명서 1초 즉시 발급 및 인쇄 미리보기 열기
                    </button>
                  </form>

                  {issuedSelfCertPreview && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                        <span className="font-mono text-[11px] font-bold text-slate-600">
                          문서번호: {issuedSelfCertPreview.certNo}
                        </span>
                        <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                          전자직인 날인완료
                        </span>
                      </div>
                      <div className="my-3 text-center text-sm font-extrabold text-slate-950">
                        [ {issuedSelfCertPreview.categoryLabel} ]
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-800">
                        <div>
                          • <strong>성명 (사번):</strong> {issuedSelfCertPreview.empName} (
                          {issuedSelfCertPreview.empNo})
                        </div>
                        <div>
                          • <strong>소속 법인 / 부서:</strong> {issuedSelfCertPreview.entityName} /{' '}
                          {issuedSelfCertPreview.deptName}
                        </div>
                        <div>
                          • <strong>입사일자:</strong> {issuedSelfCertPreview.hireDate}
                        </div>
                        <div>
                          • <strong>발급 용도:</strong> {issuedSelfCertPreview.purpose}
                        </div>
                        <div>
                          • <strong>발급 일자:</strong> {issuedSelfCertPreview.issuedDate} (위 사실을 증명함)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') window.print();
                        }}
                        className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-xs font-extrabold text-white hover:bg-blue-600"
                      >
                        지금 바로 인쇄 / PDF 저장하기
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. 5대 법정필수교육 원클릭 온라인 이수 */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                      시트 58번 무인화
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-slate-900">
                      3. 5대 법정의무교육 원클릭 온라인 이수 서명
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      성희롱예방·직장내괴롭힘·개인정보보호·퇴직연금·산업안전보건 5대 교육을 원클릭으로 이수 등록합니다.
                    </p>
                  </div>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-bold text-slate-700">현재 5대 법정교육 이수 상태</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                          selTraining?.isAllCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {selTraining?.isAllCompleted ? '✓ 5대 전 과목 이수 완료' : '⏳ 미이수 과목 있음'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={loading || !selEmp}
                      onClick={() =>
                        selEmp && handleCompleteTraining(selEmp.empId, selEmp.empName)
                      }
                      className="w-full rounded-xl bg-blue-600 py-2.5 font-extrabold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
                    >
                      5대 법정의무교육 전 과목 온라인 수료 및 본인 전자서명 완료
                    </button>
                  </div>
                </div>

                {/* 4. 모바일 전자사직서 셀프 제출 & 기숙사 퇴실 정산 */}
                <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                      시트 11, 28, 37번 무인 직결
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-slate-900">
                      4. 모바일 전자사직서 셀프 제출 (일할급여·기숙사 자동정산)
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      퇴사자가 직접 전자사직서를 제출하면 중도퇴사 일할급여, 4대보험 상실신고, 기숙사 퇴실 공제가 자동 연동됩니다.
                    </p>
                  </div>
                  <form onSubmit={handleSubmitSelfResignation} className="mt-4 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="mb-1 block font-bold text-slate-700">퇴사 희망일 *</label>
                        <input
                          type="date"
                          value={selfResignForm.resignDate}
                          onChange={(e) =>
                            setSelfResignForm({ ...selfResignForm, resignDate: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-bold text-slate-700">
                          기숙사 퇴실일 (해당자)
                        </label>
                        <input
                          type="date"
                          value={selfResignForm.dormMoveOutDate}
                          onChange={(e) =>
                            setSelfResignForm({
                              ...selfResignForm,
                              dormMoveOutDate: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">사직 사유 *</label>
                      <input
                        type="text"
                        value={selfResignForm.resignReason}
                        onChange={(e) =>
                          setSelfResignForm({ ...selfResignForm, resignReason: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-rose-800">
                        전자사직서 본인 성명 정자 서명 *
                      </label>
                      <input
                        type="text"
                        placeholder="본인 성명 입력"
                        value={selfResignForm.digitalSignatureName}
                        onChange={(e) =>
                          setSelfResignForm({
                            ...selfResignForm,
                            digitalSignatureName: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-rose-300 bg-rose-50/30 px-2.5 py-1.5 font-bold"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-rose-600 py-2.5 font-extrabold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
                    >
                      전자사직서 제출 및 퇴사 6단계·기숙사·일할급여 자동정산 직결
                    </button>
                  </form>
                </div>
              </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================
          [보안 분리 포털 2] 현업 부서장 전용 포털 (/?mode=dept-portal)
         ============================================================ */}
      {portalViewMode === 'DEPT_PORTAL' && (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-extrabold text-blue-700">
                  현업 부서장(팀장·파트장) 전용 업무 직결 포털 (인사과 취합 공수 {formatNumber(0)}시간)
                </span>
                <h1 className="mt-2 text-lg font-extrabold text-slate-900 sm:text-xl">
                  부서별 일용직 출근기록 · 내방객 차량 주차(LPR) · 수요일 주간보고 · 익월 근무표 직접 등록
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  인사과에 카톡이나 수기 엑셀로 보낼 필요 없이 부서장님이 이곳에서 입력하면 전사 급여·주차관제·이사님 보고서로 즉시 직결됩니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPortalLink('dept-portal', '현업 부서장 전용 포털')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-blue-700 hover:bg-blue-50"
                >
                  부서장 단톡방 공유용 링크 복사
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchPortalMode(
                      'ADMIN_HQ',
                      '[인사 관리 메인 화면]으로 복귀했습니다.'
                    )
                  }
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                >
                  인사 관리 메인으로 돌아가기
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 1. 오늘자 부서 일용직 출근기록 등록 (시트 24번) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                시트 24번 · 8일 일용직 급여 직결
              </span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">
                1. 부서 일용직 출근기록 즉시 등록
              </h2>
              <form onSubmit={handleAddDailyLog} className="mt-3 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">근무 일자 *</label>
                    <input
                      type="date"
                      value={dailyForm.workDate}
                      onChange={(e) => setDailyForm({ ...dailyForm, workDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">일용직 사원 선택 *</label>
                    <select
                      value={dailyForm.empId}
                      onChange={(e) =>
                        setDailyForm({ ...dailyForm, empId: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-bold"
                      required
                    >
                      <option value={0}>근무자 선택</option>
                      {employees
                        .filter((em) => em.employmentType === 'DAILY')
                        .map((em) => (
                          <option key={em.empId} value={em.empId}>
                            {em.empName} ({em.empNo})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">일당 지급액 (원) *</label>
                    <input
                      type="number"
                      placeholder="160000"
                      value={dailyForm.dailyGrossPay}
                      onChange={(e) =>
                        setDailyForm({ ...dailyForm, dailyGrossPay: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">근무 시간</label>
                    <input
                      type="number"
                      value={dailyForm.workHours}
                      onChange={(e) => setDailyForm({ ...dailyForm, workHours: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-2.5 font-extrabold text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  일용직 출근 등록 및 세금·급여원장 즉시 반영
                </button>
              </form>
            </div>

            {/* 2. 내방객 · VIP · 신규차량 주차관제 LPR 등록 (시트 39번) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                시트 39번 · 주차 차단기 LPR 직결
              </span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">
                2. 내방객 · VIP · 업체 차량 주차관제(LPR) 등록
              </h2>
              <form onSubmit={handleAddVehicle} className="mt-3 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">방문자/차주 성명 *</label>
                    <input
                      type="text"
                      placeholder="홍길동"
                      value={vehicleForm.ownerOrVisitorName}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, ownerOrVisitorName: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">차량번호 *</label>
                    <input
                      type="text"
                      placeholder="12가 3456"
                      value={vehicleForm.carNumber}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, carNumber: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-bold"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">차종 / 방문목적</label>
                    <input
                      type="text"
                      placeholder="쏘렌토 / 세미나실 대관 방문"
                      value={vehicleForm.visitPurpose}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, visitPurpose: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">연락처</label>
                    <input
                      type="text"
                      placeholder="010-0000-0000"
                      value={vehicleForm.contactPhone}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, contactPhone: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-2.5 font-extrabold text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  주차관제 차단기(LPR) 즉시 등록
                </button>
              </form>
            </div>

            {/* 3. 매주 수요일 부서 주간업무보고 & 팀장 휴무일 제출 (시트 60번) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                시트 60번 · 수요일 이사님 보고 직결
              </span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">
                3. 수요일 부서 주간업무보고 & 팀장 휴무일정 제출
              </h2>
              <form onSubmit={handleAddWeeklyReport} className="mt-3 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">소속 부서 *</label>
                    <select
                      value={weeklyReportForm.deptId}
                      onChange={(e) =>
                        setWeeklyReportForm({
                          ...weeklyReportForm,
                          deptId: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-bold"
                      required
                    >
                      <option value={0}>부서 선택</option>
                      {departments.map((d) => (
                        <option key={d.deptId} value={d.deptId}>
                          {d.deptName} ({d.entityCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">작성 팀장/파트장명 *</label>
                    <input
                      type="text"
                      placeholder="예: 박팀장"
                      value={weeklyReportForm.authorName}
                      onChange={(e) =>
                        setWeeklyReportForm({ ...weeklyReportForm, authorName: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      금주 주요 실적 *
                    </label>
                    <input
                      type="text"
                      placeholder="예: 코스 그린 보수 및 배수 점검 완료"
                      value={weeklyReportForm.thisWeekAchievements}
                      onChange={(e) =>
                        setWeeklyReportForm({
                          ...weeklyReportForm,
                          thisWeekAchievements: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      차주 주요 계획 *
                    </label>
                    <input
                      type="text"
                      placeholder="예: 차주 카트 정기 점검 및 페어웨이 시비"
                      value={weeklyReportForm.nextWeekPlans}
                      onChange={(e) =>
                        setWeeklyReportForm({
                          ...weeklyReportForm,
                          nextWeekPlans: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-bold text-blue-700">
                    팀장·파트장 차주 휴무(OFF) 예정일 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: 화요일(휴무), 목요일(연차)"
                    value={weeklyReportForm.managerOffDaysSchedule}
                    onChange={(e) =>
                      setWeeklyReportForm({
                        ...weeklyReportForm,
                        managerOffDaysSchedule: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-2.5 font-extrabold text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  주간업무보고 및 팀장 휴무일정 즉시 제출
                </button>
              </form>
            </div>

            {/* 4. 매월 말 부서 익월 근무표 제출 (시트 15번) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                시트 15번 · 말일 근무표 일괄품의 직결
              </span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">
                4. 매월 말 부서 근무표(스케줄) 제출
              </h2>
              <form onSubmit={handleSaveSchedule} className="mt-3 space-y-2.5 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">제출 부서 *</label>
                  <select
                    value={scheduleForm.deptId}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, deptId: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-bold"
                    required
                  >
                    <option value={0}>부서 선택</option>
                    {departments.map((d) => (
                      <option key={d.deptId} value={d.deptId}>
                        {d.deptName} ({d.entityCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">부서 총원(명)</label>
                    <input
                      type="number"
                      placeholder="12"
                      value={scheduleForm.totalHeadcount}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, totalHeadcount: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">총 근무일수</label>
                    <input
                      type="number"
                      placeholder="240"
                      value={scheduleForm.scheduledWorkDaysTotal}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          scheduledWorkDaysTotal: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">총 휴무(OFF)일</label>
                    <input
                      type="number"
                      placeholder="96"
                      value={scheduleForm.scheduledOffDaysTotal}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          scheduledOffDaysTotal: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-2.5 font-extrabold text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  부서 월 근무표 제출 완료
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          [현장 배포 키트] 구내식당·기숙사·경기과·부서장실 부착용 QR코드 안내 포스터 3종 인쇄기 (/?mode=qr-poster)
         ============================================================ */}
      {portalViewMode === 'QR_POSTER' && (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-extrabold text-slate-900">
                  현장 부착용 QR코드 안내문 3종 즉시 인쇄 키트 (구내식당 · 기숙사 · 경기과 · 부서장실)
                </span>
                <h1 className="mt-2 text-lg font-extrabold text-slate-900 sm:text-xl">
                  인사과 방문·전화 문의를 원천 차단하는 현장 부착용 셀프 포털 QR 포스터
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  오른쪽 <strong>[A4 포스터 3종 인쇄하기]</strong> 버튼을 눌러 출력한 뒤 구내식당, 기숙사 게시판, 경기과 캐디실, 각 부서 사무실에 부착하세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-600"
                >
                  A4 포스터 3종 지금 바로 인쇄 / PDF 저장
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchPortalMode(
                      'ADMIN_HQ',
                      '[인사 관리 메인 화면]으로 복귀했습니다.'
                    )
                  }
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                >
                  인사 관리 메인으로 돌아가기
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                posterNo: '안내문 1 · 채용장소/대기실/경기과 부착용',
                badgeColor: 'bg-amber-100 text-slate-900',
                borderColor: 'border-slate-200',
                title: '신규 입사자 · 일용직 · 캐디\n스마트폰 1분 셀프 입사등록',
                subtitle: '인사과 방문이나 서류 수기 작성 없이 스마트폰으로 즉시 등록하세요!',
                queryMode: 'self-onboarding' as const,
                targetPortalMode: 'SELF_ONBOARDING' as PortalViewMode,
                urlText: 'https://belleforet-hr.web.app/?mode=self-onboarding',
                steps: [
                  '① 스마트폰 카메라로 아래 QR코드를 스캔합니다.',
                  '② 성명, 급여계좌, 차량번호(주차등록), 기숙사 여부를 입력합니다.',
                  '③ 전자근로계약 서명 후 제출하면 사번 부여·출입·주차가 즉시 완료됩니다.',
                ],
              },
              {
                posterNo: '안내문 2 · 구내식당/기숙사/휴게실 부착용',
                badgeColor: 'bg-emerald-100 text-slate-900',
                borderColor: 'border-slate-200',
                title: '벨포레 전 직원 급여명세서 ·\n잔여연차 · 증명서 1초 발급',
                subtitle: '인사과에 전화하지 않고도 내 폰에서 1초 만에 조회·발급됩니다!',
                queryMode: 'emp-portal' as const,
                targetPortalMode: 'EMP_PORTAL' as PortalViewMode,
                urlText: 'https://belleforet-hr.web.app/?mode=emp-portal',
                steps: [
                  '① QR코드 스캔 후 본인 성명과 사번(뒤 4자리)으로 본인 인증합니다.',
                  '② 이달의 급여명세서(세전·공제·실수령액)와 잔여 연차/휴무를 확인합니다.',
                  '③ 재직·경력증명서, 원천징수영수증 즉시 인쇄, 법정교육, 전자사직서를 처리합니다.',
                ],
              },
              {
                posterNo: '안내문 3 · 현업 팀장/파트장 사무실 부착용',
                badgeColor: 'bg-blue-50 text-slate-900',
                borderColor: 'border-slate-200',
                title: '현업 부서장 전용 일용직 출근 ·\n내방객 주차(LPR) · 주간보고',
                subtitle: '인사과에 카톡·엑셀로 보낼 필요 없이 부서에서 직접 입력하면 즉시 반영됩니다!',
                queryMode: 'dept-portal' as const,
                targetPortalMode: 'DEPT_PORTAL' as PortalViewMode,
                urlText: 'https://belleforet-hr.web.app/?mode=dept-portal',
                steps: [
                  '① 오늘 출근한 부서 일용직 근무자를 선택해 출근기록을 등록합니다.',
                  '② VIP·내방객·외주업체 차량번호를 차단기(LPR)에 즉시 등록합니다.',
                  '③ 매주 수요일 부서 주간업무보고·팀장 휴무일 및 월말 근무표를 제출합니다.',
                ],
              },
            ].map((p, idx) => (
              <div
                key={p.queryMode}
                className={`flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm`}
              >
                <div>
                  <span className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-extrabold ${p.badgeColor}`}>
                    {p.posterNo}
                  </span>
                  <h2 className="mt-3 whitespace-pre-line text-lg font-extrabold leading-snug text-slate-900">
                    {p.title}
                  </h2>
                  <p className="mt-1.5 text-xs font-semibold text-slate-600">{p.subtitle}</p>

                  {/* QR 코드 그래픽 박스 */}
                  <div className="my-5 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <svg
                      viewBox="0 0 110 110"
                      className="h-36 w-36 rounded-lg border border-slate-300 bg-white p-2"
                      aria-label={p.title}
                    >
                      <rect x="6" y="6" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="4" />
                      <rect x="14" y="14" width="12" height="12" fill="#0f172a" />
                      <rect x="76" y="6" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="4" />
                      <rect x="84" y="14" width="12" height="12" fill="#0f172a" />
                      <rect x="6" y="76" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="4" />
                      <rect x="14" y="84" width="12" height="12" fill="#0f172a" />
                      <rect x="42" y="10" width="8" height="8" fill="#0f172a" />
                      <rect x="56" y="10" width="8" height="8" fill="#0f172a" />
                      <rect x="42" y="24" width="14" height="8" fill="#0f172a" />
                      <rect x="10" y="44" width="16" height="8" fill="#0f172a" />
                      <rect x="34" y="44" width="12" height="12" fill="#0f172a" />
                      <rect x="54" y="40" width="16" height="16" fill={idx === 0 ? '#d97706' : idx === 1 ? '#059669' : '#0891b2'} />
                      <rect x="78" y="44" width="22" height="8" fill="#0f172a" />
                      <rect x="14" y="60" width="12" height="8" fill="#0f172a" />
                      <rect x="38" y="62" width="20" height="8" fill="#0f172a" />
                      <rect x="66" y="62" width="12" height="12" fill="#0f172a" />
                      <rect x="86" y="60" width="14" height="14" fill="#0f172a" />
                      <rect x="42" y="80" width="12" height="20" fill="#0f172a" />
                      <rect x="62" y="84" width="18" height="8" fill="#0f172a" />
                      <rect x="86" y="82" width="16" height="18" fill="#0f172a" />
                    </svg>
                    <div className="mt-2.5 text-center font-mono text-[11px] font-extrabold text-slate-900">
                      {p.urlText}
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-800">
                    {p.steps.map((st, sIdx) => (
                      <div key={sIdx} className="font-semibold leading-relaxed">
                        {st}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink(p.queryMode, p.posterNo)}
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    주소 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        p.targetPortalMode,
                        `[${p.posterNo}] 실제 포털 화면으로 이동했습니다!`
                      )
                    }
                    className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-extrabold text-white hover:bg-blue-600"
                  >
                    포털 바로 열기 </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {portalViewMode !== 'EMP_PORTAL' &&
        portalViewMode !== 'DEPT_PORTAL' &&
        portalViewMode !== 'QR_POSTER' && (
        <div className="mx-auto flex min-h-[calc(100vh-44px)] max-w-[1600px] flex-col lg:flex-row">
          {/* ============================================================
              [좌측 고정 단계별 사이드 메뉴 (Left Sequential Sidebar)]
              - 검정 배경 없는 순백색(White) & 에메랄드 라이트 디자인
              - 1-1 1-2 ... 5-5 차례대로 클릭하면 우측에 딱 1페이지만 열림!
             ============================================================ */}
          <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-76 lg:overflow-y-auto lg:border-r lg:border-b-0">
            <div className="space-y-4 p-4">
              {/* 브랜드 타이틀 + 귀속연월 + 통합 실행 패널 */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                      벨포레 인사·급여 시스템
                    </h1>
                    <p className="truncate text-[11px] font-medium text-slate-500">
                      블랙스톤 · KMG · 락산수 통합
                    </p>
                  </div>
                </div>

                {/* 귀속연월 선택 */}
                <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <CalendarClock className="h-3.5 w-3.5 text-blue-600" />
                    {isNewcomerFriendlyMode ? '급여 계산할 달' : '귀속연월'}
                  </span>
                  <input
                    type="month"
                    value={targetYm}
                    onChange={(e) => {
                      setTargetYm(e.target.value);
                      triggerSuccessToast(
                        `귀속연월이 [${e.target.value}]로 변경되었습니다.`
                      );
                    }}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 핵심 실행 버튼 (신입 안심 모드에서는 버튼 1개로 단순화) */}
                <div className="mt-2.5 space-y-1.5">
                  <button
                    type="button"
                    onClick={handleRunMagicAllInOne}
                    disabled={loading}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-2xs transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Calculator className="h-3.5 w-3.5" />
                    <span>
                      {loading
                        ? '자동 계산 중...'
                        : isNewcomerFriendlyMode
                        ? '이번 달 급여 1클릭 자동 계산'
                        : '1~3단계 통합 자동정산 실행'}
                    </span>
                  </button>
                  {!isNewcomerFriendlyMode && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={handleRunSettlement}
                        disabled={loading || !targetYm}
                        className="flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Calculator className="h-3 w-3 text-slate-500" />
                        <span>{loading ? '계산 중...' : '급여 재계산'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowGlobalDefaultsModal((prev) => !prev)}
                        className={`flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition ${
                          showGlobalDefaultsModal
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>공통 기본값 {showGlobalDefaultsModal ? '▲' : '▼'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 좌측 메뉴: [핵심 5개 메뉴] vs [전체 16개 메뉴] 세그먼트 스위치 */}
              <div className="space-y-2.5">
                <div className="rounded-lg bg-slate-100 p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setSidebarMenuMode('ESSENTIAL_5')}
                      className={`rounded-md py-1.5 text-[11px] font-bold transition ${
                        sidebarMenuMode === 'ESSENTIAL_5'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      필수 {formatNumber(5)}순서만 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarMenuMode('ALL_16')}
                      className={`rounded-md py-1.5 text-[11px] font-bold transition ${
                        sidebarMenuMode === 'ALL_16'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      전체 {formatNumber(sequentialStepPages.length)}개 메뉴
                    </button>
                  </div>
                </div>

                {sidebarMenuMode === 'ESSENTIAL_5' ? (
                  <div className="space-y-1.5">
                    {/* 시작 홈 버튼 (항상 최상단에 깔끔하게 고정) */}
                    <button
                      type="button"
                      onClick={() => {
                        const homePage = sequentialStepPages[0];
                        if (homePage) handleSelectStepPage(homePage);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                        currentStepPage.stepCode === '1-1'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs'
                          : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            currentStepPage.stepCode === '1-1'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          홈
                        </span>
                        <span className="text-xs font-extrabold">
                          시작 안내 · 오늘 할 일
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        처음 화면
                      </span>
                    </button>

                    <div className="px-1 pt-1 text-[11px] font-bold text-slate-500">
                      매월 순서대로 따라하기 ({formatNumber(5)}순서)
                    </div>
                    {sequentialStepPages
                      .filter(
                        (p) =>
                          essentialStepCodes.includes(p.stepCode) ||
                          (p.stepCode === currentStepPage.stepCode && p.stepCode !== '1-1')
                      )
                      .map((page) => {
                        const isCurrent = page.stepCode === currentStepPage.stepCode;
                        const essentialRank = essentialStepCodes.indexOf(page.stepCode) + 1;
                        const isEssential = essentialRank > 0;
                        return (
                          <button
                            key={page.stepCode}
                            type="button"
                            onClick={() => handleSelectStepPage(page)}
                            className={`flex w-full flex-col gap-1 rounded-xl border p-2.5 text-left transition ${
                              isCurrent
                                ? 'border-blue-600 bg-blue-50/50 text-slate-900 shadow-2xs'
                                : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isCurrent
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isEssential
                                  ? `${formatNumber(essentialRank)}순서`
                                  : `선택 메뉴 · ${page.stepCode}`}
                              </span>
                              {page.badgeCount !== undefined && page.badgeCount > 0 && (
                                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                  {formatNumber(page.badgeCount)}건
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-xs font-extrabold ${
                                isCurrent ? 'text-blue-700' : 'text-slate-900'
                              }`}
                            >
                              {page.title}
                            </div>
                            {(!isNewcomerFriendlyMode || isCurrent) && (
                              <div className="line-clamp-2 text-[11px] leading-snug text-slate-500">
                                {page.easyDesc}
                              </div>
                            )}
                          </button>
                        );
                      })}

                    <button
                      type="button"
                      onClick={() => setSidebarMenuMode('ALL_16')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-center text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                    >
                      퇴직금 · 식당 · 연차 · 설정 메뉴 더보기 ▼
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-slate-500">
                        전체 1~5단계 메뉴
                      </span>
                      <button
                        type="button"
                        onClick={() => setSidebarMenuMode('ESSENTIAL_5')}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        필수 5순서만 보기 ▲
                      </button>
                    </div>

                    {stepGroupNames.map((gName) => {
                      const groupPages = sequentialStepPages.filter(
                        (p) => p.groupTitle === gName
                      );
                      return (
                        <div
                          key={gName}
                          className="rounded-xl border border-slate-200 bg-slate-50/60 p-2"
                        >
                          <div className="mb-1 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                            {gName}
                          </div>
                          <div className="space-y-0.5">
                            {groupPages.map((page) => {
                              const isCurrent =
                                page.stepCode === currentStepPage.stepCode;
                              return (
                                <button
                                  key={page.stepCode}
                                  type="button"
                                  onClick={() => handleSelectStepPage(page)}
                                  className={`flex w-full items-center justify-between gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                    isCurrent
                                      ? 'bg-blue-600 font-bold text-white shadow-2xs'
                                      : 'bg-transparent font-medium text-slate-700 hover:bg-white hover:text-slate-900'
                                  }`}
                                >
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <span
                                      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                        isCurrent
                                          ? 'bg-white/20 text-white'
                                          : 'bg-slate-200/70 text-slate-600'
                                      }`}
                                    >
                                      {page.stepCode}
                                    </span>
                                    <span className="truncate">{page.title}</span>
                                  </div>
                                  {page.badgeCount !== undefined && page.badgeCount > 0 && (
                                    <span
                                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                        isCurrent
                                          ? 'bg-white text-blue-700'
                                          : page.badgeTone === 'rose'
                                          ? 'bg-rose-50 text-rose-700'
                                          : 'bg-amber-50 text-amber-700'
                                      }`}
                                    >
                                      {formatNumber(page.badgeCount)}건
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ============================================================
              [우측 독립 페이지 영역]
             ============================================================ */}
          <div className="min-w-0 flex-1">
            {/* 상단 화이트 네비게이션 바 */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-2 backdrop-blur-md">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    {currentStepPage.stepCode === '1-1'
                      ? '시작 홈'
                      : essentialStepCodes.includes(currentStepPage.stepCode)
                      ? `필수 ${formatNumber(essentialStepCodes.indexOf(currentStepPage.stepCode) + 1)}순서`
                      : `${currentStepPage.stepCode}`}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {currentStepPage.stepCode === '1-1' && isNewcomerFriendlyMode
                      ? '처음 오신 분을 위한 3단계 시작 화면'
                      : currentStepPage.title}
                  </span>
                </div>

                {/* 중앙: 업무 빠른 검색창 */}
                <div className="relative min-w-[220px] max-w-sm flex-1">
                  <input
                    type="text"
                    value={quickMenuSearch}
                    onChange={(e) => setQuickMenuSearch(e.target.value)}
                    placeholder="찾으시는 업무를 검색하세요 (예: 퇴직금, 연차, 식대, 이체)"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                  {quickMenuSearch && (
                    <button
                      type="button"
                      onClick={() => setQuickMenuSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  )}
                  {filteredQuickSearchItems.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      <div className="mb-1 px-2 text-[10px] font-bold text-slate-500">
                        검색 결과 ({formatNumber(filteredQuickSearchItems.length)}건)
                      </div>
                      {filteredQuickSearchItems.map((qItem) => (
                        <button
                          key={qItem.key}
                          type="button"
                          onClick={() => {
                            setQuickMenuSearch('');
                            navigateToWorkspace(
                              qItem.targetTab,
                              undefined,
                              true,
                              qItem.subView
                            );
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-800 hover:bg-slate-50"
                        >
                          <span className="truncate font-bold">{qItem.title}</span>
                          <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {qItem.badge} </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 우측 유틸리티 버튼 */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowGlobalDefaultsModal((prev) => !prev)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                      showGlobalDefaultsModal
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    공통 금액 설정 {showGlobalDefaultsModal ? '▲' : '▼'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBeginnerGuide((prev) => !prev);
                      setShowKidsWordBook(false);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                      showBeginnerGuide || showKidsWordBook
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    쉬운 용어 · 도움말 {showBeginnerGuide || showKidsWordBook ? '▲' : '▼'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runWithFeedback(
                        '최신 인사·급여 데이터를 동기화하고 있습니다...',
                        async () => `[${targetYm}] 최신 인사·급여 데이터를 새로고침했습니다.`
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                    title="최신 데이터 새로고침"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`}
                    />
                  </button>
                </div>
              </div>
            </header>

            <main
              id="hr-workspace-anchor"
              key={`ws-anchor-${workspaceFlashTick}`}
              className="mx-auto max-w-6xl space-y-4 px-6 py-4"
            >
              {/* ============================================================
                  [금융권 스타일 슬림 업무 툴바 & 3단계 실행 바 (Above-the-Fold 최적화)]
                  - 신입 안심 모드의 시작 홈(1-1)에서는 하단 '신입 3단계 환영 카드'가 안내하므로 중복 툴바를 숨겨 압도감을 원천 차단
                 ============================================================ */}
              {(!isNewcomerFriendlyMode || currentStepPage.stepCode !== '1-1') && (
              <div className="hr-section-flash rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      {essentialStepCodes.includes(currentStepPage.stepCode)
                        ? `필수 ${formatNumber(essentialStepCodes.indexOf(currentStepPage.stepCode) + 1)}순서`
                        : `${currentStepPage.groupTitle} · ${currentStepPage.stepCode}`}
                    </span>
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
                      {currentStepPage.title}
                    </h2>
                    <span className="hidden text-xs text-slate-400 lg:inline">|</span>
                    <span className="hidden text-[11px] font-medium text-slate-600 lg:inline">
                      {isNewcomerFriendlyMode
                        ? currentStepPage.easyDesc
                        : currentBlueprint.bigPictureWhen}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {!showGuideDetail && (
                      <>
                        <button
                          type="button"
                          onClick={currentBlueprint.onStep1GlobalClick}
                          disabled={loading}
                          title={currentBlueprint.step1GlobalDesc}
                          className="flex h-7 items-center rounded-lg bg-blue-600 px-2.5 text-[11px] font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          ① 일괄 처리
                        </button>
                        <button
                          type="button"
                          onClick={currentBlueprint.onStep2IndividualClick}
                          title={currentBlueprint.step2IndividualDesc}
                          className="flex h-7 items-center rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          ② 개별 수정
                        </button>
                        <button
                          type="button"
                          onClick={currentBlueprint.onStep3FinishClick}
                          disabled={loading}
                          title={currentBlueprint.step3FinishDesc}
                          className="flex h-7 items-center rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                        >
                          ③ 완료·출력
                        </button>
                        <span className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:inline-block" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowGuideDetail((prev) => !prev)}
                      className="flex h-7 items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                    >
                      {showGuideDetail ? '설명 접기 ▲' : '자세한 설명 ▼'}
                    </button>
                    {prevStepPage && (
                      <button
                        type="button"
                        onClick={() => handleSelectStepPage(prevStepPage)}
                        className="flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        ◀ 이전
                      </button>
                    )}
                    {nextStepPage && (
                      <button
                        type="button"
                        onClick={() => handleSelectStepPage(nextStepPage)}
                        className="flex h-7 items-center rounded-lg bg-slate-900 px-2.5 text-[11px] font-bold text-white hover:bg-slate-800"
                      >
                        다음 순서 ▶
                      </button>
                    )}
                  </div>
                </div>

                {/* [펼침 시: 업무 개요 + STEP 01 · 02 · 03 상세 가이드] */}
                {showGuideDetail && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          업무 개요
                        </span>
                        <span className="font-bold text-slate-800">
                          {currentBlueprint.bigPictureGoal}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200/60 pt-1.5 text-[11px] text-slate-500">
                        <span>
                          <strong className="font-semibold text-slate-700">권장 시기:</strong>{' '}
                          {currentBlueprint.bigPictureWhen}
                        </span>
                        <span className="hidden text-slate-300 sm:inline">|</span>
                        <span>
                          <strong className="font-semibold text-slate-700">연동 흐름:</strong>{' '}
                          {currentBlueprint.bigPictureFlow}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {/* STEP 01: 전체 일괄 처리 (Primary Blue) */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-xs">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              STEP 01 · 일괄 처리
                            </span>
                            <span className="text-[10px] font-semibold text-blue-600">
                              전사 공통 실행
                            </span>
                          </div>
                          <div className="mt-1.5 font-extrabold text-slate-900">
                            {currentBlueprint.step1GlobalTitle}
                          </div>
                          <p className="mt-1 leading-relaxed text-slate-600">
                            {currentBlueprint.step1GlobalDesc}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={currentBlueprint.onStep1GlobalClick}
                          disabled={loading}
                          className="mt-3 flex min-h-8 w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-center text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {currentBlueprint.step1GlobalBtn}
                        </button>
                      </div>

                      {/* STEP 02: 개별 예외 수정 (Clean Slate Outline) */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-xs">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              STEP 02 · 개별 확인·수정
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              예외 대상만
                            </span>
                          </div>
                          <div className="mt-1.5 font-extrabold text-slate-900">
                            {currentBlueprint.step2IndividualTitle}
                          </div>
                          <p className="mt-1 leading-relaxed text-slate-600">
                            {currentBlueprint.step2IndividualDesc}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={currentBlueprint.onStep2IndividualClick}
                          className="mt-3 flex min-h-8 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-center text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          {currentBlueprint.step2IndividualBtn}
                        </button>
                      </div>

                      {/* STEP 03: 결과 확인 · 다운로드 (Soft Blue Tint) */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-xs">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              STEP 03 · 완료 및 파일 출력
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              마무리 단계
                            </span>
                          </div>
                          <div className="mt-1.5 font-extrabold text-slate-900">
                            {currentBlueprint.step3FinishTitle}
                          </div>
                          <p className="mt-1 leading-relaxed text-slate-600">
                            {currentBlueprint.step3FinishDesc}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={currentBlueprint.onStep3FinishClick}
                          disabled={loading}
                          className="mt-3 flex min-h-8 w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-center text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                        >
                          {currentBlueprint.step3FinishBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* ============================================================
                  [전사 공통 기본값 설정 패널]
                 ============================================================ */}
              {showGlobalDefaultsModal && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          공통 기준 설정
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          전사 공통 기본값 설정 (식대·차량유지비·보직수당·급여은행·일용직 일당)
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        전 직원에게 공통 적용할 기본 금액을 설정한 뒤 일괄 반영하고, 예외 직원만 명단 표에서 개별 수정합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGlobalDefaultsModal(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      닫기 ✕
                    </button>
                  </div>

                  <form
                    onSubmit={handleSaveGlobalDefaults}
                    className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"
                  >
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <label className="block text-[11px] font-bold text-slate-700">
                        1. 기본 비과세 식대 (월 한도 {formatNumber(200000)}원)
                      </label>
                      <input
                        type="number"
                        value={globalDefaults.defaultMealAllowanceTaxFree}
                        onChange={(e) =>
                          setGlobalDefaults({
                            ...globalDefaults,
                            defaultMealAllowanceTaxFree: Number(e.target.value),
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <label className="block text-[11px] font-bold text-slate-700">
                        2. 기본 비과세 차량유지비 (월 한도 {formatNumber(200000)}원)
                      </label>
                      <input
                        type="number"
                        value={globalDefaults.defaultCarAllowanceTaxFree}
                        onChange={(e) =>
                          setGlobalDefaults({
                            ...globalDefaults,
                            defaultCarAllowanceTaxFree: Number(e.target.value),
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <label className="block text-[11px] font-bold text-slate-700">
                        3. 팀장 기본 보직수당 (코나카드)
                      </label>
                      <input
                        type="number"
                        value={globalDefaults.defaultTeamLeaderAllowance}
                        onChange={(e) =>
                          setGlobalDefaults({
                            ...globalDefaults,
                            defaultTeamLeaderAllowance: Number(e.target.value),
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <label className="block text-[11px] font-bold text-slate-700">
                        4. 주거래 기본 급여은행
                      </label>
                      <input
                        type="text"
                        value={globalDefaults.defaultBankName}
                        onChange={(e) =>
                          setGlobalDefaults({
                            ...globalDefaults,
                            defaultBankName: e.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <label className="block text-[11px] font-bold text-slate-700">
                        5. 일용직 기본 근무시간 (일)
                      </label>
                      <input
                        type="number"
                        value={globalDefaults.defaultDailyWorkHours}
                        onChange={(e) =>
                          setGlobalDefaults({
                            ...globalDefaults,
                            defaultDailyWorkHours: Number(e.target.value),
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <label className="block text-[11px] font-bold text-slate-700">
                        6. 일용직 기본 일당 (세전)
                      </label>
                      <input
                        type="number"
                        value={globalDefaults.defaultDailyGrossWage}
                        onChange={(e) =>
                          setGlobalDefaults({
                            ...globalDefaults,
                            defaultDailyGrossWage: Number(e.target.value),
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <label className="block text-[11px] font-bold text-slate-700">
                        7. 기숙사 월 기본 관리비 공제액
                      </label>
                      <input
                        type="number"
                        value={globalDefaults.defaultDormDeductionMonthly}
                        onChange={(e) =>
                          setGlobalDefaults({
                            ...globalDefaults,
                            defaultDormDeductionMonthly: Number(e.target.value),
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={globalDefaults.autoSplitTaxFreeOnTotalPay}
                          onChange={(e) =>
                            setGlobalDefaults({
                              ...globalDefaults,
                              autoSplitTaxFreeOnTotalPay: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                        />
                        8. 계약 월급에서 비과세 자동 분리
                      </label>
                      <button
                        type="submit"
                        className="mt-2 w-full rounded-lg bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        공통 기본값 저장
                      </button>
                    </div>
                  </form>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs font-bold text-slate-700">
                      전 직원({formatNumber(employees.length)}명) 일괄 반영:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyGlobalDefaultsToEmployees('EMPTY_ONLY')}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        미입력({formatNumber(0)}원) 직원만 채우기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyGlobalDefaultsToEmployees('FORCE_ALL')}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        전 직원 기본값 일괄 적용
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyGlobalDefaultsToEmployees('SPLIT_TAX_FREE_FROM_BASE')
                        }
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        전 직원 월급 유지 + 비과세 자동 분리
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* ============================================================
                  [통일된 도움말 센터] (전체 큰그림 지도 · 상황별 해결 공식 · 쉬운 용어사전)
                  - 도움을 받는 방식도 100% 일관된 [큰 그림 + 세부 설명 + 바로가기 버튼] 양식!
                 ============================================================ */}
              {(showBeginnerGuide || showKidsWordBook) && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        도움말 센터
                      </span>
                      <h2 className="text-sm font-bold text-slate-900">
                        전체 프로세스 안내 · 상황별 업무 매뉴얼 · 인사·급여 용어집
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setUnifiedHelpTab('BIG_PICTURE')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          unifiedHelpTab === 'BIG_PICTURE'
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        1. 전체 5단계 프로세스
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnifiedHelpTab('SCENARIOS')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          unifiedHelpTab === 'SCENARIOS'
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        2. 상황별 업무 가이드
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnifiedHelpTab('GLOSSARY')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          unifiedHelpTab === 'GLOSSARY'
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        3. 인사·세무 용어집
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBeginnerGuide(false);
                          setShowKidsWordBook(false);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        닫기
                      </button>
                    </div>
                  </div>

                  {/* 탭 1: 전체 5단계 프로세스 */}
                  {unifiedHelpTab === 'BIG_PICTURE' && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
                        <div className="font-bold text-slate-900">
                          전체 업무 흐름 안내
                        </div>
                        <p className="mt-1 leading-relaxed text-slate-600">
                          좌측 메뉴의 <strong>1단계(기초자료) 2단계(급여·세금 정산) 3단계(더존 결재·전표) 4단계(안내·셀프입사) 5단계(일상 인사·보고)</strong> 순서대로 진행합니다. 모든 화면 상단은 <strong>[STEP 01 전사 일괄 실행 STEP 02 예외 개별 수정 STEP 03 결과 파일 다운로드]</strong>의 동일한 3단계 표준 양식으로 구성되어 있습니다.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                        {[
                          {
                            stage: 'STEP 1 (1-1 ~ 1-5)',
                            bigTitle: '기초자료 수집·점검',
                            bigGoal: '급여 정산 전 직원 명부와 출퇴근·식수·일용직 기초자료를 검증합니다.',
                            detail: '공통 기준값으로 비과세·일당을 일괄 반영한 뒤 예외 대상자만 표에서 개별 수정합니다.',
                            firstStepCode: '1-3',
                            btnText: '1-3 전 직원 명부 이동',
                          },
                          {
                            stage: 'STEP 2 (2-1 ~ 2-3)',
                            bigTitle: '급여·세금·퇴직금 정산',
                            bigGoal: '3개 법인 전 직원의 급여·원천세·4대보험·퇴직금을 자동 산출합니다.',
                            detail: '전사 자동정산 실행 후 법인별 실수령액을 확인하고 은행 이체·세무 신고 파일을 다운로드합니다.',
                            firstStepCode: '2-1',
                            btnText: '2-1 급여 계산표 이동',
                          },
                          {
                            stage: 'STEP 3 (3-1 ~ 3-2)',
                            bigTitle: '더존 결재·회계전표',
                            bigGoal: '정산된 급여를 더존 아마란스 전자결재·회계전표 및 신고기관으로 전송합니다.',
                            detail: '전송 데이터를 일괄 생성하고 차변·대변 일치 검증 후 더존 전표 엑셀을 다운로드합니다.',
                            firstStepCode: '3-1',
                            btnText: '3-1 더존·신고 센터 이동',
                          },
                          {
                            stage: 'STEP 4 (4-1 ~ 4-2)',
                            bigTitle: '안내 발송·셀프입사',
                            bigGoal: '급여명세서 조회 링크와 신입사원 모바일 입사등록 링크를 발송합니다.',
                            detail: '전 직원 안내 문자를 일괄 발송하거나 신입사원에게 입사등록 링크를 개별 전송합니다.',
                            firstStepCode: '4-1',
                            btnText: '4-1 문자발송 센터 이동',
                          },
                          {
                            stage: 'STEP 5 (5-1 ~ 5-5)',
                            bigTitle: '일상 인사·식수·증명서',
                            bigGoal: '입·퇴사 체크리스트, 식대·용역 품의서, 주간 인원보고, 제증명서를 관리합니다.',
                            detail: '근무표 일괄승인 및 식수 동기화 후 특이사항만 입력하여 보고서 엑셀을 다운로드합니다.',
                            firstStepCode: '5-3',
                            btnText: '5-3 주간 인원보고 이동',
                          },
                        ].map((st) => (
                          <div
                            key={st.stage}
                            className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 text-xs"
                          >
                            <div>
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                {st.stage}
                              </span>
                              <div className="mt-2 font-bold text-slate-900">
                                {st.bigTitle}
                              </div>
                              <p className="mt-1 text-[11px] font-medium text-slate-700">
                                {st.bigGoal}
                              </p>
                              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                                {st.detail}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const target = sequentialStepPages.find(
                                  (p) => p.stepCode === st.firstStepCode
                                );
                                if (target) {
                                  handleSelectStepPage(target);
                                  setShowBeginnerGuide(false);
                                }
                              }}
                              className="mt-3 w-full rounded-lg border border-slate-300 bg-white py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                            >
                              {st.btnText}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 탭 2: 상황별 업무 가이드 */}
                  {unifiedHelpTab === 'SCENARIOS' && (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
                        {practiceScenarios.map((sc) => {
                          const isSelected = sc.id === activeScenario.id;
                          return (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => setSelectedScenarioId(sc.id)}
                              className={`flex flex-col justify-between rounded-lg border p-3 text-left transition ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/50 text-slate-900'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="inline-block w-fit rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {sc.badge}
                              </span>
                              <div className="mt-1.5 text-xs font-bold leading-snug">
                                {sc.title}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-900">
                          {activeScenario.title}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{activeScenario.situation}</p>
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                          {activeScenario.steps.map((st, idx) => (
                            <div
                              key={st.stepLabel}
                              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 text-xs"
                            >
                              <div>
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                    idx === 0
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {st.stepLabel}
                                </span>
                                <div className="mt-2 font-bold text-slate-900">
                                  {st.actionTitle}
                                </div>
                                <p className="mt-1 leading-relaxed text-slate-600">
                                  {st.howToExplain}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigateToWorkspace(st.targetTab);
                                  setShowBeginnerGuide(false);
                                }}
                                className="mt-3 w-full rounded-lg bg-blue-600 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                              >
                                {st.buttonLabel}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 탭 3: 인사·세무 용어집 */}
                  {unifiedHelpTab === 'GLOSSARY' && (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        {
                          term: '01. 비과세 식대 · 차량유지비',
                          bigMeaning: '소득세와 4대보험료가 부과되지 않는 법정 비과세 급여 항목입니다.',
                          detail:
                            '계약 급여 총액에서 법정 비과세 식대와 자가운전보조금을 분리하면 과세 대상 소득이 줄어들어 근로자와 법인 모두 세금 및 보험료 부담이 절감됩니다.',
                          stepCode: '1-3',
                          btnLabel: '1-3 전 직원 명부 이동',
                        },
                        {
                          term: '02. 원천세 · 지방소득세 · 주민세',
                          bigMeaning: '급여 지급 시 원천징수하여 익월 10일까지 신고·납부하는 세금입니다.',
                          detail:
                            '국세청(홈택스)에는 근로·일용·사업소득세를, 지자체(위택스)에는 특별징수 지방소득세(소득세의 10%)와 주민세 종업원분(과세 급여총액의 0.5%)을 신고합니다.',
                          stepCode: '2-2',
                          btnLabel: '2-2 세금·4대보험 이동',
                        },
                        {
                          term: '03. 4대보험 & 캐디 특고 고용·산재',
                          bigMeaning: '국민연금·건강·고용·산재보험 및 특수형태근로종사자 의무 보험입니다.',
                          detail:
                            '상용직은 4대보험 전체를 적용하며, 골프장 경기보조원(캐디)은 매출 연동 수입에서 경비율을 차감한 기준보수액으로 산재·고용보험료를 산정합니다.',
                          stepCode: '2-2',
                          btnLabel: '2-2 캐디·4대보험 이동',
                        },
                        {
                          term: '04. 회계전표 (차변 · 대변 검증)',
                          bigMeaning: '더존 아마란스 ERP에 부서별 인건비 귀속을 기표하기 위한 전표입니다.',
                          detail:
                            '차변(급여·제수당·퇴직급여 비용 총액)과 대변(원천세·4대보험 예수금 + 미지급 실수령액)의 합계가 1원 단위까지 일치해야 전표 승인이 완료됩니다.',
                          stepCode: '3-2',
                          btnLabel: '3-2 회계전표 검증 이동',
                        },
                      ].map((g) => (
                        <div
                          key={g.term}
                          className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 text-xs"
                        >
                          <div>
                            <div className="font-bold text-blue-700">{g.term}</div>
                            <p className="mt-1.5 font-semibold text-slate-900">{g.bigMeaning}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                              {g.detail}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const target = sequentialStepPages.find(
                                (p) => p.stepCode === g.stepCode
                              );
                              if (target) {
                                handleSelectStepPage(target);
                                setShowBeginnerGuide(false);
                                setShowKidsWordBook(false);
                              }
                            }}
                            className="mt-3 w-full rounded-lg border border-slate-300 bg-white py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                          >
                            {g.btnLabel}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 개별 작업 영역 스크롤 이동용 앵커 */}
              <div id="hr-individual-work-area" className="scroll-mt-16" />

              {/* [1-1 첫 페이지 전용] 신입·초보자 안심 환영 & 3단계 따라하기 카드 */}
              {currentStepPage.stepCode === '1-1' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                            👋 처음 오셨나요? 걱정하지 마세요!
                          </span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            🛡️ 실수 방지 안전장치 작동 중 (언제든 재계산 가능)
                          </span>
                        </div>
                        <h2 className="mt-2 text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                          매월 급여·인사 업무는 아래 <span className="text-blue-600">1순서 → 2순서 → 3순서</span> 카드만 차례대로 누르면 끝납니다.
                        </h2>
                        <p className="mt-1 text-xs text-slate-600">
                          어려운 회계 용어나 세법 공식을 몰라도 괜찮습니다. 어떤 버튼을 눌러도 국세청·은행으로 돈이나 신고서가 바로 전송되지 않으니 안심하고 눌러보세요.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBeginnerGuide(true);
                          setUnifiedHelpTab('GLOSSARY');
                        }}
                        className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        📖 낯선 용어 쉽게 보기
                      </button>
                    </div>

                    {/* 초간단 1 -> 2 -> 3 순서 카드 */}
                    <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-3">
                      {/* 1순서 */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-400 hover:bg-white">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                              1순서 · 명단 확인
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              현재 {formatNumber(employees.length)}명 등록됨
                            </span>
                          </div>
                          <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                            직원 명단 · 일용직 출근 확인하기
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            이번 달 새로 입사하거나 퇴사한 직원이 있는지, 일용직 출근이나 추가 보너스가 맞는지 표에서 확인합니다.
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => navigateToWorkspace('EMPLOYEES')}
                            className="rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            직원 명부 열기 →
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateToWorkspace('INPUTS')}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            일용직·수당 입력 →
                          </button>
                        </div>
                      </div>

                      {/* 2순서 */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-400 hover:bg-white">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                              2순서 · 월급 자동계산
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700">
                              1원 오차 없음
                            </span>
                          </div>
                          <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                            이번 달 월급 · 세금 자동 계산하기
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            계산기를 두드릴 필요 없이 버튼 한 번이면 3개 회사 직원의 월급·4대보험·세금이 자동으로 계산됩니다.
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleRunSettlement}
                            disabled={loading}
                            className="rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {loading ? '계산 중...' : '지금 자동 계산'}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateToWorkspace('MATRIX')}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            월급 계산표 보기 →
                          </button>
                        </div>
                      </div>

                      {/* 3순서 */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-400 hover:bg-white">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                              3순서 · 파일 받기
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              엑셀 1클릭 출력
                            </span>
                          </div>
                          <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                            은행 이체용 · 회계장부 엑셀 받기
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            계산이 끝난 급여대장, 하나은행 급여이체용 엑셀, 더존 회계전표 파일을 내려받고 명세서 문자를 보냅니다.
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => navigateToWorkspace('MATRIX')}
                            className="rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            이체 엑셀 받기 →
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateToWorkspace('VOUCHER')}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            회계장부 확인 →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6대 핵심 요약 지표 */}
                  <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                    <button
                      onClick={() => navigateToWorkspace('EMPLOYEES')}
                      className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-2xs transition hover:border-blue-500"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>우리 회사 총 직원</span>
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="mt-1 font-mono text-base font-extrabold tracking-tight text-slate-900">
                        {formatNumber(phase4Summary?.grandTotalActiveHeadcount)}명
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                        입사 +{formatNumber(phase4Summary?.grandTotalMonthlyNewHires)} / 퇴사 -
                        {formatNumber(phase4Summary?.grandTotalMonthlyResignees)}
                      </div>
                    </button>

                    <button
                      onClick={() => navigateToWorkspace('MATRIX')}
                      className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-2xs transition hover:border-blue-500"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>세전 월급 총액</span>
                        <Calculator className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="mt-1 font-mono text-base font-extrabold tracking-tight text-slate-900">
                        {formatNumber(getDisplayedSummaryMetric('grossPay'))}원
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                        정산 대상 {formatNumber(getDisplayedSummaryMetric('headcount'))}명
                      </div>
                    </button>

                    <button
                      onClick={() => navigateToWorkspace('MATRIX')}
                      className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-2xs transition hover:border-blue-500"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>실제 통장 입금 총액</span>
                        <Landmark className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="mt-1 font-mono text-base font-extrabold tracking-tight text-blue-600">
                        {formatNumber(getDisplayedSummaryMetric('netPay'))}원
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                        세금·보험 공제 {formatNumber(getDisplayedSummaryMetric('totalDeduction'))}원
                      </div>
                    </button>

                    <button
                      onClick={() => navigateToWorkspace('VOUCHER')}
                      className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-2xs transition hover:border-blue-500"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>회계장부 오차 확인</span>
                        <ArrowRightLeft className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="mt-1 text-base font-extrabold tracking-tight text-slate-900">
                        {voucherBalanceCheck?.isBalanced ? '정상 일치' : '계산 대기'}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] font-medium text-emerald-700">
                        오차 {formatNumber(voucherBalanceCheck?.varianceDelta)}원
                      </div>
                    </button>

                    <button
                      onClick={() => navigateToWorkspace('PHASE5_BULK_AND_DDAY')}
                      className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-2xs transition hover:border-blue-500"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>이달의 마감 일정</span>
                        <BellRing className="h-3.5 w-3.5 text-rose-500" />
                      </div>
                      <div className="mt-1 text-base font-extrabold tracking-tight text-rose-600">
                        확인 {formatNumber(phase5Summary?.urgentAlertCount)}건
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                        완료 {formatNumber(phase5Summary?.completedAlertCount)}건 / 예정{' '}
                        {formatNumber(phase5Summary?.upcomingAlertCount)}건
                      </div>
                    </button>

                    <button
                      onClick={() => navigateToWorkspace('HITL_MAPPING')}
                      className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-2xs transition hover:border-blue-500"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>엑셀 오타·이름 확인</span>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div
                        className={`mt-1 text-base font-extrabold tracking-tight ${
                          pendingMappingCount > 0 ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        대기 {formatNumber(pendingMappingCount)}건
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                        누적 업로드 {formatNumber(phase5Summary?.totalBulkImportedRows)}건
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================
                  [ZERO_TOUCH_HQ 내 세부 페이지 (1-1, 3-1, 4-1, 4-2)]
                 ============================================================ */}
              {activeTab === 'ZERO_TOUCH_HQ' && (
                <div className="space-y-5">
                  {isSelfOnboardStandaloneView && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-xs font-bold text-slate-900">
                      <span>
                        현재 [신입사원 모바일 입사등록 전용 화면]을 보고 계십니다. 본인 정보를 입력하고 제출하면 인사명부에 자동 반영됩니다.
                      </span>
                      <button
                        onClick={() =>
                          handleSwitchPortalMode(
                            'ADMIN_HQ',
                            '[인사 관리 메인 화면]으로 복귀했습니다.'
                          )
                        }
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        인사 관리 메인으로 복귀
                      </button>
                    </div>
                  )}

                  {/* [4-1 페이지] 직원·부서장에게 보내는 4가지 셀프 링크 & 솔라피 문자 발송 센터 */}
                  {(zeroTouchSubView === 'ALL' || zeroTouchSubView === 'SOLAPI_PORTALS') && (
                    <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* 포털 1: 합격자 셀프 입사포털 */}
              <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-400 hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-800">
                      링크 1 · 신입사원용
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      타이핑 {formatNumber(0)}건
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-extrabold text-slate-900">
                    신입사원 스마트폰 입사등록
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    새로 뽑힌 직원에게 이 링크를 보내면 본인이 휴대폰으로 통장 계좌·차량번호·계약서 서명을 직접 입력해요.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyPortalLink('self-onboarding', '합격자 모바일 셀프 입사포털')
                    }
                    className="flex h-9 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white hover:bg-blue-600"
                  >
                    주소 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        'SELF_ONBOARDING',
                        '[신입사원 스마트폰 입사등록 화면]을 열었습니다!'
                      )
                    }
                    className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    화면 열어보기
                  </button>
                </div>
              </div>

              {/* 포털 2: 전 직원 셀프 증명서·연차·사직 포털 */}
              <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-400 hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                      링크 2 · 전 직원용
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      전화문의 {formatNumber(0)}건
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-extrabold text-slate-900">
                    직원용 월급명세서 · 증명서 발급
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    직원이 자기 이름과 비밀번호만 치면 이번 달 월급명세서, 남은 휴가(연차), 재직증명서를 스스로 뽑을 수 있어요.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink('emp-portal', '전 직원 셀프서비스 포털')}
                    className="flex h-9 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white hover:bg-blue-600"
                  >
                    주소 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        'EMP_PORTAL',
                        '[전 직원 전용 월급명세서·증명서 셀프포털] 화면으로 전환했습니다!'
                      )
                    }
                    className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    화면 열어보기
                  </button>
                </div>
              </div>

              {/* 포털 3: 현업 부서장 전용 포털 */}
              <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-400 hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-800">
                      링크 3 · 부서 팀장님용
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      직접 등록
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-extrabold text-slate-900">
                    부서 팀장님 전용 출근·근무표 입력
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    각 부서 팀장님이 일용직 출근 기록, 손님 차량 번호, 다음 달 근무표를 직접 올리는 전용 화면이에요.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink('dept-portal', '현업 부서장 전용 포털')}
                    className="flex h-9 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white hover:bg-blue-600"
                  >
                    주소 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        'DEPT_PORTAL',
                        '[부서 팀장님 전용 입력 포털] 화면으로 전환했습니다!'
                      )
                    }
                    className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    화면 열어보기
                  </button>
                </div>
              </div>

              {/* 포털 4: 현장 부착용 QR포스터 인쇄 */}
              <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-400 hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                      링크 4 · 벽보 인쇄용
                    </span>
                    <span className="text-[11px] font-bold text-slate-600">
                      식당·기숙사 부착
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-extrabold text-slate-900">
                    식당·기숙사 부착용 QR포스터 인쇄
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    구내식당·기숙사·캐디 대기실 벽에 붙여두면 직원들이 휴대폰 카메라로 찍어서 바로 접속하는 안내문이에요.
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        'QR_POSTER',
                        '[식당·기숙사 부착용 QR코드 안내문 3종 인쇄 화면]을 열었습니다!'
                      )
                    }
                    className="flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white hover:bg-blue-600"
                  >
                    QR 안내문 3종 인쇄하기 </button>
                </div>
              </div>
            </div>

            {/* ============================================================
                [4번 할 일: 솔라피(Solapi) 실시간 문자(LMS) & 카카오 알림톡 보내기]
                - 세련된 화이트 & 인디고/슬레이트 톤앤매너 + 초등학생도 바로 쓰는 1·2·3 순서 표시
               ============================================================ */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      4번 할 일 · 솔라피(Solapi) 문자/알림톡 발송
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                        solapiConfig.apiKey
                          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                          : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                      }`}
                    >
                      {solapiConfig.apiKey
                        ? `✓ 문자 발송 준비 완료 (발신번호: ${
                            solapiConfig.senderNumber || '미등록'
                          })`
                        : '발신번호 설정 확인 필요'}
                    </span>
                    {solapiBalanceWon !== null && (
                      <span className="rounded-full border border-slate-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                        남은 문자 캐시: {formatNumber(solapiBalanceWon)}원
                      </span>
                    )}
                    {solapiAccountId && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                        Account: {solapiAccountId}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-extrabold text-slate-900">
                    직원 휴대폰으로 [입사등록 링크 · 월급명세서 주소] 문자 보내기
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    ① 아래에서 보낼 문장 종류를 고르고 ② 받을 사람 휴대폰 번호를 적은 뒤 ③ <strong>[지금 즉시 문자 발송]</strong> 버튼만 누르면 회사 대표번호(<strong>{solapiConfig.senderNumber || '등록번호'}</strong>)로 문자가 날아갑니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSolapiConfigPanel((prev) => !prev)}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    통신사 인증키 · 발신번호 설정 {showSolapiConfigPanel ? '▲' : '▼'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendBulkEmployeeSolapiSms}
                    disabled={loading}
                    className="flex h-9 items-center rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-white shadow-2xs hover:bg-blue-600 disabled:opacity-50"
                  >
                    전 직원에게 월급명세서 문자 한 번에 보내기
                  </button>
                </div>
              </div>

              {/* 접이식: 솔라피 API Key / 발신번호 / 카카오 비즈니스 PFID / 템플릿 설정 패널 */}
              {showSolapiConfigPanel && (
                <form
                  onSubmit={handleSaveSolapiConfig}
                  className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <span className="font-extrabold text-slate-900">
                        솔라피(Solapi) 마스터 인증키 · 대체발송 발신번호 · 카카오 비즈니스 채널(PFID) 설정
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        동일 프로젝트(Bell-operation)의 솔라피 인증 정보와 공식 발신번호가 자동 연동되어 있습니다.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      솔라피 설정 저장 및 잔액 재조회
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        1. 솔라피 API Key *
                      </label>
                      <input
                        type="text"
                        placeholder="예: NCSEQZGX8C5I7AM2"
                        value={solapiConfig.apiKey}
                        onChange={(e) =>
                          setSolapiConfig({ ...solapiConfig, apiKey: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        1-2. 솔라피 API Secret *
                      </label>
                      <input
                        type="password"
                        placeholder="API Secret 입력"
                        value={solapiConfig.apiSecret}
                        onChange={(e) =>
                          setSolapiConfig({ ...solapiConfig, apiSecret: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-900">
                        2. 사전등록 공식 발신번호 (LMS 및 Fallback 필수) *
                      </label>
                      <input
                        type="text"
                        placeholder="예: 15660162"
                        value={solapiConfig.senderNumber}
                        onChange={(e) =>
                          setSolapiConfig({ ...solapiConfig, senderNumber: e.target.value })
                        }
                        className="w-full rounded-lg border border-blue-500 bg-white px-3 py-2 font-mono font-bold text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        발송 채널 모드 선택
                      </label>
                      <select
                        value={solapiConfig.useKakaoAlimtalk ? 'KAKAO' : 'LMS'}
                        onChange={(e) =>
                          setSolapiConfig({
                            ...solapiConfig,
                            useKakaoAlimtalk: e.target.value === 'KAKAO',
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold"
                      >
                        <option value="LMS">
                          일반 장문문자(LMS) 직통 발송 (자유 문구 즉시 발송 · 권장)
                        </option>
                        <option value="KAKAO">
                          카카오 알림톡 우선 발송 (+실패 시 발신번호 LMS 자동 우회)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        3-1. 카카오 비즈니스 채널 PFID
                      </label>
                      <input
                        type="text"
                        placeholder="예: KA01PF261001..."
                        value={solapiConfig.pfId}
                        onChange={(e) =>
                          setSolapiConfig({ ...solapiConfig, pfId: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        3-2. 카카오 승인 템플릿 ID (또는 코드)
                      </label>
                      <input
                        type="text"
                        placeholder="예: KA01TP... 또는 Jdn5glZ4gM"
                        value={solapiConfig.templateId}
                        onChange={(e) =>
                          setSolapiConfig({ ...solapiConfig, templateId: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {solapiConfig.useKakaoAlimtalk && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-amber-50 p-3">
                      <div className="font-extrabold text-slate-900">
                        [절대 규칙] 카카오 알림톡 템플릿 {'100%'} 일치 원칙 안내
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-900">
                        카카오 알림톡 모드로 발송할 때는 사전에 카카오 심사를 통과한 템플릿의 문장·띄어쓰기·줄바꿈이 토씨 하나 틀리지 않고 {'100%'} 일치해야 발송됩니다. 인사 자유 안내문(입사링크·급여명세서 등)을 별도 템플릿 심사 없이 바로 보내시려면 상단 모드를 <strong>[일반 장문문자(LMS) 직통 발송]</strong>으로 선택하세요.
                      </p>
                      <label className="mt-2 mb-1 block font-bold text-slate-900">
                        카카오 승인 템플릿 원문 (#{'{이름}'} 변수 외 수정 금지)
                      </label>
                      <textarea
                        rows={3}
                        value={solapiConfig.kakaoApprovedTemplateBody}
                        onChange={(e) =>
                          setSolapiConfig({
                            ...solapiConfig,
                            kakaoApprovedTemplateBody: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs"
                      />
                    </div>
                  )}
                </form>
              )}

              {/* 본문: 원클릭 발송 프리셋 3종 + 수신자 입력 및 즉시 발송 폼 */}
              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
                <form
                  onSubmit={handleSendSingleSolapiSms}
                  className="space-y-3 lg:col-span-7"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-700">
                      원클릭 안내문 양식 선택:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectSmsPreset('SELF_ONBOARDING_INVITE')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                        smsQuickForm.category === 'SELF_ONBOARDING_INVITE'
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      1. 합격자 셀프 입사링크
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSmsPreset('EMP_PORTAL_PAYSLIP_NOTICE')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                        smsQuickForm.category === 'EMP_PORTAL_PAYSLIP_NOTICE'
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      2. 전 직원 급여명세서·증명서 포털
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSmsPreset('DEPT_MANAGER_PORTAL_NOTICE')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                        smsQuickForm.category === 'DEPT_MANAGER_PORTAL_NOTICE'
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      3. 부서장 전용 포털 안내
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        수신자 성명 (#{'{이름}'} 자동치환) *
                      </label>
                      <input
                        type="text"
                        placeholder="예: 홍길동"
                        value={smsQuickForm.recipientName}
                        onChange={(e) =>
                          setSmsQuickForm({
                            ...smsQuickForm,
                            recipientName: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-900">
                        수신자 휴대폰 번호 *
                      </label>
                      <input
                        type="text"
                        placeholder="010-1234-5678"
                        value={smsQuickForm.recipientPhone}
                        onChange={(e) =>
                          setSmsQuickForm({
                            ...smsQuickForm,
                            recipientPhone: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-blue-500 px-3 py-2 font-mono text-xs font-extrabold text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        기존 직원 중 빠른 선택 (선택사항)
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          const found = employees.find(
                            (em) => em.empId === Number(e.target.value)
                          );
                          if (found) {
                            setSmsQuickForm({
                              ...smsQuickForm,
                              recipientName: found.empName,
                              recipientPhone: found.phone || '',
                            });
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                      >
                        <option value="">-- 명부에서 불러오기 --</option>
                        {employees.map((em) => (
                          <option key={em.empId} value={em.empId}>
                            {em.empName} ({em.phone || '연락처미등록'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      발송 메시지 본문 (#{'{이름}'} 자리에 수신자 성명이 자동 삽입됩니다)
                    </label>
                    <textarea
                      rows={4}
                      value={smsQuickForm.messageBody}
                      onChange={(e) =>
                        setSmsQuickForm({ ...smsQuickForm, messageBody: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-xs leading-relaxed text-slate-800"
                      required
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
                    >
                      솔라피(Solapi)로 지금 즉시 발송 (발신번호: {solapiConfig.senderNumber || '등록번호'})
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenMobileSmsUri}
                      className="rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      스마트폰 기본 문자앱 호출
                    </button>
                  </div>
                </form>

                {/* 우측 5컬럼: 최근 솔라피 문자/알림톡 발송 이력 로그 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 lg:col-span-5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      최근 솔라피 문자 · 알림톡 발송 감사 로그 ({formatNumber(smsLogs.length)}건)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      LMS Fallback 보장
                    </span>
                  </div>
                  <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1">
                    {smsLogs.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                        아직 발송된 문자 내역이 없습니다. 좌측에서 휴대폰 번호를 입력하고 [솔라피로 지금 즉시 발송]을 눌러보세요.
                      </div>
                    ) : (
                      smsLogs.slice(0, 8).map((log) => (
                        <div
                          key={log.smsLogId}
                          className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11px]"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-slate-900">
                              {log.recipientName} ({log.recipientPhoneMasked})
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.status === 'SUCCESS' ? '✓ 발송성공' : '✕ 실패'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10px] font-semibold text-blue-700">
                            [{log.sendMethod}] {log.categoryLabel}
                          </div>
                          <div className="mt-1 truncate text-[10px] text-slate-500">
                            {log.messagePreview}
                          </div>
                          <div className="mt-0.5 font-mono text-[9px] text-slate-400">
                            {log.sentAt} · {log.resultDetail}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
              </>
            )}

            {/* ============================================================
                [3번 할 일 - A] 더존 아마란스 10 (Douzone Amaranth 10) 공식 4대 모듈 자동 연동 센터
               ============================================================ */}
            {(zeroTouchSubView === 'ALL' || zeroTouchSubView === 'AMARANTH_RPA') && (
              <>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                      3번 할 일 · 더존 아마란스 10 자동 연동
                    </span>
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                      인사 · 전자결재 · 회계장부 · 조직도 직결
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-extrabold text-slate-900">
                    더존 아마란스 10으로 [출퇴근 · 전자결재 · 회계전표 · 부서조직도] 한 번에 보내기
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    아마란스 10 프로그램을 따로 켜서 똑같은 내용을 두 번 타이핑할 필요가 없습니다. 아래 1번~4번 버튼을 누르면 더존 서버로 즉시 전송됩니다.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAmaranthConfigPanel((prev) => !prev)}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-xs font-extrabold text-slate-800 transition hover:bg-slate-100"
                  >
                    {showAmaranthConfigPanel ? '▲ 서버 주소 설정 닫기' : '더존 서버 주소 · 인증키 설정'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(actionPendingLabel)}
                    onClick={() => {
                      void handleExecuteAmaranthRestApiModule(
                        'ALL',
                        '4대 핵심 모듈 전체(인사·근태 / 전자결재·Webhook / 회계 자동전표 / 조직도·SSO) 일괄 연동'
                      );
                    }}
                    className="flex h-9 items-center rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-white shadow-2xs transition hover:bg-blue-600 disabled:opacity-50"
                  >
                    더존 4가지 기능 한 번에 보내기
                  </button>
                </div>
              </div>

              {/* 상단 게이트웨이 상태 배지 (4열 오와 열 동일 높이) */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-bold text-slate-500">더존 아마란스 서버 주소 & 회사코드</div>
                  <div className="mt-1 truncate font-mono text-xs font-extrabold text-slate-900">
                    {amaranthApiConfig?.baseUrl || 'https://gw.belleforet.com'}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-600">
                    벨포레({amaranthApiConfig?.companyCodeBlackstone}) · KMG({amaranthApiConfig?.companyCodeKmg}) · 락산수({amaranthApiConfig?.companyCodeRaksansu})
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-bold text-slate-500">전자결재 완료 알림 주소 (Webhook)</div>
                  <div className="mt-1 truncate font-mono text-xs font-extrabold text-slate-900">
                    {amaranthApiConfig?.webhookCallbackUrl || 'https://belleforet-hr.web.app/api/webhooks/amaranth10/eapproval'}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                    ✓ 결재 완료 시 자동으로 결과 수신
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-bold text-slate-500">조직도 & 자동 로그인 (SSO)</div>
                  <div className="mt-1 text-xs font-extrabold text-slate-900">
                    {amaranthApiConfig?.ssoProviderType || 'OAUTH2'} · {amaranthApiConfig?.oauthClientId || 'BELLEFORET_HR_BRIDGE_CLIENT'}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-600">
                    ✓ 전체 부서({formatNumber(departments.length)}개) 연결 완료
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="text-[11px] font-bold text-emerald-800">지금까지 보낸 기록 & 최근 시간</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    총 {formatNumber(amaranthApiLogs.length)}건 전송 성공
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                    최근 전송: {amaranthApiConfig?.updatedAt || '-'}
                  </div>
                </div>
              </div>

              {/* API 게이트웨이 설정 패널 */}
              {showAmaranthConfigPanel && amaranthApiConfig && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">
                        더존 아마란스 10 서버 주소 · 인증키 설정
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        전산팀이나 더존 관리자 화면에서 받은 주소를 입력하고 저장하면 바로 연결됩니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(actionPendingLabel)}
                      onClick={() => {
                        void handleSaveAmaranthApiConfig();
                      }}
                      className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      설정 저장하기
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        아마란스 10 서버 도메인 (Gateway URL)
                      </label>
                      <input
                        type="text"
                        value={amaranthApiConfig.baseUrl}
                        onChange={(e) =>
                          setAmaranthApiConfig({ ...amaranthApiConfig, baseUrl: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        블랙스톤벨포레 회사코드 (coCd)
                      </label>
                      <input
                        type="text"
                        value={amaranthApiConfig.companyCodeBlackstone}
                        onChange={(e) =>
                          setAmaranthApiConfig({
                            ...amaranthApiConfig,
                            companyCodeBlackstone: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        케이엠지 / 락산수 회사코드 (coCd)
                      </label>
                      <div className="mt-1 flex gap-1.5">
                        <input
                          type="text"
                          value={amaranthApiConfig.companyCodeKmg}
                          onChange={(e) =>
                            setAmaranthApiConfig({
                              ...amaranthApiConfig,
                              companyCodeKmg: e.target.value,
                            })
                          }
                          placeholder="KMG"
                          className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          value={amaranthApiConfig.companyCodeRaksansu}
                          onChange={(e) =>
                            setAmaranthApiConfig({
                              ...amaranthApiConfig,
                              companyCodeRaksansu: e.target.value,
                            })
                          }
                          placeholder="락산수"
                          className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        SSO 인증 프로토콜 (OAuth2 / SAML2)
                      </label>
                      <select
                        value={amaranthApiConfig.ssoProviderType}
                        onChange={(e) =>
                          setAmaranthApiConfig({
                            ...amaranthApiConfig,
                            ssoProviderType: e.target.value as 'OAUTH2' | 'SAML2',
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-900"
                      >
                        <option value="OAUTH2">OAuth 2.0 Bearer Token</option>
                        <option value="SAML2">SAML 2.0 Enterprise IdP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        Access Token (Bearer 인증 토큰)
                      </label>
                      <input
                        type="password"
                        value={amaranthApiConfig.oauthAccessToken}
                        onChange={(e) =>
                          setAmaranthApiConfig({
                            ...amaranthApiConfig,
                            oauthAccessToken: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        HMAC Hash Secret Key (트랜잭션 서명키)
                      </label>
                      <input
                        type="password"
                        value={amaranthApiConfig.callerSecretKey}
                        onChange={(e) =>
                          setAmaranthApiConfig({
                            ...amaranthApiConfig,
                            callerSecretKey: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        전자결재 완료 콜백 수신 URL (Webhook)
                      </label>
                      <input
                        type="text"
                        value={amaranthApiConfig.webhookCallbackUrl}
                        onChange={(e) =>
                          setAmaranthApiConfig({
                            ...amaranthApiConfig,
                            webhookCallbackUrl: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        OAuth2 / SSO Client ID
                      </label>
                      <input
                        type="text"
                        value={amaranthApiConfig.oauthClientId}
                        onChange={(e) =>
                          setAmaranthApiConfig({
                            ...amaranthApiConfig,
                            oauthClientId: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4대 아마란스 10 핵심 API 모듈 실행 카드 (2x2 오와 열 완벽 정렬) + 우측 로그 */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:col-span-8">
                  {/* 모듈 1: 인사·근태 연동 */}
                  <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-400">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-800">
                          기능 1 · 인사·근태
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-400">
                          /api/v1/hr/employees
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-extrabold text-slate-900">
                        1. 직원 명단 · 출퇴근 · 남은 휴가 맞추기
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        우리 앱의 직원 명단과 출퇴근 시간, 남은 연차 휴가 일수를 더존 아마란스 10과 똑같게 맞춥니다.
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-700">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          직원: {formatNumber(employees.length)}명
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          휴가 장부: {formatNumber(leaveLedgers.length)}건
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(actionPendingLabel)}
                      onClick={() => {
                        void handleExecuteAmaranthRestApiModule(
                          'HR_ATTENDANCE_SYNC',
                          '인사·근태 연동 (사원 기본정보·출퇴근 기록·연차 잔여일수 조회)'
                        );
                      }}
                      className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-extrabold text-white transition hover:bg-blue-600 disabled:opacity-50"
                    >
                      1번 인사·출퇴근·휴가 맞추기 </button>
                  </div>

                  {/* 모듈 2: 전자결재 연동 */}
                  <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-400">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-800">
                          기능 2 · 전자결재
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-400">
                          /api/v1/eapproval/draft
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-extrabold text-slate-900">
                        2. 더존 전자결재 서류 자동으로 올리기
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        월급대장·퇴직금·식당밥값 결재 서류를 더존 전자결재함에 자동으로 올리고, 결재가 끝났는지 확인합니다.
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-700">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          결재 서류: {formatNumber(rpaJobs.length)}건
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          자동 확인 켜짐
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(actionPendingLabel)}
                      onClick={() => {
                        void handleExecuteAmaranthRestApiModule(
                          'EAPPROVAL_DRAFT_WEBHOOK',
                          '전자결재 자동 상신 및 결재완료 콜백(Webhook) 수신'
                        );
                      }}
                      className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-extrabold text-white transition hover:bg-blue-600 disabled:opacity-50"
                    >
                      2번 전자결재 서류 올리기 </button>
                  </div>

                  {/* 모듈 3: 회계·자금 연동 */}
                  <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-400">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          기능 3 · 회계전표
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-400">
                          /api/v1/accounting/auto-vouchers
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-extrabold text-slate-900">
                        3. 회계팀 장부(전표) 자동으로 만들어 보내기
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        3개 회사의 부서별 월급·세금·4대보험 금액을 회계팀 장부(전표) 양식으로 만들어서 더존으로 바로 보냅니다.
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-700">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          장부 줄 수: {formatNumber(vouchers.length)}건
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          오차 {formatNumber(voucherBalanceCheck?.varianceDelta ?? 0)}원
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(actionPendingLabel)}
                      onClick={() => {
                        void handleExecuteAmaranthRestApiModule(
                          'ACCOUNTING_AUTO_VOUCHER',
                          '회계·자금 연동 (3개 법인 자동전표 생성 및 차·대변 분개 처리)'
                        );
                      }}
                      className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-extrabold text-white transition hover:bg-blue-600 disabled:opacity-50"
                    >
                      3번 회계팀 장부 보내기 </button>
                  </div>

                  {/* 모듈 4: 조직도 및 SSO 연동 */}
                  <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-400">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-800">
                          기능 4 · 부서 조직도
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-400">
                          /oauth2/v1/token
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-extrabold text-slate-900">
                        4. 회사 부서 목록 · 로그인 계정 연결하기
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        사내 포털 로그인 계정과 리조트 전체 부서 코드를 연결하여 권한과 부서 이름이 틀리지 않게 관리합니다.
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-700">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          방식: {amaranthApiConfig?.ssoProviderType || 'OAUTH2'}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">
                          3개 법인 연결됨
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(actionPendingLabel)}
                      onClick={() => {
                        void handleExecuteAmaranthRestApiModule(
                          'ORG_SSO_SESSION',
                          '조직도 코스트센터 매핑 및 SSO(OAuth2/SAML) 로그인 세션 연동'
                        );
                      }}
                      className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-extrabold text-white transition hover:bg-blue-600 disabled:opacity-50"
                    >
                      4번 부서 목록 연결하기 </button>
                  </div>
                </div>

                {/* 우측: 아마란스 10 REST API & Webhook 실시간 트랜잭션 로그 */}
                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:col-span-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="text-xs font-extrabold text-slate-900">
                        더존 전송 기록장 ({formatNumber(amaranthApiLogs.length)}건)
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                        실시간 저장
                      </span>
                    </div>
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                      {amaranthApiLogs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-8 text-center text-xs text-slate-500">
                          아직 보낸 기록이 없습니다. 왼쪽의 버튼을 눌러보세요!
                        </div>
                      ) : (
                        amaranthApiLogs.map((log) => (
                          <div
                            key={log.apiLogId}
                            className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-slate-900">
                                {log.moduleLabel}
                              </span>
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                                {log.approvalOrSyncStatus} · {formatNumber(log.recordCount)}건
                              </span>
                            </div>
                            <div className="mt-0.5 font-mono text-[10px] font-semibold text-slate-500">
                              {log.restEndpoint}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-600">
                              {log.summaryMessage}
                            </div>
                            <div className="mt-1.5 truncate rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-bold text-slate-900">
                              번호: {log.docOrSlipNo} · {formatNumber(log.amountTotal)}원
                            </div>
                            <div className="mt-1 font-mono text-[10px] text-slate-400">
                              {log.executedAt} · {log.targetYm}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================
                [3번 할 일 - B] 6개 외부 사이트(더존·국세청·4대보험·은행) 자동 제출 목록
               ============================================================ */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      6개 사이트 한 번에 제출
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      국세청 · 4대보험 · 더존 결재 · 하나은행 이체 자동 실행 표
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    엑셀을 받아서 여러 사이트에 일일이 올릴 필요가 없습니다. 오른쪽 <strong>[전체 한 번에 실행]</strong> 버튼만 누르면 6가지 신고와 결재가 동시에 처리됩니다.
                  </p>
                </div>
                <button
                  onClick={handleDispatchAllRpaJobs}
                  disabled={loading}
                  className="flex h-9 items-center rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-white shadow-2xs hover:bg-blue-600 disabled:opacity-50"
                >
                  6개 사이트 전체 한 번에 실행
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold text-slate-700">
                      <th className="px-3 py-2.5">언제 하나요?</th>
                      <th className="px-3 py-2.5">어느 사이트인가요?</th>
                      <th className="px-3 py-2.5">무슨 업무를 자동으로 하나요?</th>
                      <th className="px-3 py-2.5 text-right">자동 계산 금액</th>
                      <th className="px-3 py-2.5 text-center">건수</th>
                      <th className="px-3 py-2.5 text-center">처리 결과 / 접수번호</th>
                      <th className="px-3 py-2.5 text-center">실행 버튼</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rpaJobs.map((job) => {
                      const isDone =
                        job.status === 'APPROVED_COMPLETED' ||
                        job.status === 'BOT_DISPATCHED_WAITING_OTP';
                      return (
                        <tr key={job.jobId} className="hover:bg-slate-50">
                          <td className="px-3 py-3 align-top">
                            <div className="font-extrabold text-slate-900">{job.cycleLabel}</div>
                            <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                              {job.rowRef}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <span className="inline-block rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-800">
                              {job.targetPortalLabel}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="font-extrabold text-slate-900">{job.jobTitle}</div>
                            <div className="mt-1 text-[11px] text-slate-600">
                              {job.autoDraftSummary}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right align-top font-mono font-extrabold text-slate-900">
                            {formatNumber(job.totalAmount)}원
                          </td>
                          <td className="px-3 py-3 text-center align-top font-bold text-slate-700">
                            {formatNumber(job.targetRecordCount)}건
                          </td>
                          <td className="px-3 py-3 text-center align-top">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                job.status === 'APPROVED_COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : job.status === 'BOT_DISPATCHED_WAITING_OTP'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {job.status === 'APPROVED_COMPLETED'
                                ? '✓ 자동 제출 완료'
                                : job.status === 'BOT_DISPATCHED_WAITING_OTP'
                                ? '은행 이체 준비 완료'
                                : '⏳ 실행 대기 중'}
                            </span>
                            <div className="mt-1 font-mono text-[10px] text-slate-500">
                              {job.receiptNoOrDocNo}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center align-top">
                            <button
                              onClick={() => handleApproveSingleRpaJob(job.jobId, job.jobTitle)}
                              disabled={loading}
                              className={`rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition ${
                                isDone
                                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                  : 'bg-blue-600 text-white hover:bg-blue-600'
                              }`}
                            >
                              {isDone ? '다시 실행' : '▶ 지금 실행'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            )}

            {/* ============================================================
                [신입사원 스마트폰 입사등록 칸 & 컴퓨터 실수 자동 검사판]
               ============================================================ */}
            {(zeroTouchSubView === 'ALL' ||
              zeroTouchSubView === 'SELF_ONBOARD' ||
              zeroTouchSubView === 'COLLECTOR_AUDIT') && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* 좌측 7컬럼: 합격자/일용직/캐디 모바일 셀프 입사등록 포털 */}
              {(zeroTouchSubView === 'ALL' || zeroTouchSubView === 'SELF_ONBOARD') && (
              <div
                className={`rounded-xl border border-slate-200 bg-white p-6 shadow-xs ${
                  zeroTouchSubView === 'SELF_ONBOARD' ? 'lg:col-span-12' : 'lg:col-span-7'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                        신입사원 스스로 입력
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900">
                        새로 들어온 직원 스마트폰 입사등록 & 계약서 서명 칸
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      신입사원이 자기 휴대폰으로 아래 빈칸을 채우고 <strong>[제출]</strong>을 누르면, 사번 만들기·주차장 차량등록·연차 계산·월급표 등록까지 컴퓨터가 혼자서 다 해줍니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySelfOnboardingLink}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    카톡으로 보낼 주소 복사
                  </button>
                </div>

                <form onSubmit={handleSubmitSelfOnboarding} className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        입사자 성명 (본인 입력) *
                      </label>
                      <input
                        type="text"
                        placeholder="예: 김벨포레"
                        value={selfOnboardForm.empName}
                        onChange={(e) =>
                          setSelfOnboardForm({ ...selfOnboardForm, empName: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">소속 법인 *</label>
                      <select
                        value={selfOnboardForm.entityCode}
                        onChange={(e) => {
                          const nextEntity = e.target.value as EntityCode;
                          const firstDept = departments.find((d) => d.entityCode === nextEntity);
                          setSelfOnboardForm({
                            ...selfOnboardForm,
                            entityCode: nextEntity,
                            deptId: firstDept ? firstDept.deptId : selfOnboardForm.deptId,
                          });
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                      >
                        <option value="BLACKSTONE">(주)블랙스톤벨포레</option>
                        <option value="KMG">(주)케이엠지(KMG)</option>
                        <option value="RAKSANSU">농업회사법인 락산수(주)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">배치 부서 *</label>
                      <select
                        value={selfOnboardForm.deptId}
                        onChange={(e) =>
                          setSelfOnboardForm({
                            ...selfOnboardForm,
                            deptId: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                      >
                        {departments
                          .filter((d) => d.entityCode === selfOnboardForm.entityCode)
                          .map((d) => (
                            <option key={d.deptId} value={d.deptId}>
                              {d.deptName} ({d.deptCode})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">고용 형태 *</label>
                      <select
                        value={selfOnboardForm.employmentType}
                        onChange={(e) =>
                          setSelfOnboardForm({
                            ...selfOnboardForm,
                            employmentType: e.target.value as EmploymentType,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                      >
                        <option value="REGULAR">정규직</option>
                        <option value="CONTRACT">계약직</option>
                        <option value="DAILY">일용직</option>
                        <option value="INTERN">현장실습생</option>
                        <option value="CADDY">경기과 캐디(특고)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">입사(근무시작)일 *</label>
                      <input
                        type="date"
                        value={selfOnboardForm.hireDate}
                        onChange={(e) =>
                          setSelfOnboardForm({ ...selfOnboardForm, hireDate: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        계약 월 기본급 (원) *
                      </label>
                      <input
                        type="number"
                        value={selfOnboardForm.baseMonthlyPay}
                        onChange={(e) =>
                          setSelfOnboardForm({
                            ...selfOnboardForm,
                            baseMonthlyPay: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">급여 이체 은행 *</label>
                      <input
                        type="text"
                        placeholder="하나은행"
                        value={selfOnboardForm.bankName}
                        onChange={(e) =>
                          setSelfOnboardForm({ ...selfOnboardForm, bankName: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        본인 계좌번호 *
                      </label>
                      <input
                        type="text"
                        placeholder="123-910000-00000"
                        value={selfOnboardForm.bankAccountNo}
                        onChange={(e) =>
                          setSelfOnboardForm({
                            ...selfOnboardForm,
                            bankAccountNo: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        휴대폰 번호 (명세서 발송용) *
                      </label>
                      <input
                        type="text"
                        placeholder="010-0000-0000"
                        value={selfOnboardForm.phone}
                        onChange={(e) =>
                          setSelfOnboardForm({ ...selfOnboardForm, phone: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-bold text-blue-700">
                        차량번호 (주차관제 LPR 자동등록)
                      </label>
                      <input
                        type="text"
                        placeholder="예: 123가 4567"
                        value={selfOnboardForm.carNumber}
                        onChange={(e) =>
                          setSelfOnboardForm({ ...selfOnboardForm, carNumber: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        기숙사 입실 여부 및 호실
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selfOnboardForm.usesDormitory}
                          onChange={(e) =>
                            setSelfOnboardForm({
                              ...selfOnboardForm,
                              usesDormitory: e.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <input
                          type="text"
                          placeholder="기숙사 호실 (예: 302호)"
                          value={selfOnboardForm.dormRoomNumber}
                          onChange={(e) =>
                            setSelfOnboardForm({
                              ...selfOnboardForm,
                              dormRoomNumber: e.target.value,
                            })
                          }
                          disabled={!selfOnboardForm.usesDormitory}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-2 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-emerald-800">
                        전자근로계약·보안서약 전자서명 *
                      </label>
                      <input
                        type="text"
                        placeholder="본인 성명 정자 서명"
                        value={selfOnboardForm.digitalSignatureName}
                        onChange={(e) =>
                          setSelfOnboardForm({
                            ...selfOnboardForm,
                            digitalSignatureName: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-50"
                  >
                    [신입사원 제출] 계약서 서명 완료 및 사번·주차장·휴가·월급표 한 번에 등록하기
                  </button>
                </form>
              </div>
              )}

              {/* 우측 5컬럼: 컴퓨터 실수 자동 검사판 (Anomaly) — 신입 안심 모드에서는 접기/펼치기 지원 */}
              {(zeroTouchSubView === 'ALL' || zeroTouchSubView === 'COLLECTOR_AUDIT') &&
                (!isNewcomerFriendlyMode || showAdvancedCollectorOnHome) && (
              <div
                className={`rounded-xl border border-slate-200 bg-white p-6 shadow-xs ${
                  zeroTouchSubView === 'COLLECTOR_AUDIT' ? 'lg:col-span-12' : 'lg:col-span-5'
                }`}
              >
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      자동 검사판
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      빠진 것은 없을까? 컴퓨터 자동 검사판
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    사람이 일일이 계산기로 다시 확인할 필요가 없습니다. 컴퓨터가 {formatNumber(6)}가지 중요 항목을 자동으로 검사해서 알려줍니다.
                  </p>
                </div>

                <div className="mt-4 space-y-2.5">
                  {(headcountReductionSummary?.anomalyItems ?? []).map((item) => {
                    const isOk = item.severity === 'COMPLETED_OK';
                    return (
                      <div
                        key={item.anomalyId}
                        className={`rounded-xl border p-3.5 ${
                          isOk
                            ? 'border-slate-200 bg-slate-50/70'
                            : 'border-rose-200 bg-rose-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-900">
                            {isOk ? '✓ ' : '! '}
                            {item.title}
                          </span>
                          <button
                            onClick={() =>
                              navigateToWorkspace(
                                (item.targetTab === 'VOUCHERS'
                                  ? 'VOUCHER'
                                  : item.targetTab) as ActiveTab
                              )
                            }
                            className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-extrabold text-slate-800 hover:bg-slate-100"
                          >
                            바로 가기 </button>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                          {item.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
            )}

            {/* 신입 안심 모드에서 고급 단말기 수집 & 6대 자동 검사판 접기/펼치기 바 */}
            {isNewcomerFriendlyMode && zeroTouchSubView === 'COLLECTOR_AUDIT' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-2xs">
                <div className="text-slate-600">
                  <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    부가 자동화 기능
                  </span>
                  구내식당·골프장 캐디·주차장 단말기 자동수집 및 {formatNumber(6)}대 정밀 검사판은 필요할 때만 펼쳐서 확인하세요.
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedCollectorOnHome((prev) => !prev)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  {showAdvancedCollectorOnHome
                    ? '단말기 수집 · 정밀 검사판 접기 ▲'
                    : '단말기 수집 · 정밀 검사판 펼치기 ▼'}
                </button>
              </div>
            )}

            {/* ============================================================
                [1번 할 일 상세] 현장 기계에서 기록 자동으로 모아오기 (식당·캐디·주차장·출퇴근)
               ============================================================ */}
            {(zeroTouchSubView === 'ALL' || zeroTouchSubView === 'COLLECTOR_AUDIT') &&
              (!isNewcomerFriendlyMode || showAdvancedCollectorOnHome) && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                      1번 할 일 · 기계 기록 모으기
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      식당 · 골프장 캐디 · 주차장 · 출퇴근 기계 기록 자동 수집창
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    각 부서에 전화해서 엑셀 파일을 달라고 할 필요가 없습니다. 오른쪽 버튼을 누르면 기계에 찍힌 기록을 바로 가져옵니다.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() =>
                      handleTriggerCollectorSync('POS_GOLF_CADDY', '경기과 골프 캐디 POS')
                    }
                    disabled={loading}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    캐디 출근기록 가져오기
                  </button>
                  <button
                    onClick={() =>
                      handleTriggerCollectorSync(
                        'TERMINAL_MEAL_WELSTORY',
                        '웰스토리 식수 단말기'
                      )
                    }
                    disabled={loading}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    식당 밥값 기록 가져오기
                  </button>
                  <button
                    onClick={() =>
                      handleTriggerCollectorSync('GATE_PARKING_LPR', '주차관제 LPR 차단기')
                    }
                    disabled={loading}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    주차장 차량번호 가져오기
                  </button>
                  <button
                    onClick={() =>
                      handleTriggerCollectorSync(
                        'AMARANTH_HR_SYNC',
                        '더존 아마란스 인사·일용직 브릿지'
                      )
                    }
                    disabled={loading}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    아마란스 출퇴근 가져오기
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold text-slate-700">
                      <th className="px-3 py-2.5">가져온 시간</th>
                      <th className="px-3 py-2.5">어느 기계에서 가져왔나요?</th>
                      <th className="px-3 py-2.5">방식</th>
                      <th className="px-3 py-2.5 text-center">가져온 건수</th>
                      <th className="px-3 py-2.5">어떻게 처리되었나요?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {collectorFeeds.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                          위쪽의 <strong>[1번 기록 모으기 실행]</strong> 버튼을 누르면 캐디, 구내식당, 주차장, 아마란스 기록이 이곳에 바로 나타납니다.
                        </td>
                      </tr>
                    ) : (
                      collectorFeeds.map((cf) => (
                        <tr key={cf.feedId} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                            {cf.syncedAt}
                          </td>
                          <td className="px-3 py-2.5 font-extrabold text-slate-900">
                            {cf.sourceSystemLabel}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-800">
                              {cf.syncMode}
                            </span>
                            <span className="ml-1.5 text-[10px] text-slate-500">{cf.rowRef}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-extrabold text-emerald-700">
                            {formatNumber(cf.insertedCount)}건
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{cf.summaryMessage}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ============================================================
            [탭 1] 급여·노무비·3개 법인 통합 정산 매트릭스
           ============================================================ */}
        {activeTab === 'MATRIX' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">법인 필터:</span>
                {(['BLACKSTONE', 'KMG', 'RAKSANSU'] as EntityCode[]).map((code) => {
                  const enabled = !disabledEntities.includes(code);
                  const entityObj = entities.find((e) => e.entityCode === code);
                  return (
                    <button
                      key={code}
                      onClick={() => toggleEntityFilter(code)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        enabled
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-slate-100 text-slate-400 line-through'
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {enabled
                        ? `✓ ${entityObj ? entityObj.entityName : code}`
                        : `${entityObj ? entityObj.entityName : code} (제외)`}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    {
                      type: 'kmg-expenditure',
                      label: 'KMG 노무비 품의',
                      color: 'bg-blue-600 hover:bg-blue-700',
                    },
                    {
                      type: 'team-leader-kona',
                      label: '팀장 코나카드 충전',
                      color: 'bg-blue-600 hover:bg-blue-700',
                    },
                    {
                      type: 'bank-transfer',
                      label: '하나은행 급여이체',
                      color: 'bg-blue-600 hover:bg-blue-700',
                    },
                    {
                      type: 'amaranth-voucher',
                      label: '더존 급여전표',
                      color: 'bg-blue-600 hover:bg-blue-700',
                    },
                    {
                      type: 'payslips',
                      label: '전 직원 급여명세서',
                      color: 'bg-slate-800 hover:bg-slate-700',
                    },
                    {
                      type: 'hr-lifecycle-report',
                      label: '기숙사·수습 명단',
                      color: 'bg-slate-700 hover:bg-slate-600',
                    },
                  ] as const
                ).map((btn) => {
                  const isJustDownloaded = lastDownloadedKey === btn.type;
                  return (
                    <button
                      key={btn.type}
                      onClick={() => handleExportExcel(btn.type)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white shadow-2xs transition ${
                        isJustDownloaded
                          ? 'bg-emerald-600 ring-2 ring-emerald-200'
                          : btn.color
                      }`}
                    >
                      <Download className="h-3 w-3" />
                      {isJustDownloaded ? `완료 (${btn.label})` : btn.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
              {[
                {
                  title: '정산 대상 인원',
                  val: getDisplayedSummaryMetric('headcount'),
                  unit: '명',
                },
                {
                  title: '세전 급여 총액',
                  val: getDisplayedSummaryMetric('grossPay'),
                  unit: '원',
                },
                {
                  title: '세금·4대보험 공제 총액',
                  val: getDisplayedSummaryMetric('totalDeduction'),
                  unit: '원',
                },
                {
                  title: '실제 통장 입금액 (세후)',
                  val: getDisplayedSummaryMetric('netPay'),
                  unit: '원',
                },
                {
                  title: '회사 부담 4대보험료',
                  val: getDisplayedSummaryMetric('totalEmployerBurden'),
                  unit: '원',
                },
                {
                  title: '팀장 코나카드 보직수당',
                  val: getDisplayedSummaryMetric('teamLeaderKonaAllowance'),
                  unit: '원',
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs"
                >
                  <p className="text-[11px] font-medium text-slate-500">{card.title}</p>
                  <p className="mt-1 font-mono text-base font-bold text-slate-900">
                    {card.val !== null ? `${formatNumber(card.val)}${card.unit}` : '미정산'}
                  </p>
                </div>
              ))}
            </div>

            {employmentSubtotals.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
                {employmentSubtotals.map((sub) => (
                  <div
                    key={sub.rowId}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100/80 px-3.5 py-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{sub.empName}</span>
                      <span className="ml-1.5 text-slate-500">({formatNumber(sub.headcount)}명)</span>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-semibold text-slate-900">
                        세전: {formatNumber(sub.grossPay)}원
                      </div>
                      <div className="text-emerald-700">
                        실수령: {formatNumber(sub.netPay)}원
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-extrabold text-slate-800 sm:text-sm">
                    [{targetYm}] 전사 급여·일용직·실습생 정산 대장
                  </h2>
                  <span className="hidden text-[11px] text-slate-500 md:inline">
                    (가로 스크롤 시 성명 열이 좌측에 고정됩니다)
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setMatrixColumnViewMode('SUMMARY_16')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                      matrixColumnViewMode === 'SUMMARY_16'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    요약 보기 (16열)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixColumnViewMode('FULL_31')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                      matrixColumnViewMode === 'FULL_31'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    회계 전수 보기 (31열 전체)
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse whitespace-nowrap text-left text-xs">
                  <thead>
                    {matrixColumnViewMode === 'SUMMARY_16' ? (
                      <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                        <th className="px-3 py-2.5 font-semibold">법인</th>
                        <th className="px-3 py-2.5 font-semibold">부서</th>
                        <th className="px-3 py-2.5 font-semibold">사번/구분</th>
                        <th className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-3 py-2.5 font-bold text-slate-900">
                          성명
                        </th>
                        <th className="px-3 py-2.5 font-semibold">고용형태</th>
                        <th className="px-3 py-2.5 font-semibold">근무일수/일할</th>
                        <th className="px-3 py-2.5 text-right font-semibold">기본급/일용급</th>
                        <th className="px-3 py-2.5 text-right font-semibold">연장/상여/특별</th>
                        <th className="px-3 py-2.5 text-right font-semibold">비과세(식대/차량)</th>
                        <th className="px-3 py-2.5 text-right font-semibold">세전총액</th>
                        <th className="px-3 py-2.5 text-right font-semibold">4대보험(본인)</th>
                        <th className="px-3 py-2.5 text-right font-semibold">소득세+지방세</th>
                        <th className="px-3 py-2.5 text-right font-semibold">기숙사/식대/기타</th>
                        <th className="px-3 py-2.5 text-right font-bold text-blue-700">실수령액(세후)</th>
                        <th className="px-3 py-2.5 text-right font-semibold">전월대비 차이</th>
                        <th className="px-3 py-2.5 font-semibold">점검 결과</th>
                      </tr>
                    ) : (
                      <tr className="border-b border-slate-200 bg-slate-100 text-[11px] text-slate-600">
                        <th className="px-2.5 py-2 font-semibold">법인</th>
                        <th className="px-2.5 py-2 font-semibold">부서</th>
                        <th className="px-2.5 py-2 font-semibold">사번/구분</th>
                        <th className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-3 py-2 font-bold text-slate-900">
                          성명
                        </th>
                        <th className="px-2.5 py-2 font-semibold">고용형태</th>
                        <th className="px-2.5 py-2 font-semibold">근무일수/일할</th>
                        <th className="px-2.5 py-2 text-right font-semibold">기본급</th>
                        <th className="px-2.5 py-2 text-right font-semibold">일용급</th>
                        <th className="px-2.5 py-2 text-right font-semibold">직책수당</th>
                        <th className="px-2.5 py-2 text-right font-semibold">연장수당</th>
                        <th className="px-2.5 py-2 text-right font-semibold">상여금</th>
                        <th className="px-2.5 py-2 text-right font-semibold">특별수당</th>
                        <th className="px-2.5 py-2 text-right font-semibold">기타과세</th>
                        <th className="px-2.5 py-2 text-right font-semibold">비과세식대</th>
                        <th className="px-2.5 py-2 text-right font-semibold">비과세차량</th>
                        <th className="px-2.5 py-2 text-right font-semibold">과세총액</th>
                        <th className="px-2.5 py-2 text-right font-semibold">비과세총액</th>
                        <th className="bg-blue-50/60 px-2.5 py-2 text-right font-bold text-slate-900">
                          세전총액
                        </th>
                        <th className="px-2.5 py-2 text-right font-semibold">국민연금(본인)</th>
                        <th className="px-2.5 py-2 text-right font-semibold">건강보험(본인)</th>
                        <th className="px-2.5 py-2 text-right font-semibold">장기요양(본인)</th>
                        <th className="px-2.5 py-2 text-right font-semibold">고용보험(본인)</th>
                        <th className="px-2.5 py-2 text-right font-semibold">소득세</th>
                        <th className="px-2.5 py-2 text-right font-semibold">지방소득세</th>
                        <th className="px-2.5 py-2 text-right font-semibold">기숙사비</th>
                        <th className="px-2.5 py-2 text-right font-semibold">식대공제</th>
                        <th className="px-2.5 py-2 text-right font-semibold">기타공제</th>
                        <th className="bg-rose-50/60 px-2.5 py-2 text-right font-bold text-rose-800">
                          공제합계
                        </th>
                        <th className="bg-emerald-50/70 px-2.5 py-2 text-right font-bold text-emerald-800">
                          실수령액(세후)
                        </th>
                        <th className="px-2.5 py-2 text-right font-semibold">국민연금(회사)</th>
                        <th className="px-2.5 py-2 text-right font-semibold">건강보험(회사)</th>
                        <th className="px-2.5 py-2 text-right font-semibold">장기요양(회사)</th>
                        <th className="px-2.5 py-2 text-right font-semibold">고용보험(회사)</th>
                        <th className="px-2.5 py-2 text-right font-semibold">산재보험(회사)</th>
                        <th className="px-2.5 py-2 text-right font-bold text-slate-800">
                          사업주부담합계
                        </th>
                        <th className="px-2.5 py-2 text-right font-semibold text-blue-700">
                          팀장코나수당
                        </th>
                        <th className="bg-slate-200/70 px-2.5 py-2 text-right font-extrabold text-slate-900">
                          총인건비
                        </th>
                        <th className="px-2.5 py-2 text-right font-semibold">전월대비 차이</th>
                        <th className="px-2.5 py-2 font-semibold">점검 결과</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleMatrixRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={matrixColumnViewMode === 'SUMMARY_16' ? 16 : 39}
                          className="px-6 py-10 text-center"
                        >
                          <div className="mx-auto max-w-2xl space-y-3">
                            <p className="text-sm font-extrabold text-slate-700">
                              아직 [{targetYm}] 월급 계산이 실행되지 않았거나 등록된 직원이 없습니다.
                            </p>
                            <p className="text-xs text-slate-500">
                              아래 순서대로 버튼을 눌러 자료를 넣은 뒤 <strong>[전사 급여·전표 자동정산 실행]</strong> 버튼을 클릭하세요!
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                              <button
                                onClick={() => navigateToWorkspace('CONFIG')}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              >
                                1. 기초 요율·부서 설정
                              </button>
                              <button
                                onClick={() => navigateToWorkspace('EMPLOYEES')}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              >
                                2. 직원 명부 등록
                              </button>
                              <button
                                onClick={() => navigateToWorkspace('PHASE5_BULK_AND_DDAY')}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                              >
                                3. 엑셀 일괄 업로드
                              </button>
                              <button
                                onClick={handleRunSettlement}
                                disabled={loading || !targetYm}
                                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50"
                              >
                                4. 자동정산 실행
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visibleMatrixRows.map((r) => {
                        const rowStyle = r.isGrandTotal
                          ? 'border-t-2 border-slate-200 bg-emerald-100/80 font-extrabold text-slate-900'
                          : r.isSubtotal
                          ? 'bg-slate-50 font-bold text-slate-900'
                          : 'group hover:bg-slate-50';
                        const stickyBg = r.isGrandTotal
                          ? 'bg-emerald-100'
                          : r.isSubtotal
                          ? 'bg-slate-50'
                          : 'bg-white group-hover:bg-slate-50';

                        if (matrixColumnViewMode === 'FULL_31') {
                          return (
                            <tr key={r.rowId} className={rowStyle}>
                              <td className="px-2.5 py-2">{r.entityName}</td>
                              <td className="px-2.5 py-2">
                                {r.isSubtotal || r.isGrandTotal ? '-' : r.deptName}
                              </td>
                              <td className="px-2.5 py-2">
                                {r.isSubtotal || r.isGrandTotal
                                  ? `${formatNumber(r.headcount)}명`
                                  : r.empNo}
                              </td>
                              <td
                                className={`sticky left-0 z-10 border-r border-slate-200 px-3 py-2 font-bold text-slate-900 ${stickyBg}`}
                              >
                                {r.empName}
                              </td>
                              <td className="px-2.5 py-2">{r.employmentTypeName}</td>
                              <td className="px-2.5 py-2">
                                {r.isSubtotal || r.isGrandTotal
                                  ? '-'
                                  : r.employmentType === 'DAILY'
                                  ? `투입 ${formatNumber(r.dailyWorkDays)}일`
                                  : r.prorateFormulaDesc}
                              </td>
                              <td className="px-2.5 py-2 text-right">{formatNumber(r.basePay)}</td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.dailyTotalGross)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.positionAllowance)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.overtimePay)}
                              </td>
                              <td className="px-2.5 py-2 text-right">{formatNumber(r.bonusPay)}</td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.specialAllowance)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.otherTaxableAllowance)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.mealAllowanceTaxFree)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.carAllowanceTaxFree)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-semibold">
                                {formatNumber(r.taxableIncome)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.nonTaxableIncome)}
                              </td>
                              <td className="bg-blue-50/40 px-2.5 py-2 text-right font-bold text-slate-900">
                                {formatNumber(r.grossPay)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.npWorkerDeduction)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.hiWorkerDeduction)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.ltciWorkerDeduction)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.eiWorkerDeduction)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.incomeTaxDeduction)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.localIncomeTaxDeduction)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.dormDeduction)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.mealDeduction)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.otherDeduction)}
                              </td>
                              <td className="bg-rose-50/40 px-2.5 py-2 text-right font-bold text-rose-800">
                                {formatNumber(r.totalDeduction)}
                              </td>
                              <td className="bg-emerald-50/50 px-2.5 py-2 text-right font-extrabold text-emerald-800">
                                {formatNumber(r.netPay)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.npEmployerBurden)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.hiEmployerBurden)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.ltciEmployerBurden)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.eiEmployerBurden)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {formatNumber(r.iacEmployerBurden)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-bold text-slate-800">
                                {formatNumber(r.totalEmployerBurden)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-semibold text-blue-700">
                                {formatNumber(r.teamLeaderKonaAllowance)}
                              </td>
                              <td className="bg-slate-100 px-2.5 py-2 text-right font-extrabold text-slate-900">
                                {formatNumber(r.totalCompanyCost)}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                {r.deltaGrossPay !== null
                                  ? `${r.deltaGrossPay > 0 ? '+' : ''}${formatNumber(r.deltaGrossPay)}`
                                  : '-'}
                              </td>
                              <td className="px-2.5 py-2">
                                {r.isSubtotal || r.isGrandTotal ? (
                                  '-'
                                ) : r.auditFlag !== 'NORMAL' ? (
                                  <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
                                    {r.auditReason || r.auditFlag}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">정상</span>
                                )}
                              </td>
                            </tr>
                          );
                        }

                        const workerIns =
                          r.npWorkerDeduction +
                          r.hiWorkerDeduction +
                          r.ltciWorkerDeduction +
                          r.eiWorkerDeduction;
                        const taxes = r.incomeTaxDeduction + r.localIncomeTaxDeduction;
                        const etcDed = r.dormDeduction + r.mealDeduction + r.otherDeduction;
                        const extraPay =
                          r.overtimePay +
                          r.bonusPay +
                          r.specialAllowance +
                          r.positionAllowance +
                          r.otherTaxableAllowance;

                        return (
                          <tr key={r.rowId} className={rowStyle}>
                            <td className="px-3 py-2">{r.entityName}</td>
                            <td className="px-3 py-2">{r.isSubtotal || r.isGrandTotal ? '-' : r.deptName}</td>
                            <td className="px-3 py-2">
                              {r.isSubtotal || r.isGrandTotal ? `${formatNumber(r.headcount)}명` : r.empNo}
                            </td>
                            <td
                              className={`sticky left-0 z-10 border-r border-slate-200 px-3 py-2 font-bold text-slate-900 ${stickyBg}`}
                            >
                              {r.empName}
                            </td>
                            <td className="px-3 py-2">{r.employmentTypeName}</td>
                            <td className="px-3 py-2">
                              {r.isSubtotal || r.isGrandTotal
                                ? '-'
                                : r.employmentType === 'DAILY'
                                ? `투입 ${formatNumber(r.dailyWorkDays)}일`
                                : r.prorateFormulaDesc}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatNumber(
                                r.employmentType === 'DAILY'
                                  ? r.dailyTotalGross
                                  : r.basePay + (r.isSubtotal || r.isGrandTotal ? r.dailyTotalGross : 0)
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{formatNumber(extraPay)}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(r.nonTaxableIncome)}</td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatNumber(r.grossPay)}
                            </td>
                            <td className="px-3 py-2 text-right">{formatNumber(workerIns)}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(taxes)}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(etcDed)}</td>
                            <td className="px-3 py-2 text-right font-bold text-blue-700">
                              {formatNumber(r.netPay)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {r.deltaGrossPay !== null
                                ? `${r.deltaGrossPay > 0 ? '+' : ''}${formatNumber(r.deltaGrossPay)}`
                                : '-'}
                            </td>
                            <td className="px-3 py-2">
                              {r.isSubtotal || r.isGrandTotal ? (
                                '-'
                              ) : r.auditFlag !== 'NORMAL' ? (
                                <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
                                  {r.auditReason || r.auditFlag}
                                </span>
                              ) : (
                                <span className="text-slate-400">정상</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 2] 더존 아마란스 급여전표 & 부서별 비용배분 (Row 33)
           ============================================================ */}
        {activeTab === 'VOUCHER' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  부서별 인건비 자동 배분 및 더존 아마란스 급여전표 (왼쪽·오른쪽 금액 일치 확인)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  부서별 급여·상여·일용직 일당·회사부담 4대보험료를 부서별로 자동 배분하여 1원의 오차도 없이 장부를 맞춥니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {voucherBalanceCheck && (
                  <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-emerald-50 px-4 py-2 text-xs">
                    <div>
                      <span className="text-slate-500">부서 비용(차변) 합계: </span>
                      <strong className="text-slate-900">
                        {formatNumber(voucherBalanceCheck.totalDebit)}원
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">세금·통장지급(대변) 합계: </span>
                      <strong className="text-slate-900">
                        {formatNumber(voucherBalanceCheck.totalCredit)}원
                      </strong>
                    </div>
                    <div className="font-bold text-emerald-700">
                      양쪽 차이: {formatNumber(voucherBalanceCheck.varianceDelta)}원 (
                      {voucherBalanceCheck.isBalanced ? '정확히 일치' : '점검 필요'})
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleExportExcel('amaranth-voucher')}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-600"
                >
                  <Download className="h-4 w-4" />
                  더존 급여전표 엑셀 바로 다운로드
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                    <th className="px-4 py-2.5">법인</th>
                    <th className="px-4 py-2.5">부서코드</th>
                    <th className="px-4 py-2.5">소속부서</th>
                    <th className="px-4 py-2.5">비용/지급 구분</th>
                    <th className="px-4 py-2.5">계정번호</th>
                    <th className="px-4 py-2.5">항목 이름</th>
                    <th className="px-4 py-2.5 text-right">부서 비용 금액</th>
                    <th className="px-4 py-2.5 text-right">세금·통장 지급 금액</th>
                    <th className="px-4 py-2.5">전표 설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center">
                        <p className="text-xs font-bold text-slate-600">
                          아직 생성된 회계전표가 없습니다. 아래 버튼을 눌러 자동정산을 실행하면 부서별 전표가 즉시 만들어집니다.
                        </p>
                        <button
                          onClick={handleRunSettlement}
                          disabled={loading || !targetYm}
                          className="mt-3 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                          지금 바로 전사 급여·전표 자동정산 실행하기
                        </button>
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => (
                      <tr key={v.voucherId} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">{v.entityName}</td>
                        <td className="px-4 py-2 font-mono text-slate-600">{v.costCenterCode}</td>
                        <td className="px-4 py-2">{v.deptName}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                              v.drCr === 'DEBIT'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {v.drCr === 'DEBIT' ? '부서 비용(차변)' : '세금·지급(대변)'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono">{v.accountCode}</td>
                        <td className="px-4 py-2 font-semibold">{v.accountName}</td>
                        <td className="px-4 py-2 text-right font-semibold text-blue-900">
                          {v.drCr === 'DEBIT' ? formatNumber(v.amount) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900">
                          {v.drCr === 'CREDIT' ? formatNumber(v.amount) : '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{v.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 3 - Phase 2] 세금 · 4대보험 · 골프장 캐디 · 장애인부담금 신고 화면
           ============================================================ */}
        {activeTab === 'PHASE2_TAX_EDI' && (
          <div className="space-y-4">
            {/* 원클릭 전자신고 파일 다운로드 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Landmark className="h-4 w-4 text-blue-600" />
                  국세청 세금 · 4대보험 · 골프장 캐디 · 장애인부담금 신고파일
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  매월 10일(원천세·지방세·주민세), 15일(일용직·캐디 산재), 말일(캐디 소득·프리랜서), 주 1회(4대보험) 신고 엑셀을 즉시 생성합니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    {
                      type: 'edi-4major-pack',
                      label: '4대보험 EDI 신고',
                      color: 'bg-blue-600 hover:bg-blue-700',
                    },
                    {
                      type: 'caddy-total-pack',
                      label: '캐디 세금·산재 신고',
                      color: 'bg-blue-600 hover:bg-blue-700',
                    },
                    {
                      type: 'daily-work-confirm',
                      label: '일용직 근로확인(15일)',
                      color: 'bg-blue-600 hover:bg-blue-700',
                    },
                    {
                      type: 'withholding-local-resident-tax',
                      label: '원천세·지방세·주민세(10일)',
                      color: 'bg-slate-800 hover:bg-slate-700',
                    },
                    {
                      type: 'payment-statements-disabled-levy',
                      label: '지급명세서·장애인부담금',
                      color: 'bg-slate-700 hover:bg-slate-600',
                    },
                  ] as const
                ).map((btn) => (
                  <button
                    key={btn.type}
                    onClick={() => handleExportPhase2Excel(btn.type)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs transition ${btn.color}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3개 법인별 원천세 / 지방세 / 주민세 / 장애인고용부담금 집계표 */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="text-xs font-bold text-slate-800">
                  [{targetYm}] 3개 회사별 국세청 원천세 · 구청 지방소득세 · 주민세(직원분) · 장애인 고용부담금 자동 합계표
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-3 py-2.5">회사명</th>
                      <th className="px-3 py-2.5 text-right">정규·계약직 급여(인원)</th>
                      <th className="px-3 py-2.5 text-right">일용직 급여(인원)</th>
                      <th className="px-3 py-2.5 text-right">퇴직금·프리랜서 지급액</th>
                      <th className="px-3 py-2.5 text-right font-bold text-blue-900">
                        국세청 원천세(10일)
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-slate-900">
                        구청 지방소득세(10일)
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-slate-900">
                        주민세 직원분(10일)
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        장애인 의무고용 / 현재인원
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-slate-900">
                        장애인 고용부담금
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(phase2Summary?.entityTaxSummaries ?? []).map((t) => (
                      <tr key={t.entityCode} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-bold">{t.entityName}</td>
                        <td className="px-3 py-2.5 text-right">
                          {formatNumber(t.regularTaxableGross)}원 ({formatNumber(t.regularHeadcount)}명)
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {formatNumber(t.dailyGross)}원 ({formatNumber(t.dailyHeadcount)}명)
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {formatNumber(t.severanceGross + t.bizIncomeGross)}원
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-900">
                          {formatNumber(t.totalWithholdingIncomeTax)}원
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          {formatNumber(t.totalSpecialLocalTax)}원
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          {t.residentTaxExemptYn
                            ? '면세(기준이하)'
                            : `${formatNumber(t.residentTaxAmount)}원`}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          의무 {formatNumber(t.mandatoryDisabledQuota)}명 / 인정{' '}
                          {formatNumber(t.recognizedDisabledCount)}명 (전체{' '}
                          {formatNumber(t.eligibleRegularEmployeeCount)}명)
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          {formatNumber(t.estimatedMonthlyDisabledLevy)}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 개별 캐디 / 월급변경 / 프리랜서 추가 입력폼 토글 바 및 상시 내역 표시 */}
            <div
              data-individual-form-anchor="true"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 sm:text-sm">
                    골프장 캐디 수입 ({formatNumber(caddyRecords.length)}건) · 직원 월급 변경 ({formatNumber(salaryChanges.length)}건) · 외부 강사 3.3% ({formatNumber(businessIncomes.length)}건)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    등록된 내역은 아래에서 바로 확인하고, 신규 내역을 추가할 때만 오른쪽 버튼을 눌러 입력칸을 여세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualAddForm((prev) => !prev)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                    showIndividualAddForm
                      ? 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'bg-blue-600 text-white hover:bg-blue-600'
                  }`}
                >
                  {showIndividualAddForm
                    ? '▲ 개별 입력칸 접기'
                    : '+ 캐디 · 월급변경 · 프리랜서(3.3%) 신규 등록칸 열기 ▼'}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 border-t border-slate-200 pt-4 md:grid-cols-3">
                {/* 1. 경기과 캐디 과세/산재/입이직 */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold text-slate-900">
                    골프장 캐디 라운딩 수입 · 입퇴사 내역 ({formatNumber(caddyRecords.length)}건)
                  </h4>
                  {showIndividualAddForm && (
                    <form onSubmit={handleAddCaddyRecord} className="space-y-2.5 text-xs">
                      <select
                        value={caddyForm.empId}
                        onChange={(e) => setCaddyForm({ ...caddyForm, empId: Number(e.target.value) })}
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        required
                      >
                        <option value={0}>골프장 캐디 선택 (직원명부에 등록된 캐디)</option>
                        {employees
                          .filter((e) => e.employmentType === 'CADDY')
                          .map((e) => (
                            <option key={e.empId} value={e.empId}>
                              [{e.entityName}] {e.empName} ({e.empNo})
                            </option>
                          ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="이번 달 라운딩 횟수"
                          value={caddyForm.roundCount}
                          onChange={(e) => setCaddyForm({ ...caddyForm, roundCount: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          type="number"
                          placeholder="캐디피 총수입 (원)"
                          value={caddyForm.totalCaddyFeeIncome}
                          onChange={(e) =>
                            setCaddyForm({ ...caddyForm, totalCaddyFeeIncome: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={caddyForm.hireOrLeaveStatus}
                          onChange={(e) =>
                            setCaddyForm({
                              ...caddyForm,
                              hireOrLeaveStatus: e.target.value as
                                | 'ACTIVE'
                                | 'NEW_ACQUIRE'
                                | 'LOSS_LEAVE',
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        >
                          <option value="ACTIVE">근무중 (세금·산재 신고)</option>
                          <option value="NEW_ACQUIRE">신규 입사 (고용보험 가입)</option>
                          <option value="LOSS_LEAVE">퇴사 (고용보험 상실)</option>
                        </select>
                        <input
                          type="date"
                          title="입/퇴사일"
                          value={caddyForm.eventDate}
                          onChange={(e) => setCaddyForm({ ...caddyForm, eventDate: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                      >
                        캐디 수입 저장 (경비 자동 제외 후 산재 계산)
                      </button>
                    </form>
                  )}

                  <div className="max-h-48 overflow-y-auto border-t border-slate-200 pt-2 text-[11px]">
                    {caddyRecords.length === 0 ? (
                      <div className="py-3 text-center text-slate-400">등록된 캐디 정산 내역이 없습니다.</div>
                    ) : (
                      caddyRecords.map((c) => (
                        <div
                          key={c.recordId}
                          className="mb-1.5 rounded border border-slate-200 bg-white p-2"
                        >
                          <div className="font-bold text-slate-800">
                            {c.caddyName} ({c.empNo}) — 총수입: {formatNumber(c.totalCaddyFeeIncome)}원
                          </div>
                          <div className="text-emerald-800">
                            산재신고 소득(경비 제외):{' '}
                            <strong>{formatNumber(c.reportedMonthlyRemuneration)}원</strong> / 산재보험료:{' '}
                            {formatNumber(c.iacEmployerBurden)}원
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. 근로자 월보수액 변경신고 */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold text-slate-900">
                    직원 월급 변경 4대보험 신고 내역 ({formatNumber(salaryChanges.length)}건)
                  </h4>
                  {showIndividualAddForm && (
                    <form onSubmit={handleAddSalaryChange} className="space-y-2.5 text-xs">
                      <select
                        value={salChangeForm.empId}
                        onChange={(e) =>
                          setSalChangeForm({ ...salChangeForm, empId: Number(e.target.value) })
                        }
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        required
                      >
                        <option value={0}>월급이 바뀐 직원 선택</option>
                        {employees
                          .filter((e) => e.employmentType === 'REGULAR' || e.employmentType === 'CONTRACT')
                          .map((e) => (
                            <option key={e.empId} value={e.empId}>
                              [{e.entityName}/{e.deptName}] {e.empName} (현 기본급: {formatNumber(e.baseMonthlyPay)}원)
                            </option>
                          ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={salChangeForm.changeDate}
                          onChange={(e) =>
                            setSalChangeForm({ ...salChangeForm, changeDate: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          type="number"
                          placeholder="바뀐 후 월 기본급(원)"
                          value={salChangeForm.newMonthlyPay}
                          onChange={(e) =>
                            setSalChangeForm({ ...salChangeForm, newMonthlyPay: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <input
                        placeholder="변경 사유 (예: 연봉 재계약, 승진)"
                        value={salChangeForm.changeReason}
                        onChange={(e) =>
                          setSalChangeForm({ ...salChangeForm, changeReason: e.target.value })
                        }
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        required
                      />
                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-500"
                      >
                        월급 변경신고 등록 & 직원명부 자동 반영
                      </button>
                    </form>
                  )}

                  <div className="max-h-48 overflow-y-auto border-t border-slate-200 pt-2 text-[11px]">
                    {salaryChanges.length === 0 ? (
                      <div className="py-3 text-center text-slate-400">등록된 보수월액 변경 내역이 없습니다.</div>
                    ) : (
                      salaryChanges.map((sc) => (
                        <div
                          key={sc.changeId}
                          className="mb-1.5 rounded border border-slate-200 bg-white p-2"
                        >
                          <div className="font-bold text-slate-800">
                            {sc.empName} ({sc.deptName}) — {sc.changeDate}
                          </div>
                          <div className="text-blue-800">
                            {formatNumber(sc.previousMonthlyPay)}원 →{' '}
                            <strong>{formatNumber(sc.newMonthlyPay)}원</strong> ({sc.changeReason})
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. 외부 강사·프리랜서(3.3% 사업소득) */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold text-slate-900">
                    외부 강사 · 행사 진행자(3.3% 사업소득) 내역 ({formatNumber(businessIncomes.length)}건)
                  </h4>
                  {showIndividualAddForm && (
                    <form onSubmit={handleAddBusinessIncome} className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={bizIncomeForm.entityCode}
                          onChange={(e) =>
                            setBizIncomeForm({
                              ...bizIncomeForm,
                              entityCode: e.target.value as EntityCode,
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        >
                          <option value="BLACKSTONE">블랙스톤</option>
                          <option value="KMG">KMG</option>
                          <option value="RAKSANSU">락산수</option>
                        </select>
                        <input
                          type="date"
                          value={bizIncomeForm.paymentDate}
                          onChange={(e) =>
                            setBizIncomeForm({ ...bizIncomeForm, paymentDate: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="받는 사람 이름"
                          value={bizIncomeForm.earnerName}
                          onChange={(e) =>
                            setBizIncomeForm({ ...bizIncomeForm, earnerName: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          placeholder="주민번호/사업자번호"
                          value={bizIncomeForm.earnerRegNoMasked}
                          onChange={(e) =>
                            setBizIncomeForm({ ...bizIncomeForm, earnerRegNoMasked: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="업무 내용 (예: 행사MC, 강사)"
                          value={bizIncomeForm.incomeTypeName}
                          onChange={(e) =>
                            setBizIncomeForm({ ...bizIncomeForm, incomeTypeName: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          type="number"
                          placeholder="세전 지급총액 (원)"
                          value={bizIncomeForm.grossAmount}
                          onChange={(e) =>
                            setBizIncomeForm({ ...bizIncomeForm, grossAmount: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                      >
                        3.3% 세금 자동 계산 및 등록하기
                      </button>
                    </form>
                  )}

                  <div className="max-h-48 overflow-y-auto border-t border-slate-200 pt-2 text-[11px]">
                    {businessIncomes.length === 0 ? (
                      <div className="py-3 text-center text-slate-400">등록된 3.3% 사업소득 내역이 없습니다.</div>
                    ) : (
                      businessIncomes.map((b) => (
                        <div
                          key={b.bizIncomeId}
                          className="mb-1.5 rounded border border-slate-200 bg-white p-2"
                        >
                          <div className="font-bold text-slate-800">
                            [{b.entityCode}] {b.earnerName} ({b.incomeTypeName}) — {b.paymentDate}
                          </div>
                          <div className="text-slate-600">
                            세전: {formatNumber(b.grossAmount)}원 / 세금(3.3%):{' '}
                            {formatNumber(b.incomeTaxWithheld + b.localTaxWithheld)}원 / 실제 입금액:{' '}
                            <strong>{formatNumber(b.netPaidAmount)}원</strong>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 4 - Phase 2] 퇴직금 자동 계산기 & 퇴사 후 14일 지급기한 관리
           ============================================================ */}
        {activeTab === 'PHASE2_SEVERANCE' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  퇴직금 자동 계산 결과 및 퇴사 후 14일 이내 지급 마감일 관리
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  퇴사 전 3개월 실제 일수(89~92일), 연간 상여금, 남은 연차수당을 반영해 1일 평균임금을 계산하고 통상임금과 비교해 더 유리한 금액으로 퇴직금을 산출합니다.
                </p>
              </div>
              <button
                onClick={() => handleExportPhase2Excel('severance-statement')}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-600"
              >
                <Download className="h-4 w-4" />
                퇴직금 계산서 · 결재서류 엑셀 다운로드
              </button>
            </div>

            <form
              onSubmit={handleCalculateSeverance}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800">
                  퇴사자 퇴직금 새로 계산하기 (직원을 고르면 3개월 예상 월급이 자동으로 채워집니다)
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700">
                  퇴사일을 넣으면 법정 지급 마감일(퇴사 후 14일 이내)이 자동 계산됩니다
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ① 퇴직 정산 대상 직원 선택 *
                  </label>
                  <select
                    value={severanceForm.empId}
                    onChange={(e) => {
                      const chosenId = Number(e.target.value);
                      const chosenEmp = employees.find((emp) => emp.empId === chosenId);
                      const est3Months = chosenEmp
                        ? String(
                            (chosenEmp.baseMonthlyPay +
                              chosenEmp.mealAllowanceTaxFree +
                              chosenEmp.carAllowanceTaxFree +
                              chosenEmp.teamLeaderAllowance) *
                              3
                          )
                        : severanceForm.last3MonthsWages;
                      setSeveranceForm({
                        ...severanceForm,
                        empId: chosenId,
                        resignDate: chosenEmp?.resignDate ?? severanceForm.resignDate,
                        last3MonthsWages: est3Months,
                      });
                    }}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                    required
                  >
                    <option value={0}>직원을 선택하세요</option>
                    {employees.map((e) => (
                      <option key={e.empId} value={e.empId}>
                        [{e.entityName}/{e.deptName}] {e.empName} (입사: {e.hireDate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ② 퇴사일 (마지막 근무 다음날) *
                  </label>
                  <input
                    type="date"
                    title="퇴사일"
                    value={severanceForm.resignDate}
                    onChange={(e) =>
                      setSeveranceForm({ ...severanceForm, resignDate: e.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ③ 퇴직 전 3개월 급여 합계 (세전) *
                  </label>
                  <input
                    type="number"
                    placeholder="직원 선택 시 자동 계산됨"
                    value={severanceForm.last3MonthsWages}
                    onChange={(e) =>
                      setSeveranceForm({ ...severanceForm, last3MonthsWages: e.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ④ 최근 1년간 받은 상여금 총액 (없으면 비움)
                  </label>
                  <input
                    type="number"
                    placeholder="없으면 비워두세요 (0 처리)"
                    value={severanceForm.annualBonusTotal}
                    onChange={(e) =>
                      setSeveranceForm({ ...severanceForm, annualBonusTotal: e.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑤ 미사용 연차수당 총액 (없으면 비움)
                  </label>
                  <input
                    type="number"
                    placeholder="없으면 비워두세요 (0 처리)"
                    value={severanceForm.unusedAnnualLeavePay}
                    onChange={(e) =>
                      setSeveranceForm({ ...severanceForm, unusedAnnualLeavePay: e.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑥ 비교용 하루 통상임금 (선택 입력)
                  </label>
                  <input
                    type="number"
                    placeholder="평균임금과 비교할 하루 통상임금"
                    value={severanceForm.dailyOrdinaryWage}
                    onChange={(e) =>
                      setSeveranceForm({ ...severanceForm, dailyOrdinaryWage: e.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑦ 퇴직소득세 공제액 (없으면 비움)
                  </label>
                  <input
                    type="number"
                    placeholder="퇴직소득세 (지방세는 자동 산출)"
                    value={severanceForm.retirementIncomeTax}
                    onChange={(e) =>
                      setSeveranceForm({ ...severanceForm, retirementIncomeTax: e.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-600"
                  >
                    퇴직금 자동 계산 및 저장하기
                  </button>
                </div>
              </div>
            </form>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                    <th className="px-3 py-2.5">법인/부서</th>
                    <th className="px-3 py-2.5">성명(사번)</th>
                    <th className="px-3 py-2.5">입사일 ~ 퇴사일</th>
                    <th className="px-3 py-2.5 font-bold text-rose-700">
                      14일 이내 지급 마감일
                    </th>
                    <th className="px-3 py-2.5 text-right">총 근무일수(3개월 일수)</th>
                    <th className="px-3 py-2.5 text-right">1일 평균임금</th>
                    <th className="px-3 py-2.5 text-right">최종 적용 1일임금</th>
                    <th className="px-3 py-2.5 text-right">세전 퇴직금</th>
                    <th className="px-3 py-2.5 text-right">퇴직세금(소득+지방)</th>
                    <th className="px-3 py-2.5 text-right font-bold">실제 통장 입금액(세후)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {severanceLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        계산된 퇴직금 내역이 없습니다. 위 칸에서 퇴사할 직원을 선택해 계산해 보세요.
                      </td>
                    </tr>
                  ) : (
                    severanceLedgers.map((s) => (
                      <tr key={s.severanceId} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          {s.entityName} / {s.deptName}
                        </td>
                        <td className="px-3 py-2 font-bold">
                          {s.empName} ({s.empNo})
                        </td>
                        <td className="px-3 py-2">
                          {s.hireDate} ~ {s.resignDate}
                        </td>
                        <td className="px-3 py-2 font-bold text-rose-700">
                          {s.paymentDeadlineDate}까지
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(s.serviceDays)}일 ({formatNumber(s.last3MonthsTotalDays)}일)
                        </td>
                        <td className="px-3 py-2 text-right">{formatNumber(s.dailyAverageWage)}원</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {formatNumber(s.appliedDailyWage)}원
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {formatNumber(s.grossSeverancePay)}원
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(s.retirementIncomeTax + s.retirementLocalTax)}원
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">
                          {formatNumber(s.netSeverancePay)}원
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 5 - Phase 3] 입·퇴사 6가지 필수 준비 체크표 · 현장실습생 배치 · 주차차량 등록
           ============================================================ */}
        {activeTab === 'PHASE3_ONBOARDING' && (
          <div className="space-y-4">
            {/* 상단 요약 및 엑셀 다운로드 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  신입 입사 · 퇴사자 6대 필수 준비 체크표 & 주차 차량 대장
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  준비 완료: <strong>{formatNumber(phase3Summary?.onboardingCompletedCount)}건</strong> / 진행중:{' '}
                  <strong className="text-amber-700">{formatNumber(phase3Summary?.onboardingPendingCount)}건</strong> / 등록차량:{' '}
                  <strong>{formatNumber(vehicleRegistrations.length)}대</strong> / 기숙사 퇴실:{' '}
                  <strong>{formatNumber(dormitoryResignees.length)}명</strong> / 수습 만료:{' '}
                  <strong>{formatNumber(probationTargets.length)}명</strong>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleExportPhase3Excel('onboarding-amaranth-pack')}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  입·퇴사 체크표 엑셀
                </button>
                <button
                  onClick={() => handleExportPhase3Excel('parking-vehicle-pack')}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  주차 차량 명단 엑셀
                </button>
                <button
                  onClick={() => handleExportExcel('hr-lifecycle-report')}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  기숙사·수습 명단 엑셀
                </button>
              </div>
            </div>

            {/* 입퇴사/실습생 원클릭 준비 체크표 */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-extrabold text-slate-900">
                이달의 신입사원 입사 · 퇴사자 · 현장실습생 필수 준비 체크표 (오른쪽 버튼으로 한 번에 완료 처리)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-3 py-2.5">구분 / 날짜</th>
                      <th className="px-3 py-2.5">법인 / 부서</th>
                      <th className="px-3 py-2.5">성명 (사번)</th>
                      <th className="px-3 py-2.5 text-center">① 더존등록</th>
                      <th className="px-3 py-2.5 text-center">② 채용결재</th>
                      <th className="px-3 py-2.5 text-center">③ 근로계약서</th>
                      <th className="px-3 py-2.5 text-center">④ 메일·사원증</th>
                      <th className="px-3 py-2.5 text-center">⑤ 주차등록</th>
                      <th className="px-3 py-2.5 text-center">⑥ 식당지문</th>
                      <th className="px-3 py-2.5 text-center">퇴사결재</th>
                      <th className="px-3 py-2.5 text-center">완료 상태</th>
                      <th className="px-3 py-2.5 text-center">한 번에 완료</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {onboardingProvisionings.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                          현재 진행 중인 입·퇴사 준비 대상자가 없습니다. 아래 [개별 추가칸 열기] 버튼으로 등록할 수 있습니다.
                        </td>
                      </tr>
                    ) : (
                      onboardingProvisionings.map((p) => (
                        <tr key={`${p.workflowType}_${p.empId}`} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold">
                            <span
                              className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                p.workflowType === 'OFFBOARDING'
                                  ? 'bg-rose-100 text-rose-800'
                                  : p.workflowType === 'INTERN_PLACEMENT'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.workflowType === 'OFFBOARDING'
                                ? '퇴사 절차'
                                : p.workflowType === 'INTERN_PLACEMENT'
                                ? '실습생 배치'
                                : '입사 준비'}
                            </span>
                            {p.eventDate}
                          </td>
                          <td className="px-3 py-2">
                            {p.entityName} / {p.deptName}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {p.empName} ({p.empNo})
                            {p.internSchoolName && (
                              <div className="text-[10px] font-normal text-blue-700">
                                학교: {p.internSchoolName} / 멘토: {p.internMentorName ?? '-'}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {p.amaranthErpRegistered ? '✓' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {p.recruitmentNoticeIssued ? '✓' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {p.laborContractSigned ? '✓' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {p.emailAccountRequested && p.idCardIssued ? '✓' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {p.vehicleRegistered ? '✓' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {p.mealFingerprintRegistered ? '✓' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-blue-600">
                            {p.resignationApprovalSubmitted ? '✓' : '-'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            {formatNumber(p.completedStepsCount)} / {formatNumber(p.totalStepsCount)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleCompleteAllProvisioning(p)}
                              className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-600"
                            >
                              한 번에 완료
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 하단 개별 설정 & 주차 차량 등록 토글 바 및 상시 주차 차량 대장 */}
            <div
              data-individual-form-anchor="true"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 sm:text-sm">
                    입·퇴사 준비 항목 개별 체크 & 임직원·방문객 주차장 차량 번호 대장 ({formatNumber(vehicleRegistrations.length)}대 등록됨)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    등록된 차량 목록은 아래에서 바로 확인하고, 개별 입·퇴사 항목 수정이나 신규 차량 등록 시 오른쪽 버튼을 눌러 입력칸을 여세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualAddForm((prev) => !prev)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                    showIndividualAddForm
                      ? 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'bg-blue-600 text-white hover:bg-blue-600'
                  }`}
                >
                  {showIndividualAddForm
                    ? '▲ 개별 입력칸 접기'
                    : '+ 입·퇴사 개별 설정 / 신규 주차 차량 등록칸 열기 ▼'}
                </button>
              </div>

              {showIndividualAddForm && (
                <div className="mt-4 grid grid-cols-1 gap-6 border-t border-slate-200 pt-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="text-xs font-bold text-slate-900">
                      입·퇴사자 및 현장실습생 필수 준비 개별 체크
                    </h4>
                    <form onSubmit={handleSaveProvisioning} className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={provForm.empId}
                          onChange={(e) => setProvForm({ ...provForm, empId: Number(e.target.value) })}
                          className="col-span-2 rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        >
                          <option value={0}>대상 직원 / 실습생 / 캐디 선택</option>
                          {employees.map((e) => (
                            <option key={e.empId} value={e.empId}>
                              [{e.entityName}/{e.deptName}] {e.empName} ({e.empNo})
                            </option>
                          ))}
                        </select>
                        <select
                          value={provForm.workflowType}
                          onChange={(e) =>
                            setProvForm({
                              ...provForm,
                              workflowType: e.target.value as
                                | 'ONBOARDING'
                                | 'OFFBOARDING'
                                | 'INTERN_PLACEMENT',
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        >
                          <option value="ONBOARDING">입사 준비</option>
                          <option value="OFFBOARDING">퇴사 절차</option>
                          <option value="INTERN_PLACEMENT">현장실습생 배치</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="date"
                          value={provForm.eventDate}
                          onChange={(e) => setProvForm({ ...provForm, eventDate: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          placeholder="학교명 (실습생인 경우)"
                          value={provForm.internSchoolName}
                          onChange={(e) =>
                            setProvForm({ ...provForm, internSchoolName: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          placeholder="담당 멘토 이름 (실습생)"
                          value={provForm.internMentorName}
                          onChange={(e) =>
                            setProvForm({ ...provForm, internMentorName: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3 text-[11px] md:grid-cols-4">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={provForm.amaranthErpRegistered}
                            onChange={(e) =>
                              setProvForm({ ...provForm, amaranthErpRegistered: e.target.checked })
                            }
                          />
                          ① 더존 등록
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={provForm.recruitmentNoticeIssued}
                            onChange={(e) =>
                              setProvForm({ ...provForm, recruitmentNoticeIssued: e.target.checked })
                            }
                          />
                          ② 채용 결재
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={provForm.laborContractSigned}
                            onChange={(e) =>
                              setProvForm({ ...provForm, laborContractSigned: e.target.checked })
                            }
                          />
                          ③ 근로계약서
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={provForm.emailAccountRequested}
                            onChange={(e) =>
                              setProvForm({ ...provForm, emailAccountRequested: e.target.checked })
                            }
                          />
                          ④ 이메일 생성
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={provForm.idCardIssued}
                            onChange={(e) =>
                              setProvForm({ ...provForm, idCardIssued: e.target.checked })
                            }
                          />
                          ④ 사원증 발급
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={provForm.vehicleRegistered}
                            onChange={(e) =>
                              setProvForm({ ...provForm, vehicleRegistered: e.target.checked })
                            }
                          />
                          ⑤ 주차장 등록
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={provForm.mealFingerprintRegistered}
                            onChange={(e) =>
                              setProvForm({ ...provForm, mealFingerprintRegistered: e.target.checked })
                            }
                          />
                          ⑥ 식당 지문등록
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={provForm.resignationApprovalSubmitted}
                            onChange={(e) =>
                              setProvForm({
                                ...provForm,
                                resignationApprovalSubmitted: e.target.checked,
                              })
                            }
                          />
                          퇴사 결재서류
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-600"
                      >
                        입·퇴사 체크 상태 저장하기
                      </button>
                    </form>
                  </div>

                  {/* 2. 임직원 / 내방객 주차차량 등록 폼 */}
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="text-xs font-bold text-slate-900">
                      주차장 차단기 차량 번호 신규 등록 (직원 차량 · 방문객 차량)
                    </h4>
                    <form onSubmit={handleAddVehicle} className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="date"
                          value={vehicleForm.regDate}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, regDate: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <select
                          value={vehicleForm.vehicleType}
                          onChange={(e) =>
                            setVehicleForm({
                              ...vehicleForm,
                              vehicleType: e.target.value as 'EMPLOYEE' | 'VISITOR',
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        >
                          <option value="VISITOR">방문객 차량 (VIP/업체)</option>
                          <option value="EMPLOYEE">직원 차량 (상시등록)</option>
                        </select>
                        <select
                          value={vehicleForm.entityCode}
                          onChange={(e) =>
                            setVehicleForm({
                              ...vehicleForm,
                              entityCode: e.target.value as EntityCode,
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        >
                          <option value="BLACKSTONE">블랙스톤</option>
                          <option value="KMG">KMG</option>
                          <option value="RAKSANSU">락산수</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="운전자 성명"
                          value={vehicleForm.ownerOrVisitorName}
                          onChange={(e) =>
                            setVehicleForm({ ...vehicleForm, ownerOrVisitorName: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          placeholder="차량번호 (예: 123가4567)"
                          value={vehicleForm.carNumber}
                          onChange={(e) =>
                            setVehicleForm({ ...vehicleForm, carNumber: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-bold"
                          required
                        />
                        <input
                          placeholder="차종 (예: 쏘렌토, G80)"
                          value={vehicleForm.carModel}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, carModel: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="담당 부서"
                          value={vehicleForm.deptName}
                          onChange={(e) => setVehicleForm({ ...vehicleForm, deptName: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          placeholder="방문/운행 목적"
                          value={vehicleForm.visitPurpose}
                          onChange={(e) =>
                            setVehicleForm({ ...vehicleForm, visitPurpose: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          placeholder="연락처"
                          value={vehicleForm.contactPhone}
                          onChange={(e) =>
                            setVehicleForm({ ...vehicleForm, contactPhone: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-500"
                      >
                        주차장 차량번호 즉시 등록하기
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* 주차 차량 등록 현황 목록 (항상 표시) */}
              <div className="mt-4 border-t border-slate-200 pt-3">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>주차관제(LPR) 등록 차량 현황 ({formatNumber(vehicleRegistrations.length)}대)</span>
                </div>
                <div className="max-h-52 overflow-y-auto text-[11px]">
                  {vehicleRegistrations.length === 0 ? (
                    <div className="py-4 text-center text-slate-400">
                      등록된 주차 차량이 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                      {vehicleRegistrations.map((v) => (
                        <div
                          key={v.vehicleRegId}
                          className="flex items-center justify-between rounded border border-slate-200 bg-slate-50/70 px-3 py-1.5"
                        >
                          <div>
                            <span className="mr-1.5 font-bold text-blue-800">
                              [{v.vehicleType === 'EMPLOYEE' ? '직원' : '방문객'}]
                            </span>
                            <strong>{v.carNumber}</strong> ({v.ownerOrVisitorName} / {v.deptName})
                          </div>
                          <span className="text-slate-500">
                            {v.regDate} · {v.visitPurpose}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 6 - Phase 3] 구내식당 식수관리 · 삼성웰스토리 전달 · 외주 용역비 정기 결재 서류함
           ============================================================ */}
        {activeTab === 'PHASE3_MEAL_APPROVALS' && (
          <div className="space-y-4">
            {/* 상단 4종 정기 결재 서류 & 삼성웰스토리 리포트 엑셀 다운로드 */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <Utensils className="h-4 w-4 text-blue-600" />
                    구내식당 식수 · 주간 식단표 · 외주 용역비 정기 결재 서류함
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    매월 초 반복 상신하는 구내식당 식대비, 고정 도급비, 하나BSN 용역비 결재 서류를 즉시 생성합니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleExportPhase3Excel('welstory-meal-pack')}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    웰스토리 식수·식단표
                  </button>
                  <button
                    onClick={() => handleExportPhase3Excel('meal-expense-approval')}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    식대비 결재서류
                  </button>
                  <button
                    onClick={() => handleExportPhase3Excel('vendor-contract-approval')}
                    className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    고정 도급비 결재서류
                  </button>
                  <button
                    onClick={() => handleExportPhase3Excel('hanabsn-service-approval')}
                    className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-600"
                  >
                    <Download className="h-3.5 w-3.5" />
                    하나BSN 용역비 결재
                  </button>
                </div>
              </div>
            </div>

            {/* 법인별 식수집계표 및 식대비 총괄표 */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-extrabold text-slate-900">
                구내식당(삼성웰스토리) 월간 식사 인원 및 3개 회사별 식대비 자동 합계표
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-3 py-2.5">회사명</th>
                      <th className="px-3 py-2.5 text-right">아침(조식)</th>
                      <th className="px-3 py-2.5 text-right">점심(중식)</th>
                      <th className="px-3 py-2.5 text-right">저녁(석식)</th>
                      <th className="px-3 py-2.5 text-right">야식</th>
                      <th className="px-3 py-2.5 text-right font-bold text-emerald-800">
                        총 식사 횟수
                      </th>
                      <th className="px-3 py-2.5 text-right">식대 공급가액</th>
                      <th className="px-3 py-2.5 text-right">부가세(10%)</th>
                      <th className="px-3 py-2.5 text-right font-bold text-blue-900">
                        식대 결제 합계액
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(phase3Summary?.mealEntitySummaries ?? []).map((ms) => (
                      <tr key={ms.entityCode} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-bold">{ms.entityName}</td>
                        <td className="px-3 py-2.5 text-right">{formatNumber(ms.breakfastTotal)}식</td>
                        <td className="px-3 py-2.5 text-right">{formatNumber(ms.lunchTotal)}식</td>
                        <td className="px-3 py-2.5 text-right">{formatNumber(ms.dinnerTotal)}식</td>
                        <td className="px-3 py-2.5 text-right">{formatNumber(ms.nightMealTotal)}식</td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-800">
                          {formatNumber(ms.totalMealCount)}식
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {formatNumber(ms.totalSupplyAmount)}원
                        </td>
                        <td className="px-3 py-2.5 text-right">{formatNumber(ms.totalVatAmount)}원</td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-900">
                          {formatNumber(ms.totalMealCost)}원
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-extrabold text-slate-900">
                      <td className="px-3 py-2.5 text-slate-900">[전사 식수 및 식대비 총계]</td>
                      <td colSpan={4} className="px-3 py-2.5 text-right text-slate-500">
                        삼성웰스토리 월간 마감 합계
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-700">
                        {formatNumber(phase3Summary?.mealGrandTotalCount)}식
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {formatNumber(phase3Summary?.mealGrandTotalSupply)}원
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {formatNumber(phase3Summary?.mealGrandTotalVat)}원
                      </td>
                      <td className="px-3 py-2.5 text-right text-blue-700">
                        {formatNumber(phase3Summary?.mealGrandTotalCost)}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4종 입력 및 결재 내역 토글 바 */}
            <div
              data-individual-form-anchor="true"
              className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 sm:text-sm">
                    일일 식사 인원 · 주간 식단표 · 외주 도급비 · 하나BSN 용역비 직접 입력 및 내역 보기
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    개별 식수나 외주 용역비 청구 내역을 새로 추가·수정하려면 오른쪽 버튼을 눌러 입력칸을 여세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualAddForm((prev) => !prev)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                    showIndividualAddForm
                      ? 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'bg-blue-600 text-white hover:bg-blue-600'
                  }`}
                >
                  {showIndividualAddForm
                    ? '▲ 개별 입력칸 접기'
                    : '식수 · 식단표 · 외주 용역비 입력칸 열기 ▼'}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 border-t border-slate-200 pt-4 md:grid-cols-2">
                {/* 1. 일일 식수 등록 */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold text-slate-900">
                    구내식당 일일 식사 인원 등록 (식대비 자동 합산)
                  </h4>
                  {showIndividualAddForm && (
                    <form onSubmit={handleAddMealLog} className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={mealForm.mealDate}
                          onChange={(e) => setMealForm({ ...mealForm, mealDate: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <select
                          value={mealForm.deptId}
                          onChange={(e) => setMealForm({ ...mealForm, deptId: Number(e.target.value) })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        >
                          <option value={0}>식사한 부서 선택 (회사 자동 연결)</option>
                          {departments.map((d) => (
                            <option key={d.deptId} value={d.deptId}>
                              [{d.entityCode}] {d.deptName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="number"
                          placeholder="아침 인원"
                          value={mealForm.breakfastCount}
                          onChange={(e) => {
                            const b = Number(e.target.value);
                            const l = Number(mealForm.lunchCount);
                            const d = Number(mealForm.dinnerCount);
                            const n = Number(mealForm.nightMealCount);
                            const p = Number(mealForm.unitMealPrice);
                            const autoVat = p > 0 ? String(Math.floor((b + l + d + n) * p * 0.1)) : mealForm.vatAmount;
                            setMealForm({ ...mealForm, breakfastCount: e.target.value, vatAmount: autoVat });
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          type="number"
                          placeholder="점심 인원"
                          value={mealForm.lunchCount}
                          onChange={(e) => {
                            const b = Number(mealForm.breakfastCount);
                            const l = Number(e.target.value);
                            const d = Number(mealForm.dinnerCount);
                            const n = Number(mealForm.nightMealCount);
                            const p = Number(mealForm.unitMealPrice);
                            const autoVat = p > 0 ? String(Math.floor((b + l + d + n) * p * 0.1)) : mealForm.vatAmount;
                            setMealForm({ ...mealForm, lunchCount: e.target.value, vatAmount: autoVat });
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          type="number"
                          placeholder="저녁 인원"
                          value={mealForm.dinnerCount}
                          onChange={(e) => {
                            const b = Number(mealForm.breakfastCount);
                            const l = Number(mealForm.lunchCount);
                            const d = Number(e.target.value);
                            const n = Number(mealForm.nightMealCount);
                            const p = Number(mealForm.unitMealPrice);
                            const autoVat = p > 0 ? String(Math.floor((b + l + d + n) * p * 0.1)) : mealForm.vatAmount;
                            setMealForm({ ...mealForm, dinnerCount: e.target.value, vatAmount: autoVat });
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          type="number"
                          placeholder="야식 인원"
                          value={mealForm.nightMealCount}
                          onChange={(e) => {
                            const b = Number(mealForm.breakfastCount);
                            const l = Number(mealForm.lunchCount);
                            const d = Number(mealForm.dinnerCount);
                            const n = Number(e.target.value);
                            const p = Number(mealForm.unitMealPrice);
                            const autoVat = p > 0 ? String(Math.floor((b + l + d + n) * p * 0.1)) : mealForm.vatAmount;
                            setMealForm({ ...mealForm, nightMealCount: e.target.value, vatAmount: autoVat });
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="1끼 단가(원)"
                          value={mealForm.unitMealPrice}
                          onChange={(e) => {
                            const b = Number(mealForm.breakfastCount);
                            const l = Number(mealForm.lunchCount);
                            const d = Number(mealForm.dinnerCount);
                            const n = Number(mealForm.nightMealCount);
                            const p = Number(e.target.value);
                            const autoVat = p > 0 ? String(Math.floor((b + l + d + n) * p * 0.1)) : '';
                            setMealForm({ ...mealForm, unitMealPrice: e.target.value, vatAmount: autoVat });
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          type="number"
                          placeholder="부가세(자동계산)"
                          value={mealForm.vatAmount}
                          onChange={(e) => setMealForm({ ...mealForm, vatAmount: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          placeholder="메모"
                          value={mealForm.notes}
                          onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                      >
                        일일 식사 인원 저장하기
                      </button>
                    </form>
                  )}

                  <div className="max-h-44 overflow-y-auto border-t border-slate-200 pt-2 text-[11px]">
                    {mealDailyLogs.map((m) => (
                      <div
                        key={m.mealLogId}
                        className="mb-1.5 flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-1.5"
                      >
                        <div>
                          <strong>{m.mealDate}</strong> [{m.entityName}/{m.deptName}] 총{' '}
                          <strong>{formatNumber(m.totalMealCount)}식</strong>
                        </div>
                        <span className="font-semibold text-blue-900">
                          {formatNumber(m.totalMealCost)}원
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. 주간식단표 공지사항 등록 */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold text-slate-900">
                    주간 식단표 사내 게시판 공지 기록
                  </h4>
                  {showIndividualAddForm && (
                    <form onSubmit={handleAddWeeklyMenu} className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="주차명 (예: 10월 3주차)"
                          value={weeklyMenuForm.weekLabel}
                          onChange={(e) =>
                            setWeeklyMenuForm({ ...weeklyMenuForm, weekLabel: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          type="date"
                          value={weeklyMenuForm.startDate}
                          onChange={(e) =>
                            setWeeklyMenuForm({ ...weeklyMenuForm, startDate: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          type="date"
                          value={weeklyMenuForm.endDate}
                          onChange={(e) =>
                            setWeeklyMenuForm({ ...weeklyMenuForm, endDate: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="게시판 공지번호"
                          value={weeklyMenuForm.groupwareNoticeNo}
                          onChange={(e) =>
                            setWeeklyMenuForm({
                              ...weeklyMenuForm,
                              groupwareNoticeNo: e.target.value,
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          placeholder="이번 주 주요 메뉴 요약"
                          value={weeklyMenuForm.welstoryMenuSummary}
                          onChange={(e) =>
                            setWeeklyMenuForm({
                              ...weeklyMenuForm,
                              welstoryMenuSummary: e.target.value,
                            })
                          }
                          className="col-span-2 rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                      >
                        주간 식단표 공지 내역 저장하기
                      </button>
                    </form>
                  )}

                  <div className="max-h-44 overflow-y-auto border-t border-slate-200 pt-2 text-[11px]">
                    {weeklyMenus.map((w) => (
                      <div
                        key={w.menuNoticeId}
                        className="mb-1.5 rounded border border-slate-200 bg-white px-3 py-1.5"
                      >
                        <div className="font-bold text-slate-800">
                          [{w.weekLabel}] {w.startDate} ~ {w.endDate} (공지: {w.groupwareNoticeNo})
                        </div>
                        <div className="text-slate-600">{w.welstoryMenuSummary}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. 고정거래처 도급비 및 직원수당 결재 */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      고정 거래처 도급비 · 직원수당 청구 등록 (매월 1~2일)
                    </h4>
                    <span className="text-xs font-bold text-blue-700">
                      합계: {formatNumber(phase3Summary?.vendorTotalInvoice)}원
                    </span>
                  </div>
                  {showIndividualAddForm && (
                    <form onSubmit={handleAddVendorContract} className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={vendorForm.deptId}
                          onChange={(e) =>
                            setVendorForm({ ...vendorForm, deptId: Number(e.target.value) })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        >
                          <option value={0}>담당 부서 선택</option>
                          {departments.map((d) => (
                            <option key={d.deptId} value={d.deptId}>
                              [{d.entityCode}] {d.deptName}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="거래처 이름"
                          value={vendorForm.vendorName}
                          onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          placeholder="계약 내용"
                          value={vendorForm.contractTitle}
                          onChange={(e) =>
                            setVendorForm({ ...vendorForm, contractTitle: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="number"
                          placeholder="기본 도급비(원)"
                          value={vendorForm.baseContractFee}
                          onChange={(e) => {
                            const bf = Number(e.target.value);
                            const sa = Number(vendorForm.staffAllowanceAmount);
                            const autoVat = bf + sa > 0 ? String(Math.floor((bf + sa) * 0.1)) : '';
                            setVendorForm({
                              ...vendorForm,
                              baseContractFee: e.target.value,
                              vatAmount: autoVat,
                            });
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          type="number"
                          placeholder="직원수당(원)"
                          value={vendorForm.staffAllowanceAmount}
                          onChange={(e) => {
                            const bf = Number(vendorForm.baseContractFee);
                            const sa = Number(e.target.value);
                            const autoVat = bf + sa > 0 ? String(Math.floor((bf + sa) * 0.1)) : '';
                            setVendorForm({
                              ...vendorForm,
                              staffAllowanceAmount: e.target.value,
                              vatAmount: autoVat,
                            });
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          type="number"
                          placeholder="부가세(자동계산)"
                          value={vendorForm.vatAmount}
                          onChange={(e) => setVendorForm({ ...vendorForm, vatAmount: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          placeholder="세금계산서 번호"
                          value={vendorForm.taxInvoiceNo}
                          onChange={(e) =>
                            setVendorForm({ ...vendorForm, taxInvoiceNo: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                      >
                        고정 거래처 도급비 결재내역 저장하기
                      </button>
                    </form>
                  )}

                  <div className="max-h-44 overflow-y-auto border-t border-slate-200 pt-2 text-[11px]">
                    {vendorContracts.map((vc) => (
                      <div
                        key={vc.vendorContractId}
                        className="mb-1.5 rounded border border-slate-200 bg-white px-3 py-1.5"
                      >
                        <div className="font-bold text-slate-800">{vc.approvalDocTitle}</div>
                        <div className="text-slate-900">
                          도급비 {formatNumber(vc.baseContractFee)}원 + 수당{' '}
                          {formatNumber(vc.staffAllowanceAmount)}원 + 부가세{' '}
                          {formatNumber(vc.vatAmount)}원 ={' '}
                          <strong>{formatNumber(vc.totalInvoiceAmount)}원</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. 락산수·KMG 용역비(하나BSN) */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      락산수 · KMG 부서별 외주 용역비 등록 (하나BSN)
                    </h4>
                    <span className="text-xs font-bold text-amber-800">
                      락산수 {formatNumber(phase3Summary?.hanaBsnRaksansuTotal)}원 / KMG{' '}
                      {formatNumber(phase3Summary?.hanaBsnKmgTotal)}원
                    </span>
                  </div>
                  {showIndividualAddForm && (
                    <form onSubmit={handleAddHanaBsnFee} className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={hanaBsnForm.deptId}
                          onChange={(e) =>
                            setHanaBsnForm({ ...hanaBsnForm, deptId: Number(e.target.value) })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        >
                          <option value={0}>하나BSN 용역 부서 선택 (락산수 / KMG 등)</option>
                          {departments.map((d) => (
                            <option key={d.deptId} value={d.deptId}>
                              [{d.entityCode}] {d.deptName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="파견 인원수(명)"
                          value={hanaBsnForm.dispatchedHeadcount}
                          onChange={(e) =>
                            setHanaBsnForm({ ...hanaBsnForm, dispatchedHeadcount: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="용역 공급가액(원)"
                          value={hanaBsnForm.supplyAmount}
                          onChange={(e) => {
                            const sa = Number(e.target.value);
                            const autoVat = sa > 0 ? String(Math.floor(sa * 0.1)) : '';
                            setHanaBsnForm({
                              ...hanaBsnForm,
                              supplyAmount: e.target.value,
                              vatAmount: autoVat,
                            });
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          type="number"
                          placeholder="부가세(자동계산)"
                          value={hanaBsnForm.vatAmount}
                          onChange={(e) =>
                            setHanaBsnForm({ ...hanaBsnForm, vatAmount: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <input
                          placeholder="세금계산서 번호"
                          value={hanaBsnForm.invoiceNo}
                          onChange={(e) =>
                            setHanaBsnForm({ ...hanaBsnForm, invoiceNo: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                      >
                        하나BSN 부서별 용역비 결재내역 저장하기
                      </button>
                    </form>
                  )}

                  <div className="max-h-44 overflow-y-auto border-t border-slate-200 pt-2 text-[11px]">
                    {hanaBsnFees.map((hf) => (
                      <div
                        key={hf.serviceFeeId}
                        className="mb-1.5 rounded border border-slate-200 bg-white px-3 py-1.5"
                      >
                        <div className="font-bold text-slate-800">{hf.approvalDocTitle}</div>
                        <div className="text-slate-900">
                          인원 {formatNumber(hf.dispatchedHeadcount)}명 / 공급가{' '}
                          {formatNumber(hf.supplyAmount)}원 + 부가세 {formatNumber(hf.vatAmount)}원 ={' '}
                          <strong>{formatNumber(hf.totalFeeAmount)}원</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 7] 부서별 근무표 · 연차/휴무 장부 · 수요일 인원보고 · 주간업무보고
           ============================================================ */}
        {activeTab === 'PHASE4_SCHEDULE_REPORT' && (
          <div className="space-y-4">
            {/* 상단 엑셀 팩 다운로드 및 말일 근무표 일괄 승인 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <CalendarCheck className="h-4 w-4 text-blue-600" />
                  부서 월 근무표 승인 · 잔여 연차/휴무 · 수요일 인원보고
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  부서별 월 근무표 말일 일괄 승인, 잔여 연차·휴무 장부 및 매주 수요일 임원 인원현황 보고서를 자동 집계합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={handleApproveAllSchedules}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  전 부서 근무표 일괄 승인
                </button>
                <button
                  onClick={() => handleExportPhase4Excel('monthly-schedule-leave-pack')}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-700"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  근무표·연차·휴무 엑셀
                </button>
                <button
                  onClick={() => handleExportPhase4Excel('wednesday-headcount-weekly-report')}
                  className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-600"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  수요일 인원·주간보고 엑셀
                </button>
              </div>
            </div>

            {/* 핵심 지표 요약 카드 4종 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  부서별 월 근무표 제출 및 최종 승인
                </div>
                <div className="mt-1 text-lg font-extrabold text-blue-700">
                  승인 {formatNumber(phase4Summary?.scheduleApprovedDeptsCount)}개 부서 / 제출{' '}
                  {formatNumber(phase4Summary?.scheduleSubmittedDeptsCount)}개 부서
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  부서별 근무표 제출 말일 일괄 최종 승인
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  전 직원 남은 연차 휴가 합계
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700">
                  남은 연차 {formatNumber(phase4Summary?.totalAnnualLeaveRemaining)}일
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  총 발생 {formatNumber(phase4Summary?.totalAnnualLeaveGranted)}일 / 사용{' '}
                  {formatNumber(phase4Summary?.totalAnnualLeaveUsed)}일
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  이달의 남은 휴무일 합계
                </div>
                <div className="mt-1 text-lg font-extrabold text-amber-700">
                  남은 휴무 {formatNumber(phase4Summary?.totalOffDaysRemaining)}일
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  부서 마감 근무표 기준 남은 휴무일수
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  수요일 전체 재직 인원 및 이달 입·퇴사
                </div>
                <div className="mt-1 text-lg font-extrabold text-blue-700">
                  총 재직 {formatNumber(phase4Summary?.grandTotalActiveHeadcount)}명
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  이달 입사 +{formatNumber(phase4Summary?.grandTotalMonthlyNewHires)}명 / 퇴사 -
                  {formatNumber(phase4Summary?.grandTotalMonthlyResignees)}명 (주간보고{' '}
                  {formatNumber(phase4Summary?.weeklyReportCount)}건)
                </div>
              </div>
            </div>

            {/* 매주 수요일 임직원 인원변동현황 (이사님 보고용 법인별 자동 집계표) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    매주 수요일 회사별 인원 변동 현황표 (이사님 주간 보고용 — 자동 계산)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    직원 명부에 등록된 입사일·퇴사일을 기준으로 수기 계산 없이 수요일 인원 보고서가 자동으로 집계됩니다.
                  </p>
                </div>
                <span className="rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                  기준년월: {targetYm}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
                      <th className="px-3 py-2">회사명</th>
                      <th className="px-3 py-2 text-right">정규직</th>
                      <th className="px-3 py-2 text-right">계약직</th>
                      <th className="px-3 py-2 text-right">현장실습생</th>
                      <th className="px-3 py-2 text-right">일용직</th>
                      <th className="px-3 py-2 text-right">캐디</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-900">총 재직인원</th>
                      <th className="px-3 py-2 text-right text-emerald-700">이달 신규입사</th>
                      <th className="px-3 py-2 text-right text-rose-700">이달 퇴사</th>
                      <th className="px-3 py-2 text-right font-bold text-blue-700">인원 증감</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(phase4Summary?.entityHeadcountReports ?? []).map((row) => (
                      <tr key={row.entityCode} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-slate-900">{row.entityName}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(row.activeRegularCount)}명</td>
                        <td className="px-3 py-2 text-right">{formatNumber(row.activeContractCount)}명</td>
                        <td className="px-3 py-2 text-right">{formatNumber(row.activeInternCount)}명</td>
                        <td className="px-3 py-2 text-right">{formatNumber(row.activeDailyCount)}명</td>
                        <td className="px-3 py-2 text-right">{formatNumber(row.activeCaddyCount)}명</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {formatNumber(row.totalActiveHeadcount)}명
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                          +{formatNumber(row.monthlyNewHiresCount)}명
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-rose-700">
                          -{formatNumber(row.monthlyResigneesCount)}명
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-blue-700">
                          {row.netChangeCount >= 0
                            ? `+${formatNumber(row.netChangeCount)}`
                            : formatNumber(row.netChangeCount)}
                          명
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 근무표 / 연차·휴무 / 주간업무보고 개별 등록 토글 바 */}
            <div
              data-individual-form-anchor="true"
              className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 sm:text-sm">
                    부서 월 근무표 · 직원별 연차/휴무 · 부서 주간업무보고서 개별 입력 및 상세 내역 보기
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    부서 근무표나 직원 연차 일수, 주간 업무보고를 직접 입력하거나 수정하려면 오른쪽 버튼을 눌러 여세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualAddForm((prev) => !prev)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                    showIndividualAddForm
                      ? 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'bg-blue-600 text-white hover:bg-blue-600'
                  }`}
                >
                  {showIndividualAddForm
                    ? '▲ 개별 입력칸 접기'
                    : '근무표 · 연차 · 주간보고 입력칸 열기 ▼'}
                </button>
              </div>

              <div className="mt-4 space-y-6 border-t border-slate-200 pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* 1. 부서별 월 근무표 취합 및 말일 최종 승인 */}
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="text-xs font-bold text-slate-900">
                      부서별 월 근무표 등록 및 승인 상태 변경
                    </h4>
                    {showIndividualAddForm && (
                      <form onSubmit={handleSaveSchedule} className="space-y-2.5 text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={scheduleForm.deptId}
                            onChange={(e) =>
                              setScheduleForm({ ...scheduleForm, deptId: Number(e.target.value) })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          >
                            <option value={0}>근무표 제출 부서 선택</option>
                            {departments.map((d) => (
                              <option key={d.deptId} value={d.deptId}>
                                [{d.entityCode}] {d.deptName}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="부서 인원수(명)"
                            value={scheduleForm.totalHeadcount}
                            onChange={(e) =>
                              setScheduleForm({ ...scheduleForm, totalHeadcount: e.target.value })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          />
                          <select
                            value={scheduleForm.submissionStatus}
                            onChange={(e) =>
                              setScheduleForm({
                                ...scheduleForm,
                                submissionStatus: e.target.value as 'SUBMITTED' | 'APPROVED_FINAL',
                              })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          >
                            <option value="SUBMITTED">부서 근무표 취합중</option>
                            <option value="APPROVED_FINAL">말일 최종 승인완료</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <input
                            type="number"
                            placeholder="총 근무일수 합계"
                            value={scheduleForm.scheduledWorkDaysTotal}
                            onChange={(e) =>
                              setScheduleForm({
                                ...scheduleForm,
                                scheduledWorkDaysTotal: e.target.value,
                              })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          />
                          <input
                            type="number"
                            placeholder="총 휴무일수 합계"
                            value={scheduleForm.scheduledOffDaysTotal}
                            onChange={(e) =>
                              setScheduleForm({
                                ...scheduleForm,
                                scheduledOffDaysTotal: e.target.value,
                              })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          />
                          <input
                            type="number"
                            placeholder="예상 연장시간"
                            value={scheduleForm.plannedOvertimeHours}
                            onChange={(e) =>
                              setScheduleForm({
                                ...scheduleForm,
                                plannedOvertimeHours: e.target.value,
                              })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          />
                          <input
                            placeholder="결재 문서번호"
                            value={scheduleForm.approvalDocNo}
                            onChange={(e) =>
                              setScheduleForm({ ...scheduleForm, approvalDocNo: e.target.value })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                        >
                          부서 월 근무표 저장하기
                        </button>
                      </form>
                    )}

                    <div className="max-h-52 overflow-y-auto border-t border-slate-200 pt-2">
                      <table className="w-full border-collapse text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-white text-slate-600">
                            <th className="px-2 py-1.5">법인/부서</th>
                            <th className="px-2 py-1.5 text-right">인원</th>
                            <th className="px-2 py-1.5 text-right">근무일/휴무일</th>
                            <th className="px-2 py-1.5">문서번호</th>
                            <th className="px-2 py-1.5">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {monthlySchedules.map((s) => (
                            <tr key={s.scheduleId}>
                              <td className="px-2 py-1.5 font-semibold text-slate-800">
                                [{s.entityCode}] {s.deptName}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {formatNumber(s.totalHeadcount)}명
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {formatNumber(s.scheduledWorkDaysTotal)}일 / 휴무{' '}
                                {formatNumber(s.scheduledOffDaysTotal)}일
                              </td>
                              <td className="px-2 py-1.5 font-mono text-slate-600">
                                {s.approvalDocNo}
                              </td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 font-bold ${
                                    s.submissionStatus === 'APPROVED_FINAL'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {s.submissionStatus === 'APPROVED_FINAL'
                                    ? '최종승인완료'
                                    : '부서취합중'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. 연차 및 휴무 장부 관리 */}
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="text-xs font-bold text-slate-900">
                      직원별 연차 휴가 및 월간 휴무 사용·남은 일수 등록
                    </h4>
                    {showIndividualAddForm && (
                      <form onSubmit={handleSaveLeaveLedger} className="space-y-2.5 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={leaveForm.empId}
                            onChange={(e) =>
                              setLeaveForm({ ...leaveForm, empId: Number(e.target.value) })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          >
                            <option value={0}>대상 직원 선택</option>
                            {employees.map((emp) => (
                              <option key={emp.empId} value={emp.empId}>
                                [{emp.entityCode}] {emp.empName} ({emp.deptName})
                              </option>
                            ))}
                          </select>
                          <input
                            placeholder="휴가 결재 문서번호"
                            value={leaveForm.approvalDocNo}
                            onChange={(e) =>
                              setLeaveForm({ ...leaveForm, approvalDocNo: e.target.value })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <input
                            type="number"
                            step="0.5"
                            placeholder="총 발생연차(일)"
                            value={leaveForm.annualLeaveGranted}
                            onChange={(e) =>
                              setLeaveForm({ ...leaveForm, annualLeaveGranted: e.target.value })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          />
                          <input
                            type="number"
                            step="0.5"
                            placeholder="사용연차(일)"
                            value={leaveForm.annualLeaveUsed}
                            onChange={(e) =>
                              setLeaveForm({ ...leaveForm, annualLeaveUsed: e.target.value })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          />
                          <input
                            type="number"
                            step="0.5"
                            placeholder="이달 휴무(일)"
                            value={leaveForm.monthlyOffGranted}
                            onChange={(e) =>
                              setLeaveForm({ ...leaveForm, monthlyOffGranted: e.target.value })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          />
                          <input
                            type="number"
                            step="0.5"
                            placeholder="사용 휴무(일)"
                            value={leaveForm.monthlyOffUsed}
                            onChange={(e) =>
                              setLeaveForm({ ...leaveForm, monthlyOffUsed: e.target.value })
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                        >
                          연차 및 휴무 장부 저장하기
                        </button>
                      </form>
                    )}

                    <div className="max-h-52 overflow-y-auto border-t border-slate-200 pt-2">
                      <table className="w-full border-collapse text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-white text-slate-600">
                            <th className="px-2 py-1.5">성명(부서)</th>
                            <th className="px-2 py-1.5 text-right">연차(발생/사용/남음)</th>
                            <th className="px-2 py-1.5 text-right">휴무(발생/사용/남음)</th>
                            <th className="px-2 py-1.5">문서번호</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {leaveLedgers.map((l) => (
                            <tr key={l.leaveLedgerId}>
                              <td className="px-2 py-1.5 font-semibold text-slate-800">
                                {l.empName} ({l.deptName})
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {formatNumber(l.annualLeaveGranted)} / {formatNumber(l.annualLeaveUsed)}{' '}
                                /{' '}
                                <strong className="text-emerald-700">
                                  {formatNumber(l.annualLeaveRemaining)}일
                                </strong>
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {formatNumber(l.monthlyOffGranted)} / {formatNumber(l.monthlyOffUsed)} /{' '}
                                <strong className="text-amber-700">
                                  {formatNumber(l.monthlyOffRemaining)}일
                                </strong>
                              </td>
                              <td className="px-2 py-1.5 font-mono text-slate-600">
                                {l.approvalDocNo ?? '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 3. 주간업무보고서 작성 및 각 부서 팀장/파트장 휴무일 취합 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="mb-3 text-xs font-bold text-slate-900">
                    부서 주간업무보고서 및 팀장·파트장 주간 휴무일정 취합 등록
                  </h4>
                  {showIndividualAddForm && (
                    <form onSubmit={handleAddWeeklyReport} className="mb-4 space-y-2.5 text-xs">
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="date"
                          value={weeklyReportForm.reportDate}
                          onChange={(e) =>
                            setWeeklyReportForm({ ...weeklyReportForm, reportDate: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          placeholder="주차명 (예: 10월 3주차)"
                          value={weeklyReportForm.reportWeekLabel}
                          onChange={(e) =>
                            setWeeklyReportForm({ ...weeklyReportForm, reportWeekLabel: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <select
                          value={weeklyReportForm.deptId}
                          onChange={(e) =>
                            setWeeklyReportForm({
                              ...weeklyReportForm,
                              deptId: Number(e.target.value),
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        >
                          <option value={0}>보고 부서 선택</option>
                          {departments.map((d) => (
                            <option key={d.deptId} value={d.deptId}>
                              [{d.entityCode}] {d.deptName}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="작성자 성명"
                          value={weeklyReportForm.authorName}
                          onChange={(e) =>
                            setWeeklyReportForm({ ...weeklyReportForm, authorName: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="이번 주 주요 업무 실적"
                          value={weeklyReportForm.thisWeekAchievements}
                          onChange={(e) =>
                            setWeeklyReportForm({
                              ...weeklyReportForm,
                              thisWeekAchievements: e.target.value,
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          placeholder="다음 주 주요 업무 계획"
                          value={weeklyReportForm.nextWeekPlans}
                          onChange={(e) =>
                            setWeeklyReportForm({ ...weeklyReportForm, nextWeekPlans: e.target.value })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                        <input
                          placeholder="팀장·파트장 이번 주 휴무 일정"
                          value={weeklyReportForm.managerOffDaysSchedule}
                          onChange={(e) =>
                            setWeeklyReportForm({
                              ...weeklyReportForm,
                              managerOffDaysSchedule: e.target.value,
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-500"
                      >
                        주간업무보고서 및 팀장 휴무일정 저장하기
                      </button>
                    </form>
                  )}

                  <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
                    {weeklyDeptReports.map((wr) => (
                      <div
                        key={wr.reportId}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>
                            [{wr.reportWeekLabel}] [{wr.entityCode}] {wr.deptName} (작성:{' '}
                            {wr.authorName}, 기준일: {wr.reportDate})
                          </span>
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                            팀장/파트장 휴무: {wr.managerOffDaysSchedule}
                          </span>
                        </div>
                        <div className="mt-1 grid grid-cols-1 gap-2 text-[11px] text-slate-700 md:grid-cols-2">
                          <div>
                            <strong className="text-slate-900">금주 실적:</strong>{' '}
                            {wr.thisWeekAchievements}
                          </div>
                          <div>
                            <strong className="text-slate-900">차주 계획:</strong> {wr.nextWeekPlans}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 8] 증명서 발급 · 연말정산 · 5대 법정교육 · 산재 기한 · 전산팀 요청
           ============================================================ */}
        {activeTab === 'PHASE4_CERT_TRAINING_IT' && (
          <div className="space-y-4">
            {/* 상단 엑셀 팩 다운로드 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  증명서 발급 · 건강검진 · 연말정산 · 5대 법정교육 · 산재 기한 · 전산요청
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  재직·완납증명서 발급, 5대 법정의무교육 수료, 산재 발생 30일 노동부 제출 기한 및 전산팀 요청을 관리합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleExportPhase4Excel('certs-withholding-welfare-pack')}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  증명서·완납·연말정산 엑셀
                </button>
                <button
                  onClick={() => handleExportPhase4Excel('mandatory-training-accident-it-pack')}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-700"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  법정교육·산재·전산요청 엑셀
                </button>
              </div>
            </div>

            {/* 핵심 지표 카드 4종 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  증명서 · 완납증명 · 건강검진 · 연말정산
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700">
                  누적 {formatNumber(phase4Summary?.certAndWelfareCount)}건 처리됨
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  세일즈본부 세미나 완납증명 · 재직/경력 · 원천징수영수증
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  5대 법정의무교육 전 과목 수료 현황
                </div>
                <div className="mt-1 text-lg font-extrabold text-blue-700">
                  수료완료 {formatNumber(phase4Summary?.trainingAllCompletedCount)}명 / 미수료{' '}
                  {formatNumber(phase4Summary?.trainingPendingCount)}명
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  성희롱·괴롭힘·개인정보·퇴직연금·산업안전 (11~12월)
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  산업재해 조사표 30일 제출기한 관리
                </div>
                <div className="mt-1 text-lg font-extrabold text-rose-700">
                  관리 건수 {formatNumber(phase4Summary?.accidentReportCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  사고 발생일 기준 30일 이내 고용노동부 제출 마감일 계산
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  전산팀(IT센터) 협조 요청 건수
                </div>
                <div className="mt-1 text-lg font-extrabold text-amber-700">
                  누적 {formatNumber(phase4Summary?.itTicketCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  그룹웨어 결재선 오류 · 부서 조직도 · 인사정보 수정 요청
                </div>
              </div>
            </div>

            {/* 좌우 2열: 증명서/복리후생/연말정산 & 5대 법정의무교육 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 1. 제증명·완납증명·원천징수영수증·건강검진·휴가지원·연말정산 */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  증명서 발급(세금 완납증명 · 재직/경력 · 원천징수영수증) · 건강검진 · 연말정산 기록
                </h3>
                <form onSubmit={handleAddCertAndWelfare} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={certForm.requestDate}
                      onChange={(e) => setCertForm({ ...certForm, requestDate: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <select
                      value={certForm.category}
                      onChange={(e) =>
                        setCertForm({
                          ...certForm,
                          category: e.target.value as SupportAndCertCategory,
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5 font-semibold"
                    >
                      <option value="TAX_CLEARANCE_CERT">
                        세금·4대보험 완납증명서 (세일즈본부 세미나용)
                      </option>
                      <option value="EMPLOYMENT_CAREER_CERT">
                        재직 · 경력 · 퇴직증명서 발급
                      </option>
                      <option value="WITHHOLDING_RECEIPT">
                        근로소득 원천징수영수증 · 원천징수부 발급
                      </option>
                      <option value="HEALTH_CHECKUP_EDI">
                        직장 건강검진 대상자 등록/변경
                      </option>
                      <option value="VACATION_SUPPORT">
                        근로자 휴가지원사업 신청/적립
                      </option>
                      <option value="YEAR_END_TAX_DOC">
                        연말정산 서류 접수 및 정산 반영
                      </option>
                    </select>
                    <select
                      value={certForm.entityCode}
                      onChange={(e) =>
                        setCertForm({ ...certForm, entityCode: e.target.value as EntityCode })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="BLACKSTONE">블랙스톤벨포레</option>
                      <option value="KMG">케이엠지(KMG)</option>
                      <option value="RAKSANSU">락산수</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={certForm.empId}
                      onChange={(e) =>
                        setCertForm({ ...certForm, empId: Number(e.target.value) })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value={0}>대상 직원 선택 (회사 완납증명은 생략 가능)</option>
                      {employees.map((emp) => (
                        <option key={emp.empId} value={emp.empId}>
                          [{emp.entityCode}] {emp.empName} ({emp.deptName})
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="문서번호 / 접수번호"
                      value={certForm.approvalDocNo}
                      onChange={(e) => setCertForm({ ...certForm, approvalDocNo: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      placeholder="정산금액/지원금(원, 해당시)"
                      value={certForm.settlementAmount}
                      onChange={(e) =>
                        setCertForm({ ...certForm, settlementAmount: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <input
                    placeholder="발급 용도 및 메모 (예: 세일즈본부 기업세미나 입찰용 완납증명서)"
                    value={certForm.purposeOrDetail}
                    onChange={(e) => setCertForm({ ...certForm, purposeOrDetail: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                  >
                    증명서 · 건강검진 · 연말정산 처리내역 저장하기
                  </button>
                </form>

                <div className="max-h-56 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {certsAndWelfareList.map((cw) => (
                    <div
                      key={cw.recordId}
                      className="mb-1.5 rounded border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>
                          [{cw.categoryLabel}] {cw.entityName} — {cw.empNameOrRequester} (
                          {cw.deptName})
                        </span>
                        <span className="font-mono text-emerald-700">{cw.approvalDocNo}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-slate-600">
                        <span>
                          {cw.requestDate} | {cw.purposeOrDetail}
                        </span>
                        {cw.settlementAmount !== 0 && (
                          <strong className="text-blue-700">
                            {formatNumber(cw.settlementAmount)}원
                          </strong>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. 5대 법정의무교육 이수 관리 */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      전 직원 5대 법정의무교육 수료 체크표 (버튼 하나로 5과목 완료 처리)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      1.성희롱예방 · 2.직장내괴롭힘 · 3.개인정보보호 · 4.퇴직연금 · 5.산업안전보건
                    </p>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto border-t border-slate-100 pt-2">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="px-2 py-1.5">직원명(부서)</th>
                        <th className="px-2 py-1.5 text-center">성희롱</th>
                        <th className="px-2 py-1.5 text-center">괴롭힘</th>
                        <th className="px-2 py-1.5 text-center">개인정보</th>
                        <th className="px-2 py-1.5 text-center">퇴직연금</th>
                        <th className="px-2 py-1.5 text-center">산업안전</th>
                        <th className="px-2 py-1.5 text-right">수료 처리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mandatoryTrainings.map((mt) => (
                        <tr key={mt.trainingId}>
                          <td className="px-2 py-1.5 font-semibold text-slate-800">
                            [{mt.entityCode}] {mt.empName} ({mt.deptName})
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.sexualHarassmentDone ? '✓' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.workplaceBullyingDone ? '✓' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.personalInfoDone ? '✓' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.retirementPensionDone ? '✓' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.industrialSafetyDone ? '✓' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {mt.isAllCompleted ? (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                                5대 교육 완료
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCompleteTraining(mt.empId, mt.empName)}
                                className="rounded bg-blue-600 px-2 py-0.5 font-semibold text-white hover:bg-blue-600"
                              >
                                전 과목 완료처리
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 하단 좌우 2열: 산업재해조사표(사고 후 30일 기한) & 전산팀 요청 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 3. 산업재해조사표 작성 및 30일 이내 제출기한 */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  산업재해(산재) 발생 기록 및 노동부 30일 이내 제출 마감일 자동 계산
                </h3>
                <form onSubmit={handleAddAccidentReport} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={accidentForm.accidentDate}
                      onChange={(e) =>
                        setAccidentForm({ ...accidentForm, accidentDate: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <select
                      value={accidentForm.empId}
                      onChange={(e) =>
                        setAccidentForm({ ...accidentForm, empId: Number(e.target.value) })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    >
                      <option value={0}>사고 당한 직원 선택</option>
                      {employees.map((emp) => (
                        <option key={emp.empId} value={emp.empId}>
                          [{emp.entityCode}] {emp.empName} ({emp.deptName})
                        </option>
                      ))}
                    </select>
                    <select
                      value={accidentForm.filingStatus}
                      onChange={(e) =>
                        setAccidentForm({
                          ...accidentForm,
                          filingStatus: e.target.value as 'REPORT_APPROVED' | 'SUBMITTED_TO_MOL',
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="REPORT_APPROVED">사내 사고보고서 확인</option>
                      <option value="SUBMITTED_TO_MOL">노동부 산재조사표 제출완료</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="사내 사고보고서 문서번호"
                      value={accidentForm.internalApprovalDocNo}
                      onChange={(e) =>
                        setAccidentForm({
                          ...accidentForm,
                          internalApprovalDocNo: e.target.value,
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      placeholder="사고 발생 내용 요약"
                      value={accidentForm.accidentSummary}
                      onChange={(e) =>
                        setAccidentForm({ ...accidentForm, accidentSummary: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-rose-600 py-1.5 font-bold text-white hover:bg-rose-500"
                  >
                    산재 내역 저장 및 30일 제출 마감일 계산하기
                  </button>
                </form>

                <div className="max-h-44 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {accidentReports.map((ar) => (
                    <div
                      key={ar.accidentId}
                      className="mb-1.5 rounded border border-rose-200 bg-rose-50/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>
                          [{ar.entityName}] {ar.empName} ({ar.deptName}) — 사고일: {ar.accidentDate}
                        </span>
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">
                          30일 제출 마감: {ar.filingDeadlineDate}
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-700">
                        문서번호: {ar.internalApprovalDocNo} | {ar.accidentSummary} (
                        {ar.filingStatus === 'SUBMITTED_TO_MOL'
                          ? '노동부 제출완료'
                          : '사고보고서 확인'})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. 전산팀(IT센터) 협조 요청 기록 */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Wrench className="h-3.5 w-3.5 text-amber-600" />
                  전산팀(IT센터) 협조 요청 기록장 (그룹웨어 결재 오류 · 조직도 · 직원정보 수정)
                </h3>
                <form onSubmit={handleAddItTicket} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="date"
                      value={itTicketForm.requestDate}
                      onChange={(e) =>
                        setItTicketForm({ ...itTicketForm, requestDate: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <select
                      value={itTicketForm.entityCode}
                      onChange={(e) =>
                        setItTicketForm({
                          ...itTicketForm,
                          entityCode: e.target.value as EntityCode,
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="BLACKSTONE">블랙스톤벨포레</option>
                      <option value="KMG">케이엠지(KMG)</option>
                      <option value="RAKSANSU">락산수</option>
                    </select>
                    <input
                      placeholder="요청 부서명"
                      value={itTicketForm.deptName}
                      onChange={(e) =>
                        setItTicketForm({ ...itTicketForm, deptName: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      placeholder="요청자 이름"
                      value={itTicketForm.requesterName}
                      onChange={(e) =>
                        setItTicketForm({ ...itTicketForm, requesterName: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={itTicketForm.issueType}
                      onChange={(e) =>
                        setItTicketForm({
                          ...itTicketForm,
                          issueType: e.target.value as
                            | 'GROUPWARE_ERROR'
                            | 'ORG_CHART_SYNC'
                            | 'EMP_INFO_CORRECTION'
                            | 'SYSTEM_AUTH',
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="GROUPWARE_ERROR">그룹웨어 오류/결재선 문제</option>
                      <option value="ORG_CHART_SYNC">조직도 부서·직책 변경</option>
                      <option value="EMP_INFO_CORRECTION">직원 인사정보 수정 요청</option>
                      <option value="SYSTEM_AUTH">더존/그룹웨어 권한 설정</option>
                    </select>
                    <input
                      placeholder="전산팀 요청 상세 내용"
                      value={itTicketForm.issueDescription}
                      onChange={(e) =>
                        setItTicketForm({ ...itTicketForm, issueDescription: e.target.value })
                      }
                      className="col-span-2 rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-600"
                  >
                    전산팀 협조 요청 내역 저장하기
                  </button>
                </form>

                <div className="max-h-44 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {itCenterTickets.map((tk) => (
                    <div
                      key={tk.ticketId}
                      className="mb-1.5 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          [{tk.requestDate}] [{tk.entityCode}] {tk.deptName} ({tk.requesterName}) —{' '}
                          <span className="text-amber-800">{tk.issueType}</span>
                        </div>
                        <div className="text-slate-600">{tk.issueDescription}</div>
                      </div>
                      <div>
                        {tk.resolutionStatus === 'RESOLVED' ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            해결완료
                          </span>
                        ) : (
                          <button
                            onClick={() => handleResolveItTicket(tk.ticketId)}
                            className="rounded bg-blue-600 px-2 py-1 font-semibold text-white hover:bg-slate-700"
                          >
                            해결완료 체크
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 9] 엑셀 파일 한 번에 올리기 & 이달의 마감 일정 알림판
           ============================================================ */}
        {activeTab === 'PHASE5_BULK_AND_DDAY' && (
          <div className="space-y-4">
            {/* 상단 컨트롤타워 헤더 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <BellRing className="h-4 w-4 text-blue-600" />
                  엑셀 일괄 업로드 (미등록 성명 자동 격리) & 법정·정기 마감 알림판
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  직원 명부·일용직·캐디·구내식당 식수 엑셀 일괄 업로드 및 매월 정기 마감 기한을 점검합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleDownloadBulkTemplate('EMPLOYEES_BULK')}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  직원명부 양식
                </button>
                <button
                  onClick={() => handleDownloadBulkTemplate('DAILY_LOGS_BULK')}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  일용직 출근 양식
                </button>
                <button
                  onClick={() => handleDownloadBulkTemplate('CADDY_BULK')}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  캐디 라운딩 양식
                </button>
                <button
                  onClick={() => handleDownloadBulkTemplate('MEAL_LOGS_BULK')}
                  className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-600"
                >
                  <Download className="h-3.5 w-3.5" />
                  구내식당 식수 양식
                </button>
              </div>
            </div>

            {/* 핵심 요약 카드 4종 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  오늘 바로 처리해야 할 긴급 마감 업무
                </div>
                <div className="mt-1 text-lg font-extrabold text-rose-600">
                  긴급 {formatNumber(phase5Summary?.urgentAlertCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  기준일: {phase5Summary?.referenceDate ?? '-'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  다가오는 이달의 정기 마감 업무
                </div>
                <div className="mt-1 text-lg font-extrabold text-amber-600">
                  예정 {formatNumber(phase5Summary?.upcomingAlertCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  월초·8일·10일·15일·말일·수요일·14일·30일 주기
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  이번 달 처리 완료된 마감 업무
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700">
                  완료 {formatNumber(phase5Summary?.completedAlertCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  모든 금액 및 신고 준비 확인됨
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  엑셀 업로드 누적 등록 / 미등록 이름 분리
                </div>
                <div className="mt-1 text-lg font-extrabold text-blue-700">
                  등록 {formatNumber(phase5Summary?.totalBulkImportedRows)}건 / 확인필요{' '}
                  {formatNumber(phase5Summary?.totalBulkIsolatedHitlRows)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  업로드 횟수 총 {formatNumber(phase5Summary?.totalBulkImportCount)}회
                </div>
              </div>
            </div>

            {/* 파트 1: 법정·정기 마감기한(D-Day) 알림판 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    이달의 인사·급여·세금 마감 일정 알림판 (버튼을 누르면 해당 작업 화면으로 바로 이동합니다)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    각 일정 카드의 [바로 가기 ] 버튼을 누르면 즉시 해당 업무 화면으로 이동하여 신고서·결재서류를 만들 수 있습니다.
                  </p>
                </div>
                <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  점검 기준일: {phase5Summary?.referenceDate ?? '-'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {(phase5Summary?.deadlineAlerts ?? []).map((alert) => {
                  const isUrgent = alert.urgency === 'URGENT_D_DAY';
                  const isDone = alert.urgency === 'COMPLETED_OK';
                  return (
                    <div
                      key={alert.alertCode}
                      className={`flex flex-col justify-between rounded-xl border p-4 ${
                        isUrgent
                          ? 'border-rose-300 bg-rose-50/60'
                          : isDone
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-800">
                            {alert.cycleLabel}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                              isUrgent
                                ? 'bg-rose-600 text-white'
                                : isDone
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {isDone
                              ? '처리완료'
                              : isUrgent
                              ? '긴급 확인 필요'
                              : '예정 일정'}
                          </span>
                        </div>
                        <h4 className="mt-2 text-xs font-bold text-slate-900">{alert.title}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                          {alert.description}
                        </p>
                      </div>

                      <div className="mt-3 border-t border-slate-200/70 pt-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">
                            기한: {alert.dueDateLabel}
                          </span>
                          <button
                            onClick={() =>
                              navigateToWorkspace(
                                alert.targetTab as ActiveTab,
                                `[${alert.title}] 업무 처리 화면으로 이동했습니다!`
                              )
                            }
                            className="rounded bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-700"
                          >
                            바로 가기 </button>
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-900">
                          현황: {alert.currentCountOrStatus}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 파트 2: 기존 엑셀 파일 일괄 업로드 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Upload className="h-4 w-4 text-blue-700" />
                    엑셀 파일(.xlsx / .xls / .csv) 한 번에 올리기
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    엑셀을 올릴 때 등록되지 않은 부서명이나 직원 이름 오타가 있으면 멋대로 추측하지 않고 <strong>[미등록 이름 확인 및 연결]</strong> 화면으로 안전하게 분리해 줍니다.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="font-bold text-slate-800">
                        ① 먼저 어떤 엑셀 자료를 올리실지 선택하세요:
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDownloadBulkTemplate(selectedBulkType)}
                        className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-600"
                      >
                        <Download className="h-3 w-3" />
                        ② 선택한 종류의 빈 엑셀양식 내려받기
                      </button>
                    </div>
                    <select
                      value={selectedBulkType}
                      onChange={(e) => {
                        const val = e.target.value as BulkImportTargetType;
                        setSelectedBulkType(val);
                        triggerSuccessToast(
                          '업로드할 엑셀 종류가 변경되었습니다. 오른쪽 위 버튼으로 빈 양식을 내려받거나 파일을 선택하세요.'
                        );
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900"
                    >
                      <option value="EMPLOYEES_BULK">
                        [1] 전 직원 명부 한 번에 올리기 (정규·계약·일용·실습·캐디 직원 등록)
                      </option>
                      <option value="DAILY_LOGS_BULK">
                        [2] 부서별 일용직 출근기록 엑셀 한 번에 올리기
                      </option>
                      <option value="CADDY_BULK">
                        [3] 골프장 캐디 월간 라운딩·입퇴사 엑셀 한 번에 올리기
                      </option>
                      <option value="MEAL_LOGS_BULK">
                        [4] 구내식당(삼성웰스토리) 일일 식사 인원 엑셀 한 번에 올리기
                      </option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-blue-700" />
                    <div className="mt-2 font-bold text-slate-900">
                      {uploadingExcel
                        ? '엑셀 데이터를 읽어서 자동 저장하고 있습니다...'
                        : '③ 작성한 엑셀 파일(.xlsx, .xls, .csv)을 아래 버튼으로 선택해 올리세요'}
                    </div>
                    <p className="mt-1 text-[11px] text-blue-700">
                      위의 [② 빈 엑셀양식 내려받기] 버튼으로 받은 파일에 내용을 복사·붙여넣기 한 뒤 올리시면 가장 정확합니다.
                    </p>
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-600">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{uploadingExcel ? '⏳ 업로드 처리 중...' : '엑셀 파일 선택 및 즉시 올리기'}</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleBulkExcelFileChange}
                        disabled={uploadingExcel}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 엑셀 일괄 업로드 기록장 */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    엑셀 업로드 처리 기록 (정상 등록 건수 및 미등록 분리 건수 확인)
                  </h3>
                  <button
                    onClick={() =>
                      navigateToWorkspace(
                        'HITL_MAPPING',
                        '[미등록 이름 확인 및 1:1 연결] 화면으로 이동했습니다!'
                      )
                    }
                    className="rounded bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-slate-900 hover:bg-amber-200"
                  >
                    미등록 이름 연결 화면 이동 ({formatNumber(pendingMappingCount)}건) </button>
                </div>

                <div className="max-h-72 overflow-y-auto border-t border-slate-100 pt-2">
                  {bulkImportHistory.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      아직 이번 달에 올린 엑셀 파일 기록이 없습니다. 왼쪽에서 양식을 내려받아 올려보세요.
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="px-2 py-1.5">업로드 종류 / 파일명</th>
                          <th className="px-2 py-1.5 text-right">전체 건수</th>
                          <th className="px-2 py-1.5 text-right text-emerald-700">정상 등록</th>
                          <th className="px-2 py-1.5 text-right text-rose-700">미등록 확인필요</th>
                          <th className="px-2 py-1.5">업로드 시간</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkImportHistory.map((item) => (
                          <tr key={item.importId}>
                            <td className="px-2 py-2">
                              <div className="font-bold text-slate-900">
                                {item.importTypeLabel}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500">
                                {item.fileName}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right font-semibold">
                              {formatNumber(item.totalRows)}건
                            </td>
                            <td className="px-2 py-2 text-right font-bold text-emerald-700">
                              {formatNumber(item.importedRows)}건
                            </td>
                            <td className="px-2 py-2 text-right font-bold text-rose-700">
                              {formatNumber(item.isolatedHitlRows)}건
                            </td>
                            <td className="px-2 py-2 text-[10px] text-slate-500">
                              {item.importedAt.slice(0, 19).replace('T', ' ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 10] 임직원 마스터 & 입퇴사·기숙사·수습3개월 트래커
           ============================================================ */}
        {activeTab === 'EMPLOYEES' && (
          <div className="space-y-5">
            {departments.length === 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-2xs">
                <div className="font-semibold text-slate-700">
                  <span className="mr-2 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    선행 설정 안내
                  </span>
                  직원을 등록하려면 먼저 소속 부서(예: 인사팀, 코스관리팀, 경기과)가 최소 {formatNumber(1)}개 이상 등록되어 있어야 합니다.
                </div>
                <button
                  onClick={() => navigateToWorkspace('CONFIG')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  부서 코드 설정으로 이동 </button>
              </div>
            )}

            {/* 전사 공통 기본값 빠른 일괄 적용 툴바 (단일 1줄 화이트 바) */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
              <div className="text-xs text-slate-600">
                <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  공통 기준값
                </span>
                비과세 식대 <strong className="text-slate-900">{formatNumber(globalDefaults.defaultMealAllowanceTaxFree)}원</strong> · 차량유지비 <strong className="text-slate-900">{formatNumber(globalDefaults.defaultCarAllowanceTaxFree)}원</strong> · 팀장수당 <strong className="text-slate-900">{formatNumber(globalDefaults.defaultTeamLeaderAllowance)}원</strong> · 기본은행 <strong className="text-slate-900">{globalDefaults.defaultBankName}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyGlobalDefaultsToEmployees('EMPTY_ONLY')}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  미입력({formatNumber(0)}원) 직원 채우기
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyGlobalDefaultsToEmployees('FORCE_ALL')}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  전 직원 기본값 일괄 적용
                </button>
                <button
                  type="button"
                  onClick={() => setShowGlobalDefaultsModal((prev) => !prev)}
                  className="rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  기준 금액 변경 {showGlobalDefaultsModal ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {/* 신규 직원 1명 수기 등록 / 상세정보 수정 (접이식) */}
            <div
              id="emp-form-anchor"
              data-individual-form-anchor="true"
              className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <PlusCircle className="h-4 w-4 text-blue-600" />
                    신규 직원 등록 및 상세 정보 수정
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    급여·식대·차량비·기숙사 호실 수정은 아래 <strong>[전 직원 명단]</strong> 표에서 바로 수정 후 <strong>[저장]</strong>을 누르면 즉시 반영됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualAddForm((prev) => !prev)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                    showIndividualAddForm
                      ? 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {showIndividualAddForm
                    ? '상세 입력창 접기 ▲'
                    : '신규 직원 등록 / 상세 입력창 열기 ▼'}
                </button>
              </div>

              {showIndividualAddForm && (
                <form
                  onSubmit={handleSaveEmployee}
                  className="mt-4 border-t border-slate-200 pt-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      신규 직원 정보를 입력하거나 기존 직원의 상세 항목을 수정한 후 하단 [직원 정보 저장]을 누르세요.
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEmpForm((prev) => ({
                            ...prev,
                            deptId: prev.deptId || (departments[0]?.deptId ?? 0),
                            mealAllowanceTaxFree: String(globalDefaults.defaultMealAllowanceTaxFree),
                            carAllowanceTaxFree: prev.carNumber.trim()
                              ? String(globalDefaults.defaultCarAllowanceTaxFree)
                              : '0',
                            teamLeaderAllowance: prev.isTeamLeader
                              ? String(globalDefaults.defaultTeamLeaderAllowance)
                              : prev.teamLeaderAllowance,
                            dailyOrHourlyWage:
                              prev.employmentType === 'DAILY'
                                ? String(globalDefaults.defaultDailyGrossWage)
                                : prev.dailyOrHourlyWage,
                            bankName: globalDefaults.defaultBankName,
                          }));
                          triggerSuccessToast(
                            '입력창에 전사 공통 기본값(식대·차량·은행·일당)을 채웠습니다.'
                          );
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        공통 기본값 채우기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmpForm({
                            empNo: '',
                            empName: '',
                            employmentType: 'REGULAR',
                            entityCode: 'BLACKSTONE',
                            deptId: departments[0]?.deptId ?? 0,
                            positionTitle: '',
                            hireDate: '',
                            resignDate: '',
                            baseMonthlyPay: '',
                            mealAllowanceTaxFree: String(globalDefaults.defaultMealAllowanceTaxFree),
                            carAllowanceTaxFree: '0',
                            dailyOrHourlyWage: '',
                            isTeamLeader: 0,
                            teamLeaderAllowance: '',
                            konaCardNo: '',
                            bankName: globalDefaults.defaultBankName,
                            accountNo: '',
                            accountHolder: '',
                            dormitoryRoom: '',
                            carNumber: '',
                            disabilityGrade: 'NONE',
                          });
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        입력창 초기화
                      </button>
                    </div>
                  </div>

                  {/* 계약 월급 총액에서 비과세 자동 분리 계산기 바 */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                    <div className="font-semibold text-slate-700">
                      <strong>[비과세 자동 분리]</strong> 계약 월급 총액을 입력하면 비과세 식대({formatNumber(globalDefaults.defaultMealAllowanceTaxFree)}원)·차량유지비({formatNumber(globalDefaults.defaultCarAllowanceTaxFree)}원, 차량번호 등록 시)를 제외한 금액으로 기본급을 자동 산출합니다.
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        placeholder="계약 월급 총액 (예: 3000000)"
                        value={empTotalSalaryInput}
                        onChange={(e) => setEmpTotalSalaryInput(e.target.value)}
                        className="w-44 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const total = Number(empTotalSalaryInput || empForm.baseMonthlyPay || 0);
                          const meal = globalDefaults.defaultMealAllowanceTaxFree;
                          const hasCar = empForm.carNumber.trim() !== '';
                          const car = hasCar ? globalDefaults.defaultCarAllowanceTaxFree : 0;
                          if (total <= meal + car) {
                            triggerErrorToast(
                              '계약 월급 총액이 비과세 합계보다 커야 자동 분리할 수 있습니다.'
                            );
                            return;
                          }
                          const newBase = total - meal - car;
                          setEmpForm((prev) => ({
                            ...prev,
                            baseMonthlyPay: String(newBase),
                            mealAllowanceTaxFree: String(meal),
                            carAllowanceTaxFree: String(car),
                          }));
                          triggerSuccessToast(
                            `총 월급 ${formatNumber(total)}원을 [기본급 ${formatNumber(newBase)}원 + 식대 ${formatNumber(meal)}원 + 차량 ${formatNumber(car)}원]으로 분리했습니다.`
                          );
                        }}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        비과세 자동 분리 적용
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* 섹션 1: 인사 · 소속 · 입퇴사 기본정보 */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                      <div className="mb-2.5 flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          1. 인사 · 소속 · 입퇴사 기본정보
                        </span>
                        <span className="text-[11px] text-slate-500">
                          필수(*) 항목 입력 후 소속 법인·부서를 지정하세요
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ① 사번 (고유번호) *
                          </label>
                          <input
                            placeholder="예: BF-2026-001"
                            value={empForm.empNo}
                            onChange={(e) => setEmpForm({ ...empForm, empNo: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ② 성명 (이름) *
                          </label>
                          <input
                            placeholder="예: 홍길동"
                            value={empForm.empName}
                            onChange={(e) => setEmpForm({ ...empForm, empName: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ③ 고용형태 구분 *
                          </label>
                          <select
                            value={empForm.employmentType}
                            onChange={(e) =>
                              setEmpForm({ ...empForm, employmentType: e.target.value as EmploymentType })
                            }
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          >
                            <option value="REGULAR">정규직</option>
                            <option value="CONTRACT">계약직</option>
                            <option value="DAILY">일용직 (일당제)</option>
                            <option value="INTERN">현장실습생 (실습수당)</option>
                            <option value="CADDY">경기과 캐디 (특고직)</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ④ 소속 법인 *
                          </label>
                          <select
                            value={empForm.entityCode}
                            onChange={(e) => {
                              const nextEntity = e.target.value as EntityCode;
                              const matchingDepts = departments.filter((d) => d.entityCode === nextEntity);
                              const currentDeptMatches = matchingDepts.some((d) => d.deptId === empForm.deptId);
                              setEmpForm({
                                ...empForm,
                                entityCode: nextEntity,
                                deptId: currentDeptMatches ? empForm.deptId : (matchingDepts[0]?.deptId ?? empForm.deptId),
                              });
                            }}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          >
                            <option value="BLACKSTONE">블랙스톤벨포레</option>
                            <option value="KMG">케이엠지(KMG)</option>
                            <option value="RAKSANSU">락산수</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑤ 소속 부서 *
                          </label>
                          <select
                            value={empForm.deptId}
                            onChange={(e) => {
                              const nextDeptId = Number(e.target.value);
                              const selDept = departments.find((d) => d.deptId === nextDeptId);
                              setEmpForm({
                                ...empForm,
                                deptId: nextDeptId,
                                entityCode: selDept ? selDept.entityCode : empForm.entityCode,
                              });
                            }}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            required
                          >
                            <option value={0}>부서를 선택하세요</option>
                            {departments
                              .filter((d) => d.entityCode === empForm.entityCode)
                              .map((d) => (
                                <option key={d.deptId} value={d.deptId}>
                                  [{d.entityCode}] {d.deptName} ({d.costCenterCode})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑥ 직위 / 직책
                          </label>
                          <input
                            placeholder="예: 팀장, 매니저, 사원"
                            value={empForm.positionTitle}
                            onChange={(e) => setEmpForm({ ...empForm, positionTitle: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-emerald-800">
                            ⑦ 입사일 (출근 시작일) *
                          </label>
                          <input
                            type="date"
                            title="입사일"
                            value={empForm.hireDate}
                            onChange={(e) => setEmpForm({ ...empForm, hireDate: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-rose-700">
                            ⑧ 퇴사일 (재직자는 비움)
                          </label>
                          <input
                            type="date"
                            title="퇴사일 (재직자는 비움)"
                            value={empForm.resignDate}
                            onChange={(e) => setEmpForm({ ...empForm, resignDate: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 섹션 2: 급여 · 비과세 · 일당 · 팀장 보직수당 */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                      <div className="mb-2.5 flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          2. 급여 · 비과세 한도 · 팀장 코나카드 보직수당
                        </span>
                        <span className="text-[11px] text-slate-500">
                          세전 기본급과 비과세 식대·차량유지비 및 팀장 복지카드를 설정합니다
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑨ 월 기본급 (일용직/캐디는 0)
                          </label>
                          <input
                            type="number"
                            placeholder="세전 월 기본급 숫자만 입력"
                            value={empForm.baseMonthlyPay}
                            onChange={(e) => setEmpForm({ ...empForm, baseMonthlyPay: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑩ 비과세 식대 (월)
                          </label>
                          <input
                            type="number"
                            placeholder="없으면 비워두세요"
                            value={empForm.mealAllowanceTaxFree}
                            onChange={(e) => setEmpForm({ ...empForm, mealAllowanceTaxFree: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑪ 비과세 차량유지비 (월)
                          </label>
                          <input
                            type="number"
                            placeholder="없으면 비워두세요"
                            value={empForm.carAllowanceTaxFree}
                            onChange={(e) => setEmpForm({ ...empForm, carAllowanceTaxFree: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑫ 팀장 보직수당 대상 여부
                          </label>
                          <select
                            value={empForm.isTeamLeader}
                            onChange={(e) => {
                              const flag = Number(e.target.value);
                              setEmpForm({
                                ...empForm,
                                isTeamLeader: flag,
                                teamLeaderAllowance:
                                  flag === 1 && !Number(empForm.teamLeaderAllowance)
                                    ? String(globalDefaults.defaultTeamLeaderAllowance)
                                    : empForm.teamLeaderAllowance,
                              });
                            }}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          >
                            <option value={0}>일반 팀원 (해당없음)</option>
                            <option value={1}>팀장 보직수당 대상 (코나카드)</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑬ 팀장 보직수당액 (코나카드)
                          </label>
                          <input
                            type="number"
                            placeholder="팀장인 경우 금액 입력"
                            value={empForm.teamLeaderAllowance}
                            onChange={(e) => setEmpForm({ ...empForm, teamLeaderAllowance: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑭ 코나카드 사원증번호
                          </label>
                          <input
                            placeholder="코나카드 번호 입력"
                            value={empForm.konaCardNo}
                            onChange={(e) => setEmpForm({ ...empForm, konaCardNo: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 섹션 3: 급여계좌 · 기숙사 · 차량 · 장애인 구분 */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                      <div className="mb-2.5 flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          3. 급여계좌 · 기숙사 · 출퇴근 차량 · 장애인 구분
                        </span>
                        <span className="text-[11px] text-slate-500">
                          급여 이체 계좌 및 기숙사·차량·장애인 고용부담금 산정 정보
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑮ 급여통장 은행명
                          </label>
                          <input
                            placeholder="예: 하나은행, 국민은행"
                            value={empForm.bankName}
                            onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑯ 급여통장 계좌번호
                          </label>
                          <input
                            placeholder="예: 123-456789-01"
                            value={empForm.accountNo}
                            onChange={(e) => setEmpForm({ ...empForm, accountNo: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑰ 기숙사 호실 (입주자만 입력)
                          </label>
                          <input
                            placeholder="예: 302호 (퇴사 시 지원팀 알림)"
                            value={empForm.dormitoryRoom}
                            onChange={(e) => setEmpForm({ ...empForm, dormitoryRoom: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑱ 출퇴근 차량번호 (주차관제)
                          </label>
                          <input
                            placeholder="예: 12가3456"
                            value={empForm.carNumber}
                            onChange={(e) => setEmpForm({ ...empForm, carNumber: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-700">
                            ⑲ 장애인 고용부담금 산정 구분
                          </label>
                          <select
                            value={empForm.disabilityGrade}
                            onChange={(e) =>
                              setEmpForm({
                                ...empForm,
                                disabilityGrade: e.target.value as 'NONE' | 'MILD' | 'SEVERE',
                              })
                            }
                            className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          >
                            <option value="NONE">해당없음 (비장애)</option>
                            <option value="MILD">경증 장애인 (1배수 인정)</option>
                            <option value="SEVERE">중증 장애인 (2배수 인정)</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                          >
                            직원 정보 저장 / 업데이트
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  이달({targetYm}) 입사 3개월 만료 직원 (수습평가 및 무료숙박권 지급 대상)
                </h3>
                <div className="mt-3 space-y-2 text-xs">
                  {probationTargets.length === 0 ? (
                    <p className="text-slate-400">이달에 수습 3개월이 도래하는 직원이 없습니다.</p>
                  ) : (
                    probationTargets.map((p) => (
                      <div
                        key={p.empId}
                        className="rounded border border-slate-200 bg-slate-50 p-2.5"
                      >
                        <div className="font-bold text-slate-900">
                          [{p.entityName} / {p.deptName}] {p.empName} ({p.empNo}) — 입사: {p.hireDate} → 3개월 만료: {p.probationEndDate}
                        </div>
                        <div className="mt-1 text-emerald-800">{p.step1AccommodationDraft}</div>
                        <div className="text-emerald-800">{p.step2FreeStayDraft}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  이달({targetYm}) 기숙사 퇴실 직원 명단 (15일 · 말일 지원팀 전달용)
                </h3>
                <div className="mt-3 space-y-2 text-xs">
                  {dormitoryResignees.length === 0 ? (
                    <p className="text-slate-400">이달에 퇴사한 기숙사 거주 직원이 없습니다.</p>
                  ) : (
                    dormitoryResignees.map((d) => (
                      <div
                        key={d.empId}
                        className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-2.5"
                      >
                        <div>
                          <span className="font-bold text-slate-900">
                            [{d.entityName} / {d.deptName}] {d.empName}
                          </span>
                          <span className="ml-2 text-slate-600">퇴사일: {d.resignDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="rounded bg-amber-200 px-2 py-0.5 font-bold text-slate-900">
                            호실: {d.dormitoryRoom}
                          </span>
                          <span className="ml-2 text-[11px] text-slate-500">
                            ({d.dispatchPeriod === 'FIRST_HALF_15TH' ? '15일 발송분' : '말일 발송분'})
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    등록된 전 직원 명부 ({formatNumber(employees.length)}명) — 표 안에서 숫자를 직접 고치고 [개별저장]을 누르세요!
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    글로벌 기본값으로 전체를 먼저 채운 뒤, 금액이 다른 직원만 표의 숫자 칸을 고쳐서 바로 저장할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-2.5 py-2">사번/성명</th>
                      <th className="px-2.5 py-2">법인/부서/형태</th>
                      <th className="px-2.5 py-2">입사/퇴사일</th>
                      <th className="px-2.5 py-2 text-right">월기본급(개별수정)</th>
                      <th className="px-2.5 py-2 text-right">비과세 식대</th>
                      <th className="px-2.5 py-2 text-right">비과세 차량</th>
                      <th className="px-2.5 py-2 text-right">팀장수당/일당</th>
                      <th className="px-2.5 py-2">기숙사/차량번호</th>
                      <th className="px-2.5 py-2 text-center">개별 즉시저장 / 작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((e) => {
                      const rowEdit = inlineEmpEdits[e.empId] ?? {
                        baseMonthlyPay: String(e.baseMonthlyPay ?? 0),
                        mealAllowanceTaxFree: String(e.mealAllowanceTaxFree ?? 0),
                        carAllowanceTaxFree: String(e.carAllowanceTaxFree ?? 0),
                        teamLeaderAllowance: String(e.teamLeaderAllowance ?? 0),
                        dailyOrHourlyWage: String(e.dailyOrHourlyWage ?? 0),
                        dormitoryRoom: e.dormitoryRoom ?? '',
                        carNumber: e.carNumber ?? '',
                      };
                      const isDaily = e.employmentType === 'DAILY';
                      return (
                        <tr key={e.empId} className="hover:bg-slate-50">
                          <td className="px-2.5 py-2">
                            <div className="font-bold text-slate-900">{e.empName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{e.empNo}</div>
                          </td>
                          <td className="px-2.5 py-2">
                            <div className="font-semibold text-slate-800">
                              [{e.entityName}] {e.deptName}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {e.employmentType} · {e.positionTitle || '사원'}
                            </div>
                          </td>
                          <td className="px-2.5 py-2 text-[11px]">
                            <div>입사: {e.hireDate}</div>
                            {e.resignDate ? (
                              <div className="font-bold text-rose-600">퇴사: {e.resignDate}</div>
                            ) : (
                              <div className="text-slate-400">수습만료: {e.probationEndDate ?? '-'}</div>
                            )}
                          </td>
                          <td className="px-2.5 py-2 text-right">
                            <input
                              type="number"
                              value={rowEdit.baseMonthlyPay}
                              onChange={(ev) =>
                                setInlineEmpEdits((prev) => ({
                                  ...prev,
                                  [e.empId]: { ...rowEdit, baseMonthlyPay: ev.target.value },
                                }))
                              }
                              className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs font-bold text-slate-900 focus:border-slate-200"
                            />
                          </td>
                          <td className="px-2.5 py-2 text-right">
                            <input
                              type="number"
                              value={rowEdit.mealAllowanceTaxFree}
                              onChange={(ev) =>
                                setInlineEmpEdits((prev) => ({
                                  ...prev,
                                  [e.empId]: {
                                    ...rowEdit,
                                    mealAllowanceTaxFree: ev.target.value,
                                  },
                                }))
                              }
                              className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs text-emerald-800 focus:border-slate-200"
                            />
                          </td>
                          <td className="px-2.5 py-2 text-right">
                            <input
                              type="number"
                              value={rowEdit.carAllowanceTaxFree}
                              onChange={(ev) =>
                                setInlineEmpEdits((prev) => ({
                                  ...prev,
                                  [e.empId]: {
                                    ...rowEdit,
                                    carAllowanceTaxFree: ev.target.value,
                                  },
                                }))
                              }
                              className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs text-emerald-800 focus:border-slate-200"
                            />
                          </td>
                          <td className="px-2.5 py-2 text-right">
                            {isDaily ? (
                              <div>
                                <input
                                  type="number"
                                  value={rowEdit.dailyOrHourlyWage}
                                  onChange={(ev) =>
                                    setInlineEmpEdits((prev) => ({
                                      ...prev,
                                      [e.empId]: {
                                        ...rowEdit,
                                        dailyOrHourlyWage: ev.target.value,
                                      },
                                    }))
                                  }
                                  className="w-20 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-right font-mono text-xs font-bold text-slate-900"
                                />
                                <div className="text-[9px] text-amber-700">일용직 기본일당</div>
                              </div>
                            ) : (
                              <div>
                                <input
                                  type="number"
                                  value={rowEdit.teamLeaderAllowance}
                                  onChange={(ev) =>
                                    setInlineEmpEdits((prev) => ({
                                      ...prev,
                                      [e.empId]: {
                                        ...rowEdit,
                                        teamLeaderAllowance: ev.target.value,
                                      },
                                    }))
                                  }
                                  className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs text-blue-700"
                                />
                                <div className="text-[9px] text-slate-400">
                                  {e.konaCardNo || '코나수당'}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-2.5 py-2">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="호실"
                                value={rowEdit.dormitoryRoom}
                                onChange={(ev) =>
                                  setInlineEmpEdits((prev) => ({
                                    ...prev,
                                    [e.empId]: {
                                      ...rowEdit,
                                      dormitoryRoom: ev.target.value,
                                    },
                                  }))
                                }
                                className="w-14 rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px]"
                              />
                              <input
                                type="text"
                                placeholder="차량번호"
                                value={rowEdit.carNumber}
                                onChange={(ev) =>
                                  setInlineEmpEdits((prev) => ({
                                    ...prev,
                                    [e.empId]: {
                                      ...rowEdit,
                                      carNumber: ev.target.value,
                                    },
                                  }))
                                }
                                className="w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px]"
                              />
                            </div>
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveInlineEmpRow(e)}
                                className="rounded bg-blue-600 px-2 py-1 text-[11px] font-extrabold text-white hover:bg-blue-600"
                              >
                                개별저장
                              </button>
                              {!isDaily && e.employmentType !== 'CADDY' && (
                                <button
                                  type="button"
                                  onClick={() => handleSplitSingleEmpRowTaxFree(e)}
                                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-blue-700 hover:bg-blue-50"
                                  title="이 직원의 총 월급을 유지하면서 비과세 식대·차량비로 자동 분리합니다"
                                >
                                  절세쪼개기
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowIndividualAddForm(true);
                                  setEmpForm({
                                    empNo: e.empNo,
                                    empName: e.empName,
                                    employmentType: e.employmentType,
                                    entityCode: e.entityCode,
                                    deptId: e.deptId,
                                    positionTitle: e.positionTitle,
                                    hireDate: e.hireDate,
                                    resignDate: e.resignDate ?? '',
                                    baseMonthlyPay: String(e.baseMonthlyPay),
                                    mealAllowanceTaxFree: String(e.mealAllowanceTaxFree),
                                    carAllowanceTaxFree: String(e.carAllowanceTaxFree),
                                    dailyOrHourlyWage: String(e.dailyOrHourlyWage),
                                    isTeamLeader: e.isTeamLeader ? 1 : 0,
                                    teamLeaderAllowance: String(e.teamLeaderAllowance),
                                    konaCardNo: e.konaCardNo ?? '',
                                    bankName: e.bankName ?? '',
                                    accountNo: e.accountNo ?? '',
                                    accountHolder: e.accountHolder ?? '',
                                    dormitoryRoom: e.dormitoryRoom ?? '',
                                    carNumber: e.carNumber ?? '',
                                    disabilityGrade: e.disabilityGrade ?? 'NONE',
                                  });
                                  triggerSuccessToast(
                                    `[${e.empName} (${e.empNo})] 상세 입력칸을 열고 전체 정보를 불러왔습니다!`
                                  );
                                  setTimeout(() => {
                                    const formEl = document.getElementById('emp-form-anchor');
                                    if (formEl) {
                                      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                  }, 60);
                                }}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                              >
                                상세수정
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 6] 급여 기초자료(수당/공제/상여) & 일용직 투입일지
           ============================================================ */}
        {activeTab === 'INPUTS' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div
              data-individual-form-anchor="true"
              className="scroll-mt-36 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    직원별 추가 수당 · 상여금 · 공제 금액 관리
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    공통 항목은 <strong>[일괄 반영]</strong> 버튼으로 적용하고, 예외 금액만 아래 표에서 개별 수정하세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualAddForm((prev) => !prev)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-blue-50"
                >
                  {showIndividualAddForm ? '개별 추가 접기 ▲' : '+ 개별 수당·공제 추가 ▼'}
                </button>
              </div>

              {/* 수당/공제 글로벌 원클릭 일괄 반영 바 */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="font-bold text-slate-800">
                  공통 기준값 일괄 반영 (예외자는 하단 표에서 개별 수정):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalBatchAdjustments('DORM_ALL_RESIDENTS')}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-blue-50"
                  >
                    기숙사비 일괄 공제 ({formatNumber(globalDefaults.defaultDormDeductionMonthly)}원)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalBatchAdjustments('POSITION_ALL_LEADERS')}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-blue-50"
                  >
                    팀장 직책수당 일괄 반영 ({formatNumber(globalDefaults.defaultTeamLeaderAllowance)}원)
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    placeholder="공통 상여금액"
                    value={batchBonusAmount}
                    onChange={(e) => setBatchBonusAmount(e.target.value)}
                    className="w-32 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyGlobalBatchAdjustments(
                        'BONUS_ALL_REGULAR',
                        Number(batchBonusAmount)
                      )
                    }
                    className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                  >
                    정규·계약직 상여금 일괄 반영
                  </button>
                </div>
              </div>

              {showIndividualAddForm && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <form onSubmit={handleAddSingleAdjustment} className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] font-bold text-slate-700">
                        ① 개별 추가할 직원 선택 (목록에서 고르거나 아래 칸에 직접 입력) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setAdjForm({ ...adjForm, empNoOrName: e.target.value });
                            }
                          }}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5"
                        >
                          <option value="">등록된 직원에서 빠르게 고르기...</option>
                          {employees.map((e) => (
                            <option key={e.empId} value={e.empNo}>
                              [{e.entityName}/{e.deptName}] {e.empName} ({e.empNo})
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="선택 시 자동입력 (또는 성명/사번 직접입력)"
                          value={adjForm.empNoOrName}
                          onChange={(e) => setAdjForm({ ...adjForm, empNoOrName: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-3 py-1.5"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-700">
                        ② 수당 또는 공제 항목 선택 *
                      </label>
                      <select
                        value={adjForm.categoryText}
                        onChange={(e) => setAdjForm({ ...adjForm, categoryText: e.target.value })}
                        className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                      >
                        <option value="OVERTIME_PAY">[+수당] 연장·야간·휴일근로수당</option>
                        <option value="BONUS">[+수당] 상여금 (인센티브)</option>
                        <option value="SPECIAL_ALLOWANCE">[+수당] 특별수당</option>
                        <option value="POSITION_ALLOWANCE">[+수당] 직책·보직수당</option>
                        <option value="OTHER_TAXABLE">[+수당] 기타 과세수당</option>
                        <option value="DORM_DEDUCTION">[-공제] 기숙사 관리비 공제</option>
                        <option value="MEAL_DEDUCTION">[-공제] 식대 공제</option>
                        <option value="OTHER_DEDUCTION">[-공제] 기타 공제</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-700">
                        ③ 금액 (숫자만 입력) *
                      </label>
                      <input
                        type="number"
                        placeholder="예: 250000"
                        value={adjForm.amount}
                        onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                        className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] font-bold text-slate-700">
                        ④ 결재 번호 / 메모 (선택)
                      </label>
                      <input
                        placeholder="예: 주말 연장근무 수당, 10월 기숙사비 정산 등"
                        value={adjForm.notes}
                        onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                        className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                      />
                    </div>

                    <button
                      type="submit"
                      className="col-span-2 rounded-lg bg-blue-600 py-2 font-bold text-white hover:bg-blue-700"
                    >
                      수당·공제 내역 저장
                    </button>
                  </form>

                  <div className="border-t border-slate-200 pt-3">
                    <label className="block text-xs font-bold text-slate-700">
                      여러 줄 복사·붙여넣기 (형식: 성명또는사번, 수당명, 금액, 메모)
                    </label>
                    <textarea
                      rows={2}
                      value={bulkAdjText}
                      onChange={(e) => setBulkAdjText(e.target.value)}
                      placeholder="홍길동, 연장수당, 250000, DOC-01, 주말근무"
                      className="mt-2 w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleBulkAdjustmentUpload}
                      className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      복사한 내역 일괄 등록
                    </button>
                  </div>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto border-t border-slate-200 pt-3">
                <div className="mb-1.5 text-[11px] font-bold text-slate-600">
                  등록된 수당·공제 내역 ({formatNumber(adjustments.length)}건) — 금액을 직접 고치고 [수정]을 누르세요:
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-1.5">성명(사번)</th>
                      <th className="py-1.5">수당/공제 구분</th>
                      <th className="py-1.5 text-right">금액(개별수정)</th>
                      <th className="py-1.5">비고</th>
                      <th className="py-1.5 text-center">저장/삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adjustments.map((a) => {
                      const categoryKorMap: Record<string, string> = {
                        OVERTIME_PAY: '[+수당] 연장·야간·휴일수당',
                        BONUS: '[+수당] 상여금',
                        SPECIAL_ALLOWANCE: '[+수당] 특별수당',
                        POSITION_ALLOWANCE: '[+수당] 직책수당',
                        OTHER_TAXABLE: '[+수당] 기타과세수당',
                        DORM_DEDUCTION: '[-공제] 기숙사비 공제',
                        MEAL_DEDUCTION: '[-공제] 식대 공제',
                        OTHER_DEDUCTION: '[-공제] 기타공제',
                      };
                      const edit = inlineAdjEdits[a.adjId] ?? {
                        amount: String(a.amount ?? 0),
                        notes: a.notes ?? '',
                      };
                      return (
                        <tr key={a.adjId}>
                          <td className="py-1.5 font-medium">
                            {a.empName} ({a.empNo})
                          </td>
                          <td className="py-1.5 text-[11px]">
                            {categoryKorMap[a.category] ?? a.category}
                          </td>
                          <td className="py-1.5 text-right">
                            <input
                              type="number"
                              value={edit.amount}
                              onChange={(ev) =>
                                setInlineAdjEdits((prev) => ({
                                  ...prev,
                                  [a.adjId]: { ...edit, amount: ev.target.value },
                                }))
                              }
                              className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right font-mono text-xs font-bold text-slate-900"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="text"
                              value={edit.notes}
                              onChange={(ev) =>
                                setInlineAdjEdits((prev) => ({
                                  ...prev,
                                  [a.adjId]: { ...edit, notes: ev.target.value },
                                }))
                              }
                              className="w-28 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700"
                            />
                          </td>
                          <td className="py-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateOrDeleteAdjustment(a, 'UPDATE')}
                                className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold text-white hover:bg-blue-700"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrDeleteAdjustment(a, 'DELETE')}
                                className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 hover:bg-rose-200"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    부서별 일용직 출근기록 및 일당 관리
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    일용직 전원을 기본 시간·일당으로 일괄 출근 등록한 뒤, 예외 인원만 아래 표에서 개별 수정하세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIndividualAddForm((prev) => !prev)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-blue-50"
                >
                  {showIndividualAddForm ? '개별 출근 접기 ▲' : '+ 개별 일용직 출근 ▼'}
                </button>
              </div>

              {/* 일용직 글로벌 일괄 출근 등록 바 */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="font-bold text-slate-800">
                  일용직 전원 기본값({formatNumber(globalDefaults.defaultDailyWorkHours)}시간 · {formatNumber(globalDefaults.defaultDailyGrossWage)}원) 일괄 출근 등록:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="date"
                    value={dailyForm.workDate}
                    onChange={(e) => setDailyForm({ ...dailyForm, workDate: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                    title="일괄 출근 등록할 날짜"
                  />
                  <button
                    type="button"
                    onClick={handleApplyGlobalBatchDailyLogs}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                  >
                    일용직 전원 일괄 출근 등록 ({dailyForm.workDate || '오늘'})
                  </button>
                </div>
              </div>

              {showIndividualAddForm && (
                <form onSubmit={handleAddDailyLog} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">
                      ① 출근하여 일한 날짜 *
                    </label>
                    <input
                      type="date"
                      value={dailyForm.workDate}
                      onChange={(e) => setDailyForm({ ...dailyForm, workDate: e.target.value })}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">
                      ② 일용직 직원 선택 (개별 등록 시) *
                    </label>
                    <select
                      value={dailyForm.empId}
                      onChange={(e) => {
                        const chosenId = Number(e.target.value);
                        const chosenEmp = employees.find((emp) => emp.empId === chosenId);
                        setDailyForm({
                          ...dailyForm,
                          empId: chosenId,
                          workHours:
                            dailyForm.workHours || String(globalDefaults.defaultDailyWorkHours),
                          dailyGrossPay:
                            chosenEmp && chosenEmp.dailyOrHourlyWage > 0
                              ? String(chosenEmp.dailyOrHourlyWage)
                              : dailyForm.dailyGrossPay ||
                                String(globalDefaults.defaultDailyGrossWage),
                        });
                      }}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                      required
                    >
                      <option value={0}>일용직 직원을 선택하세요</option>
                      {employees
                        .filter((e) => e.employmentType === 'DAILY')
                        .map((e) => (
                          <option key={e.empId} value={e.empId}>
                            [{e.entityName}/{e.deptName}] {e.empName} ({e.empNo})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">
                      ③ 하루 근무시간 (시간)
                    </label>
                    <input
                      type="number"
                      placeholder="예: 8"
                      value={dailyForm.workHours}
                      onChange={(e) => setDailyForm({ ...dailyForm, workHours: e.target.value })}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">
                      ④ 하루 일당 금액 (세전) *
                    </label>
                    <input
                      type="number"
                      placeholder="예: 150000"
                      value={dailyForm.dailyGrossPay}
                      onChange={(e) => setDailyForm({ ...dailyForm, dailyGrossPay: e.target.value })}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">
                      ⑤ 결재 번호 / 메모 (선택)
                    </label>
                    <input
                      placeholder="예: 코스관리팀 10월 1주차 일용직 출근기록"
                      value={dailyForm.approvalDocNo}
                      onChange={(e) => setDailyForm({ ...dailyForm, approvalDocNo: e.target.value })}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                    />
                  </div>

                  <button
                    type="submit"
                    className="col-span-2 rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-600"
                  >
                    개별 일용직 출근기록 저장하기
                  </button>
                </form>
              )}

              <div className="max-h-80 overflow-y-auto border-t border-slate-200 pt-3">
                <div className="mb-1.5 text-[11px] font-bold text-slate-600">
                  등록된 일용직 출근기록 ({formatNumber(dailyLogs.length)}건) — 시간·일당을 직접 고치고 [수정]을 누르세요:
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-1.5">근무일</th>
                      <th className="py-1.5">부서/성명</th>
                      <th className="py-1.5 text-right">시간</th>
                      <th className="py-1.5 text-right">하루 일당</th>
                      <th className="py-1.5">품의번호</th>
                      <th className="py-1.5 text-center">저장/삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyLogs.map((l) => {
                      const edit = inlineDailyEdits[l.logId] ?? {
                        workHours: String(l.workHours ?? 8),
                        dailyGrossPay: String(l.dailyGrossPay ?? 0),
                        approvalDocNo: l.approvalDocNo ?? '',
                      };
                      return (
                        <tr key={l.logId}>
                          <td className="py-1.5 font-mono text-[11px]">{l.workDate}</td>
                          <td className="py-1.5">
                            <span className="font-bold text-slate-900">{l.empName}</span>
                            <span className="ml-1 text-[10px] text-slate-500">({l.deptName})</span>
                          </td>
                          <td className="py-1.5 text-right">
                            <input
                              type="number"
                              value={edit.workHours}
                              onChange={(ev) =>
                                setInlineDailyEdits((prev) => ({
                                  ...prev,
                                  [l.logId]: { ...edit, workHours: ev.target.value },
                                }))
                              }
                              className="w-14 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right font-mono text-xs"
                            />
                          </td>
                          <td className="py-1.5 text-right">
                            <input
                              type="number"
                              value={edit.dailyGrossPay}
                              onChange={(ev) =>
                                setInlineDailyEdits((prev) => ({
                                  ...prev,
                                  [l.logId]: { ...edit, dailyGrossPay: ev.target.value },
                                }))
                              }
                              className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right font-mono text-xs font-bold text-slate-900"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="text"
                              value={edit.approvalDocNo}
                              onChange={(ev) =>
                                setInlineDailyEdits((prev) => ({
                                  ...prev,
                                  [l.logId]: { ...edit, approvalDocNo: ev.target.value },
                                }))
                              }
                              className="w-24 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-600"
                            />
                          </td>
                          <td className="py-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateOrDeleteDailyLog(l, 'UPDATE')}
                                className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold text-white hover:bg-blue-600"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrDeleteDailyLog(l, 'DELETE')}
                                className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 hover:bg-rose-200"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 7] 통합 데이터 매핑 포털 (100% HITL - Zero Regex Guessing)
           ============================================================ */}
        {activeTab === 'HITL_MAPPING' && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">
              미등록 이름 확인 및 1:1 연결 화면 (오타·신규 명칭 안전 확인)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              엑셀이나 수당 자료를 올릴 때 등록되지 않은 직원 이름(오타 포함)이나 수당 명칭이 발견되면 이곳에 따로 모입니다. 오른쪽에서 올바른 대상을 골라 <strong>[연결 승인]</strong>을 누르면 즉시 반영되며, 다음부터는 같은 이름이 들어와도 자동으로 알아봅니다.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                    <th className="px-4 py-2.5">번호</th>
                    <th className="px-4 py-2.5">확인이 필요한 종류</th>
                    <th className="px-4 py-2.5">입력된 이름(오타/미등록)</th>
                    <th className="px-4 py-2.5">상세 내용</th>
                    <th className="px-4 py-2.5">연결할 정확한 대상 선택</th>
                    <th className="px-4 py-2.5">연결 실행</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappingCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-emerald-700 font-semibold">
                        현재 확인이 필요한 미등록 이름이나 오타가 없습니다 (모두 정상 연결됨).
                      </td>
                    </tr>
                  ) : (
                    mappingCandidates.map((c) => (
                      <tr key={c.candidateId} className="bg-slate-50">
                        <td className="px-4 py-2.5 font-mono">#{c.candidateId}</td>
                        <td className="px-4 py-2.5 font-bold text-amber-800">
                          {c.sourceType === 'EMPLOYEE_NAME' ? '직원 이름 미등록' : '수당/공제 명칭 미등록'}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-rose-700">{c.rawText}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                          {c.contextJson}
                        </td>
                        <td className="px-4 py-2.5">
                          {c.sourceType === 'EMPLOYEE_NAME' ? (
                            <select
                              value={selectedMappingTarget[c.candidateId] ?? ''}
                              onChange={(e) =>
                                setSelectedMappingTarget({
                                  ...selectedMappingTarget,
                                  [c.candidateId]: e.target.value,
                                })
                              }
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                            >
                              <option value="">연결할 실제 직원 선택...</option>
                              {employees.map((e) => (
                                <option key={e.empId} value={String(e.empId)}>
                                  [{e.entityName}/{e.deptName}] {e.empName} ({e.empNo})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={selectedMappingTarget[c.candidateId] ?? ''}
                              onChange={(e) =>
                                setSelectedMappingTarget({
                                  ...selectedMappingTarget,
                                  [c.candidateId]: e.target.value,
                                })
                              }
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                            >
                              <option value="">연결할 실제 수당/공제 항목 선택...</option>
                              <option value="OVERTIME_PAY">[+수당] 연장/야간/휴일수당</option>
                              <option value="BONUS">[+수당] 상여금</option>
                              <option value="SPECIAL_ALLOWANCE">[+수당] 특별수당</option>
                              <option value="POSITION_ALLOWANCE">[+수당] 직책수당</option>
                              <option value="OTHER_TAXABLE">[+수당] 기타과세수당</option>
                              <option value="DORM_DEDUCTION">[-공제] 기숙사비 공제</option>
                              <option value="MEAL_DEDUCTION">[-공제] 식대 공제</option>
                              <option value="OTHER_DEDUCTION">[-공제] 기타공제</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => handleApproveMapping(c.candidateId)}
                            className="rounded bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-600"
                          >
                            연결 승인 및 영구기억
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 8] 법정요율 & 부서/코스트센터 설정 (Zero Hardcoding)
           ============================================================ */}
        {activeTab === 'CONFIG' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  1. 법인별 부서 및 더존 코스트센터(회계 부서코드) 등록
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  직원이 소속될 부서와 더존 회계전표에 찍힐 코스트센터 코드를 등록합니다.
                </p>
              </div>
              <form onSubmit={handleSaveDepartment} className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ① 소속 법인 선택 *
                  </label>
                  <select
                    value={deptForm.entityCode}
                    onChange={(e) =>
                      setDeptForm({ ...deptForm, entityCode: e.target.value as EntityCode })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  >
                    <option value="BLACKSTONE">블랙스톤벨포레</option>
                    <option value="KMG">케이엠지(KMG)</option>
                    <option value="RAKSANSU">락산수</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ② 부서 코드 (영문/숫자) *
                  </label>
                  <input
                    placeholder="예: HR-01, GOLF-01"
                    value={deptForm.deptCode}
                    onChange={(e) => setDeptForm({ ...deptForm, deptCode: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ③ 부서 한글 이름 *
                  </label>
                  <input
                    placeholder="예: 인사총무팀, 경기과, 코스관리팀"
                    value={deptForm.deptName}
                    onChange={(e) => setDeptForm({ ...deptForm, deptName: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ④ 더존 코스트센터 코드 *
                  </label>
                  <input
                    placeholder="예: CC-101"
                    value={deptForm.costCenterCode}
                    onChange={(e) => setDeptForm({ ...deptForm, costCenterCode: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="col-span-2 rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-600"
                >
                  부서 및 코스트센터 저장하기
                </button>
              </form>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1.5">법인</th>
                    <th className="py-1.5">부서코드</th>
                    <th className="py-1.5">부서명</th>
                    <th className="py-1.5">코스트센터</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <tr key={d.deptId}>
                      <td className="py-1.5 font-semibold">{d.entityCode}</td>
                      <td className="py-1.5 font-mono">{d.deptCode}</td>
                      <td className="py-1.5">{d.deptName}</td>
                      <td className="py-1.5 font-mono text-slate-600">{d.costCenterCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    2. 연월별 4대보험 · 세율 · 캐디 · 장애인부담금 요율 설정
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    소수점 요율 입력이 헷갈리시면 오른쪽 <strong>[표준요율 자동채우기]</strong> 버튼을 누른 뒤 저장하세요!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRateForm({
                      effectiveYm: targetYm || '2026-01',
                      npWorkerRate: '0.045',
                      npEmployerRate: '0.045',
                      npMinMonthlyIncome: '390000',
                      npMaxMonthlyIncome: '6170000',
                      hiWorkerRate: '0.03545',
                      hiEmployerRate: '0.03545',
                      ltciRateOfHi: '0.1295',
                      eiWorkerRate: '0.009',
                      eiEmployerRate: '0.0115',
                      iacEmployerRate: '0.009',
                      dailyTaxFreeLimit: '150000',
                      dailyTaxCreditRate: '0.55',
                      dailyBaseTaxRate: '0.06',
                      dailyMinTaxThreshold: '1000',
                      localIncomeTaxRate: '0.1',
                      stdIncomeTaxRate: '0.03',
                      caddyExpenseRate: '0.273',
                      caddyEiWorkerRate: '0.008',
                      caddyEiEmployerRate: '0.008',
                      residentTaxRate: '0.005',
                      residentTaxExemptionLimit: '150000000',
                      businessIncomeTaxRate: '0.03',
                      disabledMandatoryRate: '0.031',
                      disabledBaseBurdenMonthly: '1258000',
                    });
                    triggerSuccessToast(
                      '표준 법정요율 24개 항목이 입력칸에 자동으로 채워졌습니다! 아래 초록색 [법정 요율 저장하기] 버튼을 눌러 확정하세요.'
                    );
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-blue-600"
                >
                  표준 법정요율 입력칸 자동채우기 (작성 도우미)
                </button>
              </div>

              <form onSubmit={handleSaveRates} className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    적용 시작 연월 *
                  </label>
                  <input
                    type="month"
                    value={rateForm.effectiveYm}
                    onChange={(e) => setRateForm({ ...rateForm, effectiveYm: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    국민연금 근로자 요율 (예: 0.045) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.045"
                    value={rateForm.npWorkerRate}
                    onChange={(e) => setRateForm({ ...rateForm, npWorkerRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    국민연금 회사부담 요율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.045"
                    value={rateForm.npEmployerRate}
                    onChange={(e) => setRateForm({ ...rateForm, npEmployerRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    국민연금 월 소득 하한액 *
                  </label>
                  <input
                    type="number"
                    placeholder="390000"
                    value={rateForm.npMinMonthlyIncome}
                    onChange={(e) => setRateForm({ ...rateForm, npMinMonthlyIncome: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    국민연금 월 소득 상한액 *
                  </label>
                  <input
                    type="number"
                    placeholder="6170000"
                    value={rateForm.npMaxMonthlyIncome}
                    onChange={(e) => setRateForm({ ...rateForm, npMaxMonthlyIncome: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    건강보험 근로자 요율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.03545"
                    value={rateForm.hiWorkerRate}
                    onChange={(e) => setRateForm({ ...rateForm, hiWorkerRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    건강보험 회사부담 요율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.03545"
                    value={rateForm.hiEmployerRate}
                    onChange={(e) => setRateForm({ ...rateForm, hiEmployerRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    장기요양보험료율 (건보료 대비) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.1295"
                    value={rateForm.ltciRateOfHi}
                    onChange={(e) => setRateForm({ ...rateForm, ltciRateOfHi: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    고용보험 근로자 요율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.009"
                    value={rateForm.eiWorkerRate}
                    onChange={(e) => setRateForm({ ...rateForm, eiWorkerRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    고용보험 회사부담 요율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0115"
                    value={rateForm.eiEmployerRate}
                    onChange={(e) => setRateForm({ ...rateForm, eiEmployerRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    산재보험 회사부담 요율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.009"
                    value={rateForm.iacEmployerRate}
                    onChange={(e) => setRateForm({ ...rateForm, iacEmployerRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    일용직 하루 비과세 한도액 *
                  </label>
                  <input
                    type="number"
                    placeholder="150000"
                    value={rateForm.dailyTaxFreeLimit}
                    onChange={(e) => setRateForm({ ...rateForm, dailyTaxFreeLimit: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    일용직 근로소득 세액공제율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.55"
                    value={rateForm.dailyTaxCreditRate}
                    onChange={(e) => setRateForm({ ...rateForm, dailyTaxCreditRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    일용직 원천징수 기본세율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.06"
                    value={rateForm.dailyBaseTaxRate}
                    onChange={(e) => setRateForm({ ...rateForm, dailyBaseTaxRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    일용직 소액부징수 면제 기준액 *
                  </label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={rateForm.dailyMinTaxThreshold}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, dailyMinTaxThreshold: e.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    지방소득세율 (소득세 대비 비율) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.1"
                    value={rateForm.localIncomeTaxRate}
                    onChange={(e) => setRateForm({ ...rateForm, localIncomeTaxRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-slate-700">
                    일반 근로소득 간이세율 *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.03"
                    value={rateForm.stdIncomeTaxRate}
                    onChange={(e) => setRateForm({ ...rateForm, stdIncomeTaxRate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-emerald-800">
                    캐디 산재 필요경비 공제율
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.273"
                    value={rateForm.caddyExpenseRate}
                    onChange={(e) => setRateForm({ ...rateForm, caddyExpenseRate: e.target.value })}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-emerald-800">
                    주민세 종업원분 세율
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.005"
                    value={rateForm.residentTaxRate}
                    onChange={(e) => setRateForm({ ...rateForm, residentTaxRate: e.target.value })}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-emerald-800">
                    주민세 종업원분 면세 기준액
                  </label>
                  <input
                    type="number"
                    placeholder="150000000"
                    value={rateForm.residentTaxExemptionLimit}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, residentTaxExemptionLimit: e.target.value })
                    }
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-emerald-800">
                    사업소득(프리랜서) 원천징수율
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.03"
                    value={rateForm.businessIncomeTaxRate}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, businessIncomeTaxRate: e.target.value })
                    }
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-bold text-emerald-800">
                    장애인 의무고용 비율
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.031"
                    value={rateForm.disabledMandatoryRate}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, disabledMandatoryRate: e.target.value })
                    }
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-0.5 block text-[11px] font-bold text-emerald-800">
                    장애인 미달 1인당 월 부담기초액
                  </label>
                  <input
                    type="number"
                    placeholder="1258000"
                    value={rateForm.disabledBaseBurdenMonthly}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, disabledBaseBurdenMonthly: e.target.value })
                    }
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                  />
                </div>
                <button
                  type="submit"
                  className="col-span-2 rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-600"
                >
                  법정 요율 저장하기
                </button>
              </form>

              <div className="border-t border-slate-200 pt-3 text-xs">
                <p className="font-bold text-slate-700">등록된 법정 요율 이력:</p>
                {rateConfigs.length === 0 ? (
                  <p className="mt-1 text-slate-400">
                    등록된 법정 요율이 없습니다. 위의 [표준 법정요율 입력칸 자동채우기] 버튼을 누른 뒤 저장해 주세요.
                  </p>
                ) : (
                  rateConfigs.map((rc) => (
                    <div
                      key={rc.effectiveYm}
                      className="mt-1.5 rounded border border-slate-200 bg-slate-50 p-2"
                    >
                      <span className="font-bold text-emerald-700">[{rc.effectiveYm}~]</span> 국민연금:{' '}
                      {rc.npWorkerRate} / 건강보험: {rc.hiWorkerRate} / 일용직비과세:{' '}
                      {formatNumber(rc.dailyTaxFreeLimit)}원 / 캐디경비율:{' '}
                      {rc.caddyExpenseRate ?? 0} / 주민세율: {rc.residentTaxRate ?? 0}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

            {/* 하단 다음 순서 안내 바 (초등학생도 끝까지 읽고 바로 다음 페이지로 넘어갈 수 있게) */}
            <div className="mt-8 flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-emerald-50 text-xs font-black text-emerald-700">
                  {currentStepPage.stepCode}
                </span>
                <div>
                  <p className="text-[11px] font-bold text-slate-400">
                    현재 페이지: 순서 {currentStepPage.stepCode} · {currentStepPage.title} ({currentStepIndex + 1} / {sequentialStepPages.length})
                  </p>
                  <p className="text-xs font-extrabold text-slate-700">
                    {nextStepPage
                      ? `이 화면 확인이 끝났다면 다음 순서 [${nextStepPage.stepCode} ${nextStepPage.title}] 화면으로 이동해 보세요!`
                      : '마지막 순서까지 모두 확인하셨습니다! 좌측 메뉴에서 원하는 단계로 언제든 이동할 수 있습니다.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {prevStepPage && (
                  <button
                    type="button"
                    onClick={() => handleSelectStepPage(prevStepPage)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-100"
                  >
                    ◀ 이전: {prevStepPage.stepCode} {prevStepPage.title}
                  </button>
                )}
                {nextStepPage && (
                  <button
                    type="button"
                    onClick={() => handleSelectStepPage(nextStepPage)}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-600"
                  >
                    다음 순서로 진행: {nextStepPage.stepCode} {nextStepPage.title} </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      )}
    </div>
  );
}
