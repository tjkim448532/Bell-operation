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
  const [quickMenuSearch, setQuickMenuSearch] = useState<string>('');
  const [zeroTouchSubView, setZeroTouchSubView] = useState<
    'ALL' | 'AMARANTH_RPA' | 'SOLAPI_PORTALS' | 'COLLECTOR_AUDIT' | 'SELF_ONBOARD'
  >('ALL');
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

  // 현재 년월 동적 초기화 + 합격자/임직원/부서장 전용 URL(?mode=self-onboarding | emp-portal | dept-portal) 감지
  useEffect(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = `${ym}-${String(now.getDate()).padStart(2, '0')}`;
    setTargetYm(ym);
    setRateForm((prev) => ({ ...prev, effectiveYm: ym }));
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
      setAdjustments(data.adjustments);
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
        const [solapiStatus, amaranthStatus] = await Promise.all([
          fetchHrSolapiConfigAndStatus(),
          fetchHrAmaranthApiConfigAndLogs(ym),
        ]);
        setSolapiConfig(solapiStatus.config);
        setSolapiBalanceWon(solapiStatus.balanceWon);
        setSolapiAccountId(solapiStatus.accountId);
        setSmsLogs(solapiStatus.smsLogs);
        setAmaranthApiConfig(amaranthStatus.config);
        setAmaranthApiLogs(amaranthStatus.logs);
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
    customNotice?: string,
    shouldScroll = true
  ) => {
    setActiveTab(targetTab);
    setShowAllMenuGrid(false);
    setWorkspaceFlashTick((prev) => prev + 1);
    triggerSuccessToast(
      customNotice ?? `👉 [${tabTitleMap[targetTab]}] 화면이 열렸습니다! 아래 화면에서 바로 진행하세요.`
    );
    if (shouldScroll && typeof window !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById('hr-workspace-anchor');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
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
        ? `🏢 [${korName}] 법인을 화면 합계에서 제외했습니다. (다시 누르면 포함됩니다)`
        : `🏢 [${korName}] 법인을 화면 합계에 다시 포함했습니다.`
    );
  };

  const handleRunSettlement = async () => {
    if (!targetYm) return;
    await runWithFeedback(
      `[${targetYm}] 3개 법인 전 직원 급여·4대보험·원천세·더존 전표를 자동 정산하고 있습니다...`,
      async () => {
        const result = await runFirestorePayrollSettlement(targetYm);
        return `✅ [${targetYm}] 전사 급여·전표 자동정산 완료! (대상 인원 ${result.settledCount}명, 부서별 회계전표 ${result.voucherCount}건 생성 완료)`;
      }
    );
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedName = deptForm.deptName;
    await runWithFeedback(`부서 [${savedName}] 정보를 저장하고 있습니다...`, async () => {
      await saveDepartmentToFirestore(deptForm);
      setDeptForm({ entityCode: 'BLACKSTONE', deptCode: '', deptName: '', costCenterCode: '' });
      return `✅ 부서 [${savedName}] 및 더존 코스트센터 저장이 완료되었습니다!`;
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
        return `✅ [${ym}] 법정 요율 설정 저장 및 전사 급여 자동 반영 완료!`;
      }
    );
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedName = empForm.empName;
    const savedNo = empForm.empNo;
    await runWithFeedback(
      `임직원 [${savedName} (${savedNo})] 정보를 저장하고 급여·차량·입퇴사 절차를 자동 연동하고 있습니다...`,
      async () => {
        await saveEmployeeToFirestore({
          empNo: empForm.empNo,
          empName: empForm.empName,
          employmentType: empForm.employmentType,
          entityCode: empForm.entityCode,
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
          bankCode: null,
          bankName: empForm.bankName ? empForm.bankName : null,
          accountNo: empForm.accountNo ? empForm.accountNo : null,
          accountHolder: empForm.accountHolder ? empForm.accountHolder : null,
          email: null,
          phone: null,
          dormitoryRoom: empForm.dormitoryRoom ? empForm.dormitoryRoom : null,
          carNumber: empForm.carNumber ? empForm.carNumber : null,
          npExempt: 0,
          hiExempt: 0,
          eiExempt: 0,
          disabilityGrade: empForm.disabilityGrade,
        });
        return `✅ 임직원 [${savedName} (${savedNo})] 저장 및 급여·차량·체크리스트 자동 연동 완료!`;
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
        return `✅ 일용직 출근기록(${wDate}) 등록 및 급여대장 자동 정산 완료!`;
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
        return `✅ 추가 수당/공제 처리 완료! (정상 반영 ${res.insertedCount}건 / 미등록 이름 분리 ${res.isolatedCount}건)`;
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
        return `✅ 여러 줄 일괄 등록 완료! (정상 반영 ${res.insertedCount}건 / 미등록 이름 분리 ${res.isolatedCount}건)`;
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
        return `✅ 연결 승인 및 영구 기억 완료! (${res.resolvedCount}건 장부 자동 이관 및 급여 재계산 완료)`;
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
        return '✅ 경기과 캐디 과세자료 및 산재·고용보험 보수액 자동 계산 완료!';
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
        return '✅ 근로자 월보수액 변경신고 등록 및 직원 명부·급여대장 자동 동기화 완료!';
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
      return '✅ 사업소득 지급명세서 등록 및 원천징수 세액 자동 계산 완료!';
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
        return `✅ [${res.empName}] 퇴직금 산출 완료! (법정 지급기한: ${res.paymentDeadlineDate} 이내, 세후 지급액: ${formatNumber(res.netSeverancePay)}원)`;
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
        return '✅ 입·퇴사·실습생 6단계 체크리스트 저장 및 주차관제 연동 완료!';
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
        return `✅ [${item.empName}] 더존 ERP · 근로계약 · 이메일 · 사원증 · 차량 · 식수지문 6단계 일괄 완료 처리되었습니다!`;
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
      return `✅ 차량번호 [${cNum}] 주차관제 시스템 등록 완료!`;
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
        return `✅ [${mDate}] 식수현황 등록 및 3개 법인별 식대비 품의 집계 반영 완료!`;
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
      return `✅ 주간식단표 (${wLabel}) 그룹웨어 공지 등록 완료!`;
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
        return `✅ 고정거래처 [${vName}] 도급비 및 직원수당 납부 품의 생성 완료!`;
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
        return '✅ 하나BSN 부서별 용역비 지급 품의(락산수/KMG) 등록 완료!';
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
      return '✅ 부서별 월 근무표 취합 및 품의 등록 완료!';
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
        return `✅ 매월 말일 월 근무표 최종취합본 (${count}개 부서) 일괄 품의 완료 처리되었습니다!`;
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
      return '✅ 임직원 연차대장 및 잔여휴무 마감근무표 반영 완료!';
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
        return '✅ 부서 주간업무보고서 및 팀장/파트장 휴무일 취합 등록 완료!';
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
      return '✅ 제증명·완납증명·원천징수영수증·건강검진·휴가지원·연말정산 등록 완료!';
    });
  };

  const handleCompleteTraining = async (empId: number, empName: string) => {
    await runWithFeedback(
      `[${empName}] 직원의 5대 법정의무교육 전 과목 이수를 처리하고 있습니다...`,
      async () => {
        await completeAllMandatoryTrainingInFirestore(targetYm.slice(0, 4), empId);
        return `✅ [${empName}] 5대 법정의무교육(성희롱·괴롭힘·개인정보·퇴직연금·산업안전) 전 과목 이수 완료!`;
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
        return '✅ 산업재해조사표 등록 및 사고 발생 후 30일 이내 제출기한 산출 완료!';
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
      return '✅ IT센터 그룹웨어·조직도·임직원정보 협업 요청 티켓 발행 완료!';
    });
  };

  const handleResolveItTicket = async (ticketId: number) => {
    await runWithFeedback(`IT센터 협업 요청 티켓을 조치 완료로 변경하고 있습니다...`, async () => {
      await resolveItCenterTicketInFirestore(ticketId);
      return '✅ IT센터 협업 요청 조치 완료 처리되었습니다!';
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
      `📥 [엑셀 다운로드 완료] "${labelMap[type]}" 파일이 컴퓨터(다운로드 폴더)에 저장되었습니다!`
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
      `📥 [엑셀 다운로드 완료] "${labelMap[type]}" 파일이 컴퓨터(다운로드 폴더)에 저장되었습니다!`
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
      `📥 [엑셀 다운로드 완료] "${labelMap[type]}" 파일이 컴퓨터(다운로드 폴더)에 저장되었습니다!`
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
      `📥 [엑셀 다운로드 완료] "${labelMap[type]}" 파일이 컴퓨터(다운로드 폴더)에 저장되었습니다!`
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
      `📥 [표준양식 다운로드 완료] "${labelMap[importType]}" 파일이 컴퓨터에 저장되었습니다! 내용을 채워 업로드하세요.`
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
        `✅ [엑셀 일괄 업로드 완료] 파일 [${historyItem.fileName}] 총 ${historyItem.totalRows}건 중 정상 등록 ${historyItem.importedRows}건 / 미등록 이름 분리 ${historyItem.isolatedHitlRows}건 처리 완료!`
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
        return `🤖 [전 과정 무인 RPA 일괄 완료] 총 ${count}건의 그룹웨어 전자결재 상신·홈택스/4대보험 EDI 신고·3개 법인 완납증명서 자동발급·은행 이체대기 등록이 완료되었습니다!`;
      }
    );
  };

  const handleApproveSingleRpaJob = async (jobId: string, jobTitle: string) => {
    await runWithFeedback(
      `[무인 RPA 봇 실행] "${jobTitle}" 작업을 외부 포털 및 그룹웨어에 자동 집행하고 있습니다...`,
      async () => {
        const updated = await approveSingleRpaJobInFirestore(jobId, targetYm);
        return `🤖 [RPA 실행 완료] "${updated.jobTitle}" ➔ 접수/문서번호 [${updated.receiptNoOrDocNo}] 처리 완료!`;
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
        return `📡 [무인 수집 파이프라인 동기화 완료] "${label}" 총 ${totalSynced}건 자동 수집 및 3개 법인 급여·전표 마트 직결 완료!`;
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
        return `🎉 [셀프 입사등록 100% 무인 완료] ${res.empName}님(사번: ${res.empNo}) 등록 완료! 인사담당자 타이핑 없이 근로계약·주차관제·연차·법정교육·급여원장까지 즉시 연동되었습니다.`;
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
        `🔗 [합격자 발송용 모바일 셀프 입사링크 복사 완료] "${url}" 주소를 카카오톡/문자로 합격자에게 보내면 본인이 직접 입력·전자서명합니다!`
      );
    } catch {
      triggerSuccessToast(`🔗 합격자 셀프 입사링크: ${url}`);
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
        `🔗 [${label} 링크 복사 완료] "${url}" 주소를 단톡방/공지에 공유하면 인사과 전화·방문 없이 본인이 직접 처리합니다!`
      );
    } catch {
      triggerSuccessToast(`🔗 ${label} 링크: ${url}`);
    }
  };

  const handleSwitchPortalMode = (nextMode: PortalViewMode, notice: string) => {
    setPortalViewMode(nextMode);
    setIsSelfOnboardStandaloneView(nextMode === 'SELF_ONBOARDING');
    if (nextMode === 'SELF_ONBOARDING' || nextMode === 'ADMIN_HQ') {
      setActiveTab('ZERO_TOUCH_HQ');
    }
    triggerSuccessToast(notice);
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
    triggerSuccessToast('✉️ 선택한 안내문 양식이 문자 발송창에 자동 입력되었습니다.');
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
        return `✅ [솔라피 발송 설정 저장 완료] 발신번호(${solapiConfig.senderNumber}) 및 ${
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
        return `📨 [솔라피 발송 완료] ${res.detailMessage}`;
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
        return `📨 [임직원 일괄 발송 완료] ${res.detailMessage}`;
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
        '📲 기기의 기본 문자(메시지) 앱을 호출했습니다. 전송 버튼을 눌러 발송하세요.'
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
        return `✅ [더존 아마란스 10 Open API 설정 완료] 게이트웨이(${amaranthApiConfig.baseUrl}) 및 3개 법인 코드·SSO(${amaranthApiConfig.ssoProviderType})·Webhook 설정이 저장되었습니다!`;
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
        `🔓 [본인 인증 완료] ${selEmp.empName}(${selEmp.empNo})님의 개인 급여명세서 · 잔여연차 · 증명서 발급 화면이 잠금 해제되었습니다!`
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
      `🔓 [본인 인증 즉시 해제] ${selEmp.empName}(${selEmp.empNo})님의 급여명세서 및 셀프서비스 포털이 열렸습니다!`
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
        return `📄 [셀프 증명서 1초 즉시발급 완료] 문서번호 [${res.approvalDocNo}] ${res.categoryLabel}이 발급되었습니다! 아래 증명서 카드에서 [🖨️ 인쇄 / PDF 저장]을 누르세요.`;
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
          resignReason: selfResignForm.resignReason,
          digitalSignatureName: selfResignForm.digitalSignatureName,
        });
        setSelfResignForm((prev) => ({ ...prev, digitalSignatureName: '' }));
        return `✅ [전자사직서 셀프 제출 및 무인 연동 완료] ${res.empName}님(${res.empNo}) 퇴사일 [${res.resignDate}] 기준 일할급여·4대보험 상실·${res.dormNotice}이 자동 반영되었습니다.`;
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
          shortTitle: '🤖 자동화 홈 (기록모으기 · 더존결재 · 문자보내기)',
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
          shortTitle: '📅 마감일(D-Day) 달력 · 엑셀 한번에 올리기',
          subDesc: '이번 달 꼭 해야 할 날짜 확인 및 엑셀 파일 통째로 올리기',
          rowBadge: '마감일 확인',
          icon: Upload,
          badgeCount: phase5Summary?.urgentAlertCount ?? 0,
          badgeTone: 'rose',
        },
        {
          id: 'EMPLOYEES',
          shortTitle: '👥 전 직원 명부 · 수습 3개월 알림 · 기숙사',
          subDesc: '우리 회사 모든 직원 명단 관리 및 기숙사 방값 정산',
          rowBadge: '직원 명단',
          icon: Users,
        },
        {
          id: 'HITL_MAPPING',
          shortTitle: '🔍 낯선 이름·오타 짝지어 주기 (실수 방지)',
          subDesc: '엑셀에 오타나 새 부서 이름이 있을 때 정확한 이름과 연결해 주는 곳',
          rowBadge: '실수 방지',
          icon: AlertTriangle,
          badgeCount: pendingMappingCount,
          badgeTone: pendingMappingCount > 0 ? 'amber' : 'emerald',
        },
        {
          id: 'CONFIG',
          shortTitle: '⚙️ 4대보험 비율 · 부서 코드 설정',
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
          shortTitle: '💰 3개 회사 월급 계산표 · 은행이체 엑셀',
          subDesc: '기본급·보너스·세금 자동계산 및 하나은행·코나카드 파일 받기',
          rowBadge: '월급날 필수',
          icon: Calculator,
        },
        {
          id: 'VOUCHER',
          shortTitle: '🧾 더존 회계전표 (금액 맞는지 자동검사)',
          subDesc: '회계팀 프로그램(더존 아마란스)에 올릴 부서별 인건비 장부 파일',
          rowBadge: '회계팀 전달용',
          icon: ArrowRightLeft,
        },
        {
          id: 'INPUTS',
          shortTitle: '✍️ 일용직 출근기록 · 보너스/공제 추가 입력',
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
          shortTitle: '🏛️ 세금(원천세) · 4대보험 신고 · 캐디 보험',
          subDesc: '매달 10일 세금 신고와 15일 4대보험·캐디 보험 신고 파일 받기',
          rowBadge: '매월 10일·15일',
          icon: Landmark,
        },
        {
          id: 'PHASE2_SEVERANCE',
          shortTitle: '💼 퇴직금 자동계산 · 14일 기한 알림 · 강사료',
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
          shortTitle: '✅ 입·퇴사 6가지 할 일 체크 · 주차장 차량등록',
          subDesc: '새 직원 들어올 때 계약서·사원증·이메일·주차등록 한 번에 챙기기',
          rowBadge: '신입·퇴사 체크',
          icon: UserCheck,
        },
        {
          id: 'PHASE3_MEAL_APPROVALS',
          shortTitle: '🍱 구내식당(웰스토리) 밥값 · 외주 용역비 결재서',
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
          shortTitle: '📆 부서별 월근무표 · 연차휴가 · 수요일 인원보고',
          subDesc: '다음 달 근무표 승인과 매주 수요일 이사님께 드리는 인원 보고서',
          rowBadge: '매주 수요일·말일',
          icon: CalendarCheck,
        },
        {
          id: 'PHASE4_CERT_TRAINING_IT',
          shortTitle: '🎓 재직증명서 발급 · 5대 의무교육 · 산재 · 컴퓨터 요청',
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
      easyTitle: '🤖 자동화 홈 — 1번(기록모으기) ➔ 2번(월급계산) ➔ 3번(결재·신고) ➔ 4번(문자보내기)',
      whenToUse:
        '어려운 인사 업무를 직접 타이핑하지 않고, 화면 위쪽의 [1번 ➔ 2번 ➔ 3번 ➔ 4번] 숫자 버튼만 순서대로 눌러 한 번에 끝낼 때 사용해요.',
      step1:
        '① [1번 기록 모으기] 버튼을 누르면 식당·캐디·주차장·출퇴근 기계에서 이번 달 기록을 자동으로 가져와요.',
      step2:
        '② [2번 월급 계산하기]와 [3번 결재·장부 올리기]를 누르면 월급 계산부터 더존 아마란스 결재·세금 신고까지 자동으로 끝나요.',
      step3:
        '③ [4번 문자 보내기]에서 직원 휴대폰 번호를 고르고 [지금 즉시 발송]을 누르면 월급명세서나 입사 링크가 문자로 날아가요!',
      tip: '새로 들어온 직원은 [🔗 합격자 카톡 입사링크 복사]를 보내주면 본인이 스마트폰으로 직접 주소를 적어서 인사팀이 타이핑할 필요가 없어요.',
    },
    MATRIX: {
      easyTitle: '💰 3개 회사 월급 계산표 · 은행이체 엑셀 받기',
      whenToUse: '매달 8일(일용직)과 10일(직원·실습생)에 월급과 세금을 자동 계산하고 은행 이체용 엑셀 파일을 받을 때 써요.',
      step1: '① 맨 위에서 계산할 [연월(달력)]을 고르고 초록색 [2번 월급 자동계산] 버튼을 눌러요.',
      step2: '② 회사 버튼(전체 / 블랙스톤 / KMG / 락산수)을 눌러 직원별 월급과 통장 입금액이 맞는지 눈으로 확인해요.',
      step3: '③ 오른쪽 위의 [엑셀 다운로드] 버튼을 눌러 급여대장, 하나은행 이체파일, 코나카드 충전명단을 내려받아요.',
      tip: '달 중간에 들어오거나 그만둔 직원도 일한 날짜만큼 컴퓨터가 알아서 정확히 계산해 줘요.',
    },
    VOUCHER: {
      easyTitle: '🧾 더존 아마란스 회계전표 (회계팀 전달용 장부)',
      whenToUse: '월급 계산이 끝난 뒤 회계팀 프로그램(더존 아마란스)에 올릴 부서별 인건비 장부가 필요할 때 써요.',
      step1: '① 초록색 [자동정산 실행] 버튼을 누르면 부서별로 들어간 월급과 세금 장부가 자동으로 만들어져요.',
      step2: '② 화면 위쪽에 초록색으로 [차대변 일치 (차이 0원)] 표시가 떴는지 확인해요.',
      step3: '③ [더존 급여전표 엑셀 다운로드] 또는 [더존 API 자동전송] 버튼을 누르면 회계팀 전달이 끝나요.',
      tip: '계산기를 두드릴 필요 없이 부서별로 단 1원의 오차도 없이 자동으로 나누어져요.',
    },
    INPUTS: {
      easyTitle: '✍️ 일용직 출근기록 · 보너스/공제 추가 입력',
      whenToUse: '일용직 아르바이트 출근 기록을 적거나, 특정 직원의 야근수당·보너스·기숙사비를 추가로 넣을 때 써요.',
      step1: '① 왼쪽 입력칸에서 직원을 고르고 일당이나 보너스/공제 금액을 적은 뒤 [저장] 버튼을 눌러요.',
      step2: '② 적을 사람이 많다면 [마감일 달력 · 엑셀 한번에 올리기] 메뉴에서 엑셀 파일로 한 번에 올릴 수도 있어요.',
      step3: '③ 다 적었으면 맨 위 초록색 [자동정산 실행] 버튼을 눌러 월급 계산표에 반영해요.',
      tip: '일용직 세금도 법에서 정한 공제 금액을 빼고 컴퓨터가 알아서 계산해 줘요.',
    },
    PHASE2_TAX_EDI: {
      easyTitle: '🏛️ 세금(원천세) · 4대보험 신고 · 캐디 보험',
      whenToUse: '매달 10일 세금 신고와 매달 15일 4대보험·캐디 보험 신고 파일을 만들 때 써요.',
      step1: '① 화면 위쪽 6개 요약 상자에서 이번 달 신고할 세금과 4대보험 인원을 확인해요.',
      step2: '② 새로 들어오거나 그만둔 캐디가 있으면 아래 칸에 적어서 산재·고용보험료를 자동 계산해요.',
      step3: '③ 오른쪽 위의 [4대보험 엑셀], [캐디 산재 엑셀], [원천세 엑셀] 버튼을 눌러 신고용 파일을 받아요.',
      tip: '어려운 세금 공식을 외울 필요 없이 자동으로 합산된 파일을 그대로 신고 사이트에 올리면 돼요.',
    },
    PHASE2_SEVERANCE: {
      easyTitle: '💼 퇴직금 자동계산 · 14일 기한 알림 · 강사료',
      whenToUse: '1년 이상 일한 직원이 그만둘 때 퇴직금을 계산하거나, 외부 강사님 세금을 계산할 때 써요.',
      step1: '① 왼쪽 칸에서 그만두는 직원을 고르고 퇴사 날짜와 최근 3달치 월급을 적은 뒤 [등록]을 눌러요.',
      step2: '② 퇴사 후 14일 안에 꼭 주어야 하는 날짜와 퇴직금 금액이 자동으로 계산되어 나와요.',
      step3: '③ [퇴직금 정산서 엑셀] 버튼을 눌러 결재 서류로 바로 뽑아요.',
      tip: '법으로 정해진 14일 지급 마감일을 빨간색 알림으로 미리 알려주어 늦지 않게 도와줘요.',
    },
    PHASE3_ONBOARDING: {
      easyTitle: '✅ 입·퇴사 6가지 할 일 체크 · 주차장 차량등록',
      whenToUse: '새 직원이 들어오거나 나갈 때 빠뜨리기 쉬운 6가지 준비물(계약서·이메일·사원증·주차장·식당지문 등)을 챙길 때 써요.',
      step1: '① 왼쪽 칸에서 [입사] 또는 [퇴사]와 직원 이름을 고른 뒤 [원클릭 생성] 버튼을 눌러요.',
      step2: '② 만들어진 6가지 할 일 목록에서 다 챙긴 것은 [6단계 일괄완료]를 누르고, 자동차 번호는 오른쪽 칸에 적어요.',
      step3: '③ [체크리스트 엑셀]이나 [주차등록 엑셀]을 내려받아 담당 부서에 전달해요.',
      tip: '누가 새로 오더라도 6가지 할 일이 자동으로 만들어져서 하나도 빠뜨리지 않고 챙길 수 있어요.',
    },
    PHASE3_MEAL_APPROVALS: {
      easyTitle: '🍱 구내식당(웰스토리) 밥값 · 외주 용역비 결재서',
      whenToUse: '직원 식당에서 밥 먹은 인원을 정리하고, 매달 초 식당·외주 업체 비용 결재 서류를 만들 때 써요.',
      step1: '① 아침·점심·저녁·야식 식사 인원이나 외주 업체 금액을 적어요 (기계 자동수집 또는 엑셀 업로드 가능).',
      step2: '② 표에서 회사별 식사 인원과 세금(부가세)이 자동으로 나누어진 것을 확인해요.',
      step3: '③ 오른쪽 위의 [웰스토리 식수 엑셀], [고정거래처 품의 엑셀] 버튼을 눌러 결재 서류에 첨부해요.',
      tip: '식사 인원과 단가만 넣으면 공급가액과 부가세가 자동으로 계산되어 품의서 양식으로 딱 만들어져요.',
    },
    PHASE4_SCHEDULE_REPORT: {
      easyTitle: '📆 부서별 월근무표 · 연차휴가 · 수요일 인원보고',
      whenToUse: '매달 말일 다음 달 근무표를 승인하고, 매주 수요일 이사님께 드릴 인원 현황표를 뽑을 때 써요.',
      step1: '① 부서별 근무표와 연차 휴가 내역을 확인하고 [말일 근무표 일괄 최종승인] 버튼을 눌러요.',
      step2: '② 화면 가운데 [매주 수요일 이사님 인원보고] 표에서 회사별 현재 인원과 새로 온 사람·나간 사람 수를 확인해요.',
      step3: '③ [수요일 인원보고 엑셀] 버튼을 눌러 보고서 파일을 바로 내려받아요.',
      tip: '직원 명부에 등록된 인원이 수요일 보고서 표에 자동으로 합산되어 손으로 셀 필요가 없어요.',
    },
    PHASE4_CERT_TRAINING_IT: {
      easyTitle: '🎓 재직증명서 발급 · 5대 의무교육 · 산재 · 컴퓨터 요청',
      whenToUse: '재직증명서·세금완납증명서 발급, 5대 의무교육 확인, 다친 직원 산재 30일 기한 관리, 컴퓨터/장비 신청에 써요.',
      step1: '① 증명서 신청, 의무교육 확인, 산재 기록, 컴퓨터 요청 중 필요한 칸에 내용을 적고 등록해요.',
      step2: '② 산재가 발생하면 [30일 마감일]과 남은 날짜(D-Day)가 자동으로 표시돼요.',
      step3: '③ 오른쪽 위의 [엑셀 다운로드] 버튼을 눌러 관리 대장을 내려받아요.',
      tip: '직원들이 직접 증명서를 뽑게 하려면 맨 위 [🪪 직원 셀프포털] 링크를 문자로 보내주면 끝나요!',
    },
    PHASE5_BULK_AND_DDAY: {
      easyTitle: '📅 마감일(D-Day) 달력 · 엑셀 한번에 올리기',
      whenToUse: '이번 달 꼭 챙겨야 할 마감 날짜를 보거나, 여러 명의 직원·일용직·캐디·식사 기록을 엑셀로 한 번에 올릴 때 써요.',
      step1: '① 위쪽 [이달의 마감일 알림판]에서 빨간색(긴급) 상자를 누르면 그 업무 화면으로 바로 이동해요.',
      step2: '② 엑셀을 올리려면 아래쪽에서 ① 종류 선택 ➔ ② [빈 양식 다운로드] 클릭 ➔ ③ 내용 채운 뒤 [엑셀 업로드]를 눌러요.',
      step3: '③ 다 올렸으면 맨 위 초록색 [자동정산 실행] 버튼을 눌러 계산을 마무리해요.',
      tip: '손으로 한 명씩 치기 힘들 때 빈 엑셀 양식을 받아 복사·붙여넣기만 하면 100명도 1초 만에 등록돼요.',
    },
    EMPLOYEES: {
      easyTitle: '👥 전 직원 명부 · 수습 3개월 알림 · 기숙사',
      whenToUse: '새 직원을 명단에 올리거나 월급 변경, 수습 3개월 끝나는 직원 확인, 퇴사자 기숙사 방값 정산을 할 때 써요.',
      step1: '① 왼쪽 [신규 직원 등록] 칸에 이름, 회사, 부서, 기본급, 통장 계좌번호를 적고 [등록]을 눌러요.',
      step2: '② 아래쪽 표에서 수습 3개월이 다가오는 직원과 기숙사 퇴실 정산 내역을 확인해요.',
      step3: '③ 직원을 추가하거나 월급을 바꾼 뒤에는 맨 위 초록색 [자동정산 실행]을 눌러 월급표에 반영해요.',
      tip: '기숙사에서 나가는 직원은 들어온 날과 나간 날만 넣으면 머문 날짜만큼 방값이 자동 계산돼요.',
    },
    HITL_MAPPING: {
      easyTitle: '🔍 낯선 이름·오타 짝지어 주기 (실수 방지)',
      whenToUse: '엑셀을 올렸는데 오타가 있거나 처음 보는 부서·이름이 나왔을 때 정확한 이름과 짝지어 주는 화면이에요.',
      step1: '① 목록에서 어떤 낯선 이름(예: 부서 이름 오타)이 들어왔는지 확인해요.',
      step2: '② 연결할 정확한 부서 코드나 사번을 고르고 [승인 및 연결] 버튼을 눌러요.',
      step3: '③ 한 번만 짝지어 주면 다음부터는 똑같은 오타가 들어와도 컴퓨터가 알아서 척척 알아봐요.',
      tip: '컴퓨터가 멋대로 추측해서 엉뚱한 부서로 돈이 잘못 계산되는 것을 막아주는 똑똑한 안전장치예요.',
    },
    CONFIG: {
      easyTitle: '⚙️ 4대보험 비율 · 부서 코드 설정',
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
      title: '👋 신입사원 입사 등록부터 6단계 체크·차량·4대보험 신고까지',
      situation:
        '상황 예시: 블랙스톤벨포레 코스관리팀에 정규직 신입사원이 오늘 새로 출근했습니다. 무엇부터 해야 할까요?',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '직원 명부에 신입사원 기본정보 등록하기',
          howToExplain:
            '[전 직원 명부] 화면에서 사번, 성명, 소속 법인, 부서, 입사일, 월 기본급, 급여통장 계좌번호, 차량번호를 입력하고 [임직원 마스터 저장]을 누릅니다.',
          targetTab: 'EMPLOYEES',
          buttonLabel: '① 직원 명부 등록 화면 열기 ➔',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '입사 필수 6가지 절차(ERP·계약서·이메일·사원증·차량·지문) 한 번에 완료',
          howToExplain:
            '[입·퇴사 6단계 체크리스트] 화면에서 방금 등록한 직원을 고르고 [⚡ 원클릭 동시 완료] 버튼을 누르면 6가지 입사 절차와 주차차량 등록이 동시에 끝납니다.',
          targetTab: 'PHASE3_ONBOARDING',
          buttonLabel: '② 입·퇴사 6단계 체크 화면 열기 ➔',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '4대보험 자격취득 신고용 엑셀 파일 내려받기',
          howToExplain:
            '[원천세·4대보험 신고] 화면 오른쪽 위의 파란색 [4대보험 취득·상실·보수변경 EDI] 버튼을 눌러 엑셀을 내려받으면 입사 처리가 모두 완료됩니다.',
          targetTab: 'PHASE2_TAX_EDI',
          buttonLabel: '③ 4대보험 EDI 다운로드 화면 열기 ➔',
        },
      ],
    },
    {
      id: 'SCENARIO_2',
      badge: '시나리오 2 · 월급날 정산',
      title: '💵 매월 8일(일용직) · 10일(임직원) 월급 계산하고 은행이체·더존 전표 뽑기',
      situation:
        '상황 예시: 이번 달 일용직 출근기록과 연장수당을 반영해 3개 법인 월급을 계산하고 은행 이체파일과 회계전표를 만들어야 합니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '이번 달 일용직 근무일지와 연장수당·공제액 입력하기',
          howToExplain:
            '[일용직 출근기록·추가수당 입력] 화면에서 직원을 선택해 추가 수당(연장·상여)이나 공제액(기숙사·식대), 일용직 일당을 등록합니다.',
          targetTab: 'INPUTS',
          buttonLabel: '① 일용직·추가수당 입력 화면 열기 ➔',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '초록색 [자동정산 실행] 버튼 누르고 월급 계산표 확인하기',
          howToExplain:
            '상단 헤더의 초록색 [전사 급여·전표 자동정산 실행] 버튼을 누르면 3개 법인 전 직원의 세금·4대보험·실수령액이 자동 계산됩니다. 오른쪽 위 버튼으로 은행 이체파일과 코나카드 파일을 내려받습니다.',
          targetTab: 'MATRIX',
          buttonLabel: '② 월급 계산표·은행이체 화면 열기 ➔',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '더존 아마란스 회계전표 차대변 일치 확인 후 내려받기',
          howToExplain:
            '[더존 아마란스 급여전표] 화면에서 [차대변 일치] 표시를 확인하고 [더존 급여전표 엑셀 다운로드] 버튼을 눌러 회계팀에 전달합니다.',
          targetTab: 'VOUCHER',
          buttonLabel: '③ 더존 회계전표 화면 열기 ➔',
        },
      ],
    },
    {
      id: 'SCENARIO_3',
      badge: '시나리오 3 · 월초 정기품의',
      title: '🍱 매월 1~2일 웰스토리 식대 · 고정도급 · 하나BSN 용역비 품의서 만들기',
      situation:
        '상황 예시: 매월 초마다 올리는 삼성웰스토리 식대비, 고정 도급업체 수수료, 락산수/KMG 하나BSN 용역비 결재 품의서를 작성해야 합니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '일일 식수 인원(조·중·석·야식) 및 도급·하나BSN 청구액 입력',
          howToExplain:
            '[식수·식대·도급·하나BSN 품의] 화면 아래쪽 입력칸에 식수 인원과 고정거래처 도급비, 하나BSN 파견 용역비를 입력합니다.',
          targetTab: 'PHASE3_MEAL_APPROVALS',
          buttonLabel: '① 식수·도급·용역비 입력 화면 열기 ➔',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '3개 법인별 식수 합계와 공급가액·부가세 자동 집계 확인',
          howToExplain:
            '화면 중앙의 검은색 헤더 집계표에서 블랙스톤·KMG·락산수 법인별 총 식수 인원과 세금계산서 합계액이 맞는지 한눈에 확인합니다.',
          targetTab: 'PHASE3_MEAL_APPROVALS',
          buttonLabel: '② 법인별 식대 집계표 확인하기 ➔',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '결재 첨부용 품의서 엑셀 4종 원클릭 다운로드',
          howToExplain:
            '오른쪽 위의 [웰스토리 식수전달], [식대비 지급 품의서], [고정거래처 품의서], [하나BSN 용역비 품의서] 버튼을 눌러 결재 문서에 바로 첨부합니다.',
          targetTab: 'PHASE3_MEAL_APPROVALS',
          buttonLabel: '③ 품의서 엑셀 다운로드 화면 열기 ➔',
        },
      ],
    },
    {
      id: 'SCENARIO_4',
      badge: '시나리오 4 · 세금/캐디/퇴직금',
      title: '🏛️ 매월 10일 세금신고 · 15일 캐디/일용직 신고 · 퇴직금 14일 기한 정산',
      situation:
        '상황 예시: 매월 10일 원천세·지방세·주민세 신고와 15일 경기과 캐디 산재·일용직 신고, 퇴사자 퇴직금 정산을 처리해야 합니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '경기과 캐디 라운딩 수입 및 외부강사 사업소득 등록',
          howToExplain:
            '[원천세·4대보험 신고·캐디] 화면에서 캐디를 골라 라운딩 횟수와 캐디피 수입을 넣으면 경비율을 뺀 보수액과 산재·고용보험료가 자동 계산됩니다.',
          targetTab: 'PHASE2_TAX_EDI',
          buttonLabel: '① 세금·캐디·일용직 신고 화면 열기 ➔',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '퇴사자 발생 시 퇴직금 자동 비교 산출 (14일 지급기한 자동 표시)',
          howToExplain:
            '[퇴직금 자동계산] 화면에서 퇴사 직원을 고르면 기본급 기준 3개월 예상 급여가 자동으로 채워집니다. 퇴사일을 넣으면 법정 14일 지급기한과 퇴직금이 즉시 계산됩니다.',
          targetTab: 'PHASE2_SEVERANCE',
          buttonLabel: '② 퇴직금 14일 정산기 화면 열기 ➔',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '세무서·공단 신고용 엑셀 파일 내려받기',
          howToExplain:
            '각 화면 오른쪽 위의 [원천세·지방세·주민세], [일용직 근로내용확인], [캐디 산재신고], [퇴직금 산정내역서] 버튼을 눌러 엑셀을 내려받습니다.',
          targetTab: 'PHASE2_TAX_EDI',
          buttonLabel: '③ 세무·공단 신고 엑셀 받기 ➔',
        },
      ],
    },
    {
      id: 'SCENARIO_5',
      badge: '시나리오 5 · 수요일 보고/근무표',
      title: '📊 매주 수요일 이사님 인원변동 보고 & 월말 부서 근무표·연차 마감',
      situation:
        '상황 예시: 수요일 아침 이사님께 3개 법인 인원 현황을 보고하고, 월말에 부서별 근무표와 연차·산재·법정교육을 챙겨야 합니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '매주 수요일 이사님 보고용 3개 법인 인원변동표 확인 및 다운로드',
          howToExplain:
            '[월근무표·연차/휴무대장·수요일 인원보고] 화면을 열면 법인별 정규·계약·실습·일용·캐디 인원과 이달 입·퇴사자가 이미 집계되어 있습니다. [수요일 인원변동 팩] 버튼을 눌러 바로 출력하세요.',
          targetTab: 'PHASE4_SCHEDULE_REPORT',
          buttonLabel: '① 수요일 인원보고·근무표 화면 열기 ➔',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '부서별 월 근무표 일괄 승인 및 연차/잔여휴무 등록',
          howToExplain:
            '부서 근무표를 등록한 뒤 오른쪽 위의 초록색 [말일 월 근무표 최종취합본 일괄 품의 승인] 버튼을 한 번 누르면 모든 부서 근무표가 최종 승인됩니다.',
          targetTab: 'PHASE4_SCHEDULE_REPORT',
          buttonLabel: '② 말일 근무표 일괄승인 하러가기 ➔',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '완납/재직증명서 발급 · 5대 법정교육 · 산재 30일 기한 관리',
          howToExplain:
            '[각종 증명서·5대 법정교육·산재] 화면에서 세미나용 완납증명서 발급, 법정교육 이수율, 산재 발생 후 30일 이내 노동부 제출 기한을 관리합니다.',
          targetTab: 'PHASE4_CERT_TRAINING_IT',
          buttonLabel: '③ 증명서·법정교육·산재 화면 열기 ➔',
        },
      ],
    },
    {
      id: 'SCENARIO_6',
      badge: '시나리오 6 · 엑셀 대량업로드',
      title: '📥 기존 엑셀 파일 한 번에 올리기 & 오타(미등록 이름) 1:1 연결하기',
      situation:
        '상황 예시: 수십 명의 사원 명부나 일용직·캐디·식수 엑셀 파일을 일일이 손으로 입력하지 않고 한 번에 올리고 싶습니다.',
      steps: [
        {
          stepLabel: '순서 1',
          actionTitle: '오른쪽 위에서 [표준 업로드 양식 (.xlsx)] 내려받기',
          howToExplain:
            '[마감일(D-Day) 알림판·엑셀 한번에 올리기] 화면 오른쪽 위에서 원하는 양식(임직원/일용직/캐디/식수)을 내려받아 기존 엑셀 내용을 복사해 붙여넣습니다.',
          targetTab: 'PHASE5_BULK_AND_DDAY',
          buttonLabel: '① 엑셀 양식 받기·업로드 화면 열기 ➔',
        },
        {
          stepLabel: '순서 2',
          actionTitle: '파란색 점선 상자에 엑셀 파일 올리기',
          howToExplain:
            '업로드 종류(1~4번)를 고른 뒤 [엑셀 파일 선택 및 즉시 적재] 버튼을 눌러 파일을 올리면 수백 건도 즉시 저장됩니다.',
          targetTab: 'PHASE5_BULK_AND_DDAY',
          buttonLabel: '② 엑셀 파일 올리러 가기 ➔',
        },
        {
          stepLabel: '순서 3',
          actionTitle: '오타나 새 부서명이 있을 때 1:1로 짝지어 주기',
          howToExplain:
            '엑셀에 등록되지 않은 이름이나 오타가 있으면 [미등록 이름 확인 및 연결] 화면에 따로 모입니다. 올바른 사원이나 수당 항목을 골라 [승인]만 누르면 다음부터는 자동으로 인식합니다.',
          targetTab: 'HITL_MAPPING',
          buttonLabel: '③ 미등록 이름 연결 화면 열기 ➔',
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

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900">
      {/* ============================================================
          [최상단 글로벌 역할·포털 원클릭 스위처 바] 어느 모드에서든 1초 전환
         ============================================================ */}
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-1.5 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>BELLEFORET HR SMART CLOUD</span>
            <span className="hidden text-slate-600 sm:inline">|</span>
            <span className="hidden text-slate-400 sm:inline">
              솔라피 문자/알림톡 · 더존 아마란스 10 REST API 실시간 연동 가동중
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] font-bold text-slate-400">화면 모드 전환:</span>
            <button
              type="button"
              onClick={() => {
                setIsSelfOnboardStandaloneView(false);
                handleSwitchPortalMode(
                  'ADMIN_HQ',
                  '🔐 [인사 통합 컨트롤타워 (관리자 모드)]로 전환했습니다.'
                );
              }}
              className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold transition ${
                portalViewMode === 'ADMIN_HQ' && !isSelfOnboardStandaloneView
                  ? 'bg-emerald-500 text-slate-950 shadow-2xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              🔐 인사 통합 통제실
            </button>
            <button
              type="button"
              onClick={() =>
                handleSwitchPortalMode(
                  'EMP_PORTAL',
                  '🪪 [전 직원 전용 셀프 증명서·연차·급여명세서 포털]로 전환했습니다.'
                )
              }
              className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold transition ${
                portalViewMode === 'EMP_PORTAL'
                  ? 'bg-emerald-500 text-slate-950 shadow-2xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              🪪 직원 셀프포털
            </button>
            <button
              type="button"
              onClick={() =>
                handleSwitchPortalMode(
                  'DEPT_PORTAL',
                  '🏢 [현업 부서장 전용 직결 포털]로 전환했습니다.'
                )
              }
              className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold transition ${
                portalViewMode === 'DEPT_PORTAL'
                  ? 'bg-cyan-400 text-slate-950 shadow-2xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              🏢 부서장 포털
            </button>
            <button
              type="button"
              onClick={() => {
                handleSwitchPortalMode(
                  'SELF_ONBOARDING',
                  '📱 [합격자 모바일 셀프 입사등록 화면]을 열었습니다.'
                );
                setZeroTouchSubView('SELF_ONBOARD');
              }}
              className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold transition ${
                isSelfOnboardStandaloneView
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              📱 신입 셀프입사
            </button>
            <button
              type="button"
              onClick={() =>
                handleSwitchPortalMode(
                  'QR_POSTER',
                  '🖨️ [현장 부착용 QR포스터 3종 인쇄 화면]으로 전환했습니다.'
                )
              }
              className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold transition ${
                portalViewMode === 'QR_POSTER'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              🖨️ QR포스터 인쇄
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          [최상단 플로팅 알림창] 어떤 버튼을 누르든 화면 정중앙 상단에 즉시 반응 표시
         ============================================================ */}
      {(loading || uploadingExcel || actionPendingLabel || statusMessage || errorMessage) && (
        <div className="pointer-events-none fixed top-3 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4">
          {loading || uploadingExcel || actionPendingLabel ? (
            <div className="hr-toast-animate pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-slate-950/95 px-5 py-3.5 text-white shadow-2xl ring-4 ring-amber-400/20">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-amber-400" />
                <div>
                  <div className="text-xs font-extrabold text-amber-300">
                    ⏳ 버튼 실행 중 — 잠시만 기다려 주세요
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-white">
                    {actionPendingLabel ||
                      '요청하신 데이터를 처리하고 자동정산을 동기화하고 있습니다...'}
                  </div>
                </div>
              </div>
            </div>
          ) : errorMessage ? (
            <div
              key={`err-${toastTick}`}
              className="hr-toast-animate pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border-2 border-rose-500 bg-rose-950/95 px-5 py-3.5 text-white shadow-2xl ring-4 ring-rose-500/25"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
                <div>
                  <div className="text-[11px] font-extrabold text-rose-300">
                    🚨 입력 내용을 확인해 주세요
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-white">{errorMessage}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="shrink-0 rounded-lg bg-rose-800 px-3 py-1 text-xs font-extrabold text-white hover:bg-rose-700"
              >
                확인 ✕
              </button>
            </div>
          ) : statusMessage ? (
            <div
              key={`ok-${toastTick}`}
              className="hr-toast-animate pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-400 bg-slate-950/95 px-5 py-3.5 text-white shadow-2xl ring-4 ring-emerald-500/25"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <div className="text-[11px] font-extrabold text-emerald-300">
                    ✨ 버튼 동작 완료 알림
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-white">{statusMessage}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage('')}
                className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-extrabold text-white hover:bg-emerald-500"
              >
                닫기 ✕
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ============================================================
          [보안 분리 포털 1] 전 직원 셀프서비스 포털 (/?mode=emp-portal)
          - 타 직원 급여/인사 기밀 완전 차단 (관리자 메뉴 숨김)
          - 증명서 1초 셀프발급·인쇄, 내 연차/휴무 조회, 5대 법정교육 원클릭 이수, 모바일 전자사직서 제출
         ============================================================ */}
      {portalViewMode === 'EMP_PORTAL' && (
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
          <div className="rounded-2xl border-2 border-emerald-500 bg-slate-950 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-400 px-3 py-0.5 text-xs font-extrabold text-slate-950">
                    🪪 임직원 전용 셀프서비스 포털 (기밀분리 · 인사과 방문/전화 문의 {formatNumber(0)}건)
                  </span>
                </div>
                <h1 className="mt-2 text-lg font-extrabold text-white sm:text-xl">
                  벨포레 전 직원 증명서 1초 발급 · 잔여연차 조회 · 법정교육 · 전자사직서 포털
                </h1>
                <p className="mt-1 text-xs text-slate-300">
                  인사과에 전화하거나 방문할 필요 없이 본인 성명을 선택하면 재직/경력증명서·원천징수영수증 즉시 인쇄, 잔여 연차/휴무 확인, 5대 법정교육 이수, 전자사직서 제출이 즉시 처리됩니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPortalLink('emp-portal', '전 직원 셀프서비스 포털')}
                  className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3.5 py-2 text-xs font-extrabold text-emerald-200 hover:bg-emerald-500/30"
                >
                  🔗 직원 공지용 포털 링크 복사
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchPortalMode(
                      'ADMIN_HQ',
                      '🔐 [스마트 인사 통합 컨트롤타워] 화면으로 복귀했습니다.'
                    )
                  }
                  className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-extrabold text-slate-200 hover:bg-slate-700"
                >
                  🔐 관리자 통제실로 전환
                </button>
              </div>
            </div>

            {/* 본인 성명 선택 + 사번/휴대폰 뒤 4자리 본인 인증 잠금 바 */}
            <form
              onSubmit={handleVerifyEmpPortalPin}
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-extrabold text-emerald-300">
                  👤 1단계 본인 선택:
                </span>
                <select
                  value={empPortalSelectedEmpId}
                  onChange={(e) => {
                    setEmpPortalSelectedEmpId(Number(e.target.value));
                    setEmpPortalVerifiedEmpId(0);
                    setEmpPortalPinInput('');
                    setIssuedSelfCertPreview(null);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.empId} value={emp.empId}>
                      {emp.empName} ({emp.empNo}) — {emp.entityCode}
                    </option>
                  ))}
                </select>

                <span className="ml-1 text-xs font-extrabold text-amber-300">
                  🔑 2단계 본인 확인코드:
                </span>
                <input
                  type="password"
                  placeholder="사번 또는 휴대폰/계좌 뒤 4자리"
                  value={empPortalPinInput}
                  onChange={(e) => setEmpPortalPinInput(e.target.value)}
                  className="w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  🔓 본인 인증 확인
                </button>
                <button
                  type="button"
                  onClick={handleAutoUnlockEmpPortalForDemo}
                  className="rounded-lg border border-amber-400/60 bg-amber-400/15 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-400/25"
                >
                  ⚡ 원클릭 자동인증 (즉시열람)
                </button>
              </div>

              {empPortalVerifiedEmpId === Number(empPortalSelectedEmpId) && (
                <button
                  type="button"
                  onClick={() => {
                    setEmpPortalVerifiedEmpId(0);
                    setEmpPortalPinInput('');
                    triggerSuccessToast('🔒 개인정보 보호를 위해 본인 인증을 잠금 상태로 전환했습니다.');
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-rose-500"
                >
                  🔒 화면 잠금 (로그아웃)
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
                <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/70 p-8 text-center shadow-xs">
                  <div className="mx-auto max-w-xl space-y-3">
                    <span className="inline-block rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-slate-950">
                      🔒 개인 급여·연차·증명서 보안 잠금 상태
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
                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-slate-800"
                      >
                        🔓 {selEmp?.empName || '선택 직원'} 본인 인증 즉시 통과하고 내 급여명세서·연차·증명서 열기
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {/* 0. [신규] 이번 달 모바일 급여명세서 실시간 열람 및 인쇄 (시트 30, 32, 40번 무인화) */}
                <div className="rounded-2xl border-2 border-emerald-500 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                        시트 30, 32, 40번 · 인사과 급여문의 {formatNumber(0)}건화
                      </span>
                      <h2 className="mt-1 text-base font-extrabold text-slate-900">
                        💵 [{targetYm}] {selEmp.empName} ({selEmp.empNo}) 모바일 급여명세서
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
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                    >
                      🖨️ 내 급여명세서 인쇄 / PDF 저장
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
                    <div className="flex flex-col justify-between rounded-xl border-2 border-emerald-500 bg-emerald-50/60 p-4 text-xs">
                      <div>
                        <span className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-extrabold text-white">
                          차인지급액 (통장 입금액)
                        </span>
                        <div className="mt-2 text-2xl font-extrabold text-emerald-800">
                          {formatNumber(selPayslip?.netPay ?? 0)}원
                        </div>
                        <p className="mt-1 text-[11px] text-emerald-900">
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
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                      시트 16~18번 무인화
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-slate-900">
                      🏖️ 1. 내 잔여 연차 및 당월 휴무(OFF) 실시간 조회
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
                    <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/50 p-3">
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
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
                      <div className="text-[11px] font-bold text-indigo-800">당월 잔여 휴무(OFF)</div>
                      <div className="mt-1 text-lg font-extrabold text-indigo-700">
                        {formatNumber(selLeave?.monthlyOffRemaining ?? 0)}일
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 재직/경력증명서 & 원천징수영수증 1초 즉시 발급 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
                      시트 53, 55번 무인화
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-slate-900">
                      📄 2. 재직·경력증명서 / 원천징수영수증 1초 즉시 발급
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
                      className="w-full rounded-xl bg-indigo-600 py-2.5 font-extrabold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                    >
                      ⚡ 증명서 1초 즉시 발급 및 인쇄 미리보기 열기
                    </button>
                  </form>

                  {issuedSelfCertPreview && (
                    <div className="mt-4 rounded-xl border-2 border-slate-900 bg-slate-50 p-4 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                        <span className="font-mono text-[11px] font-bold text-slate-600">
                          문서번호: {issuedSelfCertPreview.certNo}
                        </span>
                        <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
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
                        className="mt-3 w-full rounded-lg bg-slate-900 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                      >
                        🖨️ 지금 바로 인쇄 / PDF 저장하기
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. 5대 법정필수교육 원클릭 온라인 이수 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                      시트 58번 무인화
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-slate-900">
                      🎓 3. 5대 법정의무교육 원클릭 온라인 이수 서명
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
                      className="w-full rounded-xl bg-emerald-600 py-2.5 font-extrabold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                    >
                      ✅ 5대 법정의무교육 전 과목 온라인 수료 및 본인 전자서명 완료
                    </button>
                  </div>
                </div>

                {/* 4. 모바일 전자사직서 셀프 제출 & 기숙사 퇴실 정산 */}
                <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                      시트 11, 28, 37번 무인 직결
                    </span>
                    <h2 className="mt-1 text-base font-extrabold text-slate-900">
                      📝 4. 모바일 전자사직서 셀프 제출 (일할급여·기숙사 자동정산)
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
                      ✍️ 전자사직서 제출 및 퇴사 6단계·기숙사·일할급여 자동정산 직결
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
          - 전사 급여 기밀 완벽 차단 (부서장이 직접 일용직 출근·주차·주간보고·월근무표 등록)
         ============================================================ */}
      {portalViewMode === 'DEPT_PORTAL' && (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <div className="rounded-2xl border-2 border-cyan-500 bg-slate-950 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-full bg-cyan-400 px-3 py-0.5 text-xs font-extrabold text-slate-950">
                  🏢 현업 부서장(팀장·파트장) 전용 업무 직결 포털 (인사과 취합 공수 {formatNumber(0)}시간)
                </span>
                <h1 className="mt-2 text-lg font-extrabold text-white sm:text-xl">
                  부서별 일용직 출근기록 · 내방객 차량 주차(LPR) · 수요일 주간보고 · 익월 근무표 직접 등록
                </h1>
                <p className="mt-1 text-xs text-slate-300">
                  인사과에 카톡이나 수기 엑셀로 보낼 필요 없이 부서장님이 이곳에서 입력하면 전사 급여·주차관제·이사님 보고서로 즉시 직결됩니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPortalLink('dept-portal', '현업 부서장 전용 포털')}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-500/20 px-3.5 py-2 text-xs font-extrabold text-cyan-200 hover:bg-cyan-500/30"
                >
                  🔗 부서장 단톡방 공유용 링크 복사
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchPortalMode(
                      'ADMIN_HQ',
                      '🔐 [스마트 인사 통합 컨트롤타워] 화면으로 복귀했습니다.'
                    )
                  }
                  className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-extrabold text-slate-200 hover:bg-slate-700"
                >
                  🔐 관리자 통제실로 전환
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 1. 오늘자 부서 일용직 출근기록 등록 (시트 24번) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                시트 24번 · 8일 일용직 급여 직결
              </span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">
                👷 1. 부서 일용직 출근기록 즉시 등록
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
                  className="w-full rounded-xl bg-emerald-600 py-2.5 font-extrabold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  ✅ 일용직 출근 등록 및 세금·급여원장 즉시 반영
                </button>
              </form>
            </div>

            {/* 2. 내방객 · VIP · 신규차량 주차관제 LPR 등록 (시트 39번) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="rounded bg-cyan-100 px-2 py-0.5 text-[10px] font-extrabold text-cyan-800">
                시트 39번 · 주차 차단기 LPR 직결
              </span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">
                🚗 2. 내방객 · VIP · 업체 차량 주차관제(LPR) 등록
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
                  className="w-full rounded-xl bg-cyan-700 py-2.5 font-extrabold text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  🚗 주차관제 차단기(LPR) 즉시 등록
                </button>
              </form>
            </div>

            {/* 3. 매주 수요일 부서 주간업무보고 & 팀장 휴무일 제출 (시트 60번) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
                시트 60번 · 수요일 이사님 보고 직결
              </span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">
                📊 3. 수요일 부서 주간업무보고 & 팀장 휴무일정 제출
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
                <div>
                  <label className="mb-1 block font-bold text-slate-700">
                    금주 주요 실적 및 차주 계획 *
                  </label>
                  <input
                    type="text"
                    placeholder="코스 그린 보수 완료 / 차주 카트 점검"
                    value={weeklyReportForm.thisWeekAchievements}
                    onChange={(e) =>
                      setWeeklyReportForm({
                        ...weeklyReportForm,
                        thisWeekAchievements: e.target.value,
                        nextWeekPlans: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-indigo-800">
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
                    className="w-full rounded-lg border border-indigo-300 bg-indigo-50/30 px-2.5 py-1.5"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 font-extrabold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  📋 주간업무보고 및 팀장 휴무일정 즉시 제출
                </button>
              </form>
            </div>

            {/* 4. 매월 말 부서 익월 근무표 제출 (시트 15번) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                시트 15번 · 말일 근무표 일괄품의 직결
              </span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">
                🗓️ 4. 매월 말 부서 근무표(스케줄) 제출
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
                  className="w-full rounded-xl bg-slate-900 py-2.5 font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  🗓️ 부서 월 근무표 제출 완료
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
          <div className="rounded-2xl border-2 border-amber-400 bg-slate-950 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-full bg-amber-400 px-3 py-0.5 text-xs font-extrabold text-slate-950">
                  🖨️ 현장 부착용 QR코드 안내문 3종 즉시 인쇄 키트 (구내식당 · 기숙사 · 경기과 · 부서장실)
                </span>
                <h1 className="mt-2 text-lg font-extrabold text-white sm:text-xl">
                  인사과 방문·전화 문의를 원천 차단하는 현장 부착용 셀프 포털 QR 포스터
                </h1>
                <p className="mt-1 text-xs text-slate-300">
                  오른쪽 <strong>[🖨️ A4 포스터 3종 인쇄하기]</strong> 버튼을 눌러 출력한 뒤 구내식당, 기숙사 게시판, 경기과 캐디실, 각 부서 사무실에 부착하세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                  className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-md hover:bg-amber-300"
                >
                  🖨️ A4 포스터 3종 지금 바로 인쇄 / PDF 저장
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchPortalMode(
                      'ADMIN_HQ',
                      '🔐 [스마트 인사 통합 컨트롤타워] 화면으로 복귀했습니다.'
                    )
                  }
                  className="rounded-xl bg-slate-800 px-3.5 py-2.5 text-xs font-extrabold text-slate-200 hover:bg-slate-700"
                >
                  🔐 관리자 통제실로 전환
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                posterNo: '안내문 1 · 채용장소/대기실/경기과 부착용',
                badgeColor: 'bg-amber-500 text-slate-950',
                borderColor: 'border-amber-400',
                title: '📱 신규 입사자 · 일용직 · 캐디\n스마트폰 1분 셀프 입사등록',
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
                badgeColor: 'bg-emerald-500 text-slate-950',
                borderColor: 'border-emerald-500',
                title: '🪪 벨포레 전 직원 급여명세서 ·\n잔여연차 · 증명서 1초 발급',
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
                badgeColor: 'bg-cyan-400 text-slate-950',
                borderColor: 'border-cyan-500',
                title: '🏢 현업 부서장 전용 일용직 출근 ·\n내방객 주차(LPR) · 주간보고',
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
                className={`flex flex-col justify-between rounded-2xl border-2 ${p.borderColor} bg-white p-6 shadow-md`}
              >
                <div>
                  <span className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-extrabold ${p.badgeColor}`}>
                    {p.posterNo}
                  </span>
                  <h2 className="mt-3 whitespace-pre-line text-lg font-extrabold leading-snug text-slate-950">
                    {p.title}
                  </h2>
                  <p className="mt-1.5 text-xs font-semibold text-slate-600">{p.subtitle}</p>

                  {/* QR 코드 그래픽 박스 */}
                  <div className="my-5 flex flex-col items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-50 p-4">
                    <svg
                      viewBox="0 0 110 110"
                      className="h-36 w-36 rounded-lg border border-slate-300 bg-white p-2"
                      aria-label={p.title}
                    >
                      {/* 좌상단 파인더 패턴 */}
                      <rect x="6" y="6" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="4" />
                      <rect x="14" y="14" width="12" height="12" fill="#0f172a" />
                      {/* 우상단 파인더 패턴 */}
                      <rect x="76" y="6" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="4" />
                      <rect x="84" y="14" width="12" height="12" fill="#0f172a" />
                      {/* 좌하단 파인더 패턴 */}
                      <rect x="6" y="76" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="4" />
                      <rect x="14" y="84" width="12" height="12" fill="#0f172a" />
                      {/* 데이터 모듈 패턴 */}
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

                  <div className="space-y-1.5 rounded-xl bg-slate-100 p-3.5 text-xs text-slate-800">
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
                    🔗 주소 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        p.targetPortalMode,
                        `👉 [${p.posterNo}] 실제 포털 화면으로 이동했습니다!`
                      )
                    }
                    className="flex-1 rounded-xl bg-slate-900 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                  >
                    포털 바로 열기 ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {portalViewMode !== 'EMP_PORTAL' &&
        portalViewMode !== 'DEPT_PORTAL' &&
        portalViewMode !== 'QR_POSTER' && (
        <>
      {/* ============================================================
          상단 고정 엔터프라이즈 커맨드 헤더 (Sticky Command Header)
         ============================================================ */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white shadow-lg backdrop-blur-md">
        {/* 1단: 브랜드 타이틀 + 1초 키워드 검색창 + 귀속연월 + 정산 실행 CTA */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-white sm:text-base">
                  벨포레 인사(HR) 통합 자동화 컨트롤타워
                </h1>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                  ERP · 솔라피 · 6대포털 직결
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                (주)블랙스톤벨포레 · (주)케이엠지 · 농업회사법인 락산수(주)
              </p>
            </div>
          </div>

          {/* 중앙: 1초 업무 검색창 (아무 키워드나 치면 즉시 해당 화면 이동) */}
          <div className="relative flex-1 min-w-[230px] max-w-sm">
            <input
              type="text"
              value={quickMenuSearch}
              onChange={(e) => setQuickMenuSearch(e.target.value)}
              placeholder="🔍 업무 1초 검색 (예: 퇴직금, 문자, 아마란스, 캐디, 식수, 연차...)"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-1.5 text-xs font-semibold text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
            {quickMenuSearch && (
              <button
                type="button"
                onClick={() => setQuickMenuSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
            {filteredQuickSearchItems.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-emerald-500/50 bg-slate-900 p-2 shadow-2xl">
                <div className="mb-1 px-2 text-[10px] font-bold text-emerald-400">
                  검색 결과 ({formatNumber(filteredQuickSearchItems.length)}건) — 클릭하면 즉시 이동합니다
                </div>
                {filteredQuickSearchItems.map((qItem) => (
                  <button
                    key={qItem.key}
                    type="button"
                    onClick={() => {
                      if (qItem.subView) {
                        setZeroTouchSubView(qItem.subView);
                      }
                      setQuickMenuSearch('');
                      navigateToWorkspace(
                        qItem.targetTab,
                        `🔍 [${qItem.badge}] "${qItem.title}" 화면으로 즉시 이동했습니다!`,
                        true
                      );
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-emerald-600 hover:text-white"
                  >
                    <span className="truncate font-bold">{qItem.title}</span>
                    <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                      {qItem.badge} ➔
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* 초보자 사용법 토글 버튼 */}
            <button
              onClick={() => {
                const next = !showBeginnerGuide;
                setShowBeginnerGuide(next);
                triggerSuccessToast(
                  next
                    ? '💡 [초보자 3단계 사용법 & 6대 실전 시나리오] 안내판을 펼쳤습니다!'
                    : '💡 초보자 사용법 안내판을 접어 업무 화면을 넓혔습니다.'
                );
              }}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-extrabold transition ${
                showBeginnerGuide
                  ? 'border-amber-400 bg-amber-400 text-slate-950 shadow-xs'
                  : 'border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              <span>💡 {showBeginnerGuide ? '가이드 닫기 ▲' : '초보자 가이드 ▼'}</span>
            </button>

            {/* D-Day 기한 상태 퀵 배지 */}
            <button
              onClick={() =>
                navigateToWorkspace(
                  'PHASE5_BULK_AND_DDAY',
                  '🔔 [마감일(D-Day) 알림판 · 엑셀 한번에 올리기] 화면으로 이동했습니다!'
                )
              }
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                (phase5Summary?.urgentAlertCount ?? 0) > 0
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
              title="이달의 마감일(D-Day) 확인하기"
            >
              <BellRing className="h-3.5 w-3.5 text-rose-400" />
              <span>D-Day {formatNumber(phase5Summary?.urgentAlertCount ?? 0)}건</span>
            </button>

            {/* 미분류 상태 퀵 배지 */}
            <button
              onClick={() =>
                navigateToWorkspace(
                  'HITL_MAPPING',
                  '⚠️ [미등록 이름 확인 및 1:1 연결] 화면으로 이동했습니다!'
                )
              }
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                pendingMappingCount > 0
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
              title="미등록 부서·이름 확인하기"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>미분류 {formatNumber(pendingMappingCount)}건</span>
            </button>

            {/* 귀속연월 선택기 */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs">
              <CalendarClock className="h-3.5 w-3.5 text-emerald-400" />
              <input
                type="month"
                value={targetYm}
                onChange={(e) => {
                  setTargetYm(e.target.value);
                  triggerSuccessToast(
                    `📅 작업 연월이 [${e.target.value}]로 변경되어 해당 월 데이터를 불러옵니다.`
                  );
                }}
                className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-bold text-white focus:outline-none"
              />
            </div>

            {/* 전사 급여·전표 자동정산 메인 버튼 */}
            <button
              onClick={handleRunSettlement}
              disabled={loading || !targetYm}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-emerald-400 disabled:opacity-50"
            >
              <Calculator className="h-3.5 w-3.5" />
              {loading ? '⏳ 계산중...' : '⚡ 자동정산 실행'}
            </button>

            <button
              onClick={() =>
                runWithFeedback(
                  '최신 인사·급여 데이터를 새로고침하고 있습니다...',
                  async () => `🔄 [${targetYm}] 최신 인사·급여 데이터를 새로고침했습니다!`
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
              title="최신 데이터 새로고침"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2단: 5대 핵심 인사 도메인 + 세부 워크스페이스 통합 슬림 네비게이션 */}
        <div className="border-t border-slate-800/80 bg-slate-900/95">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-2">
            <div className="grid flex-1 grid-cols-2 gap-1.5 md:grid-cols-5">
              {navDomains.map((dom) => {
                const DomIcon = dom.icon;
                const isDomActive = dom.domainId === activeDomain.domainId;
                return (
                  <button
                    key={dom.domainId}
                    onClick={() => navigateToWorkspace(dom.tabs[0].id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left transition ${
                      isDomActive
                        ? 'bg-emerald-500 text-slate-950 shadow-xs ring-2 ring-emerald-300'
                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <DomIcon
                      className={`h-4 w-4 shrink-0 ${
                        isDomActive ? 'text-slate-950' : 'text-emerald-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-extrabold">
                        {dom.domainTitle}
                      </div>
                      <div
                        className={`truncate text-[10px] ${
                          isDomActive ? 'font-semibold text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {dom.domainDesc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                const next = !showAllMenuGrid;
                setShowAllMenuGrid(next);
              }}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition ${
                showAllMenuGrid
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {showAllMenuGrid ? '전체 메뉴 닫기 ▲' : '전체 13개 메뉴 ▼'}
            </button>
          </div>
        </div>

        {/* 3단: 선택된 도메인의 세부 워크스페이스 탭 바 */}
        <div className="border-t border-slate-800/60 bg-slate-950">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">
                세부 탭:
              </span>
              {activeDomain.tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isTabActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateToWorkspace(tab.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      isTabActive
                        ? 'bg-white text-slate-950 shadow-xs ring-2 ring-emerald-400'
                        : 'bg-slate-900 text-slate-300 ring-1 ring-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <TabIcon
                      className={`h-3.5 w-3.5 ${
                        isTabActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{tab.shortTitle}</span>
                    {tab.badgeCount !== undefined && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                          tab.badgeTone === 'rose' && tab.badgeCount > 0
                            ? 'bg-rose-600 text-white'
                            : tab.badgeTone === 'amber' && tab.badgeCount > 0
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {formatNumber(tab.badgeCount)}건
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden items-center gap-2 text-[11px] text-slate-400 lg:flex">
              <span>현재 화면:</span>
              <strong className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                {activeTabMeta.shortTitle}
              </strong>
            </div>
          </div>
        </div>

        {/* 전체 13개 워크스페이스 메가 메뉴 그리드 (토글 시 오픈) */}
        {showAllMenuGrid && (
          <div className="border-t border-slate-800 bg-slate-900/98 shadow-2xl">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-4 md:grid-cols-5">
              {navDomains.map((dom) => (
                <div
                  key={dom.domainId}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="mb-2 border-b border-slate-800 pb-1.5 text-xs font-extrabold text-emerald-400">
                    {dom.domainTitle}
                  </div>
                  <div className="space-y-1.5">
                    {dom.tabs.map((t) => {
                      const TIcon = t.icon;
                      const isCurrent = activeTab === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setShowAllMenuGrid(false);
                            navigateToWorkspace(t.id);
                          }}
                          className={`w-full rounded-lg p-2 text-left transition ${
                            isCurrent
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1.5 text-xs font-bold">
                              <TIcon className="h-3.5 w-3.5 shrink-0" />
                              {t.shortTitle}
                            </span>
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] ${
                              isCurrent ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            {t.rowBadge} · {t.subDesc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-6 py-5">
        {/* ============================================================
            [초등학생도 10초 만에 따라 하는 1·2·3·4 숫자 버튼 순서도]
            - 오와 열(높이·여백·하단 버튼 위치) 100% 정렬 + 세련된 네이비/에메랄드 톤앤매너
           ============================================================ */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-emerald-300">
                🧒 초간단 1 · 2 · 3 · 4 순서도
              </span>
              <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
                어려운 인사 업무, 왼쪽부터 [1번 ➔ 2번 ➔ 3번 ➔ 4번] 순서대로만 누르면 끝납니다!
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              모든 버튼은 누르는 즉시 자동 계산·연동됩니다
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1번 카드 */}
            <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-600 hover:bg-white hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    1번 할 일
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">자동 수집</span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                  📡 기계 기록 한 번에 모으기
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  식당 밥값·캐디 출근·주차장 차량·아마란스 출퇴근 기록을 컴퓨터가 자동으로 가져와요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ZERO_TOUCH_HQ');
                  setZeroTouchSubView('COLLECTOR_AUDIT');
                  void handleTriggerCollectorSync(
                    'ALL',
                    '4대 현장 단말기(캐디POS·웰스토리·주차LPR·아마란스) 통합'
                  );
                }}
                className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-extrabold text-white transition hover:bg-slate-800"
              >
                1번 기록 모으기 실행 ➔
              </button>
            </div>

            {/* 2번 카드 */}
            <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-600 hover:bg-white hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-emerald-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    2번 할 일
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">자동 계산</span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                  💰 전 직원 월급·세금 계산하기
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  블랙스톤·KMG·락산수 직원의 월급과 4대보험·세금·회계장부를 계산기 없이 자동 계산해요.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunSettlement}
                className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-extrabold text-white transition hover:bg-emerald-500"
              >
                2번 월급 자동계산 실행 ➔
              </button>
            </div>

            {/* 3번 카드 */}
            <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-600 hover:bg-white hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    3번 할 일
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700">더존 · 세무신고</span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                  🏢 더존 결재 · 세금신고 올리기
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  더존 아마란스 전자결재와 회계전표, 국세청·4대보험 신고를 버튼 하나로 한 번에 올려요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ZERO_TOUCH_HQ');
                  setZeroTouchSubView('AMARANTH_RPA');
                  void handleExecuteAmaranthRestApiModule(
                    'ALL',
                    '더존 아마란스 10 4대 모듈(인사·전자결재·회계전표·SSO) 전체 연동'
                  );
                }}
                className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-extrabold text-white transition hover:bg-slate-800"
              >
                3번 결재·신고 올리기 ➔
              </button>
            </div>

            {/* 4번 카드 */}
            <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-600 hover:bg-white hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    4번 할 일
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700">솔라피 문자</span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                  📨 직원들에게 카톡·문자 보내기
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  신입사원 입사등록 링크나 이번 달 월급명세서 확인 주소를 직원 휴대폰 문자로 바로 보내요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ZERO_TOUCH_HQ');
                  setZeroTouchSubView('SOLAPI_PORTALS');
                  triggerSuccessToast(
                    '📨 [4번 할 일: 솔라피 문자/알림톡 보내기] 화면으로 이동했습니다!'
                  );
                }}
                className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-extrabold text-white transition hover:bg-indigo-500"
              >
                4번 문자 보내기 열기 ➔
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================
            [초보자 전용] 아무 지식이 없어도 1분이면 끝나는 3단계 사용법 & 실전 시나리오 따라하기 (토글 오픈 시 표시)
           ============================================================ */}
        {showBeginnerGuide && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-base font-extrabold text-emerald-300">
                  💡
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    처음 오셨나요? 초등학생도 따라 하는 [상황별 1·2·3 순서 안내판]
                  </h2>
                  <p className="text-xs text-slate-600">
                    어려운 계산 공식은 몰라도 괜찮아요! 아래에서 오늘 할 일을 고르고 버튼을 누르면 그 화면으로 바로 데려다줍니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBeginnerGuide(false)}
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                안내판 접어두기 ▲
              </button>
            </div>

            {/* 실전 업무 시나리오 6선 단계별 따라하기 */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {practiceScenarios.map((sc) => {
                  const isSelected = sc.id === activeScenario.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => {
                        setSelectedScenarioId(sc.id);
                        setActiveTab(sc.steps[0].targetTab);
                      }}
                      className={`flex h-full flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`inline-block w-fit rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                            isSelected
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sc.badge}
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-extrabold leading-snug">{sc.title}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3.5 rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                  {activeScenario.steps.map((st, idx) => {
                    const isCurrentStepTab = activeTab === st.targetTab;
                    return (
                      <div
                        key={idx}
                        className={`flex h-full flex-col justify-between rounded-xl border p-4 ${
                          isCurrentStepTab
                            ? 'border-emerald-600 bg-emerald-50/30'
                            : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div>
                          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            {st.stepLabel}
                          </span>
                          <div className="mt-2 text-xs font-extrabold text-slate-900">
                            {st.actionTitle}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                            {st.howToExplain}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            navigateToWorkspace(
                              st.targetTab,
                              `👉 [${activeScenario.badge} - ${st.stepLabel}] "${st.actionTitle}" 화면이 열렸습니다!`,
                              true
                            )
                          }
                          className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 text-xs font-extrabold text-white hover:bg-slate-800"
                        >
                          {st.buttonLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================
            전사 실시간 핵심 지표 6열 요약 카드 (오와 열 높이·폰트·테두리 완벽 통일)
           ============================================================ */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <button
            onClick={() =>
              navigateToWorkspace(
                'PHASE4_SCHEDULE_REPORT',
                '👥 [총 재직인원 및 수요일 이사님 인원변동 보고] 화면으로 이동했습니다!'
              )
            }
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>우리 회사 총 인원</span>
              <Users className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-2 font-mono text-lg font-extrabold tracking-tight text-slate-900">
              {formatNumber(phase4Summary?.grandTotalActiveHeadcount)}명
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              입사 +{formatNumber(phase4Summary?.grandTotalMonthlyNewHires)} / 퇴사 -
              {formatNumber(phase4Summary?.grandTotalMonthlyResignees)}
            </div>
          </button>

          <button
            onClick={() =>
              navigateToWorkspace(
                'MATRIX',
                '💵 [3개 회사 월급 계산표] 화면으로 이동했습니다!'
              )
            }
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>세전 월급 총액</span>
              <Calculator className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-2 font-mono text-lg font-extrabold tracking-tight text-slate-900">
              {formatNumber(getDisplayedSummaryMetric('grossPay'))}원
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              계산 대상 {formatNumber(getDisplayedSummaryMetric('headcount'))}명
            </div>
          </button>

          <button
            onClick={() =>
              navigateToWorkspace(
                'MATRIX',
                '🏦 [실제 통장 입금액 및 하나은행 이체 엑셀] 화면으로 이동했습니다!'
              )
            }
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>실제 통장 입금액</span>
              <Landmark className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-2 font-mono text-lg font-extrabold tracking-tight text-emerald-700">
              {formatNumber(getDisplayedSummaryMetric('netPay'))}원
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              세금·보험 {formatNumber(getDisplayedSummaryMetric('totalDeduction'))}원 제외
            </div>
          </button>

          <button
            onClick={() =>
              navigateToWorkspace(
                'VOUCHER',
                '🧾 [더존 아마란스 회계전표] 화면으로 이동했습니다!'
              )
            }
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>더존 회계장부 검사</span>
              <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
              {voucherBalanceCheck?.isBalanced ? '금액 일치 (정상)' : '계산 대기'}
            </div>
            <div className="mt-1 font-mono text-[11px] font-medium text-emerald-700">
              오차 {formatNumber(voucherBalanceCheck?.varianceDelta)}원
            </div>
          </button>

          <button
            onClick={() =>
              navigateToWorkspace(
                'PHASE5_BULK_AND_DDAY',
                '🔔 [이달의 마감일(D-Day) 달력] 화면으로 이동했습니다!'
              )
            }
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>이달의 마감일 알림</span>
              <BellRing className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div className="mt-2 text-lg font-extrabold tracking-tight text-rose-600">
              급한 일 {formatNumber(phase5Summary?.urgentAlertCount)}건
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              완료 {formatNumber(phase5Summary?.completedAlertCount)}건 / 예정{' '}
              {formatNumber(phase5Summary?.upcomingAlertCount)}건
            </div>
          </button>

          <button
            onClick={() =>
              navigateToWorkspace(
                'HITL_MAPPING',
                '⚠️ [낯선 이름·오타 짝지어 주기] 화면으로 이동했습니다!'
              )
            }
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>오타·새 이름 확인</span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div
              className={`mt-2 text-lg font-extrabold tracking-tight ${
                pendingMappingCount > 0 ? 'text-amber-600' : 'text-emerald-700'
              }`}
            >
              확인 필요 {formatNumber(pendingMappingCount)}건
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              엑셀 등록 누적 {formatNumber(phase5Summary?.totalBulkImportedRows)}건
            </div>
          </button>
        </div>

        {/* ============================================================
            [슬림 컨텍스트 바] 현재 화면 요약 + 쉬운 3단계 따라하기
           ============================================================ */}
        <div
          id="hr-workspace-anchor"
          key={`ws-anchor-${workspaceFlashTick}`}
          className="hr-section-flash scroll-mt-36 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-white shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-emerald-400 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-950">
                📍 지금 보고 있는 화면
              </span>
              <h3 className="text-xs font-extrabold text-white sm:text-sm">
                {currentGuide.easyTitle}
              </h3>
              <span className="hidden text-xs text-slate-300 xl:inline">
                — {currentGuide.whenToUse}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowGuideDetail((prev) => !prev)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-slate-700"
            >
              {showGuideDetail ? '쉬운 설명 접기 ▲' : '📖 이 화면 쉽게 쓰는 법 보기 ▼'}
            </button>
          </div>
          {showGuideDetail && (
            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-800 pt-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs leading-relaxed">
                <div className="font-extrabold text-emerald-400">1단계 따라하기</div>
                <div className="mt-1 text-slate-200">{currentGuide.step1}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs leading-relaxed">
                <div className="font-extrabold text-emerald-400">2단계 따라하기</div>
                <div className="mt-1 text-slate-200">{currentGuide.step2}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs leading-relaxed">
                <div className="font-extrabold text-emerald-400">3단계 따라하기</div>
                <div className="mt-1 text-slate-200">{currentGuide.step3}</div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            [탭 0 - 핵심] 자동화 홈 (ZERO_TOUCH_HQ): 포커스 서브탭 지원
           ============================================================ */}
        {activeTab === 'ZERO_TOUCH_HQ' && (
          <div className="space-y-5">
            {/* 컨트롤타워 내부 포커스 서브탭 바 (보고 싶은 화면만 깔끔하게 선택) */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 text-xs font-extrabold text-slate-700">
                  🎯 보고 싶은 기능만 골라보기:
                </span>
                {(
                  [
                    { id: 'ALL', label: '📊 전체 한눈에 보기' },
                    { id: 'AMARANTH_RPA', label: '🏢 3번: 더존 아마란스 결재 · 세금신고' },
                    { id: 'SOLAPI_PORTALS', label: '📨 4번: 솔라피 문자보내기 · 직원용 링크' },
                    { id: 'COLLECTOR_AUDIT', label: '📡 1번: 기계 기록 모으기 · 실수 자동검사' },
                    { id: 'SELF_ONBOARD', label: '📱 신입사원 스마트폰 입사등록 칸' },
                  ] as const
                ).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setZeroTouchSubView(sub.id)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                      zeroTouchSubView === sub.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 상단: 스마트 자동화 요약 배너 (세련된 딥 네이비 + 에메랄드 포인트) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-emerald-500 px-2.5 py-0.5 text-xs font-extrabold text-slate-950">
                      ✨ 벨포레 자동화 홈
                    </span>
                    <span className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                      손으로 다시 치는 작업 {formatNumber(0)}건 · 버튼 하나로 끝내는 인사관리
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                    기계 기록 모으기 ➔ 월급 자동계산 ➔ 더존 결재·세금신고 ➔ 직원 문자발송 통합 화면
                  </h2>
                  <p className="text-xs leading-relaxed text-slate-300">
                    이력서나 통장 번호를 손으로 다시 치거나, 여러 사이트(더존 아마란스·국세청·4대보험·웰스토리)에 일일이 들어가서 올릴 필요가 없습니다. 아래 버튼만 누르면 컴퓨터가 대신 처리합니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleCopySelfOnboardingLink}
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-extrabold text-white transition hover:bg-slate-800"
                  >
                    <Link2 className="h-4 w-4 text-emerald-400" />
                    🔗 신입사원 카톡 전송용 [입사링크] 복사
                  </button>
                  <button
                    onClick={() =>
                      handleTriggerCollectorSync(
                        'ALL',
                        '4대 현장 단말기(캐디POS·웰스토리·주차LPR·아마란스) 통합'
                      )
                    }
                    disabled={loading}
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Cpu className="h-4 w-4 text-emerald-400" />
                    📡 1번: 기계 기록 지금 모으기
                  </button>
                  <button
                    onClick={handleDispatchAllRpaJobs}
                    disabled={loading}
                    className="flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-extrabold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <Bot className="h-4 w-4" />
                    🚀 3번: 6개 사이트 결재·신고 한 번에 끝내기
                  </button>
                </div>
              </div>

              {/* 스마트 자동화 5대 실측 지표 카드 (오와 열 동일 높이) */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    자동화 작동 상태
                  </div>
                  <div className="mt-1.5 text-base font-extrabold text-emerald-400">
                    정상 작동 중
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    반복 타이핑·결재 자동 처리
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    아낀 업무 시간
                  </div>
                  <div className="mt-1.5 font-mono text-base font-extrabold text-white">
                    월 {formatNumber(headcountReductionSummary?.estimatedMonthlyHoursSaved ?? 0)}시간 절약
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {formatNumber(61)}가지 인사 업무 자동화
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    결재·세금신고 자동 완료
                  </div>
                  <div className="mt-1.5 font-mono text-base font-extrabold text-white">
                    완료 {formatNumber(headcountReductionSummary?.rpaCompletedOrDispatchedCount ?? 0)} /{' '}
                    {formatNumber(headcountReductionSummary?.rpaTotalJobsCount ?? 6)}건
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-400">
                    대기 중 {formatNumber(headcountReductionSummary?.rpaPendingApprovalCount ?? 0)}건
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    기계에서 모아온 기록
                  </div>
                  <div className="mt-1.5 font-mono text-base font-extrabold text-white">
                    총 {formatNumber(headcountReductionSummary?.collectorTotalSyncedRecords ?? 0)}건
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    캐디 · 식당 · 주차장 · 출퇴근
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    신입사원 스스로 등록
                  </div>
                  <div className="mt-1.5 font-mono text-base font-extrabold text-emerald-400">
                    {formatNumber(headcountReductionSummary?.selfOnboardedCount ?? 0)}명 완료
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    인사팀 직접 타이핑 {formatNumber(0)}건
                  </div>
                </div>
              </div>
            </div>

            {isSelfOnboardStandaloneView && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-900">
                <span>
                  📱 현재 [신입사원 스마트폰 입사등록 전용 화면]을 보고 계십니다. 아래 칸에 본인 정보를 적고 제출하면 인사팀에 서류를 따로 낼 필요가 없습니다.
                </span>
                <button
                  onClick={() => setIsSelfOnboardStandaloneView(false)}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-800"
                >
                  인사팀 전체 화면 함께 보기
                </button>
              </div>
            )}

            {/* ============================================================
                [오와 열 4열 카드 완벽 정렬] 직원·부서장에게 보내는 4가지 셀프 링크 & 솔라피 문자 발송 센터
               ============================================================ */}
            {(zeroTouchSubView === 'ALL' || zeroTouchSubView === 'SOLAPI_PORTALS') && (
              <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* 포털 1: 합격자 셀프 입사포털 */}
              <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-400 hover:shadow-sm">
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
                    📱 신입사원 스마트폰 입사등록
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
                    className="flex h-9 items-center justify-center rounded-lg bg-slate-900 text-xs font-extrabold text-white hover:bg-slate-800"
                  >
                    🔗 주소 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        'SELF_ONBOARDING',
                        '📱 [신입사원 스마트폰 입사등록 화면]을 열었습니다!'
                      )
                    }
                    className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    화면 열어보기
                  </button>
                </div>
              </div>

              {/* 포털 2: 전 직원 셀프 증명서·연차·사직 포털 */}
              <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-400 hover:shadow-sm">
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
                    🪪 직원용 월급명세서 · 증명서 발급
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    직원이 자기 이름과 비밀번호만 치면 이번 달 월급명세서, 남은 휴가(연차), 재직증명서를 스스로 뽑을 수 있어요.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink('emp-portal', '전 직원 셀프서비스 포털')}
                    className="flex h-9 items-center justify-center rounded-lg bg-emerald-600 text-xs font-extrabold text-white hover:bg-emerald-500"
                  >
                    🔗 주소 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        'EMP_PORTAL',
                        '🪪 [전 직원 전용 월급명세서·증명서 셀프포털] 화면으로 전환했습니다!'
                      )
                    }
                    className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    화면 열어보기
                  </button>
                </div>
              </div>

              {/* 포털 3: 현업 부서장 전용 포털 */}
              <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-400 hover:shadow-sm">
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
                    🏢 부서 팀장님 전용 출근·근무표 입력
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    각 부서 팀장님이 일용직 출근 기록, 손님 차량 번호, 다음 달 근무표를 직접 올리는 전용 화면이에요.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPortalLink('dept-portal', '현업 부서장 전용 포털')}
                    className="flex h-9 items-center justify-center rounded-lg bg-slate-900 text-xs font-extrabold text-white hover:bg-slate-800"
                  >
                    🔗 주소 복사
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchPortalMode(
                        'DEPT_PORTAL',
                        '🏢 [부서 팀장님 전용 입력 포털] 화면으로 전환했습니다!'
                      )
                    }
                    className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    화면 열어보기
                  </button>
                </div>
              </div>

              {/* 포털 4: 현장 부착용 QR포스터 인쇄 */}
              <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-400 hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300">
                      링크 4 · 벽보 인쇄용
                    </span>
                    <span className="text-[11px] font-bold text-slate-600">
                      식당·기숙사 부착
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-extrabold text-slate-900">
                    🖨️ 식당·기숙사 부착용 QR포스터 인쇄
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
                        '🖨️ [식당·기숙사 부착용 QR코드 안내문 3종 인쇄 화면]을 열었습니다!'
                      )
                    }
                    className="flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 text-xs font-extrabold text-white hover:bg-slate-800"
                  >
                    🖨️ QR 안내문 3종 인쇄하기 ➔
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================
                [4번 할 일: 솔라피(Solapi) 실시간 문자(LMS) & 카카오 알림톡 보내기]
                - 세련된 화이트 & 인디고/슬레이트 톤앤매너 + 초등학생도 바로 쓰는 1·2·3 순서 표시
               ============================================================ */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
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
                        : '⚠️ 발신번호 설정 확인 필요'}
                    </span>
                    {solapiBalanceWon !== null && (
                      <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300">
                        💰 남은 문자 캐시: {formatNumber(solapiBalanceWon)}원
                      </span>
                    )}
                    {solapiAccountId && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                        Account: {solapiAccountId}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-extrabold text-slate-900">
                    📨 직원 휴대폰으로 [입사등록 링크 · 월급명세서 주소] 문자 보내기
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    ① 아래에서 보낼 문장 종류를 고르고 ➔ ② 받을 사람 휴대폰 번호를 적은 뒤 ➔ ③ <strong>[지금 즉시 문자 발송]</strong> 버튼만 누르면 회사 대표번호(<strong>{solapiConfig.senderNumber || '등록번호'}</strong>)로 문자가 날아갑니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSolapiConfigPanel((prev) => !prev)}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    ⚙️ 통신사 인증키 · 발신번호 설정 {showSolapiConfigPanel ? '▲' : '▼'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendBulkEmployeeSolapiSms}
                    disabled={loading}
                    className="flex h-9 items-center rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-2xs hover:bg-emerald-500 disabled:opacity-50"
                  >
                    👥 전 직원에게 월급명세서 문자 한 번에 보내기
                  </button>
                </div>
              </div>

              {/* 접이식: 솔라피 API Key / 발신번호 / 카카오 비즈니스 PFID / 템플릿 설정 패널 */}
              {showSolapiConfigPanel && (
                <form
                  onSubmit={handleSaveSolapiConfig}
                  className="mt-4 rounded-xl border-2 border-slate-300 bg-slate-50 p-4 text-xs"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <span className="font-extrabold text-slate-900">
                        🔐 솔라피(Solapi) 마스터 인증키 · 대체발송 발신번호 · 카카오 비즈니스 채널(PFID) 설정
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        동일 프로젝트(Bell-operation)의 솔라피 인증 정보와 공식 발신번호가 자동 연동되어 있습니다.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      💾 솔라피 설정 저장 및 잔액 재조회
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
                      <label className="mb-1 block font-bold text-indigo-900">
                        2. 사전등록 공식 발신번호 (LMS 및 Fallback 필수) *
                      </label>
                      <input
                        type="text"
                        placeholder="예: 15660162"
                        value={solapiConfig.senderNumber}
                        onChange={(e) =>
                          setSolapiConfig({ ...solapiConfig, senderNumber: e.target.value })
                        }
                        className="w-full rounded-lg border-2 border-indigo-400 bg-white px-3 py-2 font-mono font-bold text-slate-900"
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
                    <div className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3">
                      <div className="font-extrabold text-amber-950">
                        🚨 [절대 규칙] 카카오 알림톡 템플릿 {'100%'} 일치 원칙 안내
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
                        카카오 알림톡 모드로 발송할 때는 사전에 카카오 심사를 통과한 템플릿의 문장·띄어쓰기·줄바꿈이 토씨 하나 틀리지 않고 {'100%'} 일치해야 발송됩니다. 인사 자유 안내문(입사링크·급여명세서 등)을 별도 템플릿 심사 없이 바로 보내시려면 상단 모드를 <strong>[일반 장문문자(LMS) 직통 발송]</strong>으로 선택하세요.
                      </p>
                      <label className="mt-2 mb-1 block font-bold text-amber-950">
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
                        className="w-full rounded-lg border border-amber-300 bg-white p-2 font-mono text-xs"
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
                      📌 원클릭 안내문 양식 선택:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectSmsPreset('SELF_ONBOARDING_INVITE')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                        smsQuickForm.category === 'SELF_ONBOARDING_INVITE'
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      📱 1. 합격자 셀프 입사링크
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSmsPreset('EMP_PORTAL_PAYSLIP_NOTICE')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                        smsQuickForm.category === 'EMP_PORTAL_PAYSLIP_NOTICE'
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      🪪 2. 전 직원 급여명세서·증명서 포털
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSmsPreset('DEPT_MANAGER_PORTAL_NOTICE')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                        smsQuickForm.category === 'DEPT_MANAGER_PORTAL_NOTICE'
                          ? 'bg-cyan-700 text-white'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      🏢 3. 부서장 전용 포털 안내
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
                      <label className="mb-1 block text-xs font-bold text-indigo-900">
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
                        className="w-full rounded-lg border-2 border-indigo-400 px-3 py-2 font-mono text-xs font-extrabold text-slate-900"
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
                      className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                    >
                      📨 솔라피(Solapi)로 지금 즉시 발송 (발신번호: {solapiConfig.senderNumber || '등록번호'})
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenMobileSmsUri}
                      className="rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      📲 스마트폰 기본 문자앱 호출
                    </button>
                  </div>
                </form>

                {/* 우측 5컬럼: 최근 솔라피 문자/알림톡 발송 이력 로그 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 lg:col-span-5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      📋 최근 솔라피 문자 · 알림톡 발송 감사 로그 ({formatNumber(smsLogs.length)}건)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      LMS Fallback 보장
                    </span>
                  </div>
                  <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1">
                    {smsLogs.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                        아직 발송된 문자 내역이 없습니다. 좌측에서 휴대폰 번호를 입력하고 [📨 솔라피로 지금 즉시 발송]을 눌러보세요.
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
                          <div className="mt-0.5 text-[10px] font-semibold text-indigo-700">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300">
                      3번 할 일 · 더존 아마란스 10 자동 연동
                    </span>
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                      인사 · 전자결재 · 회계장부 · 조직도 직결
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-extrabold text-slate-900">
                    🏢 더존 아마란스 10으로 [출퇴근 · 전자결재 · 회계전표 · 부서조직도] 한 번에 보내기
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
                    {showAmaranthConfigPanel ? '▲ 서버 주소 설정 닫기' : '⚙️ 더존 서버 주소 · 인증키 설정'}
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
                    className="flex h-9 items-center rounded-xl bg-slate-900 px-4 text-xs font-extrabold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    🔄 더존 4가지 기능 한 번에 보내기
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

                <div className="flex h-full flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <div className="text-[11px] font-bold text-emerald-800">지금까지 보낸 기록 & 최근 시간</div>
                  <div className="mt-1 text-sm font-extrabold text-emerald-950">
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
                        🔐 더존 아마란스 10 서버 주소 · 인증키 설정
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
                      className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      💾 설정 저장하기
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
                      className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      1번 인사·출퇴근·휴가 맞추기 ➔
                    </button>
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
                      className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      2번 전자결재 서류 올리기 ➔
                    </button>
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
                      className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-extrabold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      3번 회계팀 장부 보내기 ➔
                    </button>
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
                      className="mt-4 flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      4번 부서 목록 연결하기 ➔
                    </button>
                  </div>
                </div>

                {/* 우측: 아마란스 10 REST API & Webhook 실시간 트랜잭션 로그 */}
                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:col-span-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="text-xs font-extrabold text-slate-900">
                        📋 더존 전송 기록장 ({formatNumber(amaranthApiLogs.length)}건)
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
                            <div className="mt-1.5 truncate rounded bg-slate-900 px-2 py-1 font-mono text-[10px] text-emerald-300">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      6개 사이트 한 번에 제출
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      🚀 국세청 · 4대보험 · 더존 결재 · 하나은행 이체 자동 실행 표
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    엑셀을 받아서 여러 사이트에 일일이 올릴 필요가 없습니다. 오른쪽 <strong>[전체 한 번에 실행]</strong> 버튼만 누르면 6가지 신고와 결재가 동시에 처리됩니다.
                  </p>
                </div>
                <button
                  onClick={handleDispatchAllRpaJobs}
                  disabled={loading}
                  className="flex h-9 items-center rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-2xs hover:bg-emerald-500 disabled:opacity-50"
                >
                  🚀 6개 사이트 전체 한 번에 실행
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
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {job.status === 'APPROVED_COMPLETED'
                                ? '✓ 자동 제출 완료'
                                : job.status === 'BOT_DISPATCHED_WAITING_OTP'
                                ? '🏦 은행 이체 준비 완료'
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
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              {isDone ? '🔄 다시 실행' : '▶ 지금 실행'}
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
                className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-xs ${
                  zeroTouchSubView === 'SELF_ONBOARD' ? 'lg:col-span-12' : 'lg:col-span-7'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300">
                        신입사원 스스로 입력
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900">
                        📱 새로 들어온 직원 스마트폰 입사등록 & 계약서 서명 칸
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
                    🔗 카톡으로 보낼 주소 복사
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
                      <label className="mb-1 block font-bold text-indigo-800">
                        차량번호 (주차관제 LPR 자동등록)
                      </label>
                      <input
                        type="text"
                        placeholder="예: 123가 4567"
                        value={selfOnboardForm.carNumber}
                        onChange={(e) =>
                          setSelfOnboardForm({ ...selfOnboardForm, carNumber: e.target.value })
                        }
                        className="w-full rounded-lg border border-indigo-300 bg-indigo-50/40 px-3 py-2"
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
                        className="w-full rounded-lg border border-emerald-400 bg-emerald-50/50 px-3 py-2 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-slate-900 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    ✍️ [신입사원 제출] 계약서 서명 완료 및 사번·주차장·휴가·월급표 한 번에 등록하기
                  </button>
                </form>
              </div>
              )}

              {/* 우측 5컬럼: 컴퓨터 실수 자동 검사판 (Anomaly) */}
              {(zeroTouchSubView === 'ALL' || zeroTouchSubView === 'COLLECTOR_AUDIT') && (
              <div
                className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-xs ${
                  zeroTouchSubView === 'COLLECTOR_AUDIT' ? 'lg:col-span-12' : 'lg:col-span-5'
                }`}
              >
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      자동 검사판
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      🔍 빠진 것은 없을까? 컴퓨터 자동 검사판
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
                            {isOk ? '✅ ' : '🚨 '}
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
                            바로 가기 ➔
                          </button>
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

            {/* ============================================================
                [1번 할 일 상세] 현장 기계에서 기록 자동으로 모아오기 (식당·캐디·주차장·출퇴근)
               ============================================================ */}
            {(zeroTouchSubView === 'ALL' || zeroTouchSubView === 'COLLECTOR_AUDIT') && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300">
                      1번 할 일 · 기계 기록 모으기
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      📡 식당 · 골프장 캐디 · 주차장 · 출퇴근 기계 기록 자동 수집창
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
                    ⛳ 캐디 출근기록 가져오기
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
                    🍱 식당 밥값 기록 가져오기
                  </button>
                  <button
                    onClick={() =>
                      handleTriggerCollectorSync('GATE_PARKING_LPR', '주차관제 LPR 차단기')
                    }
                    disabled={loading}
                    className="flex h-9 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
                  >
                    🚗 주차장 차량번호 가져오기
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
                    🏢 아마란스 출퇴근 가져오기
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
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-700">
                  보고 싶은 법인 선택 (클릭해서 켜고 끄기 — 끈 법인은 합계에서 자동 제외):
                </span>
                {(['BLACKSTONE', 'KMG', 'RAKSANSU'] as EntityCode[]).map((code) => {
                  const enabled = !disabledEntities.includes(code);
                  const entityObj = entities.find((e) => e.entityCode === code);
                  return (
                    <button
                      key={code}
                      onClick={() => toggleEntityFilter(code)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        enabled
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-slate-100 text-slate-400 line-through'
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {enabled ? `✓ ${entityObj ? entityObj.entityName : code}` : `${entityObj ? entityObj.entityName : code} (제외됨)`}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    {
                      type: 'kmg-expenditure',
                      label: '[8일 지출] KMG 노무비 지출품의 엑셀',
                      color: 'bg-indigo-600 hover:bg-indigo-500',
                    },
                    {
                      type: 'team-leader-kona',
                      label: '[코나카드] 팀장 보직수당 충전 엑셀',
                      color: 'bg-amber-600 hover:bg-amber-500',
                    },
                    {
                      type: 'bank-transfer',
                      label: '[하나은행] 급여품의 & 은행이체 엑셀',
                      color: 'bg-blue-600 hover:bg-blue-500',
                    },
                    {
                      type: 'amaranth-voucher',
                      label: '[회계팀] 더존 아마란스 급여전표 엑셀',
                      color: 'bg-emerald-600 hover:bg-emerald-500',
                    },
                    {
                      type: 'payslips',
                      label: '[개인별] 전 직원 급여명세서 엑셀',
                      color: 'bg-slate-700 hover:bg-slate-600',
                    },
                    {
                      type: 'hr-lifecycle-report',
                      label: '[지원팀] 기숙사퇴사·수습숙박권 엑셀',
                      color: 'bg-teal-600 hover:bg-teal-500',
                    },
                  ] as const
                ).map((btn) => {
                  const isJustDownloaded = lastDownloadedKey === btn.type;
                  return (
                    <button
                      key={btn.type}
                      onClick={() => handleExportExcel(btn.type)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition ${
                        isJustDownloaded
                          ? 'bg-emerald-600 ring-2 ring-emerald-300'
                          : btn.color
                      }`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isJustDownloaded ? `✅ 다운로드 완료! (${btn.label})` : btn.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
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
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <p className="text-xs font-medium text-slate-500">{card.title}</p>
                  <p className="mt-1.5 text-lg font-bold text-slate-900">
                    {card.val !== null ? `${formatNumber(card.val)}${card.unit}` : '미정산'}
                  </p>
                </div>
              ))}
            </div>

            {employmentSubtotals.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {employmentSubtotals.map((sub) => (
                  <div
                    key={sub.rowId}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100/80 px-4 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{sub.empName}</span>
                      <span className="ml-2 text-slate-500">({formatNumber(sub.headcount)}명)</span>
                    </div>
                    <div className="text-right">
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

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-bold text-slate-800">
                  [{targetYm}] 전사 급여·일용직·실습생 월급 계산표 및 전월 대비 변동 점검표
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-3 py-2.5 font-semibold">법인</th>
                      <th className="px-3 py-2.5 font-semibold">부서</th>
                      <th className="px-3 py-2.5 font-semibold">사번/구분</th>
                      <th className="px-3 py-2.5 font-semibold">성명</th>
                      <th className="px-3 py-2.5 font-semibold">고용형태</th>
                      <th className="px-3 py-2.5 font-semibold">근무일수/일할계산</th>
                      <th className="px-3 py-2.5 text-right font-semibold">기본급/일용급</th>
                      <th className="px-3 py-2.5 text-right font-semibold">연장/상여/특별</th>
                      <th className="px-3 py-2.5 text-right font-semibold">비과세(식대/차량)</th>
                      <th className="px-3 py-2.5 text-right font-semibold">세전총액</th>
                      <th className="px-3 py-2.5 text-right font-semibold">4대보험(본인)</th>
                      <th className="px-3 py-2.5 text-right font-semibold">소득세+지방세</th>
                      <th className="px-3 py-2.5 text-right font-semibold">기숙사/식대/기타공제</th>
                      <th className="px-3 py-2.5 text-right font-semibold">실수령액(세후)</th>
                      <th className="px-3 py-2.5 text-right font-semibold">전월대비 차이</th>
                      <th className="px-3 py-2.5 font-semibold">자동 점검 결과</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleMatrixRows.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="px-6 py-10 text-center">
                          <div className="mx-auto max-w-2xl space-y-3">
                            <p className="text-sm font-extrabold text-slate-700">
                              아직 [{targetYm}] 월급 계산이 실행되지 않았거나 등록된 직원이 없습니다.
                            </p>
                            <p className="text-xs text-slate-500">
                              아래 순서대로 버튼을 눌러 자료를 넣은 뒤 <strong>[전사 급여·전표 자동정산 실행]</strong> 버튼을 클릭하세요!
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                              <button
                                onClick={() => setActiveTab('CONFIG')}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              >
                                👉 1. 기초 요율·부서 설정 확인
                              </button>
                              <button
                                onClick={() => setActiveTab('EMPLOYEES')}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              >
                                👉 2. 직원 명부 직접 등록
                              </button>
                              <button
                                onClick={() => setActiveTab('PHASE5_BULK_AND_DDAY')}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                              >
                                📥 3. 엑셀 파일로 한번에 올리기
                              </button>
                              <button
                                onClick={handleRunSettlement}
                                disabled={loading || !targetYm}
                                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50"
                              >
                                ⚡ 4. 지금 바로 자동정산 실행
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visibleMatrixRows.map((r) => {
                        const rowStyle = r.isGrandTotal
                          ? 'bg-slate-900 font-bold text-white'
                          : r.isSubtotal
                          ? 'bg-emerald-50/90 font-bold text-emerald-950'
                          : 'hover:bg-slate-50';

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
                            <td className="px-3 py-2">{r.empName}</td>
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
                            <td className="px-3 py-2 text-right font-bold">
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
                                <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
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
                  [업무 33] 부서별 인건비 자동 배분 및 더존 아마란스 급여전표 (차변·대변 자동 일치 검증)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  부서별 급여·상여·일용직 노무비·회사부담 4대보험료를 부서 코스트센터별로 자동 배분하여 단 한 푼의 단수 오차도 원천 차단합니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {voucherBalanceCheck && (
                  <div className="flex items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs">
                    <div>
                      <span className="text-slate-500">차변(비용) 합계: </span>
                      <strong className="text-slate-900">
                        {formatNumber(voucherBalanceCheck.totalDebit)}원
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">대변(예수/미지급) 합계: </span>
                      <strong className="text-slate-900">
                        {formatNumber(voucherBalanceCheck.totalCredit)}원
                      </strong>
                    </div>
                    <div className="font-bold text-emerald-700">
                      차대변 차이: {formatNumber(voucherBalanceCheck.varianceDelta)}원 (
                      {voucherBalanceCheck.isBalanced ? '차대변 정확히 일치' : '점검 필요'})
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleExportExcel('amaranth-voucher')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500"
                >
                  <Download className="h-4 w-4" />
                  더존 아마란스 급여전표 엑셀 바로 다운로드
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                    <th className="px-4 py-2.5">법인</th>
                    <th className="px-4 py-2.5">코스트센터</th>
                    <th className="px-4 py-2.5">귀속부서</th>
                    <th className="px-4 py-2.5">차변/대변 구분</th>
                    <th className="px-4 py-2.5">계정코드</th>
                    <th className="px-4 py-2.5">계정과목명</th>
                    <th className="px-4 py-2.5 text-right">차변 금액 (비용)</th>
                    <th className="px-4 py-2.5 text-right">대변 금액 (공제/지급)</th>
                    <th className="px-4 py-2.5">전표 적요 (설명)</th>
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
                          className="mt-3 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          ⚡ 지금 바로 전사 급여·전표 자동정산 실행하기
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
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {v.drCr === 'DEBIT' ? '차변 (부서비용)' : '대변 (세금/지급)'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono">{v.accountCode}</td>
                        <td className="px-4 py-2 font-semibold">{v.accountName}</td>
                        <td className="px-4 py-2 text-right font-semibold text-blue-900">
                          {v.drCr === 'DEBIT' ? formatNumber(v.amount) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-purple-900">
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
            [탭 3 - Phase 2] 세무 · 4대보험 EDI · 경기과 캐디 · 장애인고용부담금 신고 센터
           ============================================================ */}
        {activeTab === 'PHASE2_TAX_EDI' && (
          <div className="space-y-6">
            {/* Phase 2 원클릭 전자신고 파일 다운로드 바 */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Landmark className="h-4 w-4 text-emerald-600" />
                  세무 · 4대보험 EDI · 경기과 캐디 · 지급명세서 · 장애인부담금 원클릭 생성기 (Row 7, 9, 12, 14, 43~52)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  매월 10일(원천세·지방세·주민세), 15일(일용직 근로내용확인·캐디 산재 월보수액), 말일(캐디 과세자료·사업소득), 주 1회(4대보험 취득/상실) 신고서를 즉시 추출합니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    {
                      type: 'edi-4major-pack',
                      label: '[R7/R9/R14] 4대보험 취득·상실·보수변경 EDI',
                      color: 'bg-blue-600 hover:bg-blue-500',
                    },
                    {
                      type: 'caddy-total-pack',
                      label: '[R12/R44/R45] 경기과 캐디 입이직·과세·산재신고',
                      color: 'bg-emerald-600 hover:bg-emerald-500',
                    },
                    {
                      type: 'daily-work-confirm',
                      label: '[R43] 일용직 근로내용확인신고 (15일)',
                      color: 'bg-indigo-600 hover:bg-indigo-500',
                    },
                    {
                      type: 'withholding-local-resident-tax',
                      label: '[R46/47/48] 원천세·지방세·주민세 (10일)',
                      color: 'bg-slate-800 hover:bg-slate-700',
                    },
                    {
                      type: 'payment-statements-disabled-levy',
                      label: '[R49~52] 지급명세서 & 장애인고용부담금',
                      color: 'bg-amber-600 hover:bg-amber-500',
                    },
                  ] as const
                ).map((btn) => (
                  <button
                    key={btn.type}
                    onClick={() => handleExportPhase2Excel(btn.type)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-xs transition ${btn.color}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3개 법인별 원천세 / 지방세 특별징수 / 주민세(종업원분) / 장애인고용부담금 집계 매트릭스 */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="text-xs font-bold text-slate-800">
                  [{targetYm}] 법인별 원천세(R46) · 지방세 특별징수(R47) · 주민세 종업원분(R48) · 장애인 고용부담금(R52) 자동 집계표
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-3 py-2.5">법인명</th>
                      <th className="px-3 py-2.5 text-right">정규근로 과세급여(인원)</th>
                      <th className="px-3 py-2.5 text-right">일용근로 총급여(인원)</th>
                      <th className="px-3 py-2.5 text-right">퇴직/사업소득 총액</th>
                      <th className="px-3 py-2.5 text-right font-bold text-blue-900">
                        [R46] 원천세 총세액
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-purple-900">
                        [R47] 지방세 특별징수
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-emerald-900">
                        [R48] 주민세(종업원분)
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        [R52] 장애인 의무/인정(상시)
                      </th>
                      <th className="px-3 py-2.5 text-right font-bold text-amber-900">
                        [R52] 장애인 고용부담금
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
                        <td className="px-3 py-2.5 text-right font-bold text-purple-900">
                          {formatNumber(t.totalSpecialLocalTax)}원
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-900">
                          {t.residentTaxExemptYn
                            ? '면세(기준이하)'
                            : `${formatNumber(t.residentTaxAmount)}원`}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          의무 {formatNumber(t.mandatoryDisabledQuota)} / 인정{' '}
                          {formatNumber(t.recognizedDisabledCount)} (상시{' '}
                          {formatNumber(t.eligibleRegularEmployeeCount)}명)
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-amber-900">
                          {formatNumber(t.estimatedMonthlyDisabledLevy)}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 경기과 캐디 자료 입력(Row 12, 44, 45) & 근로자 월보수액 변경(Row 14) & 사업소득(Row 49) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* 1. 경기과 캐디 과세/산재/입이직 등록 */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 12, 44, 45] 경기과 캐디 입이직 · 과세 · 산재 월보수액(경비율 제외) 등록
                </h3>
                <form onSubmit={handleAddCaddyRecord} className="space-y-2.5 text-xs">
                  <select
                    value={caddyForm.empId}
                    onChange={(e) => setCaddyForm({ ...caddyForm, empId: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  >
                    <option value={0}>캐디(특고직) 선택 (임직원 마스터 CADDY)</option>
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
                      placeholder="당월 라운딩 횟수"
                      value={caddyForm.roundCount}
                      onChange={(e) => setCaddyForm({ ...caddyForm, roundCount: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      placeholder="캐디피 총수입금액 (원)"
                      value={caddyForm.totalCaddyFeeIncome}
                      onChange={(e) =>
                        setCaddyForm({ ...caddyForm, totalCaddyFeeIncome: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="ACTIVE">재직중 (과세/산재신고)</option>
                      <option value="NEW_ACQUIRE">신규 입직 (고용보험 취득 R12)</option>
                      <option value="LOSS_LEAVE">퇴사 이직 (고용보험 상실 R12)</option>
                    </select>
                    <input
                      type="date"
                      title="입/이직 발생일"
                      value={caddyForm.eventDate}
                      onChange={(e) => setCaddyForm({ ...caddyForm, eventDate: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-emerald-600 py-1.5 font-bold text-white hover:bg-emerald-500"
                  >
                    경기과 캐디 데이터 반영 (경비율 자동 공제)
                  </button>
                </form>

                <div className="max-h-48 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {caddyRecords.map((c) => (
                    <div
                      key={c.recordId}
                      className="mb-1.5 rounded border border-slate-200 bg-slate-50 p-2"
                    >
                      <div className="font-bold text-slate-800">
                        {c.caddyName} ({c.empNo}) — 총수입: {formatNumber(c.totalCaddyFeeIncome)}원
                      </div>
                      <div className="text-emerald-800">
                        산재신고 월보수액(경비율 제외):{' '}
                        <strong>{formatNumber(c.reportedMonthlyRemuneration)}원</strong> / 산재보험:{' '}
                        {formatNumber(c.iacEmployerBurden)}원
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. 근로자 월보수액 변경신고 (Row 14) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 14] 근로자 월보수액 변경 발생 시 변경신고 등록
                </h3>
                <form onSubmit={handleAddSalaryChange} className="space-y-2.5 text-xs">
                  <select
                    value={salChangeForm.empId}
                    onChange={(e) =>
                      setSalChangeForm({ ...salChangeForm, empId: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  >
                    <option value={0}>보수월액 변경 대상 근로자 선택</option>
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      placeholder="변경 후 월보수액(원)"
                      value={salChangeForm.newMonthlyPay}
                      onChange={(e) =>
                        setSalChangeForm({ ...salChangeForm, newMonthlyPay: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <input
                    placeholder="변경 사유 (예: 연봉재계약, 승진)"
                    value={salChangeForm.changeReason}
                    onChange={(e) =>
                      setSalChangeForm({ ...salChangeForm, changeReason: e.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-500"
                  >
                    월보수액 변경신고 등록 & 마스터 즉시 반영
                  </button>
                </form>

                <div className="max-h-48 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {salaryChanges.map((sc) => (
                    <div
                      key={sc.changeId}
                      className="mb-1.5 rounded border border-slate-200 bg-slate-50 p-2"
                    >
                      <div className="font-bold text-slate-800">
                        {sc.empName} ({sc.deptName}) — {sc.changeDate}
                      </div>
                      <div className="text-blue-800">
                        {formatNumber(sc.previousMonthlyPay)}원 ➔{' '}
                        <strong>{formatNumber(sc.newMonthlyPay)}원</strong> ({sc.changeReason})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. 사업소득 지급명세서 등록 (Row 49) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 49] 귀속월 사업소득 발생 시 지급명세서 신고 등록 (익월 말일)
                </h3>
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="사업소득자 성명"
                      value={bizIncomeForm.earnerName}
                      onChange={(e) =>
                        setBizIncomeForm({ ...bizIncomeForm, earnerName: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      placeholder="주민/사업자번호"
                      value={bizIncomeForm.earnerRegNoMasked}
                      onChange={(e) =>
                        setBizIncomeForm({ ...bizIncomeForm, earnerRegNoMasked: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="소득구분 (예: 행사MC, 강사)"
                      value={bizIncomeForm.incomeTypeName}
                      onChange={(e) =>
                        setBizIncomeForm({ ...bizIncomeForm, incomeTypeName: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      placeholder="지급총액 (원)"
                      value={bizIncomeForm.grossAmount}
                      onChange={(e) =>
                        setBizIncomeForm({ ...bizIncomeForm, grossAmount: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-slate-900 py-1.5 font-bold text-white hover:bg-slate-800"
                  >
                    사업소득 원천징수 자동산출 & 등록
                  </button>
                </form>

                <div className="max-h-48 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {businessIncomes.map((b) => (
                    <div
                      key={b.bizIncomeId}
                      className="mb-1.5 rounded border border-slate-200 bg-slate-50 p-2"
                    >
                      <div className="font-bold text-slate-800">
                        [{b.entityCode}] {b.earnerName} ({b.incomeTypeName}) — {b.paymentDate}
                      </div>
                      <div className="text-slate-600">
                        지급액: {formatNumber(b.grossAmount)}원 / 원천세(소득+지방):{' '}
                        {formatNumber(b.incomeTaxWithheld + b.localTaxWithheld)}원 / 실지급:{' '}
                        <strong>{formatNumber(b.netPaidAmount)}원</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 4 - Phase 2] 퇴직금 정밀 산출기 & 퇴직 후 14일 데드라인 트래커 (Row 42)
           ============================================================ */}
        {activeTab === 'PHASE2_SEVERANCE' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  [Row 42] 퇴직금 정밀 산출기 (평균임금 vs 통상임금 자동 비교) 및 퇴직 후 14일 데드라인 트래커
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  퇴직일 기준 직전 3개월 실제 달력 일수(89~92일 동적 계산), 연간 상여금(3/12), 미사용 연차수당(3/12)을 반영하여 1일 평균임금을 산출하고 통상임금과 비교해 법정 퇴직금을 산정합니다.
                </p>
              </div>
              <button
                onClick={() => handleExportPhase2Excel('severance-statement')}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500"
              >
                <Download className="h-4 w-4" />
                [R42] 퇴직금 산정내역서 & 품의서 엑셀 다운로드
              </button>
            </div>

            <form
              onSubmit={handleCalculateSeverance}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800">
                  신규 퇴직금 산정 실행 (직원을 고르면 등록된 기본급 기준으로 3개월 예상 급여가 자동 입력됩니다)
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700">
                  💡 퇴사일을 넣으면 법정 지급기한(퇴사 후 14일 이내)이 자동 계산됩니다
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
                    className="w-full rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
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
                      14일 이내 지급기한 (R42)
                    </th>
                    <th className="px-3 py-2.5 text-right">재직일수(3개월일수)</th>
                    <th className="px-3 py-2.5 text-right">1일 평균임금</th>
                    <th className="px-3 py-2.5 text-right">적용 1일임금</th>
                    <th className="px-3 py-2.5 text-right">세전 퇴직금</th>
                    <th className="px-3 py-2.5 text-right">퇴직소득세+지방세</th>
                    <th className="px-3 py-2.5 text-right font-bold">차인지급 실퇴직금</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {severanceLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        산출된 퇴직금 정산 내역이 없습니다.
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
            [탭 5 - Phase 3] 입퇴사 원클릭 프로비저닝 · 현장실습생 배치 · 주차차량 등록 (R3~R8, R10, R11, R13, R23, R35, R39)
           ============================================================ */}
        {activeTab === 'PHASE3_ONBOARDING' && (
          <div className="space-y-6">
            {/* 상단 요약 및 엑셀 다운로드 바 */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  입퇴사 6종 동시 프로비저닝 (아마란스 ERP · 채용/사직품의 · 전자계약 · 이메일 · 사원증 · 차량 · 식수지문) & 실습생 · 주차관제
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  완료 건수: <strong>{formatNumber(phase3Summary?.onboardingCompletedCount)}건</strong> / 진행중:{' '}
                  <strong className="text-amber-700">{formatNumber(phase3Summary?.onboardingPendingCount)}건</strong> / 등록차량:{' '}
                  <strong>{formatNumber(vehicleRegistrations.length)}대</strong> / 기숙사 퇴사전달(R10):{' '}
                  <strong>{formatNumber(dormitoryResignees.length)}명</strong> / 수습 3개월 도래(R11):{' '}
                  <strong>{formatNumber(probationTargets.length)}명</strong>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleExportPhase3Excel('onboarding-amaranth-pack')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  [R3~R8/R13/R23] 아마란스·계약·이메일·사원증·지문 패키지
                </button>
                <button
                  onClick={() => handleExportPhase3Excel('parking-vehicle-pack')}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-blue-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  [R39] 임직원·내방객 주차차량 등록대장
                </button>
                <button
                  onClick={() => handleExportExcel('hr-lifecycle-report')}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-teal-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  [R10/R11] 지원팀 기숙사퇴사자 & 수습숙박권 품의
                </button>
              </div>
            </div>

            {/* 입퇴사/실습생 원클릭 프로비저닝 대장 */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-900 px-5 py-3 text-xs font-bold text-white">
                당월 입·퇴사자 및 현장실습생 원클릭 동시 프로비저닝 보드 (Row 3, 4, 5, 6, 8, 13, 23, 35, 39)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-3 py-2.5">구분 / 발생일</th>
                      <th className="px-3 py-2.5">법인 / 부서</th>
                      <th className="px-3 py-2.5">사번 / 성명</th>
                      <th className="px-3 py-2.5 text-center">R3 아마란스</th>
                      <th className="px-3 py-2.5 text-center">R4·5 채용품의/통지</th>
                      <th className="px-3 py-2.5 text-center">R6 근로계약</th>
                      <th className="px-3 py-2.5 text-center">R6 이메일/사원증</th>
                      <th className="px-3 py-2.5 text-center">R6·39 차량등록</th>
                      <th className="px-3 py-2.5 text-center">R23 식수지문</th>
                      <th className="px-3 py-2.5 text-center">R8 사직품의</th>
                      <th className="px-3 py-2.5 text-center">진행도</th>
                      <th className="px-3 py-2.5 text-center">원클릭 실행</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {onboardingProvisionings.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                          당월 입·퇴사 또는 등록된 프로비저닝 대상자가 없습니다. 아래 폼에서 대상자를 선택해 등록하십시오.
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
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.workflowType === 'OFFBOARDING'
                                ? '퇴사 오프보딩'
                                : p.workflowType === 'INTERN_PLACEMENT'
                                ? '실습생 배치'
                                : '입사 온보딩'}
                            </span>
                            {p.eventDate}
                          </td>
                          <td className="px-3 py-2">
                            {p.entityName} / {p.deptName}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {p.empName} ({p.empNo})
                            {p.internSchoolName && (
                              <div className="text-[10px] font-normal text-purple-700">
                                학교: {p.internSchoolName} / 멘토: {p.internMentorName ?? '-'}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.amaranthErpRegistered ? '✅' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.recruitmentNoticeIssued ? '✅' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.laborContractSigned ? '✅' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.emailAccountRequested && p.idCardIssued ? '✅' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.vehicleRegistered ? '✅' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.mealFingerprintRegistered ? '✅' : '⏳'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.resignationApprovalSubmitted ? '✅' : '-'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            {formatNumber(p.completedStepsCount)} / {formatNumber(p.totalStepsCount)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleCompleteAllProvisioning(p)}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500"
                            >
                              ⚡ 원클릭 동시 완료
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 하단 2단: 1. 온보딩/오프보딩/실습생 상세 등록 & 2. 임직원/내방객 주차차량 등록(R39) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 3~8, 13, 23, 35] 입·퇴사자 및 취업연계 고교 현장실습생 프로비저닝 개별 설정
                </h3>
                <form onSubmit={handleSaveProvisioning} className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={provForm.empId}
                      onChange={(e) => setProvForm({ ...provForm, empId: Number(e.target.value) })}
                      className="col-span-2 rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    >
                      <option value={0}>대상 임직원 / 실습생 / 캐디 선택</option>
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="ONBOARDING">입사 온보딩(R3~R6)</option>
                      <option value="OFFBOARDING">퇴사 오프보딩(R8)</option>
                      <option value="INTERN_PLACEMENT">현장실습생 배치(R13/R35)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={provForm.eventDate}
                      onChange={(e) => setProvForm({ ...provForm, eventDate: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      placeholder="취업연계 학교명 (실습생 R35)"
                      value={provForm.internSchoolName}
                      onChange={(e) =>
                        setProvForm({ ...provForm, internSchoolName: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      placeholder="배치부서 멘토/담당자 (R13)"
                      value={provForm.internMentorName}
                      onChange={(e) =>
                        setProvForm({ ...provForm, internMentorName: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-[11px] md:grid-cols-4">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={provForm.amaranthErpRegistered}
                        onChange={(e) =>
                          setProvForm({ ...provForm, amaranthErpRegistered: e.target.checked })
                        }
                      />
                      R3 아마란스ERP
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={provForm.recruitmentNoticeIssued}
                        onChange={(e) =>
                          setProvForm({ ...provForm, recruitmentNoticeIssued: e.target.checked })
                        }
                      />
                      R4·5 채용품의/통지
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={provForm.laborContractSigned}
                        onChange={(e) =>
                          setProvForm({ ...provForm, laborContractSigned: e.target.checked })
                        }
                      />
                      R6 근로계약서
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={provForm.emailAccountRequested}
                        onChange={(e) =>
                          setProvForm({ ...provForm, emailAccountRequested: e.target.checked })
                        }
                      />
                      R6 이메일신청
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={provForm.idCardIssued}
                        onChange={(e) =>
                          setProvForm({ ...provForm, idCardIssued: e.target.checked })
                        }
                      />
                      R6 사원증발급
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={provForm.vehicleRegistered}
                        onChange={(e) =>
                          setProvForm({ ...provForm, vehicleRegistered: e.target.checked })
                        }
                      />
                      R6·39 차량등록
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={provForm.mealFingerprintRegistered}
                        onChange={(e) =>
                          setProvForm({ ...provForm, mealFingerprintRegistered: e.target.checked })
                        }
                      />
                      R23 식수지문등록
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
                      R8 사직서품의
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded bg-slate-900 py-2 font-bold text-white hover:bg-slate-800"
                  >
                    프로비저닝 상태 저장 및 주차관제 자동 연동
                  </button>
                </form>
              </div>

              {/* 2. 임직원 / 내방객 주차차량 등록 (Row 39) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 39] 주차차량등록 — 임직원 차량 번호 등록 및 일일 내방객 차량 등록
                </h3>
                <form onSubmit={handleAddVehicle} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={vehicleForm.regDate}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, regDate: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="VISITOR">내방객 차량 (VIP/업체)</option>
                      <option value="EMPLOYEE">임직원 차량 (상시등록)</option>
                    </select>
                    <select
                      value={vehicleForm.entityCode}
                      onChange={(e) =>
                        setVehicleForm({
                          ...vehicleForm,
                          entityCode: e.target.value as EntityCode,
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="BLACKSTONE">블랙스톤</option>
                      <option value="KMG">KMG</option>
                      <option value="RAKSANSU">락산수</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="차주/방문자 성명"
                      value={vehicleForm.ownerOrVisitorName}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, ownerOrVisitorName: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      placeholder="차량번호 (예: 123가4567)"
                      value={vehicleForm.carNumber}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, carNumber: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                      required
                    />
                    <input
                      placeholder="차종 (예: 제네시스 G80)"
                      value={vehicleForm.carModel}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, carModel: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="담당부서"
                      value={vehicleForm.deptName}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, deptName: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      placeholder="방문/운행 목적"
                      value={vehicleForm.visitPurpose}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, visitPurpose: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      placeholder="연락처"
                      value={vehicleForm.contactPhone}
                      onChange={(e) =>
                        setVehicleForm({ ...vehicleForm, contactPhone: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-blue-600 py-1.5 font-bold text-white hover:bg-blue-500"
                  >
                    주차관제 차량번호 즉시 등록
                  </button>
                </form>

                <div className="max-h-44 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {vehicleRegistrations.map((v) => (
                    <div
                      key={v.vehicleRegId}
                      className="mb-1.5 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-1.5"
                    >
                      <div>
                        <span className="mr-1.5 font-bold text-blue-800">
                          [{v.vehicleType === 'EMPLOYEE' ? '임직원' : '내방객'}]
                        </span>
                        <strong>{v.carNumber}</strong> ({v.ownerOrVisitorName} / {v.deptName})
                      </div>
                      <span className="text-slate-500">
                        {v.regDate} · {v.visitPurpose}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 6 - Phase 3] 식수관리 · 삼성웰스토리 전달 · 블랙스톤/KMG 식대비 품의 · 고정도급비 · 하나BSN 용역비 품의 (R19~R22, R37, R38)
           ============================================================ */}
        {activeTab === 'PHASE3_MEAL_APPROVALS' && (
          <div className="space-y-6">
            {/* 상단 4종 정기 품의 & 삼성웰스토리 리포트 엑셀 다운로드 */}
            <div className="rounded-xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <Utensils className="h-4 w-4 text-emerald-600" />
                    일일 식수현황(R19) · 주간식단표(R20) · 삼성웰스토리 전달(R21) · 식대비(R22)/고정도급(R37)/하나BSN 용역비(R38) 정기 품의
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    매월 1~2일 반복 기안하는 블랙스톤·KMG 식대비 품의, 고정거래처 도급비 및 직원수당 품의, 락산수·KMG 하나BSN 용역비 품의서를 원클릭 생성합니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleExportPhase3Excel('welstory-meal-pack')}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500"
                  >
                    <Download className="h-3.5 w-3.5" />
                    [R19/20/21] 삼성웰스토리 식수전달 & 주간식단표
                  </button>
                  <button
                    onClick={() => handleExportPhase3Excel('meal-expense-approval')}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-blue-500"
                  >
                    <Download className="h-3.5 w-3.5" />
                    [R22] 블랙스톤·KMG 식대비 지급 품의서
                  </button>
                  <button
                    onClick={() => handleExportPhase3Excel('vendor-contract-approval')}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-purple-500"
                  >
                    <Download className="h-3.5 w-3.5" />
                    [R37] 고정거래처 도급비·직원수당 품의서
                  </button>
                  <button
                    onClick={() => handleExportPhase3Excel('hanabsn-service-approval')}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-amber-500"
                  >
                    <Download className="h-3.5 w-3.5" />
                    [R38] 락산수·KMG 하나BSN 용역비 품의서
                  </button>
                </div>
              </div>
            </div>

            {/* 법인별 식수집계표 및 세금계산서 식대비 품의 총괄표 (Row 21, 22) */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 bg-slate-900 px-5 py-3 text-xs font-bold text-white">
                [Row 21, 22] 삼성웰스토리 전달용 월간 식수현황 및 법인별(블랙스톤 · KMG · 락산수) 식대비 지급 품의 집계표
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-3 py-2.5">법인명</th>
                      <th className="px-3 py-2.5 text-right">조식 인원</th>
                      <th className="px-3 py-2.5 text-right">중식 인원</th>
                      <th className="px-3 py-2.5 text-right">석식 인원</th>
                      <th className="px-3 py-2.5 text-right">야식 인원</th>
                      <th className="px-3 py-2.5 text-right font-bold text-emerald-800">
                        총 식수 인원 (R21)
                      </th>
                      <th className="px-3 py-2.5 text-right">식대 공급가액</th>
                      <th className="px-3 py-2.5 text-right">식대 부가세</th>
                      <th className="px-3 py-2.5 text-right font-bold text-blue-900">
                        세금계산서 품의 합계액 (R22)
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
                    <tr className="bg-slate-900 font-bold text-white">
                      <td className="px-3 py-2.5">[전사 식수 및 식대비 총계]</td>
                      <td colSpan={4} className="px-3 py-2.5 text-right text-slate-300">
                        삼성웰스토리 월간 마감 합계
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-300">
                        {formatNumber(phase3Summary?.mealGrandTotalCount)}식
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatNumber(phase3Summary?.mealGrandTotalSupply)}원
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatNumber(phase3Summary?.mealGrandTotalVat)}원
                      </td>
                      <td className="px-3 py-2.5 text-right text-amber-300">
                        {formatNumber(phase3Summary?.mealGrandTotalCost)}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4종 입력 및 품의 내역 보드 */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* 1. 일일 식수 프로그램 등록 (Row 19, 21, 22) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 19, 21, 22] 일일 식수 프로그램 등록 (전날 식수 확인 후 월 식수현황 반영)
                </h3>
                <form onSubmit={handleAddMealLog} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={mealForm.mealDate}
                      onChange={(e) => setMealForm({ ...mealForm, mealDate: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <select
                      value={mealForm.deptId}
                      onChange={(e) => setMealForm({ ...mealForm, deptId: Number(e.target.value) })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    >
                      <option value={0}>식수 귀속 부서 선택 (법인 자동매핑)</option>
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
                      placeholder="조식 인원"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      type="number"
                      placeholder="중식 인원"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      type="number"
                      placeholder="석식 인원"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="적용 식단가(원)"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      placeholder="부가세액(자동계산)"
                      value={mealForm.vatAmount}
                      onChange={(e) => setMealForm({ ...mealForm, vatAmount: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      placeholder="비고"
                      value={mealForm.notes}
                      onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-emerald-600 py-1.5 font-bold text-white hover:bg-emerald-500"
                  >
                    일일 식수현황 등록 & 블랙스톤/KMG 식대비 자동 집계
                  </button>
                </form>

                <div className="max-h-44 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {mealDailyLogs.map((m) => (
                    <div
                      key={m.mealLogId}
                      className="mb-1.5 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-1.5"
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

              {/* 2. 주간식단표 공지사항 등록 (Row 20) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 20] 주간식단표 그룹웨어 공지사항 등록 관리 (매주 즉시)
                </h3>
                <form onSubmit={handleAddWeeklyMenu} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="주차명 (예: 10월 3주차)"
                      value={weeklyMenuForm.weekLabel}
                      onChange={(e) =>
                        setWeeklyMenuForm({ ...weeklyMenuForm, weekLabel: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="date"
                      value={weeklyMenuForm.startDate}
                      onChange={(e) =>
                        setWeeklyMenuForm({ ...weeklyMenuForm, startDate: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="date"
                      value={weeklyMenuForm.endDate}
                      onChange={(e) =>
                        setWeeklyMenuForm({ ...weeklyMenuForm, endDate: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="그룹웨어 공지번호"
                      value={weeklyMenuForm.groupwareNoticeNo}
                      onChange={(e) =>
                        setWeeklyMenuForm({
                          ...weeklyMenuForm,
                          groupwareNoticeNo: e.target.value,
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      placeholder="주간식단 주요특식/요약"
                      value={weeklyMenuForm.welstoryMenuSummary}
                      onChange={(e) =>
                        setWeeklyMenuForm({
                          ...weeklyMenuForm,
                          welstoryMenuSummary: e.target.value,
                        })
                      }
                      className="col-span-2 rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-slate-900 py-1.5 font-bold text-white hover:bg-slate-800"
                  >
                    주간식단표 공지사항 등록 완료 기록
                  </button>
                </form>

                <div className="max-h-44 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {weeklyMenus.map((w) => (
                    <div
                      key={w.menuNoticeId}
                      className="mb-1.5 rounded border border-slate-200 bg-slate-50 px-3 py-1.5"
                    >
                      <div className="font-bold text-slate-800">
                        [{w.weekLabel}] {w.startDate} ~ {w.endDate} (공지: {w.groupwareNoticeNo})
                      </div>
                      <div className="text-slate-600">{w.welstoryMenuSummary}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. 고정거래처 도급비 및 직원수당 납부 품의 (Row 37) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    [Row 37] 고정거래처 도급비 및 직원수당 납부 품의 (매월 1~2일)
                  </h3>
                  <span className="text-xs font-bold text-purple-800">
                    총 청구액: {formatNumber(phase3Summary?.vendorTotalInvoice)}원
                  </span>
                </div>
                <form onSubmit={handleAddVendorContract} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={vendorForm.deptId}
                      onChange={(e) =>
                        setVendorForm({ ...vendorForm, deptId: Number(e.target.value) })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    >
                      <option value={0}>귀속 부서 선택</option>
                      {departments.map((d) => (
                        <option key={d.deptId} value={d.deptId}>
                          [{d.entityCode}] {d.deptName}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="고정 거래처명"
                      value={vendorForm.vendorName}
                      onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      placeholder="도급 계약 건명"
                      value={vendorForm.contractTitle}
                      onChange={(e) =>
                        setVendorForm({ ...vendorForm, contractTitle: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      placeholder="고정도급비(원)"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      type="number"
                      placeholder="부가세액(자동계산)"
                      value={vendorForm.vatAmount}
                      onChange={(e) => setVendorForm({ ...vendorForm, vatAmount: e.target.value })}
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      placeholder="세금계산서 번호"
                      value={vendorForm.taxInvoiceNo}
                      onChange={(e) =>
                        setVendorForm({ ...vendorForm, taxInvoiceNo: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-purple-600 py-1.5 font-bold text-white hover:bg-purple-500"
                  >
                    고정거래처 도급비·직원수당 품의 생성
                  </button>
                </form>

                <div className="max-h-44 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {vendorContracts.map((vc) => (
                    <div
                      key={vc.vendorContractId}
                      className="mb-1.5 rounded border border-slate-200 bg-slate-50 px-3 py-1.5"
                    >
                      <div className="font-bold text-slate-800">{vc.approvalDocTitle}</div>
                      <div className="text-purple-900">
                        도급비 {formatNumber(vc.baseContractFee)}원 + 직원수당{' '}
                        {formatNumber(vc.staffAllowanceAmount)}원 + 부가세{' '}
                        {formatNumber(vc.vatAmount)}원 ={' '}
                        <strong>{formatNumber(vc.totalInvoiceAmount)}원</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. 부서별 용역비 지급 - 락산수, KMG 용역비 지급 품의(하나BSN) (Row 38) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    [Row 38] 락산수 · KMG 부서별 용역비 지급 품의 (하나BSN, 매월 1~2일)
                  </h3>
                  <span className="text-xs font-bold text-amber-800">
                    락산수 {formatNumber(phase3Summary?.hanaBsnRaksansuTotal)}원 / KMG{' '}
                    {formatNumber(phase3Summary?.hanaBsnKmgTotal)}원
                  </span>
                </div>
                <form onSubmit={handleAddHanaBsnFee} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={hanaBsnForm.deptId}
                      onChange={(e) =>
                        setHanaBsnForm({ ...hanaBsnForm, deptId: Number(e.target.value) })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    >
                      <option value={0}>하나BSN 용역 귀속 부서 선택 (락산수 / KMG 등)</option>
                      {departments.map((d) => (
                        <option key={d.deptId} value={d.deptId}>
                          [{d.entityCode}] {d.deptName} (CC: {d.costCenterCode})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="부서 파견 용역 인원수"
                      value={hanaBsnForm.dispatchedHeadcount}
                      onChange={(e) =>
                        setHanaBsnForm({ ...hanaBsnForm, dispatchedHeadcount: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="용역비 공급가액(원)"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      placeholder="부가세액(자동계산)"
                      value={hanaBsnForm.vatAmount}
                      onChange={(e) =>
                        setHanaBsnForm({ ...hanaBsnForm, vatAmount: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      placeholder="세금계산서 번호"
                      value={hanaBsnForm.invoiceNo}
                      onChange={(e) =>
                        setHanaBsnForm({ ...hanaBsnForm, invoiceNo: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-amber-600 py-1.5 font-bold text-white hover:bg-amber-500"
                  >
                    하나BSN 부서별 용역비 품의 생성 (락산수/KMG)
                  </button>
                </form>

                <div className="max-h-44 overflow-y-auto border-t border-slate-100 pt-2 text-[11px]">
                  {hanaBsnFees.map((hf) => (
                    <div
                      key={hf.serviceFeeId}
                      className="mb-1.5 rounded border border-slate-200 bg-slate-50 px-3 py-1.5"
                    >
                      <div className="font-bold text-slate-800">{hf.approvalDocTitle}</div>
                      <div className="text-amber-900">
                        인원 {formatNumber(hf.dispatchedHeadcount)}명 / 공급가{' '}
                        {formatNumber(hf.supplyAmount)}원 + 세액 {formatNumber(hf.vatAmount)}원 ={' '}
                        <strong>{formatNumber(hf.totalFeeAmount)}원</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 7] 4단계: 근태·연차·휴무 & 수요일 인원변동·주간보고 (Row 15~18, 41, 60)
           ============================================================ */}
        {activeTab === 'PHASE4_SCHEDULE_REPORT' && (
          <div className="space-y-6">
            {/* 상단 엑셀 팩 다운로드 및 말일 근무표 일괄 품의 바 */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  부서 월 근무표 취합·최종품의(R15~16) · 연차/휴무대장(R17~18) · 수요일 인원변동 보고(R41) · 주간보고(R60)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  부서별 월 근무표 취합 후 매월 말일 최종취합본 일괄 품의, 연차·잔여휴무 대장 자동 산출 및 매주 수요일 이사님 보고용 인원변동·주간보고 통합 관리
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApproveAllSchedules}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  [Row 16] 말일 월 근무표 최종취합본 일괄 품의 승인
                </button>
                <button
                  onClick={() => handleExportPhase4Excel('monthly-schedule-leave-pack')}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  월근무표·연차·잔여휴무대장 팩 (R15~R18)
                </button>
                <button
                  onClick={() => handleExportPhase4Excel('wednesday-headcount-weekly-report')}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  수요일 인원변동(이사님 보고)·주간보고 팩 (R41/R60)
                </button>
              </div>
            </div>

            {/* 4단계 A 핵심 지표 요약 카드 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  월 근무표 취합 및 말일 최종품의 (Row 15~16)
                </div>
                <div className="mt-1 text-lg font-extrabold text-indigo-700">
                  최종품의 {formatNumber(phase4Summary?.scheduleApprovedDeptsCount)}개 부서 / 취합{' '}
                  {formatNumber(phase4Summary?.scheduleSubmittedDeptsCount)}개 부서
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  매월 부서 근무표 취합 ➔ 말일 최종취합본 품의
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  전사 연차 부여 / 사용 / 잔여일수 (Row 17)
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700">
                  잔여 {formatNumber(phase4Summary?.totalAnnualLeaveRemaining)}일
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  총 부여 {formatNumber(phase4Summary?.totalAnnualLeaveGranted)}일 / 사용{' '}
                  {formatNumber(phase4Summary?.totalAnnualLeaveUsed)}일
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  당월 잔여 휴무일수 합계 (Row 18 마감근무표)
                </div>
                <div className="mt-1 text-lg font-extrabold text-amber-700">
                  잔여휴무 {formatNumber(phase4Summary?.totalOffDaysRemaining)}일
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  휴무 사용 품의 대조 및 월 마감근무표 연동
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  수요일 임직원 총원 및 당월 입·퇴사 (Row 41)
                </div>
                <div className="mt-1 text-lg font-extrabold text-blue-700">
                  총 재직 {formatNumber(phase4Summary?.grandTotalActiveHeadcount)}명
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  당월 입사 +{formatNumber(phase4Summary?.grandTotalMonthlyNewHires)}명 / 퇴사 -
                  {formatNumber(phase4Summary?.grandTotalMonthlyResignees)}명 (주간보고{' '}
                  {formatNumber(phase4Summary?.weeklyReportCount)}건)
                </div>
              </div>
            </div>

            {/* [Row 41] 매주 수요일 임직원 인원변동현황 (이사님 보고용 법인별 자동 집계표) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    [Row 41] 매주 수요일 임직원 인원변동현황 보고서 (법인별 재직·입사·퇴사 실시간 SSOT 집계 — 이사님 보고용)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    임직원 마스터(정규직·계약직·실습생·일용직·캐디)의 입사일·퇴사일을 기준으로 별도 수기 계산 없이 수요일 보고서 즉시 출력
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
                      <th className="px-3 py-2">법인명</th>
                      <th className="px-3 py-2 text-right">정규직</th>
                      <th className="px-3 py-2 text-right">계약직</th>
                      <th className="px-3 py-2 text-right">현장실습생</th>
                      <th className="px-3 py-2 text-right">일용직</th>
                      <th className="px-3 py-2 text-right">캐디</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-900">총 재직인원</th>
                      <th className="px-3 py-2 text-right text-emerald-700">당월 신규입사</th>
                      <th className="px-3 py-2 text-right text-rose-700">당월 퇴사</th>
                      <th className="px-3 py-2 text-right font-bold text-indigo-700">순증감</th>
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
                        <td className="px-3 py-2 text-right font-bold text-indigo-700">
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

            {/* 좌우 2열: [Row 15~16] 월 근무표 취합/품의 & [Row 17~18] 연차·잔여휴무 대장 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 1. 부서별 월 근무표 취합 및 말일 최종취합본 품의 (Row 15, 16) */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 15~16] 부서별 월 근무표 취합 및 매월 말일 최종취합본 품의
                </h3>
                <form onSubmit={handleSaveSchedule} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={scheduleForm.deptId}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, deptId: Number(e.target.value) })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
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
                      placeholder="부서 대상 인원수"
                      value={scheduleForm.totalHeadcount}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, totalHeadcount: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    >
                      <option value="SUBMITTED">부서 근무표 취합중 (R15)</option>
                      <option value="APPROVED_FINAL">말일 최종취합본 품의완료 (R16)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      placeholder="총 예정근무일수 합계"
                      value={scheduleForm.scheduledWorkDaysTotal}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          scheduledWorkDaysTotal: e.target.value,
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      placeholder="총 예정휴무일수 합계"
                      value={scheduleForm.scheduledOffDaysTotal}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          scheduledOffDaysTotal: e.target.value,
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      placeholder="예정 연장근로시간"
                      value={scheduleForm.plannedOvertimeHours}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          plannedOvertimeHours: e.target.value,
                        })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      placeholder="그룹웨어 품의번호"
                      value={scheduleForm.approvalDocNo}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, approvalDocNo: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-indigo-600 py-1.5 font-bold text-white hover:bg-indigo-500"
                  >
                    부서 월 근무표 취합 데이터 저장 (Row 15~16)
                  </button>
                </form>

                <div className="max-h-52 overflow-y-auto border-t border-slate-100 pt-2">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="px-2 py-1.5">법인/부서</th>
                        <th className="px-2 py-1.5 text-right">인원</th>
                        <th className="px-2 py-1.5 text-right">근무일/휴무일</th>
                        <th className="px-2 py-1.5">품의번호</th>
                        <th className="px-2 py-1.5">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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
                                ? '말일최종품의완료'
                                : '부서취합중'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. 연차대장 및 잔여휴무 마감근무표 관리 (Row 17, 18) */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 17~18] 연차 확인·잔여 관리(연차대장) 및 휴무 사용·잔여휴무(마감근무표)
                </h3>
                <form onSubmit={handleSaveLeaveLedger} className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={leaveForm.empId}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, empId: Number(e.target.value) })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    >
                      <option value={0}>대상 임직원 선택</option>
                      {employees.map((emp) => (
                        <option key={emp.empId} value={emp.empId}>
                          [{emp.entityCode}] {emp.empName} ({emp.deptName})
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="연차·휴무 품의 문서번호"
                      value={leaveForm.approvalDocNo}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, approvalDocNo: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="발생연차(일)"
                      value={leaveForm.annualLeaveGranted}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, annualLeaveGranted: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
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
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      step="0.5"
                      placeholder="당월부여휴무(일)"
                      value={leaveForm.monthlyOffGranted}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, monthlyOffGranted: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="number"
                      step="0.5"
                      placeholder="당월사용휴무(일)"
                      value={leaveForm.monthlyOffUsed}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, monthlyOffUsed: e.target.value })
                      }
                      className="rounded border border-slate-300 px-2.5 py-1.5"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-emerald-600 py-1.5 font-bold text-white hover:bg-emerald-500"
                  >
                    연차대장 및 마감근무표 잔여휴무 반영 (Row 17~18)
                  </button>
                </form>

                <div className="max-h-52 overflow-y-auto border-t border-slate-100 pt-2">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="px-2 py-1.5">성명(부서)</th>
                        <th className="px-2 py-1.5 text-right">연차(부여/사용/잔여)</th>
                        <th className="px-2 py-1.5 text-right">휴무(부여/사용/잔여)</th>
                        <th className="px-2 py-1.5">품의번호</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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

            {/* [Row 60] 주간업무보고서 작성 및 각 부서 팀장/파트장 휴무일 취합 보고 (매주 수, 목, 금) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="mb-3 text-xs font-bold text-slate-900">
                [Row 60] 부서 주간업무보고서 작성 및 각 부서 팀장·파트장 휴무일 취합 보고 (매주 수·목·금)
              </h3>
              <form onSubmit={handleAddWeeklyReport} className="mb-4 space-y-2.5 text-xs">
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="date"
                    value={weeklyReportForm.reportDate}
                    onChange={(e) =>
                      setWeeklyReportForm({ ...weeklyReportForm, reportDate: e.target.value })
                    }
                    className="rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                  <input
                    placeholder="주차 라벨 (예: 10월 3주차 수~금 취합)"
                    value={weeklyReportForm.reportWeekLabel}
                    onChange={(e) =>
                      setWeeklyReportForm({ ...weeklyReportForm, reportWeekLabel: e.target.value })
                    }
                    className="rounded border border-slate-300 px-2.5 py-1.5"
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
                    className="rounded border border-slate-300 px-2.5 py-1.5"
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
                    placeholder="작성자 (인사담당/부서장)"
                    value={weeklyReportForm.authorName}
                    onChange={(e) =>
                      setWeeklyReportForm({ ...weeklyReportForm, authorName: e.target.value })
                    }
                    className="rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="금주 주요 업무 실적 요약"
                    value={weeklyReportForm.thisWeekAchievements}
                    onChange={(e) =>
                      setWeeklyReportForm({
                        ...weeklyReportForm,
                        thisWeekAchievements: e.target.value,
                      })
                    }
                    className="rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                  <input
                    placeholder="차주 주요 업무 계획 요약"
                    value={weeklyReportForm.nextWeekPlans}
                    onChange={(e) =>
                      setWeeklyReportForm({ ...weeklyReportForm, nextWeekPlans: e.target.value })
                    }
                    className="rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                  <input
                    placeholder="각 부서 팀장·파트장 주간 휴무일정 취합"
                    value={weeklyReportForm.managerOffDaysSchedule}
                    onChange={(e) =>
                      setWeeklyReportForm({
                        ...weeklyReportForm,
                        managerOffDaysSchedule: e.target.value,
                      })
                    }
                    className="rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-500"
                >
                  주간업무보고서 및 팀장/파트장 휴무일 취합 등록 (Row 60)
                </button>
              </form>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                {weeklyDeptReports.map((wr) => (
                  <div
                    key={wr.reportId}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>
                        [{wr.reportWeekLabel}] [{wr.entityCode}] {wr.deptName} (작성:{' '}
                        {wr.authorName}, 기준일: {wr.reportDate})
                      </span>
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] text-indigo-800">
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
        )}

        {/* ============================================================
            [탭 8] 4단계: 제증명·완납·복리후생·연말정산·5대법정교육·산재·IT센터 (Row 34, 53~59, 61)
           ============================================================ */}
        {activeTab === 'PHASE4_CERT_TRAINING_IT' && (
          <div className="space-y-6">
            {/* 상단 엑셀 팩 다운로드 바 */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <GraduationCap className="h-4 w-4 text-emerald-600" />
                  연말정산(R34) · 휴가지원/건강검진EDI(R53~54) · 세미나 완납/제증명/원천징수부(R55~57) · 5대법정교육(R58) · 산재30일기한(R59) · IT센터(R61)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  인사 업무기술서 나머지 모든 수시·연간 행정업무(Row 34, 53~59, 61) 전 항목 무결성 원클릭 원장 및 엑셀 팩 자동 생성
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleExportPhase4Excel('certs-withholding-welfare-pack')}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  제증명·완납·원천징수영수증·복리후생·연말정산 팩 (R34/R53~57)
                </button>
                <button
                  onClick={() => handleExportPhase4Excel('mandatory-training-accident-it-pack')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  5대법정의무교육·산재조사표(30일기한)·IT센터 팩 (R58/R59/R61)
                </button>
              </div>
            </div>

            {/* 4단계 B 핵심 지표 카드 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  제증명·완납·복리후생·연말정산 처리 (R34/R53~57)
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700">
                  누적 {formatNumber(phase4Summary?.certAndWelfareCount)}건 발급·반영
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  세일즈본부 세미나 완납증명 · 재직/경력 · 원천징수부 통합
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  5대 법정의무교육 전 과목 이수 (Row 58)
                </div>
                <div className="mt-1 text-lg font-extrabold text-indigo-700">
                  이수완료 {formatNumber(phase4Summary?.trainingAllCompletedCount)}명 / 미이수{' '}
                  {formatNumber(phase4Summary?.trainingPendingCount)}명
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  성희롱·괴롭힘·개인정보·퇴직연금·산업안전 (11~12월)
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  산업재해조사표 30일 기한 트래커 (Row 59)
                </div>
                <div className="mt-1 text-lg font-extrabold text-rose-700">
                  관리 건수 {formatNumber(phase4Summary?.accidentReportCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  사고발생보고서 품의 확인 ➔ 30일 이내 노동부 제출기한 자동 산출
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  IT센터 협업 요청 티켓 (Row 61)
                </div>
                <div className="mt-1 text-lg font-extrabold text-amber-700">
                  누적 {formatNumber(phase4Summary?.itTicketCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  그룹웨어 오류 · 조직도 동기화 · 임직원 정보 수정 요청
                </div>
              </div>
            </div>

            {/* 좌우 2열: [Row 34, 53~57] 제증명/복리후생/연말정산 & [Row 58] 5대 법정의무교육 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 1. 제증명·완납증명·원천징수영수증·건강검진EDI·휴가지원·연말정산 (Row 34, 53~57) */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 34 / 53~57] 연말정산 · 휴가지원 · 건강검진 EDI · 세미나 완납증명 · 재직/경력/퇴직증명 · 원천징수영수증/원천징수부
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
                        [R55] 완납증명서(4대보험·국세·지방세 / 세일즈본부 세미나)
                      </option>
                      <option value="EMPLOYMENT_CAREER_CERT">
                        [R56] 재직·경력·퇴직증명서 (제증명 품의 확인)
                      </option>
                      <option value="WITHHOLDING_RECEIPT">
                        [R57] 근로소득 원천징수영수증 및 원천징수부 발급
                      </option>
                      <option value="HEALTH_CHECKUP_EDI">
                        [R54] 직장 건강검진 대상자 EDI 등록/삭제 확인
                      </option>
                      <option value="VACATION_SUPPORT">
                        [R53] 근로자 휴가지원사업 신청 및 적립 진행
                      </option>
                      <option value="YEAR_END_TAX_DOC">
                        [R34] 연말정산 자료 수합 및 정산 반영 (12/31 재직자)
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
                      <option value={0}>대상 임직원 선택 (법인 완납증명 시 선택 생략 가능)</option>
                      {employees.map((emp) => (
                        <option key={emp.empId} value={emp.empId}>
                          [{emp.entityCode}] {emp.empName} ({emp.deptName})
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="제증명 품의번호 / EDI 접수번호"
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
                    placeholder="발급 용도 및 상세 내역 (예: 세일즈본부 기업세미나 입찰용 국세·지방세·4대보험 완납증명)"
                    value={certForm.purposeOrDetail}
                    onChange={(e) => setCertForm({ ...certForm, purposeOrDetail: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full rounded bg-emerald-600 py-1.5 font-bold text-white hover:bg-emerald-500"
                  >
                    제증명 · 완납증명 · 원천징수영수증 · 건강검진 · 휴가지원 · 연말정산 원장 등록
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
                          <strong className="text-indigo-700">
                            {formatNumber(cw.settlementAmount)}원
                          </strong>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. 5대 법정의무교육 이수 관리 (Row 58) */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      [Row 58] 5대 법정의무교육 전 직원 이수 관리 (11월 진행 ~ 12월 완료)
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
                        <th className="px-2 py-1.5">임직원(부서)</th>
                        <th className="px-2 py-1.5 text-center">성희롱</th>
                        <th className="px-2 py-1.5 text-center">괴롭힘</th>
                        <th className="px-2 py-1.5 text-center">개인정보</th>
                        <th className="px-2 py-1.5 text-center">퇴직연금</th>
                        <th className="px-2 py-1.5 text-center">산업안전</th>
                        <th className="px-2 py-1.5 text-right">원클릭 이수</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mandatoryTrainings.map((mt) => (
                        <tr key={mt.trainingId}>
                          <td className="px-2 py-1.5 font-semibold text-slate-800">
                            [{mt.entityCode}] {mt.empName} ({mt.deptName})
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.sexualHarassmentDone ? '✅' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.workplaceBullyingDone ? '✅' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.personalInfoDone ? '✅' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.retirementPensionDone ? '✅' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mt.industrialSafetyDone ? '✅' : '⬜'}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {mt.isAllCompleted ? (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                                5대 교육 수료
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCompleteTraining(mt.empId, mt.empName)}
                                className="rounded bg-indigo-600 px-2 py-0.5 font-semibold text-white hover:bg-indigo-500"
                              >
                                전 과목 이수처리
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

            {/* 하단 좌우 2열: [Row 59] 산업재해조사표(사고 후 30일 이내 기한) & [Row 61] IT센터 협업 티켓 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 3. 산업재해조사표 작성 및 30일 이내 제출기한 가드레일 (Row 59) */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [Row 59] 산업재해조사표 작성 및 제출 트래커 (사고발생보고서 품의 확인 ➔ 사고 후 30일 이내 제출기한 자동 산출)
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
                      <option value={0}>재해 대상 임직원 선택</option>
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
                      <option value="REPORT_APPROVED">사고발생보고서 품의 확인</option>
                      <option value="SUBMITTED_TO_MOL">고용노동부 산재조사표 제출완료</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="내부 사고발생보고서 품의번호"
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
                      placeholder="재해 발생 경위 및 산재조사표 요약"
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
                    산업재해조사표 등록 및 30일 법정 제출기한 산출 (Row 59)
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
                          30일 제출기한: {ar.filingDeadlineDate}
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-700">
                        품의번호: {ar.internalApprovalDocNo} | {ar.accidentSummary} (
                        {ar.filingStatus === 'SUBMITTED_TO_MOL'
                          ? '노동부 제출완료'
                          : '사고보고서 품의확인'})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. IT센터 협업 요청 트래커 (Row 61: 그룹웨어 문제 및 조직도/임직원 정보 수정) */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Wrench className="h-3.5 w-3.5 text-amber-600" />
                  [Row 61] IT센터 협업 요청 트래커 (그룹웨어 문제 해결 · 조직도 동기화 · 임직원 정보 수정)
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
                      placeholder="요청자 성명"
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
                      <option value="ORG_CHART_SYNC">조직도 부서·직책 동기화</option>
                      <option value="EMP_INFO_CORRECTION">임직원 인사정보 수정 반영</option>
                      <option value="SYSTEM_AUTH">ERP/그룹웨어 권한 설정</option>
                    </select>
                    <input
                      placeholder="IT센터 요청 상세 내용"
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
                    className="w-full rounded bg-amber-600 py-1.5 font-bold text-white hover:bg-amber-500"
                  >
                    IT센터 협업 요청 티켓 등록 (Row 61)
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
                            조치완료
                          </span>
                        ) : (
                          <button
                            onClick={() => handleResolveItTicket(tk.ticketId)}
                            className="rounded bg-slate-800 px-2 py-1 font-semibold text-white hover:bg-slate-700"
                          >
                            조치완료 처리
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
            [탭 9] 5단계: 실데이터 엑셀 일괄 업로드(Bulk Import) & 법정·정기 데드라인(D-Day) 컨트롤타워
           ============================================================ */}
        {activeTab === 'PHASE5_BULK_AND_DDAY' && (
          <div className="space-y-6">
            {/* 상단 컨트롤타워 헤더 바 */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-900 bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <BellRing className="h-4 w-4 text-emerald-600" />
                  기존 엑셀 파일 드래그앤드롭 일괄 인제스천(HITL 미분류 자동격리) & 법정·정기 업무 D-Day 컨트롤타워
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  더존 아마란스 임직원 명부 · 일용직 투입일지 · 경기과 캐디 라운딩 · 삼성웰스토리 식수 엑셀을 원클릭 업로드하고, 매월 1~2일/8일/10일/15일/말일/수요일 및 퇴직 14일·산재 30일 기한을 실시간 통제합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDownloadBulkTemplate('EMPLOYEES_BULK')}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  임직원명부 업로드 양식 (.xlsx)
                </button>
                <button
                  onClick={() => handleDownloadBulkTemplate('DAILY_LOGS_BULK')}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  일용직일지 업로드 양식 (.xlsx)
                </button>
                <button
                  onClick={() => handleDownloadBulkTemplate('CADDY_BULK')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  경기과 캐디 업로드 양식 (.xlsx)
                </button>
                <button
                  onClick={() => handleDownloadBulkTemplate('MEAL_LOGS_BULK')}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-600"
                >
                  <Download className="h-3.5 w-3.5" />
                  웰스토리 식수 업로드 양식 (.xlsx)
                </button>
              </div>
            </div>

            {/* 5단계 핵심 KPI 요약 카드 4종 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  긴급 D-Day 도래 / 즉시 조치 필요 업무
                </div>
                <div className="mt-1 text-lg font-extrabold text-rose-600">
                  긴급 {formatNumber(phase5Summary?.urgentAlertCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  기준일: {phase5Summary?.referenceDate ?? '-'}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  예정(Upcoming) 정기·법정 기한 업무
                </div>
                <div className="mt-1 text-lg font-extrabold text-amber-600">
                  예정 {formatNumber(phase5Summary?.upcomingAlertCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  월초·8일·10일·15일·말일·수요일·14일·30일 주기
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  당월 처리 완료된 법정·정기 기한 업무
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-700">
                  완료 {formatNumber(phase5Summary?.completedAlertCount)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  전 공정 SSOT 마트 검증 완료
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">
                  엑셀 일괄 업로드 누적 적재 / HITL 격리
                </div>
                <div className="mt-1 text-lg font-extrabold text-indigo-700">
                  적재 {formatNumber(phase5Summary?.totalBulkImportedRows)}건 / HITL 격리{' '}
                  {formatNumber(phase5Summary?.totalBulkIsolatedHitlRows)}건
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  업로드 횟수 총 {formatNumber(phase5Summary?.totalBulkImportCount)}회
                </div>
              </div>
            </div>

            {/* 파트 1: 법정·정기 데드라인(D-Day) 컨트롤타워 대시보드 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    인사 업무기술서(Row 3 ~ Row 61) 법정·정기 마감기한(D-Day) 실시간 컨트롤타워
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    각 기한 카드의 [해당 탭 바로가기] 버튼을 클릭하면 즉시 해당 업무 화면으로 이동하여 품의·신고·엑셀 다운로드를 실행할 수 있습니다.
                  </p>
                </div>
                <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  실시간 점검 기준일: {phase5Summary?.referenceDate ?? '-'}
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
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-amber-200 bg-amber-50/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                            {alert.rowRef} · {alert.cycleLabel}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                              isUrgent
                                ? 'bg-rose-600 text-white'
                                : isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {isDone
                              ? '처리완료'
                              : isUrgent
                              ? '긴급 조치 요망'
                              : '기한 예정'}
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
                                `🔔 [${alert.title}] 마감 업무 처리 화면으로 이동했습니다!`
                              )
                            }
                            className="rounded bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-700"
                          >
                            해당 탭 바로가기 ➔
                          </button>
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-indigo-900">
                          현황: {alert.currentCountOrStatus}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 파트 2: 기존 엑셀 파일 드래그 앤 드롭 일괄 인제스천 엔진 (Zero Regex Guessing + 100% HITL) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Upload className="h-4 w-4 text-indigo-600" />
                    실데이터 엑셀(.xlsx / .xls / .csv) 원클릭 일괄 업로드 엔진
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    업로드 시 미등록 부서명이나 사원명 오타는 멋대로 추측하지 않고 즉시 <strong>[미등록 이름 확인 및 연결]</strong> 화면으로 안전하게 분리해 줍니다.
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
                        className="flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                      >
                        <Download className="h-3 w-3" />
                        ② 선택한 종류의 표준 엑셀양식 내려받기
                      </button>
                    </div>
                    <select
                      value={selectedBulkType}
                      onChange={(e) => {
                        const val = e.target.value as BulkImportTargetType;
                        setSelectedBulkType(val);
                        triggerSuccessToast(
                          '📋 업로드할 엑셀 종류가 변경되었습니다. 오른쪽 위 버튼으로 표준양식을 내려받거나 파일을 선택하세요.'
                        );
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900"
                    >
                      <option value="EMPLOYEES_BULK">
                        [1] 더존 아마란스 임직원 명부 일괄 업로드 (정규·계약·일용·실습·캐디 직원 등록)
                      </option>
                      <option value="DAILY_LOGS_BULK">
                        [2] 부서별 일용직 출근일지 엑셀 일괄 업로드 (업무 24, 30, 43)
                      </option>
                      <option value="CADDY_BULK">
                        [3] 경기과 캐디 월간 라운딩·입이직 엑셀 일괄 업로드 (업무 12, 44, 45)
                      </option>
                      <option value="MEAL_LOGS_BULK">
                        [4] 삼성웰스토리 일일 식수현황 엑셀 일괄 업로드 (업무 19, 21, 22)
                      </option>
                    </select>
                  </div>

                  <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-indigo-600" />
                    <div className="mt-2 font-bold text-indigo-950">
                      {uploadingExcel
                        ? '엑셀 데이터를 읽어서 자동 저장하고 있습니다...'
                        : '③ 작성한 엑셀 파일(.xlsx, .xls, .csv)을 아래 버튼으로 선택해 올리세요'}
                    </div>
                    <p className="mt-1 text-[11px] text-indigo-700">
                      위의 [② 표준 엑셀양식 내려받기] 버튼으로 받은 파일에 내용을 복사·붙여넣기 한 뒤 올리시면 가장 정확합니다.
                    </p>
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{uploadingExcel ? '⏳ 업로드 처리 중...' : '📂 엑셀 파일 선택 및 즉시 올리기'}</span>
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

              {/* 엑셀 일괄 업로드 감사 로그(Audit Trail) */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    엑셀 업로드 처리 내역 (성공 건수 및 미등록 분리 건수 확인)
                  </h3>
                  <button
                    onClick={() =>
                      navigateToWorkspace(
                        'HITL_MAPPING',
                        '⚠️ [미등록 이름 확인 및 1:1 연결] 화면으로 이동했습니다!'
                      )
                    }
                    className="rounded bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
                  >
                    미등록 이름 연결 화면 이동 ({formatNumber(pendingMappingCount)}건) ➔
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto border-t border-slate-100 pt-2">
                  {bulkImportHistory.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      아직 당월 일괄 업로드된 엑셀 이력이 없습니다. 왼쪽에서 양식을 내려받아 업로드해 보세요.
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="px-2 py-1.5">업로드 구분 / 파일명</th>
                          <th className="px-2 py-1.5 text-right">전체 건수</th>
                          <th className="px-2 py-1.5 text-right text-emerald-700">정상 등록</th>
                          <th className="px-2 py-1.5 text-right text-rose-700">미등록 확인필요</th>
                          <th className="px-2 py-1.5">업로드 일시</th>
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
          <div className="space-y-6">
            {departments.length === 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs">
                <div className="font-bold text-amber-950">
                  ⚠️ 직원을 등록하려면 먼저 소속 부서(예: 인사팀, 코스관리팀, 경기과)가 최소 1개 이상 등록되어 있어야 합니다.
                </div>
                <button
                  onClick={() =>
                    navigateToWorkspace(
                      'CONFIG',
                      '👉 [부서 및 코스트센터 등록] 화면으로 이동했습니다! 왼쪽 1번 칸에서 부서를 먼저 등록하세요.'
                    )
                  }
                  className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-500"
                >
                  👉 부서 먼저 등록하러 가기 (기초 설정) ➔
                </button>
              </div>
            )}

            <form
              id="emp-form-anchor"
              onSubmit={handleSaveEmployee}
              className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <PlusCircle className="h-4 w-4 text-emerald-600" />
                    전 직원(정규직·계약직·일용직·현장실습생·캐디) 신규 등록 및 정보 수정
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    이미 등록된 직원의 급여·퇴사일·차량번호를 고치려면 아래 명단에서 <strong>[불러오기]</strong> 버튼을 누른 뒤 수정하고 저장하세요.
                  </p>
                </div>
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
                      disabilityGrade: 'NONE',
                    });
                    triggerSuccessToast(
                      '🧹 직원 등록 입력칸을 깨끗하게 비웠습니다. 새 직원을 입력하실 수 있습니다!'
                    );
                  }}
                  className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  🧹 입력칸 비우기 (초기화)
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ① 사번 (고유번호) *
                  </label>
                  <input
                    placeholder="예: BF-2026-001"
                    value={empForm.empNo}
                    onChange={(e) => setEmpForm({ ...empForm, empNo: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    onChange={(e) =>
                      setEmpForm({ ...empForm, entityCode: e.target.value as EntityCode })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    onChange={(e) => setEmpForm({ ...empForm, deptId: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                    required
                  >
                    <option value={0}>부서를 선택하세요</option>
                    {departments.map((d) => (
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-emerald-400 bg-emerald-50/20 px-3 py-1.5 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-rose-700">
                    ⑧ 퇴사일 (재직자는 비워두세요)
                  </label>
                  <input
                    type="date"
                    title="퇴사일 (재직자는 비움)"
                    value={empForm.resignDate}
                    onChange={(e) => setEmpForm({ ...empForm, resignDate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑨ 월 기본급 (일용직/캐디는 0)
                  </label>
                  <input
                    type="number"
                    placeholder="세전 월 기본급 숫자만 입력"
                    value={empForm.baseMonthlyPay}
                    onChange={(e) => setEmpForm({ ...empForm, baseMonthlyPay: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑫ 팀장 보직수당 대상 여부
                  </label>
                  <select
                    value={empForm.isTeamLeader}
                    onChange={(e) => setEmpForm({ ...empForm, isTeamLeader: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑮ 기숙사 호실 (입주자만 입력)
                  </label>
                  <input
                    placeholder="예: 302호 (퇴사 시 지원팀 알림)"
                    value={empForm.dormitoryRoom}
                    onChange={(e) => setEmpForm({ ...empForm, dormitoryRoom: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑯ 급여통장 은행명
                  </label>
                  <input
                    placeholder="예: 하나은행, 국민은행"
                    value={empForm.bankName}
                    onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑰ 급여통장 계좌번호
                  </label>
                  <input
                    placeholder="예: 123-456789-01"
                    value={empForm.accountNo}
                    onChange={(e) => setEmpForm({ ...empForm, accountNo: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
                  >
                    <option value="NONE">해당없음 (비장애)</option>
                    <option value="MILD">경증 장애인 (1배수 인정)</option>
                    <option value="SEVERE">중증 장애인 (2배수 인정)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500"
                  >
                    💾 직원 정보 저장 / 업데이트
                  </button>
                </div>
              </div>
            </form>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900">
                  [업무 11] 이달({targetYm}) 입사 3개월 만료 수습평가 & 무료숙박권 품의 대상자
                </h3>
                <div className="mt-3 space-y-2 text-xs">
                  {probationTargets.length === 0 ? (
                    <p className="text-slate-400">이달에 수습 3개월이 도래하는 직원이 없습니다.</p>
                  ) : (
                    probationTargets.map((p) => (
                      <div
                        key={p.empId}
                        className="rounded border border-emerald-200 bg-emerald-50/60 p-2.5"
                      >
                        <div className="font-bold text-slate-900">
                          [{p.entityName} / {p.deptName}] {p.empName} ({p.empNo}) — 입사: {p.hireDate} ➔ 3개월 만료: {p.probationEndDate}
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
                  [업무 10] 이달({targetYm}) 지원팀 전달용 기숙사 퇴사자 명단 (15일 / 말일 발송)
                </h3>
                <div className="mt-3 space-y-2 text-xs">
                  {dormitoryResignees.length === 0 ? (
                    <p className="text-slate-400">이달에 퇴사한 기숙사 거주 직원이 없습니다.</p>
                  ) : (
                    dormitoryResignees.map((d) => (
                      <div
                        key={d.empId}
                        className="flex items-center justify-between rounded border border-amber-200 bg-amber-50/60 p-2.5"
                      >
                        <div>
                          <span className="font-bold text-slate-900">
                            [{d.entityName} / {d.deptName}] {d.empName}
                          </span>
                          <span className="ml-2 text-slate-600">퇴사일: {d.resignDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="rounded bg-amber-200 px-2 py-0.5 font-bold text-amber-900">
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
                <h3 className="text-xs font-bold text-slate-800">
                  등록된 전 직원 명부 ({formatNumber(employees.length)}명) — 수정하려면 우측 [불러오기] 클릭
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                      <th className="px-3 py-2">사번</th>
                      <th className="px-3 py-2">성명</th>
                      <th className="px-3 py-2">고용형태</th>
                      <th className="px-3 py-2">법인</th>
                      <th className="px-3 py-2">부서(코스트센터)</th>
                      <th className="px-3 py-2">직위</th>
                      <th className="px-3 py-2">입사일</th>
                      <th className="px-3 py-2">퇴사일</th>
                      <th className="px-3 py-2">수습3개월만료</th>
                      <th className="px-3 py-2 text-right">월기본급</th>
                      <th className="px-3 py-2 text-right">비과세(식대+차량)</th>
                      <th className="px-3 py-2 text-right">팀장수당(코나카드)</th>
                      <th className="px-3 py-2">기숙사/차량/장애</th>
                      <th className="px-3 py-2 text-center">수정 불러오기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((e) => (
                      <tr key={e.empId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono">{e.empNo}</td>
                        <td className="px-3 py-2 font-bold">{e.empName}</td>
                        <td className="px-3 py-2">{e.employmentType}</td>
                        <td className="px-3 py-2">{e.entityName}</td>
                        <td className="px-3 py-2">
                          {e.deptName} ({e.costCenterCode})
                        </td>
                        <td className="px-3 py-2">{e.positionTitle}</td>
                        <td className="px-3 py-2">{e.hireDate}</td>
                        <td className="px-3 py-2 text-rose-600">{e.resignDate ?? '-'}</td>
                        <td className="px-3 py-2">{e.probationEndDate ?? '-'}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(e.baseMonthlyPay)}</td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(e.mealAllowanceTaxFree + e.carAllowanceTaxFree)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {e.isTeamLeader
                            ? `${formatNumber(e.teamLeaderAllowance)} (${e.konaCardNo ?? '카드미등록'})`
                            : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {e.dormitoryRoom ?? '-'} / {e.carNumber ?? '-'} / {e.disabilityGrade ?? 'NONE'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
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
                                `✏️ [${e.empName} (${e.empNo})] 직원 정보를 위쪽 수정 입력칸으로 불러왔습니다! 수정 후 [직원 정보 저장]을 누르세요.`
                              );
                              const formEl = document.getElementById('emp-form-anchor');
                              if (formEl) {
                                formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            ✏️ 불러오기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            [탭 6] 급여 기초자료(수당/공제/상여) & 일용직 투입일지 (Row 24, 25, 27, 30)
           ============================================================ */}
        {activeTab === 'INPUTS' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  [업무 25 & 27] 직원별 추가 수당 · 상여금 · 공제 금액 입력
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  이번 달에 발생한 연장수당, 상여금이나 기숙사비·식대 공제액을 등록합니다.
                </p>
              </div>
              <form onSubmit={handleAddSingleAdjustment} className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ① 대상 직원 선택 (목록에서 고르거나 아래 칸에 직접 입력) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setAdjForm({ ...adjForm, empNoOrName: e.target.value });
                        }
                      }}
                      className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5"
                    >
                      <option value="">👉 등록된 직원에서 빠르게 고르기...</option>
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
                      className="rounded border border-slate-300 px-3 py-1.5"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ④ 품의번호 / 메모 (선택)
                  </label>
                  <input
                    placeholder="예: 주말 연장근무 수당, 10월 기숙사비 정산 등"
                    value={adjForm.notes}
                    onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>

                <button
                  type="submit"
                  className="col-span-2 rounded bg-slate-900 py-2 font-bold text-white hover:bg-slate-800"
                >
                  추가 수당/공제 내역 저장하기
                </button>
              </form>

              <div className="border-t border-slate-200 pt-4">
                <label className="block text-xs font-bold text-slate-700">
                  여러 줄 한 번에 복사·붙여넣기 (한 줄에 한 명씩: 성명또는사번, 수당명, 금액, 품의번호, 비고)
                </label>
                <textarea
                  rows={3}
                  value={bulkAdjText}
                  onChange={(e) => setBulkAdjText(e.target.value)}
                  placeholder="홍길동, 연장수당, 250000, DOC-01, 주말근무"
                  className="mt-2 w-full rounded border border-slate-300 p-2 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleBulkAdjustmentUpload}
                  className="mt-2 w-full rounded bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  붙여넣은 여러 줄 한 번에 등록하기
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border-t border-slate-200 pt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-1.5">성명(사번)</th>
                      <th className="py-1.5">수당/공제 구분</th>
                      <th className="py-1.5 text-right">금액</th>
                      <th className="py-1.5">비고</th>
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
                      return (
                        <tr key={a.adjId}>
                          <td className="py-1.5 font-medium">
                            {a.empName} ({a.empNo})
                          </td>
                          <td className="py-1.5">
                            {categoryKorMap[a.category] ?? a.category}
                          </td>
                          <td className="py-1.5 text-right font-semibold">
                            {formatNumber(a.amount)}원
                          </td>
                          <td className="py-1.5 text-slate-500">{a.notes ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  [업무 24 & 30] 각 팀별 일용직 출근기록(투입일지) 등록
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  일용직 직원의 출근 날짜와 하루 일당을 입력하면 세금·고용보험·노무비가 자동 계산됩니다.
                </p>
              </div>
              <form onSubmit={handleAddDailyLog} className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ① 출근하여 일한 날짜 *
                  </label>
                  <input
                    type="date"
                    value={dailyForm.workDate}
                    onChange={(e) => setDailyForm({ ...dailyForm, workDate: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ② 일용직 직원 선택 *
                  </label>
                  <select
                    value={dailyForm.empId}
                    onChange={(e) => setDailyForm({ ...dailyForm, empId: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
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
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    ⑤ 투입일지 품의번호 / 메모 (선택)
                  </label>
                  <input
                    placeholder="예: 코스관리팀 10월 1주차 일용직 투입일지"
                    value={dailyForm.approvalDocNo}
                    onChange={(e) => setDailyForm({ ...dailyForm, approvalDocNo: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>

                <button
                  type="submit"
                  className="col-span-2 rounded bg-slate-900 py-2 font-bold text-white hover:bg-slate-800"
                >
                  일용직 출근기록 저장하기
                </button>
              </form>

              <div className="max-h-80 overflow-y-auto border-t border-slate-200 pt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-1.5">근무일</th>
                      <th className="py-1.5">부서</th>
                      <th className="py-1.5">성명</th>
                      <th className="py-1.5 text-right">시간</th>
                      <th className="py-1.5 text-right">하루 일당</th>
                      <th className="py-1.5">품의번호</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyLogs.map((l) => (
                      <tr key={l.logId}>
                        <td className="py-1.5">{l.workDate}</td>
                        <td className="py-1.5">{l.deptName}</td>
                        <td className="py-1.5 font-medium">{l.empName}</td>
                        <td className="py-1.5 text-right">{formatNumber(l.workHours)}시간</td>
                        <td className="py-1.5 text-right font-semibold">
                          {formatNumber(l.dailyGrossPay)}원
                        </td>
                        <td className="py-1.5 text-slate-500">{l.approvalDocNo ?? '-'}</td>
                      </tr>
                    ))}
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
                        ✅ 현재 확인이 필요한 미등록 이름이나 오타가 없습니다 (모두 정상 연결됨).
                      </td>
                    </tr>
                  ) : (
                    mappingCandidates.map((c) => (
                      <tr key={c.candidateId} className="bg-amber-50/40">
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
                            className="rounded bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500"
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
                  className="col-span-2 rounded bg-slate-900 py-2 font-bold text-white hover:bg-slate-800"
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
                      '🪄 표준 법정요율 24개 항목이 입력칸에 자동으로 채워졌습니다! 아래 초록색 [법정 요율 저장하기] 버튼을 눌러 확정하세요.'
                    );
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-500"
                >
                  🪄 표준 법정요율 입력칸 자동채우기 (작성 도우미)
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
                    className="w-full rounded border border-emerald-300 bg-emerald-50/30 px-2.5 py-1.5"
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
                    className="w-full rounded border border-emerald-300 bg-emerald-50/30 px-2.5 py-1.5"
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
                    className="w-full rounded border border-emerald-300 bg-emerald-50/30 px-2.5 py-1.5"
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
                    className="w-full rounded border border-emerald-300 bg-emerald-50/30 px-2.5 py-1.5"
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
                    className="w-full rounded border border-emerald-300 bg-emerald-50/30 px-2.5 py-1.5"
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
                    className="w-full rounded border border-emerald-300 bg-emerald-50/30 px-2.5 py-1.5"
                  />
                </div>
                <button
                  type="submit"
                  className="col-span-2 rounded bg-emerald-600 py-2 font-bold text-white hover:bg-emerald-500"
                >
                  법정 요율 저장하기
                </button>
              </form>

              <div className="border-t border-slate-200 pt-3 text-xs">
                <p className="font-bold text-slate-700">등록된 법정 요율 이력:</p>
                {rateConfigs.length === 0 ? (
                  <p className="mt-1 text-slate-400">
                    등록된 법정 요율이 없습니다. 위의 [🪄 표준 법정요율 입력칸 자동채우기] 버튼을 누른 뒤 저장해 주세요.
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
      </main>
        </>
      )}
    </div>
  );
}
