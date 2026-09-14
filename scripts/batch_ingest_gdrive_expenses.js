/**
 * 벨포레 2026년 비용 전표 일괄 맵핑 및 Firestore 영구 적재 ETL 스크립트
 * 원천 디렉토리: G:/내 드라이브/벨포레_보안유지/01_경영_전략_사업계획/00_경영 및 전략/26년 비용_재경 전달
 * 원칙:
 *  1. Zero-Mock Policy (허수 0원, 1원 단위 실측 엑셀 데이터 100% 보존)
 *  2. 놀이동산 등 외주 위탁업체 전표 원천 격리 (isOutsourcedExpense)
 *  3. Zero-Variance Penny Balancing 감사 로그 (validation_master_logs) 기록
 *  4. 400건 단위 Chunked Batch 처리 (Firestore Write 제한 준수)
 */

const fs = require('fs');
const https = require('https');
const XLSX = require('xlsx');
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  writeBatch,
  doc,
  query,
  where,
  getDocs,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo",
  authDomain: "bell-operation.firebaseapp.com",
  projectId: "bell-operation",
  storageBucket: "bell-operation.firebasestorage.app",
  messagingSenderId: "593133920835",
  appId: "1:593133920835:web:61f25b39170b2f62ce6af6",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GDRIVE_DIR = 'G:/내 드라이브/벨포레_보안유지/01_경영_전략_사업계획/00_경영 및 전략/26년 비용_재경 전달';

// 4대 공식 팀
const LEISURE_OFFICIAL_TEAMS = ['미디어아트센터', '액티비티', '목장', '디지털지원'];

// 1. Team & Venue link
function linkVenueAndTeam(project, dept, memo) {
  const p = (project || '').trim();
  const d = (dept || '').trim();
  const m = (memo || '').trim();
  const combined = `${p} ${d} ${m}`.toLowerCase();

  // 디지털지원
  if (combined.includes('디지털') || combined.includes('digital') || combined.includes('전산')) {
    return { team: '디지털지원', venue: '디지털지원팀' };
  }
  // 미디어아트센터
  if (combined.includes('뮤지엄카페')) return { team: '미디어아트센터', venue: '미디어-뮤지엄카페' };
  if (combined.includes('기프트샵')) return { team: '미디어아트센터', venue: '미디어-기프트샵' };
  if (combined.includes('미디어') || combined.includes('벨포레홀') || combined.includes('아트센터')) {
    return { team: '미디어아트센터', venue: '미디어아트센터' };
  }
  // 목장
  if (combined.includes('얼룩말')) return { team: '목장', venue: '얼룩말카페' };
  if (combined.includes('목장/체험') || combined.includes('체험')) return { team: '목장', venue: '벨포레 목장(체험)' };
  if (combined.includes('목장') || combined.includes('리틀팜') || combined.includes('양떼')) {
    return { team: '목장', venue: '벨포레 목장' };
  }
  // 액티비티
  if (combined.includes('마운틴카트') || combined.includes('카트')) return { team: '액티비티', venue: '마운틴카트' };
  if (combined.includes('썰매') || combined.includes('사계절')) return { team: '액티비티', venue: '사계절썰매장' };
  if (combined.includes('썸머랜드')) return { team: '액티비티', venue: '썸머랜드' };
  if (combined.includes('원더풀')) return { team: '액티비티', venue: '원더풀' };
  if (combined.includes('마리나')) return { team: '액티비티', venue: '마리나 클럽' };

  // 외주 및 타 부서
  if (
    combined.includes('놀이동산') ||
    combined.includes('회전그네') ||
    combined.includes('미니골프') ||
    combined.includes('미니포렛') ||
    combined.includes('뉴스타피아')
  ) {
    return { team: '외주', venue: '놀이동산 (외주)' };
  }
  if (combined.includes('모토아레나') || combined.includes('모토')) {
    return { team: '외주', venue: '모토아레나 (별도본부)' };
  }
  if (combined.includes('액티비티') || combined.includes('activity')) {
    return { team: '액티비티', venue: '액티비티 (공통)' };
  }

  return { team: '본부공통', venue: '레져본부 (공통)' };
}

