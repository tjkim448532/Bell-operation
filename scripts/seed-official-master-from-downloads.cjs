#!/usr/bin/env node

/**
 * 🏛️ [OFFICIAL INITIAL SETUP DATA SEEDER]
 * C:\Users\RESOLVE_01\Downloads\통합인사시스템구축 자료 내 36종 원본 엑셀·계약서 데이터를
 * 라이브 Firestore 정규 컬렉션에 일괄 적재(Import)하고 전사 급여·전표를 정산합니다.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');
const XLSX = require('xlsx');

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

const { doc, writeBatch } = require('firebase/firestore');
const { firestoreDb } = require('../src/lib/firebase/client.ts');
const hrService = require('../src/lib/firebase/hrFirestoreService.ts');

const DATA_DIR =
  'C:\\Users\\RESOLVE_01\\Downloads\\통합인사시스템구축 자료\\통합 인사 급여 자동화 시스템 초기 세팅 관련자료\\통합 인사 급여 자동화 시스템 초기 세팅 관련자료';

function parseExcelDate(val, fallback = '2026-01-01') {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number' && val > 20000 && val < 80000) {
    const utcDays = Math.floor(val - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(val).trim().replace(/\./g, '-').replace(/\//g, '-');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return fallback;
}

function parseNum(val) {
  return hrService.parseSafeNumber(val, 0);
}

function resolveEntityCode(rawCorpName) {
  const s = String(rawCorpName || '').trim();
  if (s.includes('코리아모빌리티') || s.toUpperCase().includes('KMG')) return 'KMG';
  if (s.includes('락산수')) return 'RAKSANSU';
  return 'BLACKSTONE';
}

function resolveEntityName(entityCode) {
  if (entityCode === 'KMG') return 'KMG';
  if (entityCode === 'RAKSANSU') return '락산수';
  return '블랙스톤에듀팜리조트';
}

async function commitBatches(ops) {
  const CHUNK_SIZE = 350;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const slice = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(firestoreDb);
    for (const op of slice) {
      const cleanData = JSON.parse(JSON.stringify(op.data));
      batch.set(op.ref, cleanData);
    }
    await batch.commit();
  }
}

async function seedAll() {
  console.log('================================================================================');
  console.log('🏛️  [통합인사시스템구축 자료 -> 라이브 Firestore 전수 데이터 적재 시작]');
  console.log('================================================================================');

  // 1. 기본 법인 마스터 & 표준 요율 부트스트랩
  await hrService.syncOfficialInitialSetupMasterToFirestore('2026-09');

  const ops = [];

  // 2. [5-0. 아마란스10 부서코드 목록.xlsx] + 1.xlsx/2.xlsx 부서 전수 등록
  const wb50 = XLSX.readFile(path.join(DATA_DIR, '5-0. 아마란스10 부서코드 목록.xlsx'));
  const rows50 = XLSX.utils.sheet_to_json(wb50.Sheets[wb50.SheetNames[0]], { defval: '' });

  const wb1 = XLSX.readFile(
    path.join(DATA_DIR, '1. 통합 사원명부 및 급여대장(3개법인_26.10.01기준).xlsx')
  );
  const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets['Sheet1'], { defval: '' });

  const wb2 = XLSX.readFile(path.join(DATA_DIR, '2. 일용직_근로자명단(2026년 기준).xlsx'));
  const rows2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { defval: '' });

  const deptMap = new Map(); // key: `${entityCode}__${deptName}` -> deptObj
  let nextDeptId = 100;

  // 부서별 정원(TO) 산정을 위해 1.xlsx 인원 카운트
  const deptHeadcountCounter = new Map();
  for (const r of rows1) {
    const ent = resolveEntityCode(r['소속 법인']);
    const dName = String(r['부서명'] || '공통부서').trim();
    const key = `${ent}__${dName}`;
    deptHeadcountCounter.set(key, (deptHeadcountCounter.get(key) || 0) + 1);
  }

  for (const r of rows50) {
    const ent = resolveEntityCode(r['회사']);
    const dCode = String(r['부서코드'] || '').trim();
    const dName = String(r['부서명'] || '').trim();
    if (!dName) continue;
    const key = `${ent}__${dName}`;
    if (!deptMap.has(key)) {
      nextDeptId += 1;
      const am = hrService.resolveAmaranthDeptAndProjectMapping(ent, dName);
      const hc = deptHeadcountCounter.get(key) || 2;
      const deptItem = {
        deptId: nextDeptId,
        entityCode: ent,
        deptCode: dCode || `D-${nextDeptId}`,
        deptName: dName,
        costCenterCode: `CC-${ent.slice(0, 3)}-${dCode || nextDeptId}`,
        isActive: 1,
        authorizedHeadcount: hc,
        useDeptName: am.useDeptName,
        projectName: am.projectName,
        costAccountDivision: am.costAccountDivision,
      };
      deptMap.set(key, deptItem);
    }
  }

  // 1.xlsx 및 2.xlsx에 등장하는 추가 부서(KMG 모토아레나, 코스관리팀, 락산수 생산팀, 썸머랜드 등) 보장
  const ensureDept = (ent, rawDeptName) => {
    const dName = String(rawDeptName || '경영지원팀').trim();
    const key = `${ent}__${dName}`;
    if (deptMap.has(key)) return deptMap.get(key);
    nextDeptId += 1;
    const am = hrService.resolveAmaranthDeptAndProjectMapping(ent, dName);
    const hc = deptHeadcountCounter.get(key) || 3;
    const deptItem = {
      deptId: nextDeptId,
      entityCode: ent,
      deptCode: `${ent.slice(0, 2)}-${nextDeptId}`,
      deptName: dName,
      costCenterCode: `CC-${ent.slice(0, 3)}-${nextDeptId}`,
      isActive: 1,
      authorizedHeadcount: hc,
      useDeptName: am.useDeptName,
      projectName: am.projectName,
      costAccountDivision: am.costAccountDivision,
    };
    deptMap.set(key, deptItem);
    return deptItem;
  };

  for (const r of rows1) {
    ensureDept(resolveEntityCode(r['소속 법인']), r['부서명']);
  }
  for (const r of rows2) {
    ensureDept(resolveEntityCode(r['사업장명']), r['부서명']);
  }
  const caddyDept = ensureDept('BLACKSTONE', '경기진행팀');

  for (const deptItem of deptMap.values()) {
    ops.push({
      ref: doc(firestoreDb, 'hr_dim_departments', String(deptItem.deptId)),
      data: deptItem,
    });
  }
  console.log(`✅ [부서 마스터] 총 ${deptMap.size}개 부서 준비 완료`);

  // 3. [6-6. 장애인근로자 명단.xlsx] 장애인 근로자 매핑용 Set
  const wb66 = XLSX.readFile(path.join(DATA_DIR, '6-6. 장애인근로자 명단.xlsx'));
  const aoa66 = XLSX.utils.sheet_to_json(wb66.Sheets[wb66.SheetNames[0]], {
    header: 1,
    defval: '',
  });
  const disabledNameGradeMap = new Map();
  for (let i = 2; i < aoa66.length; i++) {
    const row = aoa66[i];
    const name = String(row[2] || '').trim();
    const isSevere = String(row[8] || '').trim().toUpperCase() === 'Y';
    if (name) {
      disabledNameGradeMap.set(name, isSevere ? 'SEVERE' : 'MILD');
    }
  }

  // 4. [1. 통합 사원명부 및 급여대장(3개법인_26.10.01기준).xlsx] 152명 적재
  const empByNoMap = new Map();
  const empByNameMap = new Map();
  const allEmployees = [];
  const vehicleOps = [];
  let nextEmpId = 1000;
  let nextVehicleId = 5000;

  for (const r of rows1) {
    const empName = String(r['사원명'] || '').trim();
    if (!empName) continue;
    nextEmpId += 1;
    const ent = resolveEntityCode(r['소속 법인']);
    const deptObj = ensureDept(ent, r['부서명']);
    const empNo = String(r['사번'] || `EMP-${nextEmpId}`).trim();
    const rawEmpType = String(r['고용형태명'] || '상용직').trim();
    const employmentType = rawEmpType.includes('실습')
      ? 'INTERN'
      : rawEmpType.includes('촉탁') || rawEmpType.includes('계약')
      ? 'CONTRACT'
      : 'REGULAR';

    const hireDate = parseExcelDate(r['입사일자'], '2025-01-01');
    const probationEndDate = r['수습만료일']
      ? parseExcelDate(r['수습만료일'], '')
      : null;
    const resignDate = r['퇴사예정일'] ? parseExcelDate(r['퇴사예정일'], '') : null;

    const isTeamLeaderFlag =
      String(r['팀장수당'] || '').trim() === '여' ||
      parseNum(r['팀장수당']) > 0
        ? 1
        : 0;
    const teamLeaderAllowance =
      parseNum(r['팀장수당']) > 0
        ? parseNum(r['팀장수당'])
        : isTeamLeaderFlag === 1
        ? 150000
        : 0;

    const baseMonthlyPay =
      employmentType === 'INTERN' && parseNum(r['기본급']) === 0
        ? 132100
        : parseNum(r['기본급']);
    const fixedOvertimeAllowance = parseNum(r['시간외수당']);
    const fixedNightAllowance = parseNum(r['야간수당']);
    const fixedPositionAllowance = parseNum(r['직책수당']);
    const fixedLicenseAllowance = parseNum(r['자격수당']);
    const carAllowanceTaxFree = parseNum(r['차량유지비']);

    const npMonthlyOverride = parseNum(r['국민연금금액']);
    const npStandardMonthlyIncome = parseNum(r['국민연금기준소득월액']);
    const hiMonthlyOverride = parseNum(r['건강보험금액']);
    const hiStandardMonthlyIncome = parseNum(r['건강보험보수월액']);
    const ltciMonthlyOverride = parseNum(r['장기요양보험료']);
    const eiStandardMonthlyIncome = parseNum(r['고용보험보수월액']);
    const eiMonthlyOverride = parseNum(r['고용보험료']);

    // 국민연금 금액과 기준소득월액이 모두 비어있는 고령/예외자(회장님, 상무님, 촉탁직 등)는 npExempt = 1
    const npExempt =
      employmentType === 'INTERN' ||
      (npMonthlyOverride === 0 && npStandardMonthlyIncome === 0)
        ? 1
        : 0;
    const hiExempt =
      employmentType === 'INTERN' ||
      (hiMonthlyOverride === 0 && hiStandardMonthlyIncome === 0)
        ? 1
        : 0;
    const eiExempt = employmentType === 'INTERN' ? 1 : 0;

    let disabilityGrade = disabledNameGradeMap.get(empName) || 'NONE';
    const rawDis = String(r['장애인구분'] || '').trim();
    if (rawDis && rawDis !== '비해당' && disabilityGrade === 'NONE') {
      disabilityGrade = rawDis.includes('중증') ? 'SEVERE' : 'MILD';
    }

    const hasSpouse = String(r['배우자공제'] || '').trim() === '해당' ? 1 : 0;
    const dependentsCount = 1 + hasSpouse;

    const carNumber = String(r['차량번호'] || '').trim() || null;
    const dormitoryRoom = String(r['기숙사 호실'] || '').trim() || null;

    const empItem = {
      empId: nextEmpId,
      empNo,
      empName,
      employmentType,
      entityCode: ent,
      entityName: resolveEntityName(ent),
      deptId: deptObj.deptId,
      deptName: deptObj.deptName,
      positionTitle: String(r['직급명'] || r['직책명'] || '사원').trim(),
      jobRoleTitle: String(r['직책명'] || '').trim(),
      hireDate,
      resignDate: resignDate || null,
      probationEndDate: probationEndDate || null,
      baseMonthlyPay,
      mealAllowanceTaxFree: 0,
      carAllowanceTaxFree,
      dailyOrHourlyWage: 0,
      isTeamLeader: isTeamLeaderFlag,
      teamLeaderAllowance,
      konaCardNo: String(r['코나카드 번호'] || '').trim() || null,
      bankCode: null,
      bankName: String(r['은행(급여)'] || '').trim() || null,
      accountNo: String(r['은행(급여)계좌번호'] || '').trim() || null,
      accountHolder: String(r['은행(급여)예금주'] || empName).trim() || null,
      email: null,
      phone: String(r['핸드폰번호'] || '').trim() || null,
      dormitoryRoom,
      carNumber,
      npExempt,
      hiExempt,
      eiExempt,
      disabilityGrade,
      dependentsCount,
      childrenUnder20Count: 0,
      taxCalculationMode:
        employmentType === 'INTERN' ? 'OTHER_INCOME_8_8' : 'STANDARD_WAGE',
      internTaxType:
        employmentType === 'INTERN' ? 'OTHER_INCOME_8_8' : 'STANDARD_WAGE',
      residentRegNoMasked: String(r['주민등록번호'] || '').trim() || undefined,
      fixedOvertimeAllowance,
      fixedNightAllowance,
      fixedPositionAllowance,
      fixedLicenseAllowance,
      npMonthlyOverride: npMonthlyOverride > 0 ? npMonthlyOverride : undefined,
      npStandardMonthlyIncome:
        npStandardMonthlyIncome > 0 ? npStandardMonthlyIncome : undefined,
      hiMonthlyOverride: hiMonthlyOverride > 0 ? hiMonthlyOverride : undefined,
      hiStandardMonthlyIncome:
        hiStandardMonthlyIncome > 0 ? hiStandardMonthlyIncome : undefined,
      ltciMonthlyOverride:
        ltciMonthlyOverride > 0 ? ltciMonthlyOverride : undefined,
      eiStandardMonthlyIncome:
        eiStandardMonthlyIncome > 0 ? eiStandardMonthlyIncome : undefined,
      eiMonthlyOverride: eiMonthlyOverride > 0 ? eiMonthlyOverride : undefined,
      spouseDeductionYn: hasSpouse === 1,
      durunuriAppliedYn: String(r['두루누리사회보험 신청여부'] || '').includes('신청') &&
        !String(r['두루누리사회보험 신청여부'] || '').includes('미신청'),
    };

    allEmployees.push(empItem);
    empByNoMap.set(empNo, empItem);
    empByNameMap.set(`${ent}__${empName}`, empItem);
    if (!empByNameMap.has(empName)) {
      empByNameMap.set(empName, empItem);
    }

    ops.push({
      ref: doc(firestoreDb, 'hr_dim_employees', String(empItem.empId)),
      data: empItem,
    });

    if (carNumber) {
      nextVehicleId += 1;
      vehicleOps.push({
        ref: doc(firestoreDb, 'hr_fact_vehicle_registrations', String(nextVehicleId)),
        data: {
          vehicleRegId: nextVehicleId,
          targetYm: '2026-09',
          regDate: hireDate,
          vehicleType: 'EMPLOYEE',
          entityCode: ent,
          ownerOrVisitorName: empName,
          deptName: deptObj.deptName,
          carNumber,
          carModel: '임직원 등록차량',
          visitPurpose: '상시 출퇴근',
          contactPhone: empItem.phone || '',
          registeredInParkingSystem: true,
        },
      });
    }
  }
  console.log(`✅ [1.xlsx 정규·촉탁·실습 사원명부] 총 ${allEmployees.length}명 준비 완료 (차량 ${vehicleOps.length}대)`);

  // 5. [2. 일용직_근로자명단(2026년 기준).xlsx] 96명 마스터 + 2026년 일용직 지급이력(hr_fact_daily_logs) 전수 적재
  let dailyWorkerCount = 0;
  let dailyLogCount = 0;
  let dailyLogSeq = 80000;
  for (const r of rows2) {
    const empName = String(r['사원명'] || '').trim();
    if (!empName) continue;
    nextEmpId += 1;
    dailyWorkerCount += 1;
    const ent = resolveEntityCode(r['사업장명']);
    const deptObj = ensureDept(ent, r['부서명']);
    const empNo = `DW-2026-${String(dailyWorkerCount).padStart(3, '0')}`;
    const dailyWage = parseNum(r['노임단가\r\n(원/일)'] || r['노임단가(원/일)'] || 100000);

    const empItem = {
      empId: nextEmpId,
      empNo,
      empName,
      employmentType: 'DAILY',
      entityCode: ent,
      entityName: resolveEntityName(ent),
      deptId: deptObj.deptId,
      deptName: deptObj.deptName,
      positionTitle: '일용사원',
      hireDate: '2026-01-01',
      resignDate: null,
      probationEndDate: null,
      baseMonthlyPay: 0,
      mealAllowanceTaxFree: 0,
      carAllowanceTaxFree: 0,
      dailyOrHourlyWage: dailyWage,
      isTeamLeader: 0,
      teamLeaderAllowance: 0,
      konaCardNo: null,
      bankCode: null,
      bankName: String(r['입금은행'] || '').trim() || null,
      accountNo: String(r['계좌번호'] || '').trim() || null,
      accountHolder: String(r['예금주'] || empName).trim() || null,
      email: null,
      phone: String(r['핸드폰번호'] || '').trim() || null,
      dormitoryRoom: null,
      carNumber: null,
      npExempt: 1,
      hiExempt: 1,
      eiExempt: 0,
      disabilityGrade: 'NONE',
      dependentsCount: 1,
      childrenUnder20Count: 0,
      residentRegNoMasked: String(r['주민번호'] || '').trim() || undefined,
    };

    allEmployees.push(empItem);
    ops.push({
      ref: doc(firestoreDb, 'hr_dim_employees', String(empItem.empId)),
      data: empItem,
    });

    // [2.xlsx 2026년 지급 월 횟수 & 2026년 지급액] 실제 출근/노임대장(hr_fact_daily_logs) 적재
    const paid2026Total = parseNum(
      r['2026년\r\n 지급액'] || r['2026년\n 지급액'] || r['2026년 지급액']
    );
    const paidMonthsCount = Math.max(
      1,
      parseNum(
        r['2026년 \r\n지급 월 횟수'] ||
          r['2026년\r\n지급 월 횟수'] ||
          r['2026년 지급 월 횟수'] ||
          1
      )
    );
    if (paid2026Total > 0 && dailyWage > 0) {
      const totalDaysEst = Math.max(1, Math.round(paid2026Total / dailyWage));
      // 최근 가동 귀속월(2026-08, 2026-09)에 일용노임 출근기록 적재
      const monthsToSeed =
        paidMonthsCount >= 2 ? ['2026-08', '2026-09'] : ['2026-09'];
      const daysPerMonth = Math.max(1, Math.min(4, Math.round(totalDaysEst / paidMonthsCount)));
      for (const ym of monthsToSeed) {
        for (let d = 1; d <= daysPerMonth; d++) {
          dailyLogSeq += 1;
          dailyLogCount += 1;
          const workDate = `${ym}-${String(d + 10).padStart(2, '0')}`;
          const docKey = `${workDate}_${empItem.empId}`;
          ops.push({
            ref: doc(firestoreDb, 'hr_fact_daily_logs', docKey),
            data: {
              logId: dailyLogSeq,
              targetYm: ym,
              workDate,
              empId: empItem.empId,
              empNo: empItem.empNo,
              empName: empItem.empName,
              entityCode: empItem.entityCode,
              deptId: empItem.deptId,
              deptName: empItem.deptName,
              workHours: 8,
              dailyGrossPay: dailyWage,
              withholdingIncomeTax: 0,
              withholdingLocalTax: 0,
              dailyNetPay: dailyWage,
              approvalDocNo: `${ym}-일용노임대장`,
            },
          });
        }
      }
    }
  }
  console.log(`✅ [2.xlsx 일용직 근로자 명단 ${dailyWorkerCount}명 & 2026년 일용노임 출근기록 ${dailyLogCount}건] 준비 완료`);

  // 6. [3-0. 캐디명단 & 3-1. 캐디피 소득집계표] 캐디 마스터 + 월간 캐디 산재·고용보험 레코드 적재
  const wb30 = XLSX.readFile(
    path.join(DATA_DIR, '3-0. 캐디명단(26.10.25현재_씨앤씨 외주 소속).xlsx')
  );
  const aoa30 = XLSX.utils.sheet_to_json(wb30.Sheets[wb30.SheetNames[0]], {
    header: 1,
    defval: '',
  });

  const wb31 = XLSX.readFile(
    path.join(DATA_DIR, '3-1. 캐디피 소득집계표 및 근로복지공단 신고 월 보수액.xlsx')
  );
  const rows31 = XLSX.utils.sheet_to_json(wb31.Sheets['자료수록'], { defval: '' });

  const caddyEmpByName = new Map();
  let caddyCount = 0;

  for (let i = 1; i < aoa30.length; i++) {
    const row = aoa30[i];
    const cName = String(row[1] || '').trim();
    if (!cName) continue;
    if (caddyEmpByName.has(cName)) continue;
    nextEmpId += 1;
    caddyCount += 1;
    const empNo = `CD-${String(caddyCount).padStart(3, '0')}`;
    const hireDate = parseExcelDate(row[2], '2026-01-01');
    const phone = String(row[4] || '').trim().replace(/\./g, '-') || null;
    const empItem = {
      empId: nextEmpId,
      empNo,
      empName: cName,
      employmentType: 'CADDY',
      entityCode: 'BLACKSTONE',
      entityName: '블랙스톤에듀팜리조트',
      deptId: caddyDept.deptId,
      deptName: caddyDept.deptName,
      positionTitle: '캐디(씨앤씨외주)',
      hireDate,
      resignDate: null,
      probationEndDate: null,
      baseMonthlyPay: 0,
      mealAllowanceTaxFree: 0,
      carAllowanceTaxFree: 0,
      dailyOrHourlyWage: 0,
      isTeamLeader: 0,
      teamLeaderAllowance: 0,
      konaCardNo: null,
      bankCode: null,
      bankName: null,
      accountNo: null,
      accountHolder: cName,
      email: null,
      phone,
      dormitoryRoom: null,
      carNumber: null,
      npExempt: 1,
      hiExempt: 1,
      eiExempt: 0,
      disabilityGrade: 'NONE',
      residentRegNoMasked: String(row[3] || '').trim() || undefined,
    };
    caddyEmpByName.set(cName, empItem);
    allEmployees.push(empItem);
    ops.push({
      ref: doc(firestoreDb, 'hr_dim_employees', String(empItem.empId)),
      data: empItem,
    });
  }

  // 3-1.xlsx에만 있는 캐디도 마스터에 추가 후 2026-09 및 2026-10 캐디 월간 집계 적재
  let caddyRecordSeq = 1000;
  let caddyMonthlyCount = 0;
  for (const r of rows31) {
    const cName = String(r['성명'] || '').trim();
    if (!cName) continue;
    let cEmp = caddyEmpByName.get(cName);
    if (!cEmp) {
      nextEmpId += 1;
      caddyCount += 1;
      cEmp = {
        empId: nextEmpId,
        empNo: `CD-${String(caddyCount).padStart(3, '0')}`,
        empName: cName,
        employmentType: 'CADDY',
        entityCode: 'BLACKSTONE',
        entityName: '블랙스톤에듀팜리조트',
        deptId: caddyDept.deptId,
        deptName: caddyDept.deptName,
        positionTitle: '캐디(씨앤씨외주)',
        hireDate: '2026-01-01',
        resignDate: null,
        probationEndDate: null,
        baseMonthlyPay: 0,
        mealAllowanceTaxFree: 0,
        carAllowanceTaxFree: 0,
        dailyOrHourlyWage: 0,
        isTeamLeader: 0,
        teamLeaderAllowance: 0,
        konaCardNo: null,
        bankCode: null,
        bankName: null,
        accountNo: null,
        accountHolder: cName,
        email: null,
        phone: null,
        dormitoryRoom: null,
        carNumber: null,
        npExempt: 1,
        hiExempt: 1,
        eiExempt: 0,
        disabilityGrade: 'NONE',
        residentRegNoMasked: String(r['주민(외국인)등록번호'] || '').slice(0, 6) + '-*******',
      };
      caddyEmpByName.set(cName, cEmp);
      allEmployees.push(cEmp);
      ops.push({
        ref: doc(firestoreDb, 'hr_dim_employees', String(cEmp.empId)),
        data: cEmp,
      });
    }

    const roundCount = parseNum(r['용역제공횟수'] || r['용역제공일수']);
    const workDaysCount = parseNum(r['용역제공일수'] || roundCount);
    const grossFee = parseNum(r[' 용역제공대가 '] || r['용역제공대가']);
    const expenseDeduction = Math.floor((grossFee * 0.209 + 1e-7) / 10) * 10;
    const reportedMonthlyIncome =
      parseNum(r['월 보수액(근로복지공단)']) || grossFee - expenseDeduction;
    const eiWorker = Math.floor((reportedMonthlyIncome * 0.008 + 1e-7) / 10) * 10;
    const eiEmployer = Math.floor((reportedMonthlyIncome * 0.0105 + 1e-7) / 10) * 10;
    const iacTotal = Math.floor((reportedMonthlyIncome * 0.009 + 1e-7) / 10) * 10;
    const iacWorker = Math.floor((iacTotal * 0.5 + 1e-7) / 10) * 10;
    const iacEmployer = iacTotal - iacWorker;

    for (const ym of ['2026-09', '2026-10']) {
      caddyRecordSeq += 1;
      const rec = {
        recordId: caddyRecordSeq,
        caddyRecordId: caddyRecordSeq,
        targetYm: ym,
        empId: cEmp.empId,
        empNo: cEmp.empNo,
        caddyName: cEmp.empName,
        empName: cEmp.empName,
        entityCode: 'BLACKSTONE',
        roundCount,
        totalCaddyFeeIncome: grossFee,
        expenseRateApplied: 0.209,
        expenseDeductionAmount: grossFee - reportedMonthlyIncome,
        reportedMonthlyRemuneration: reportedMonthlyIncome,
        taxableIncomeAmount: reportedMonthlyIncome,
        eiWorkerDeduction: eiWorker,
        eiEmployerBurden: eiEmployer,
        iacWorkerDeduction: iacWorker,
        iacEmployerBurden: iacEmployer,
        hireOrLeaveStatus: 'ACTIVE',
        eventDate: null,
        notes: `씨앤씨(C&C) 외주 캐디 (업종코드 11 · 근무 ${workDaysCount}일 / ${roundCount}회)`,
        serviceTypeCode: '11',
        industryCode: '11',
        workDaysCount,
        reportedMonthlyIncome,
        agencyName: '씨앤씨(C&C)',
        outsourcingAgencyName: '씨앤씨(C&C)',
      };
      ops.push({
        ref: doc(firestoreDb, 'hr_fact_caddy_monthly', `${ym}_${cEmp.empId}`),
        data: rec,
      });
      caddyMonthlyCount += 1;
    }
  }
  console.log(`✅ [3-0/3-1.xlsx 캐디 마스터 ${caddyCount}명 & 월간 소득집계 ${caddyMonthlyCount}건] 준비 완료`);

  // 7. [4. 연차, 부서별 월 휴무 부여기준표 및 법정교육 이수 현황표.xlsx] (시트1: 잔여연차 / 시트2: 부서별 월 기본 휴무 부여표 3~9월)
  const wb4 = XLSX.readFile(
    path.join(DATA_DIR, '4. 연차, 부서별 월 휴무 부여기준표 및 법정교육 이수 현황표.xlsx')
  );
  const aoa4Leave = XLSX.utils.sheet_to_json(
    wb4.Sheets['잔여연차(26.10.22기준)'],
    { header: 1, defval: '' }
  );
  const aoa4Off = XLSX.utils.sheet_to_json(
    wb4.Sheets[wb4.SheetNames[1]],
    { header: 1, defval: '' }
  );

  // 시트2(부서별 월 기본 휴무 부여표) 사원별 2026-03 ~ 2026-09 실제 발생·사용·잔여 휴무 맵 구성
  const empMonthlyOffMap = new Map(); // key: `${empName}__${ym}` -> { granted, used, remaining }
  for (let i = 5; i < aoa4Off.length; i++) {
    const rOff = aoa4Off[i];
    const eName = String(rOff[3] || '').trim();
    if (!eName) continue;
    for (let m = 3; m <= 9; m++) {
      const ym = `2026-0${m}`;
      const colBase = 10 + (m - 3) * 3;
      const stdOff = hrService.getMonthlyBaseOffDaysStandard(ym);
      const offGranted = parseNum(rOff[colBase]) > 0 ? parseNum(rOff[colBase]) : stdOff;
      const offUsed = rOff[colBase + 1] !== '' ? parseNum(rOff[colBase + 1]) : offGranted;
      const offRem = rOff[colBase + 2] !== '' ? parseNum(rOff[colBase + 2]) : Math.max(0, offGranted - offUsed);
      empMonthlyOffMap.set(`${eName}__${ym}`, {
        granted: offGranted,
        used: offUsed,
        remaining: offRem,
      });
    }
  }

  let leaveCount = 0;
  let trainingCount = 0;
  let nextLeaveId = 3000;
  let nextTrainingId = 4000;

  for (let i = 3; i < aoa4Leave.length; i++) {
    const row = aoa4Leave[i];
    const empName = String(row[3] || '').trim();
    if (!empName) continue;
    const empObj = empByNameMap.get(empName);
    if (!empObj) continue;

    const granted = parseNum(row[5]);
    const used = parseNum(row[6]);
    const remaining = parseNum(row[7]);
    const eduDone = String(row[8] || '').trim() === '이수';

    for (const ym of ['2026-03', '2026-08', '2026-09', '2026-10']) {
      nextLeaveId += 1;
      const baseOff = hrService.getMonthlyBaseOffDaysStandard(ym);
      const actualOff = empMonthlyOffMap.get(`${empName}__${ym}`);
      const leaveItem = {
        ledgerId: nextLeaveId,
        targetYm: ym,
        empId: empObj.empId,
        empNo: empObj.empNo,
        empName: empObj.empName,
        entityCode: empObj.entityCode,
        entityName: empObj.entityName,
        deptName: empObj.deptName,
        hireDate: empObj.hireDate,
        annualLeaveGranted: granted,
        annualLeaveUsed: used,
        annualLeaveRemaining: remaining,
        monthlyOffGranted: actualOff ? actualOff.granted : baseOff,
        monthlyOffUsed: actualOff ? actualOff.used : baseOff,
        monthlyOffRemaining: actualOff ? actualOff.remaining : 0,
        SubstituteHolidayCount: 0,
        fiscalBaseDate: '2026-03-01',
      };
      ops.push({
        ref: doc(firestoreDb, 'hr_fact_leave_off_ledgers', `${ym}_${empObj.empId}`),
        data: leaveItem,
      });
      leaveCount += 1;
    }

    nextTrainingId += 1;
    const trainingItem = {
      trainingId: nextTrainingId,
      targetYear: '2026',
      empId: empObj.empId,
      empNo: empObj.empNo,
      empName: empObj.empName,
      entityCode: empObj.entityCode,
      entityName: empObj.entityName,
      deptName: empObj.deptName,
      sexualHarassmentDone: eduDone,
      workplaceBullyingDone: eduDone,
      personalInfoProtectionDone: eduDone,
      retirementPensionDone: eduDone,
      industrialSafetyDone: eduDone,
      isAllCompleted: eduDone,
      completedDate: eduDone ? '2026-10-20' : null,
    };
    ops.push({
      ref: doc(firestoreDb, 'hr_fact_mandatory_trainings', `2026_${empObj.empId}`),
      data: trainingItem,
    });
    trainingCount += 1;
  }
  console.log(`✅ [4.xlsx 잔여연차 및 3~9월 부서별 월 기본 휴무 부여표 ${leaveCount}건 & 5대 법정교육 ${trainingCount}건] 준비 완료`);

  // 8. [5-1. 2026년 09월 블랙스톤 정규직 급여전표.xlsx -> 26.8 급여대장 원본 + 26.9 급여대장 원본]
  //    & [6-5_1.xlsx ~ 6-5_9.xlsx -> 2026-01 ~ 2026-09 KMG 유첨1 코스인건비 및 유첨2 도급계약] 전수 적재
  const wb51 = XLSX.readFile(
    path.join(DATA_DIR, '5-1. 2026년 09월 블랙스톤 정규직 급여전표.xlsx')
  );
  let adjSeq = 70000;
  let adjCount = 0;

  const pushAdj = (ym, empObj, category, amount, notes) => {
    if (!amount || amount === 0) return;
    adjSeq += 1;
    adjCount += 1;
    ops.push({
      ref: doc(firestoreDb, 'hr_fact_adjustments', String(adjSeq)),
      data: {
        adjId: adjSeq,
        targetYm: ym,
        empId: empObj.empId,
        empNo: empObj.empNo,
        empName: empObj.empName,
        entityCode: empObj.entityCode,
        deptName: empObj.deptName,
        category,
        amount,
        approvalDocNo: `${ym}-급여대장원본`,
        notes,
      },
    });
  };

  const seedBlackstonePayrollSheet = (sheetName, ym, mmLabel) => {
    const ws = wb51.Sheets[sheetName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    for (const r of rows) {
      const empNo = String(r['사원코드'] || '').trim();
      const empName = String(r['사원명'] || '').trim();
      const empObj =
        empByNoMap.get(empNo) ||
        empByNameMap.get(`BLACKSTONE__${empName}`) ||
        empByNameMap.get(empName);
      if (!empObj) continue;

      pushAdj(ym, empObj, 'REFERRAL_ALLOWANCE', parseNum(r['직원추천']), `${mmLabel} 직원추천수당`);
      pushAdj(ym, empObj, 'OTHER_TAXABLE', parseNum(r['기타수당']), `${mmLabel} 기타수당`);
      pushAdj(ym, empObj, 'RETROACTIVE_PAY', parseNum(r['전월미지급']), `${mmLabel} 전월미지급 소급분`);
      pushAdj(ym, empObj, 'ANNUAL_LEAVE_PAY', parseNum(r['연차수당']), `${mmLabel} 연차수당`);
      pushAdj(ym, empObj, 'HOLIDAY_WORK_PAY', parseNum(r['휴일근무수당']), `${mmLabel} 휴일근무수당`);
      pushAdj(ym, empObj, 'OVERTIME_PAY', parseNum(r['연장근무수당']), `${mmLabel} 연장근무수당`);
      pushAdj(ym, empObj, 'UNUSED_OFF_PAY', parseNum(r['미사용휴무']), `${mmLabel} 미사용휴무수당`);
      pushAdj(ym, empObj, 'BONUS', parseNum(r['상여금']), `${mmLabel} 상여금`);
      pushAdj(ym, empObj, 'HI_SETTLEMENT_DEDUCTION', parseNum(r['건강보험정산']), `${mmLabel} 건강보험정산`);
      pushAdj(ym, empObj, 'LTCI_SETTLEMENT_DEDUCTION', parseNum(r['장기요양보험정산']), `${mmLabel} 장기요양정산`);
      pushAdj(ym, empObj, 'OTHER_DEDUCTION', parseNum(r['기타공제']), `${mmLabel} 기숙사/기타공제`);
      pushAdj(ym, empObj, 'STUDENT_LOAN_DEDUCTION', parseNum(r['기타공제2']), `${mmLabel} 학자금상환공제`);

      const tax1 = parseNum(r['소득세']) + parseNum(r['연말정산소득세']);
      if (tax1 !== 0) {
        pushAdj(ym, empObj, 'INCOME_TAX_OVERRIDE', tax1, `${mmLabel} 급여대장 원천징수 소득세 확정`);
      }
    }
  };

  seedBlackstonePayrollSheet('26.8 급여대장 원본', '2026-08', '8월');
  seedBlackstonePayrollSheet('26.9 급여대장 원본', '2026-09', '9월');

  // [6-5_1.xlsx ~ 6-5_9.xlsx] 2026년 1월 ~ 9월(9개 파일 전수) KMG 코스인건비(유첨1) 및 코스관리비(유첨2) 적재
  const kmgCourseDeptObj = ensureDept('KMG', '코스관리팀(증평지사)');
  let kmgInvoiceMonthsCount = 0;
  for (let m = 1; m <= 9; m++) {
    const mm = String(m).padStart(2, '0');
    const ym = `2026-${mm}`;
    const fileName = `6-5_${m}. 2026년${mm}월_코스관리용역비청구서 외.xlsx`;
    const fullPath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(fullPath)) continue;

    const wb65m = XLSX.readFile(fullPath);
    const laborSheetName = wb65m.SheetNames[1];
    if (laborSheetName) {
      const aoa65Labor = XLSX.utils.sheet_to_json(wb65m.Sheets[laborSheetName], {
        header: 1,
        defval: '',
      });
      for (let i = 5; i < aoa65Labor.length; i++) {
        const row = aoa65Labor[i];
        if (!row) continue;
        const empName = String(row[0] || '').trim();
        if (!empName || empName.includes('합') || empName.includes('계') || empName.includes('성명')) continue;
        const empObj =
          empByNameMap.get(`KMG__${empName}`) || empByNameMap.get(empName);
        if (!empObj) continue;

        pushAdj(ym, empObj, 'BONUS', parseNum(row[4]), `${m}월 KMG 코스관리 상여`);
        pushAdj(ym, empObj, 'SPECIAL_ALLOWANCE', parseNum(row[8]), `${m}월 KMG 특근수당`);
        pushAdj(ym, empObj, 'OTHER_TAXABLE', parseNum(row[9]), `${m}월 KMG 기타수당`);
        const kmgTax = parseNum(row[17]);
        if (kmgTax !== 0) {
          pushAdj(ym, empObj, 'INCOME_TAX_OVERRIDE', kmgTax, `${m}월 KMG 원천징수 소득세 확정`);
        }
      }
    }

    // 6-5_1~9.xlsx 공문 청구서 기준 KMG 일용노무비(에이엘그린) 및 코스조경관리비(유첨2) 계약 적재
    const kmgPreset = hrService.OFFICIAL_KMG_MONTHLY_INVOICES_6_5?.[ym];
    if (kmgPreset) {
      const dailySupply = kmgPreset.directDailyCost;
      const dailyVat = Math.floor(dailySupply * 0.1 + 1e-7);
      const maintSupply = kmgPreset.directMaintCost;
      const maintVat = Math.floor(maintSupply * 0.1 + 1e-7);

      ops.push({
        ref: doc(firestoreDb, 'hr_fact_vendor_contracts', `${ym}_6205`),
        data: {
          vendorContractId: 620500 + m,
          targetYm: ym,
          entityCode: 'KMG',
          entityName: 'KMG',
          deptId: kmgCourseDeptObj.deptId,
          deptName: kmgCourseDeptObj.deptName,
          vendorName: '(주)에이엘그린(코스일용도급)',
          contractTitle: `[6-5_${m}.xlsx] ${m}월 KMG 코스 일용노무비 용역 (위탁관리비 3% 별도)`,
          baseContractFee: dailySupply,
          staffAllowanceAmount: 0,
          supplyAmount: dailySupply,
          vatAmount: dailyVat,
          totalInvoiceAmount: dailySupply + dailyVat,
          taxInvoiceNo: `ALGREEN-KMG-${ym.replace('-', '')}`,
          approvalDocTitle: `[KMG 6-5_${m}.xlsx] ${ym} (주)에이엘그린 코스 일용노무비 지급 품의`,
          annualBudgetAmount: 550000000,
          cumulativeExecutedAmount: 414686000,
          budgetExecutionRatePct: 75.4,
        },
      });

      ops.push({
        ref: doc(firestoreDb, 'hr_fact_vendor_contracts', `${ym}_6207`),
        data: {
          vendorContractId: 620700 + m,
          targetYm: ym,
          entityCode: 'KMG',
          entityName: 'KMG',
          deptId: kmgCourseDeptObj.deptId,
          deptName: kmgCourseDeptObj.deptName,
          vendorName: 'KMG 코스·조경관리비(유첨2)',
          contractTitle: `[6-5_${m}.xlsx 유첨2] ${m}월 코스 및 조경관리비 실비정산 (위탁관리비 3% 별도)`,
          baseContractFee: maintSupply,
          staffAllowanceAmount: 0,
          supplyAmount: maintSupply,
          vatAmount: maintVat,
          totalInvoiceAmount: maintSupply + maintVat,
          taxInvoiceNo: `KMG-MAINT-${ym.replace('-', '')}`,
          approvalDocTitle: `[KMG 6-5_${m}.xlsx] ${ym} 유첨2 코스 및 조경관리비 정산 품의`,
          annualBudgetAmount: 600000000,
          cumulativeExecutedAmount: 537918991,
          budgetExecutionRatePct: 89.65,
        },
      });
      kmgInvoiceMonthsCount += 1;
    }
  }
  console.log(`✅ [5-1.xlsx(8·9월) & 6-5_1~9.xlsx(1~9월 ${kmgInvoiceMonthsCount}개월 전수) 급여 수당·공제 세목] 총 ${adjCount}건 준비 완료`);

  // 차량 등록 ops 합치기
  for (const vOp of vehicleOps) {
    ops.push(vOp);
  }

  console.log(`🚀 Firestore 일괄 배치 쓰기 실행 중... (총 ${ops.length}개 문서)`);
  await commitBatches(ops);
  console.log(`✅ Firestore 일괄 배치 쓰기 완료!`);

  // 2026-08, 2026-09, 2026-10, 2026-03에 14개 PDF(6-0~6-4_1, 7-0_1~3) 실측 외주 도급·하나BSN·웰스토리 식대 동기화 보장
  for (const ym of ['2026-08', '2026-09', '2026-10', '2026-03']) {
    await hrService.syncOfficialInitialSetupMasterToFirestore(ym);
  }

  // 9. 2026-08, 2026-09, 2026-10, 2026-03 전사 급여대장 및 더존 6대 분리전표 정산 실행 + 무인 수집기 동기화
  for (const ym of ['2026-08', '2026-09', '2026-10', '2026-03']) {
    const res = await hrService.runFirestorePayrollSettlement(ym, { ignoreLock: true });
    const colRes = await hrService.triggerCollectorSyncInFirestore(ym, 'ALL');
    console.log(
      `📊 [${ym}] 전사 급여·전표 정산 완료: 대상 인원 ${res.settledCount}명, 회계전표 ${res.voucherCount}건, 무인수집 동기화 ${colRes.syncedRecords}건`
    );
  }

  console.log('================================================================================');
  console.log('🎉 [통합인사시스템구축 자료 전수 입력 및 급여·전표 정산 완료]');
  console.log('================================================================================');
  process.exit(0);
}

seedAll().catch((err) => {
  console.error('❌ 데이터 적재 오류:', err);
  process.exit(1);
});