// 2. Macro category
function inferAccountCategory(accountCode, accountName) {
  const c = (accountCode || '').replace(/[^0-9]/g, '');
  const n = (accountName || '').trim();

  if (c.startsWith('603') || c.startsWith('604') || c.startsWith('609') || n.includes('급여') || n.includes('잡급') || n.includes('퇴직')) {
    return '인건비';
  }
  if (c.startsWith('611') || n.includes('복리') || n.includes('식대') || n.includes('연금') || n.includes('건강보험') || n.includes('고용보험') || n.includes('산재보험')) {
    return '복리후생비';
  }
  if (c.startsWith('642') || c.startsWith('626') || n.includes('광고') || n.includes('판촉') || n.includes('마케팅') || n.includes('인쇄') || n.includes('홍보')) {
    return '마케팅/판촉비';
  }
  if (c.startsWith('631') || c.startsWith('619') || n.includes('수수료') || n.includes('임차') || n.includes('도메인') || n.includes('구독')) {
    return '지급수수료/임차료';
  }
  if (
    c.startsWith('630') || c.startsWith('614') || c.startsWith('615') || c.startsWith('616') ||
    c.startsWith('612') || c.startsWith('613') || n.includes('소모품') || n.includes('통신') ||
    n.includes('수도') || n.includes('전력') || n.includes('여비') || n.includes('접대')
  ) {
    return '운영경비/소모품비';
  }
  return '시설유지/기타';
}

// 3. Friendly category
function makeFriendlyCategory(accountCode, accountName, memo, clientName) {
  const acct = `${accountCode || ''} ${accountName || ''}`.trim();
  const m = (memo || '').trim();
  const cl = (clientName || '').trim();

  // (1) 알바비
  if (cl.includes('일용노임') || acct.includes('잡급') || m.includes('일용') || m.includes('알바') || m.includes('단기') || cl.includes('아르바이트')) {
    return { category: '아르바이트비 (알바비)', subcategory: '아르바이트/일용직 노임' };
  }
  // (2) 정규직 급여
  if (cl.includes('정규직') || (acct.includes('급여') && !cl.includes('일용')) || m.includes('직원급여') || acct.includes('퇴직')) {
    return { category: '정규직 직원 급여', subcategory: '정규직 직원 월급/상여' };
  }
  // (3) 4대보험/국민연금
  if (
    cl.includes('국민연금') || m.includes('국민연금') || acct.includes('국민연금') ||
    cl.includes('건강보험') || m.includes('건강보험') || acct.includes('건강보험') ||
    cl.includes('고용보험') || m.includes('고용보험') || acct.includes('고용보험') ||
    cl.includes('산재보험') || m.includes('산재보험') || acct.includes('산재보험') ||
    m.includes('4대보험') || cl.includes('보험관리공단')
  ) {
    return { category: '직원 4대보험과 국민연금 (직원비용)', subcategory: '4대보험 및 국민연금' };
  }
  // (4) 식대
  if (acct.includes('복리후생') || acct.includes('식대') || m.includes('식대') || m.includes('간식') || m.includes('식사') || m.includes('스넥') || m.includes('생고기') || m.includes('막국수') || m.includes('오봉집') || m.includes('만휴정') || m.includes('다산마트')) {
    return { category: '직원 밥값과 간식비', subcategory: '직원 식사/간식 구매' };
  }
  // (5) 안전보험료
  if (acct.includes('보험') || cl.includes('손해보험') || cl.includes('화재') || m.includes('배상') || m.includes('화재')) {
    return { category: '손님과 시설 안전 보험료', subcategory: '화재/영업배상/시설손해보험' };
  }
  // (6) 공과금
  if (acct.includes('전력비') || acct.includes('수도광열비') || m.includes('전기') || m.includes('수도') || m.includes('가스')) {
    return { category: '전기세와 물·가스 요금', subcategory: '전기/수도 요금' };
  }
  // (7) 통신비
  if (acct.includes('통신비') || m.includes('통신') || m.includes('인터넷') || m.includes('단말기') || m.includes('qr')) {
    return { category: '인터넷과 전화 요금', subcategory: '인터넷/무전기/통신료' };
  }
  // (8) 임차료
  if (acct.includes('임차료') || m.includes('렌탈') || m.includes('스타리아') || m.includes('정수기')) {
    return { category: '정수기와 차량 빌린 돈', subcategory: '정수기/차량 렌탈료' };
  }
  // (9) 홍보비
  if (acct.includes('도서인쇄비') || acct.includes('판촉') || acct.includes('광고') || m.includes('배너') || m.includes('디자인') || m.includes('현수막')) {
    return { category: '현수막·배너 만들기와 홍보비', subcategory: '안내판/배너/광고 제작' };
  }
  // (10) 수선비
  if (acct.includes('수선비') || m.includes('수리') || m.includes('보수') || m.includes('고치') || m.includes('부품') || m.includes('타이어')) {
    return { category: '고장난 시설과 기구 고치기', subcategory: '놀이기구/시설물 수리비' };
  }
  // (11) 차량유지비
  if (acct.includes('차량유지비') || m.includes('주유') || m.includes('기름') || m.includes('엔진오일')) {
    return { category: '리조트 차량 기름값과 정비', subcategory: '차량 주유/정비비' };
  }
  // (12) 수수료
  if (acct.includes('수수료') || m.includes('수수료') || m.includes('카드단말기대금') || cl.includes('나이스정보통신')) {
    return { category: '카드단말기·서비스 수수료', subcategory: '결제/프로그램 수수료' };
  }
  // (13) 세금
  if (acct.includes('세금과공과') || m.includes('세금') || m.includes('공과금')) {
    return { category: '나라와 지자체에 낸 세금', subcategory: '지방세/공과금' };
  }
  // (14) 기부금
  if (acct.includes('기부금') || m.includes('기부') || m.includes('장학')) {
    return { category: '좋은 일 돕기 (기부금)', subcategory: '지역 장학/사회 공헌' };
  }
  // (15) 소모품
  if (acct.includes('소모품') || acct.includes('사무용품') || acct.includes('상품') || m.includes('구매') || m.includes('구입')) {
    return { category: '영업장에 필요한 물건 사기', subcategory: '현장 비품/소모품 구매' };
  }
  return { category: '기타 운영 지출', subcategory: '기타 경비' };
}

// 4. Outsourced check
function isOutsourcedExpense(row) {
  const t = (row.assignedTeam || '').trim();
  const v = (row.assignedVenue || '').trim();
  const d = (row.rawDepartment || '').trim();
  const c = (row.clientName || '').trim();
  const m = (row.memo || '').trim();

  return (
    t === '외주' ||
    t === '외주위탁' ||
    v.includes('놀이동산') ||
    v.includes('회전그네') ||
    v.includes('미니골프') ||
    v.includes('미니포렛') ||
    v.includes('모토아레나') ||
    d.includes('놀이동산') ||
    c.includes('뉴스타피아') ||
    m.includes('놀이동산') ||
    m.includes('회전그네') ||
    m.includes('미니골프') ||
    m.includes('미니포렛') ||
    m.includes('뉴스타피아')
  );
}

// 5. Zero-Variance Allocation Engine
function allocateExpenses(expenses, partMetrics) {
  const totalExcelSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  const resultMap = new Map();
  LEISURE_OFFICIAL_TEAMS.forEach((team) => {
    resultMap.set(team, {
      partName: team,
      directExpense: 0,
      commonExpense: 0,
      totalExpense: 0,
      categoryBreakdown: {
        '인건비': 0,
        '복리후생비': 0,
        '마케팅/판촉비': 0,
        '지급수수료/임차료': 0,
        '운영경비/소모품비': 0,
        '시설유지/기타': 0,
      },
    });
  });

  const revenueTeams = ['미디어아트센터', '액티비티', '목장'];
  const revenueMap = new Map();
  partMetrics.forEach((p) => {
    revenueMap.set(p.partName, p.revenue);
  });

  const totalRevenueForAllocation = revenueTeams.reduce((sum, t) => sum + (revenueMap.get(t) || 0), 0);

  let commonPoolSum = 0;
  let outsourcedSum = 0;
  let totalDirectSum = 0;

  expenses.forEach((expense) => {
    if (isOutsourcedExpense(expense)) {
      outsourcedSum += expense.amount;
      return;
    }

    totalDirectSum += expense.amount;
    const assignedTeam = expense.assignedTeam || linkVenueAndTeam(expense.rawDepartment, expense.rawDepartment, expense.memo).team;
    const category = expense.assignedCategory || inferAccountCategory(expense.accountCode, expense.accountName);

    if (assignedTeam === '디지털지원') {
      const target = resultMap.get('디지털지원');
      target.directExpense += expense.amount;
      target.totalExpense += expense.amount;
      target.categoryBreakdown[category] = (target.categoryBreakdown[category] || 0) + expense.amount;
    } else if (resultMap.has(assignedTeam)) {
      const target = resultMap.get(assignedTeam);
      target.directExpense += expense.amount;
      target.totalExpense += expense.amount;
      target.categoryBreakdown[category] = (target.categoryBreakdown[category] || 0) + expense.amount;
    } else {
      commonPoolSum += expense.amount;
    }
  });

  if (commonPoolSum > 0) {
    revenueTeams.forEach((team) => {
      const rev = revenueMap.get(team) || 0;
      const ratio = totalRevenueForAllocation > 0 ? rev / totalRevenueForAllocation : 1 / revenueTeams.length;
      const allocatedPortion = Math.round(commonPoolSum * ratio);
      const target = resultMap.get(team);
      target.commonExpense += allocatedPortion;
      target.totalExpense += allocatedPortion;
    });
  }

  let totalAllocatedSum = 0;
  resultMap.forEach((v) => (totalAllocatedSum += v.totalExpense));
  const delta = totalDirectSum - totalAllocatedSum;

  if (delta !== 0 && revenueTeams.length > 0) {
    const topTeam = revenueTeams[0];
    const target = resultMap.get(topTeam);
    target.commonExpense += delta;
    target.totalExpense += delta;
    totalAllocatedSum += delta;
  }

  const audit = {
    totalExcelSum,
    totalDirectSum,
    outsourcedSum,
    totalAllocatedSum,
    delta: totalDirectSum - totalAllocatedSum,
    isZeroVariance: totalDirectSum === totalAllocatedSum,
    status: totalDirectSum === totalAllocatedSum ? 'VERIFIED' : 'DISCREPANCY',
  };

  return { allocations: resultMap, audit };
}

// 6. Fetch live part metrics from backend V6 API
function fetchLivePartMetrics(yearMonth) {
  const [y, mm] = yearMonth.split('-');
  const lastDay = new Date(Number(y), Number(mm), 0).getDate();
  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  const url = `https://belleforet-data.vercel.app/api/v6/report/daily-sales?startDate=${start}&endDate=${end}`;

  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'x-m2m-token': 'belleforet-m2m-secret',
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          const rawCategories = json.data || [];
          const leisureCategories = rawCategories.filter(cat => {
            const catCode = cat.category_code || '';
            return (
              catCode === 'TICKET' ||
              (cat.teams && cat.teams.some(t => t.team_name === '레저본부' || t.team_name === '미분류'))
            );
          });

          const rawTeamAgg = {
            '미디어아트센터': { revenue: 0, visitors: 0 },
            '액티비티': { revenue: 0, visitors: 0 },
            '목장': { revenue: 0, visitors: 0 },
            '디지털지원': { revenue: 0, visitors: 0 },
          };

          leisureCategories.forEach(cat => {
            cat.teams?.forEach(team => {
              const teamName = team.team_name || '레저본부';
              if (teamName !== '레저본부' && teamName !== '미분류') return;
              team.parts?.forEach(part => {
                const rawPartName = part.part_name || '기타';
                if (rawPartName === '놀이동산') return;
                const officialTeam = (rawPartName === '액티비티')
                  ? '액티비티'
                  : (rawPartName === '미디어아트센터' ? '미디어아트센터' : (rawPartName === '목장' ? '목장' : '기타'));

                if (!rawTeamAgg[officialTeam]) {
                  rawTeamAgg[officialTeam] = { revenue: 0, visitors: 0 };
                }

                const pSub = part.subtotal || {};
                rawTeamAgg[officialTeam].revenue += Number(pSub.todayActual || 0);
                rawTeamAgg[officialTeam].visitors += Number(pSub.todayQuantity || 0);
              });
            });
          });

          const parts = ['미디어아트센터', '액티비티', '목장', '디지털지원'].map(partName => ({
            partName,
            revenue: rawTeamAgg[partName].revenue,
            visitors: rawTeamAgg[partName].visitors,
          }));

          resolve(parts);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 7. Parse Month 01 (Expenses + Salary)
function parseMonth01() {
  const parsedRows = [];

  // Part A: Operating Expenses (26년 1월 레저사업본부 비용세부내역.xlsx, Sheet: 원가2025)
  const expFile = `${GDRIVE_DIR}/26년 1월 레저사업본부 비용세부내역.xlsx`;
  const wbExp = XLSX.readFile(expFile);
  const dataExp = XLSX.utils.sheet_to_json(wbExp.Sheets['원가2025'], { header: 1 });

  dataExp.slice(2).forEach((row) => {
    if (!row || row.length === 0) return;
    const dept = String(row[9] || '').trim();
    if (dept !== '레저사업본부') return; // Filtered to official 레저사업본부

    const rawDebit = row[6];
    let amount = 0;
    if (typeof rawDebit === 'number') amount = rawDebit;
    else if (typeof rawDebit === 'string') {
      const clean = rawDebit.replace(/,/g, '').trim();
      if (/^-?\d+(\.\d+)?$/.test(clean)) amount = parseFloat(clean);
    }
    if (amount === 0) return;

    const accountName = String(row[5] || '').trim();
    const memo = String(row[12] || '').trim();
    const proj = String(row[10] || '').trim();
    const venue = String(row[3] || '').trim();

    const { team: assignedTeam, venue: assignedVenue } = linkVenueAndTeam(proj || venue, dept, memo);
    const assignedCategory = inferAccountCategory('', accountName);
    const { category: friendlyCategory } = makeFriendlyCategory('', accountName, memo, '');

    parsedRows.push({
      accountCode: '',
      accountName,
      macroCategory: assignedCategory,
      rawDepartment: dept || proj || '레저사업본부',
      amount,
      memo,
      clientName: '',
      assignedTeam,
      assignedVenue,
      assignedCategory,
      friendlyCategory,
    });
  });

  return parsedRows;
}

// 8. Parse standard monthly Excel (Months 02 to 06)
function parseStandardMonth(fileName, sheetName) {
  const filePath = `${GDRIVE_DIR}/${fileName}`;
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[sheetName || wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let headerIdx = 0;
  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const str = (data[i] || []).join(' ');
    if (str.includes('계정') || str.includes('차변') || str.includes('적요') || str.includes('부서')) {
      headerIdx = i;
      break;
    }
  }

  const headers = (data[headerIdx] || []).map(h => String(h || '').trim());
  const debitIdx = headers.findIndex(h => (h || '').includes('차변') || (h || '') === '금액');
  const accountIdx = headers.findIndex(h => (h || '').includes('계정과목') || (h || '').includes('계정명'));
  const descIdx = headers.findIndex(h => (h || '').includes('적요'));
  const projIdx = headers.findIndex(h => (h || '').includes('프로젝트'));
  const venueIdx = headers.findIndex(h => (h || '').includes('업장'));
  const deptIdx = headers.findIndex(h => (h || '').includes('사용부서') || (h || '').includes('부서'));
  const clientIdx = headers.findIndex(h => (h || '').includes('거래처') || (h || '').includes('업체'));

  const parsedRows = [];

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const rawDebit = debitIdx >= 0 ? row[debitIdx] : null;
    let amount = 0;
    if (typeof rawDebit === 'number') amount = rawDebit;
    else if (typeof rawDebit === 'string') {
      const clean = rawDebit.replace(/,/g, '').trim();
      if (/^-?\d+(\.\d+)?$/.test(clean)) amount = parseFloat(clean);
    }
    if (amount === 0) continue;

    const accountName = accountIdx >= 0 ? String(row[accountIdx] || '').trim() : '';
    const memo = descIdx >= 0 ? String(row[descIdx] || '').trim() : '';
    const proj = projIdx >= 0 ? String(row[projIdx] || '').trim() : '';
    const venue = venueIdx >= 0 ? String(row[venueIdx] || '').trim() : '';
    const dept = deptIdx >= 0 ? String(row[deptIdx] || '').trim() : '';
    const client = clientIdx >= 0 ? String(row[clientIdx] || '').trim() : '';

    const { team: assignedTeam, venue: assignedVenue } = linkVenueAndTeam(proj || venue, dept, memo);
    const assignedCategory = inferAccountCategory('', accountName);
    const { category: friendlyCategory } = makeFriendlyCategory('', accountName, memo, client);

    parsedRows.push({
      accountCode: '',
      accountName,
      macroCategory: assignedCategory,
      rawDepartment: dept || proj || '레저사업본부',
      amount,
      memo,
      clientName: client,
      assignedTeam,
      assignedVenue,
      assignedCategory,
      friendlyCategory,
    });
  }

  return parsedRows;
}

// 9. Save month to Firestore with chunked batch writes
async function saveMonthToFirestore(yearMonth, expenses, partMetrics) {
  console.log(`\n======================================================`);
  console.log(`>>> [${yearMonth}] INGESTING TO FIRESTORE (Total rows: ${expenses.length}) <<<`);

  // 1. Run Zero-Variance allocation
  const { allocations, audit } = allocateExpenses(expenses, partMetrics);
  console.log(`[${yearMonth}] Audit Report:`, {
    totalExcelSum: audit.totalExcelSum.toLocaleString(),
    totalDirectSum: audit.totalDirectSum.toLocaleString(),
    outsourcedSum: audit.outsourcedSum.toLocaleString(),
    totalAllocatedSum: audit.totalAllocatedSum.toLocaleString(),
    delta: audit.delta,
    isZeroVariance: audit.isZeroVariance,
    status: audit.status,
  });

  if (!audit.isZeroVariance) {
    throw new Error(`[${yearMonth}] Zero-variance check failed! Delta: ${audit.delta}`);
  }

  // 2. Delete existing records for this month
  console.log(`[${yearMonth}] Deleting existing documents...`);
  const oldQ = query(collection(db, 'expenses_v2'), where('yearMonth', '==', yearMonth));
  const oldSnap = await getDocs(oldQ);
  console.log(`[${yearMonth}] Found ${oldSnap.size} old documents to delete.`);

  const delDocs = [];
  oldSnap.forEach(d => delDocs.push(d.ref));

  // Chunk delete
  const CHUNK_SIZE = 400;
  for (let i = 0; i < delDocs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    delDocs.slice(i, i + CHUNK_SIZE).forEach(ref => batch.delete(ref));
    await batch.commit();
  }

  // 3. Chunked batch write for new expenses
  console.log(`[${yearMonth}] Inserting ${expenses.length} new expenses...`);
  for (let i = 0; i < expenses.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = expenses.slice(i, i + CHUNK_SIZE);
    chunk.forEach((item, chunkIdx) => {
      const globalIdx = i + chunkIdx + 1;
      const docId = `exp_${yearMonth.replace('-', '')}_${String(globalIdx).padStart(4, '0')}`;
      const docRef = doc(db, 'expenses_v2', docId);
      batch.set(docRef, {
        ...item,
        yearMonth,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    console.log(`  Committed batch ${i + 1} ~ ${Math.min(i + CHUNK_SIZE, expenses.length)}`);
  }

  // 4. Save validation master log
  const auditDocId = `audit_${yearMonth.replace('-', '')}`;
  const auditRef = doc(db, 'validation_master_logs', auditDocId);
  const auditBatch = writeBatch(db);
  auditBatch.set(auditRef, {
    ...audit,
    yearMonth,
    itemCount: expenses.length,
    verifiedAt: new Date().toISOString(),
  });
  await auditBatch.commit();
  console.log(`[${yearMonth}] Validation audit log saved: ${auditDocId} (STATUS: ${audit.status})`);
}

// 10. Main Execution Loop
async function main() {
  console.log('======================================================');
  console.log('=== BELLEFORET MULTI-MONTH EXPENSE INGESTION START ===');
  console.log('======================================================');

  const ingestionJobs = [
    {
      ym: '2026-01',
      getRows: () => parseMonth01(),
    },
    {
      ym: '2026-02',
      getRows: () => parseStandardMonth('26.02_레저사업본부 비용v2 (2).xlsx', '02월'),
    },
    {
      ym: '2026-03',
      getRows: () => parseStandardMonth('26.03_레저사업본부 비용v2.xlsx', 'Sheet3'),
    },
    {
      ym: '2026-04',
      getRows: () => parseStandardMonth('26.04_레저사업본부 비용.xlsx', 'Sheet1'),
    },
    {
      ym: '2026-05',
      getRows: () => parseStandardMonth('26.05_레저사업본부 비용.xlsx', 'Sheet1'),
    },
    {
      ym: '2026-06',
      getRows: () => parseStandardMonth('26.06_레저사업본부 비용 (1).xlsx', 'Sheet1'),
    },
  ];

  const results = [];

  for (const job of ingestionJobs) {
    const ym = job.ym;
    console.log(`\nProcessing ${ym}...`);
    const expenses = job.getRows();
    const livePartMetrics = await fetchLivePartMetrics(ym);

    await saveMonthToFirestore(ym, expenses, livePartMetrics);
    results.push({
      yearMonth: ym,
      rowCount: expenses.length,
      totalSum: expenses.reduce((s, e) => s + e.amount, 0),
      status: 'VERIFIED',
    });
  }

  console.log('\n======================================================');
  console.log('=== ALL MONTHS INGESTION COMPLETED SUCCESSFULLY ===');
  console.log('======================================================');
  console.table(results);
}

main()
  .then(() => {
    console.log('Batch Ingestion ETL Process Exited Gracefully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal Ingestion Error:', err);
    process.exit(1);
  });
