import * as xlsx from 'xlsx';
import crypto from 'crypto';

// Helper function to extract date from Excel serial number or string
export function parseExcelDate(dateVal: any): Date | null {
  if (dateVal === null || dateVal === undefined || dateVal === '') return null;
  
  if (typeof dateVal === 'number') {
    // 8-digit YYYYMMDD integer like 20260615
    if (dateVal >= 20200101 && dateVal <= 20301231) {
      const s = String(dateVal);
      const y = s.slice(0, 4);
      const m = s.slice(4, 6);
      const d = s.slice(6, 8);
      return new Date(`${y}-${m}-${d}T00:00:00`);
    }
    // Excel date serial number
    const date = new Date((dateVal - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  
  const str = String(dateVal).trim();
  if (!str) return null;

  // 8-digit YYYYMMDD string format (e.g. "20260615")
  if (/^\d{8}$/.test(str)) {
    const y = str.slice(0, 4);
    const m = str.slice(4, 6);
    const d = str.slice(6, 8);
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  // Handle dot or slash formats like "2026.06.15", "2026. 6. 15", "2026/06/15", "26.6.15", "2026년 6월 15일"
  const cleanStr = str.replace(/[년월일]/g, '-').replace(/[.\/]/g, '-').replace(/\s+/g, '');
  const match = cleanStr.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    let y = match[1];
    if (y.length === 2) y = '20' + y;
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  return null;
}

// [SSOT 적용] 하드코딩 휴리스틱 파싱 엔진 철거
// 원본 엑셀의 계정과목(originalTerm)을 프론트엔드가 자의적으로 변조하지 않고 그대로 반환합니다.
export function heuristicExpenseTerm(originalTerm: string, description: string | undefined, vendor: string | undefined): string {
  return originalTerm.trim();
}

export function inferAssignedProject(branchName: string, context: string): { project: string, rule: string } {
  // 1. 엑셀 원본에 프로젝트명이 명시되어 있으면 최우선 사용
  if (branchName && branchName !== '0' && branchName.trim() !== '' && branchName !== '미분류') {
    return { project: branchName.trim(), rule: '엑셀 원본 프로젝트명 명시됨' };
  }

  // [SSOT 적용] 텍스트 기반 프로젝트 추론(Guessing) 완전 제거
  // 엑셀 원본에 프로젝트명이 명시되지 않았다면, 프론트엔드가 자의적으로 유추하지 않고 
  // '미분류 프로젝트'로 분류하여 사용자가 직접 칸반보드에서 지정하도록 강제합니다.
  return { project: '미분류 프로젝트', rule: '프로젝트명 미상 (수동 매핑 필요)' };
}

export function normalizeTeamName(rawTeam: string): string {
  // [SSOT 적용] 프론트엔드의 하드코딩 딕셔너리(typoDictionary) 전면 철폐.
  // 오타 교정이나 팀 이름 강제 매핑은 오직 사용자가 제어하는 파이어베이스 칸반보드(SSOT)에서만 수행해야 합니다.
  return rawTeam.trim();
}

export function getMappedTeam(assignedProject: string, context: string, mappingDict: Record<string, string>): { team: string, rule: string } {
  let resultTeam = '';
  let resultRule = '';

  // 1. Try exact match on assignedProject (highest priority for Kanban board mappings)
  if (assignedProject && mappingDict[assignedProject]) {
    resultTeam = mappingDict[assignedProject];
    resultRule = `사용자 지정 규칙 (프로젝트명 일치: ${assignedProject})`;
  } 
  // 2. Try exact match on user mapping using the context
  else if (mappingDict[context]) {
    resultTeam = mappingDict[context];
    resultRule = '사용자 지정 규칙 (정확히 일치)';
  } else {
    // 3. Try partial match on user mapping using the context
    let matched = false;
    const sortedKeys = Object.keys(mappingDict).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (key.length < 2) continue; // 방어 로직: 1글자 이하 단어는 부분 일치로 사용하지 않음 (오폭 방지)
      if (context.includes(key)) {
        resultTeam = mappingDict[key];
        resultRule = `사용자 지정 규칙 포함 ("${key}")`;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // 3. Team is STRICTLY determined by the SSOT Mapping Dict. 
      // V4 legacy hardcoded fallback (proj.includes...) is removed.
      resultTeam = '기타';
      resultRule = `등록된 매핑 규칙 없음`;
    }
  }

  // 절대 방어선 (Normalizer) 통과
  const finalTeam = normalizeTeamName(resultTeam);
  if (finalTeam !== resultTeam && finalTeam !== '제외' && finalTeam !== '기타') {
    resultRule += ` (자동 교정: ${resultTeam} -> ${finalTeam})`;
  } else if (finalTeam === '기타' && resultTeam !== '기타' && resultTeam !== '제외') {
    resultRule += ` (알 수 없는 팀 강제 편입: ${resultTeam} -> 기타)`;
  }

  return { team: finalTeam, rule: resultRule };
}

export async function parseRevenueBuffer(
  buffer: Buffer, 
  filename: string, 
  teamMapping: Record<string, string>,
  revenueFilters: string[] = [],
  projectOverrides: Record<string, string> = {}
) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // Parse as array of arrays to handle multi-line headers
  const jsonData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Find the header row by dynamically looking for date columns
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const rowStr = JSON.stringify(jsonData[i]).replace(/\s/g, '');
    if (rowStr.includes('영업일자') || rowStr.includes('salesdate') || rowStr.includes('일자') || rowStr.includes('date')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('Could not find header row in Revenue file.');
  }

  const headers = jsonData[headerRowIdx];
  const records = [];

  for (let i = headerRowIdx + 2; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;
    
    const dateVal = row[0]; // Assuming first column is date
    if (!dateVal || String(dateVal).includes('합계')) continue;
    
    const parsedDate = parseExcelDate(dateVal);
    if (!parsedDate) continue;

    for (let j = 1; j < headers.length; j++) {
      const colName = headers[j] as string;
      if (!colName) continue;
      
      const rawVal = String(row[j]).replace(/,/g, '');
      const amount = parseFloat(rawVal);
      if (isNaN(amount) || amount === 0) continue;

      // Filter out excluded revenues
      const isExcluded = revenueFilters.some(filter => colName.includes(filter));
      if (isExcluded) continue;

      // 안정적인 고유 서명(Signature) 생성 (수동 교정 기억장치용 - 매출용)
      const sigStr = `REV_${parsedDate.toISOString()}_${colName}_${amount}_ROW_${i}`;
      const rowSignature = crypto.createHash('md5').update(sigStr).digest('hex');

      // 1단계: 프로젝트명 1차 할당 (매출은 컬럼명이 원본 프로젝트명 역할을 함)
      let assignedProject = '';
      let projRule = '';

      if (projectOverrides[rowSignature]) {
        assignedProject = projectOverrides[rowSignature];
        projRule = `수동 교정 기억장치 자동 복구`;
      } else {
        const inference = inferAssignedProject(colName, colName);
        assignedProject = inference.project;
        projRule = inference.rule;
      }

      // 2단계: 프로젝트명 기반 팀 분류
      const teamContext = colName;
      const { team, rule: teamRule } = getMappedTeam(assignedProject, teamContext, teamMapping);

      if (team === '제외') continue;

      const hashStr = `${parsedDate.toISOString()}_${team}_${assignedProject}_${amount}_${colName}`;
      const hash = crypto.createHash('md5').update(hashStr).digest('hex');

      records.push({
        id: `rev_${hash}`,
        row_signature: rowSignature,
        date: parsedDate,
        month: parsedDate.toISOString().slice(0, 7),
        team,
        amount,
        assigned_project: assignedProject,
        branch_name: colName, // 원본 컬럼명
        mapped_rule: `[매출 파싱] [프로젝트명 부여] ${projRule} -> [팀 분류] ${teamRule}`,
        source_file: filename,
      });
    }
  }

  return records;
}

export async function parseExpenseBuffer(
  buffer: Buffer, 
  filename: string, 
  teamMapping: Record<string, string>, 
  expenseFilters: string[] = [],
  projectOverrides: Record<string, string> = {}
) {
  // cellDates: false 처리로 원시 날짜 데이터(Serial)를 가져와 [object Object] 방지
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  const records = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // 빈 셀도 undefined가 아닌 빈 문자열로 처리하도록 defval 옵션 추가
    const jsonData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerRowIdx = -1;
    let flatHeaders: string[] = [];

    // 1. 다중 헤더 결합 탐색 (최대 30번째 줄까지 스캔)
    for (let i = 0; i < Math.min(30, jsonData.length); i++) {
      const rowStr = JSON.stringify(jsonData[i]);
      if (
        rowStr.includes('계정과목') || rowStr.includes('과목') || rowStr.includes('적요') ||
        rowStr.includes('차변') || rowStr.includes('금액') || rowStr.includes('일자') ||
        rowStr.includes('날짜') || rowStr.includes('계정') || rowStr.includes('비용') ||
        rowStr.includes('지출') || rowStr.includes('프로젝트') || rowStr.includes('부서')
      ) {
        headerRowIdx = i;
        
        // 헤더는 1줄(해당 행)만 사용 (데이터 행이 헤더로 병합되는 치명적 오류 방지)
        flatHeaders = (jsonData[i] || []).map((col: any) => 
          String(col || '').replace(/\s/g, '').toLowerCase()
        );
        break;
      }
    }

    if (headerRowIdx === -1) {
      console.warn(`Could not find header row in sheet: ${sheetName}`);
      continue;
    }

    // 2. 루프 외부에서 인덱스 1회 매핑 (성능 최적화 및 누락 방지)
    const getColIdx = (possibleNames: string[]) => {
      // 1순위: 정확히 일치하는(Exact Match) 컬럼 탐색 (우선순위 순)
      for (const name of possibleNames) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        if (!cleanName) continue;
        for (let i = 0; i < flatHeaders.length; i++) {
          if (flatHeaders[i] === cleanName) return i;
        }
      }
      // 2순위: 포함하는(Includes) 컬럼 탐색 (우선순위 순)
      for (const name of possibleNames) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        if (!cleanName) continue;
        for (let i = 0; i < flatHeaders.length; i++) {
          if (flatHeaders[i].includes(cleanName)) return i;
        }
      }
      return -1;
    };

    const getColIndices = (possibleNames: string[]) => {
      const indices: number[] = [];
      // 1순위: 정확히 일치하는 컬럼
      for (const name of possibleNames) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        if (!cleanName) continue;
        for (let i = 0; i < flatHeaders.length; i++) {
          if (flatHeaders[i] === cleanName && !indices.includes(i)) {
            indices.push(i);
          }
        }
      }
      // 2순위: 포함하는 컬럼
      for (const name of possibleNames) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        if (!cleanName) continue;
        for (let i = 0; i < flatHeaders.length; i++) {
          if (flatHeaders[i].includes(cleanName) && !indices.includes(i)) {
            indices.push(i);
          }
        }
      }
      return indices;
    };

    const idxMap = {
      dateIndices: getColIndices(['작성일', '전표일자', '회계일자', '전표일', '일자', '날짜', 'date', '승인일', '사용일', '결제일', '지출일', '승인일자', '발행일', '발행일자', '일시', '거래일', '거래일자', '발의일자', '기안일자', '년월', '기준년월', '연월', '회계년월', '결의일자', '지급일자']),
      term: getColIdx(['계정과목명', '계정과목', '과목명', '과목', '차변계정과목', '계정명', '비용항목', '지출항목', '항목명', '항목', '구분', '내역', '지출내역']),
      amount: getColIdx(['차변', '금액', '차변금액', '지출금액', '비용', '공급가액', '합계', '결제금액', '출금액', '대변', '금액합계', '사용금액']),
      project: getColIdx(['프로젝트명', '프로젝트', 'project', '사업명', '사업', '영업장', '영업장명', '업장명', '업장']),
      dept: getColIdx(['부서명', '부서', 'dept', '사용부서명', '본부명', '소속', '소속부서']),
      desc: getColIdx(['적요', '내용', 'desc', '적요명', '품명', '지출적요', '상세내용', '비고']),
      vendor: getColIdx(['업체명', '업체', '거래처', '거래처명', 'vendor', '상호', '상호명', '가맹점명', '가맹점']),
      approval: getColIdx(['승인번호', '승인번호(세금계산서)', 'approval', '카드번호', '승인']),
      attrMonth: getColIdx(['귀속월', '귀속', 'attr_month', '사용월', '정산월', '귀속연월', '귀속년월'])
    };

    let lastVendor = '';
    let lastApproval = '';
    let lastAttrMonth = '';

    // 3. 실제 데이터 행 반복 추출
    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      let attr_month = idxMap.attrMonth !== -1 ? String(row[idxMap.attrMonth] || '').trim() : '';
      if (!attr_month) attr_month = lastAttrMonth;
      else lastAttrMonth = attr_month;

      const originalTerm = idxMap.term !== -1 ? String(row[idxMap.term] || '') : '';
      const description = idxMap.desc !== -1 ? String(row[idxMap.desc] || '') : '';
      let vendor = idxMap.vendor !== -1 ? String(row[idxMap.vendor] || '').trim() : '';
      if (!vendor) vendor = lastVendor;
      else lastVendor = vendor;

      let approval_number = idxMap.approval !== -1 ? String(row[idxMap.approval] || '').trim() : '';
      if (!approval_number) approval_number = lastApproval;
      else lastApproval = approval_number;
      
      let rawAmount = idxMap.amount !== -1 ? String(row[idxMap.amount] || '0') : '0';
      // 회계 형식 음수 (예: (526,656)) 처리
      if (rawAmount.includes('(') && rawAmount.includes(')')) {
        rawAmount = '-' + rawAmount.replace(/[()]/g, '');
      }
      rawAmount = rawAmount.replace(/,/g, '').replace(/\s/g, '');
      const amount = parseFloat(rawAmount) || 0;

      if (amount === 0) continue; // 금액이 0인 행은 유효한 비용 데이터가 아니므로 1차 드랍

      // 다중 날짜 컬럼에서 우선순위에 따라 유효한 날짜 탐색 (작성일/전표일자 우선 -> 승인일 후순위)
      let dateVal = null;
      for (const idx of idxMap.dateIndices) {
        if (row[idx] !== undefined && String(row[idx]).trim() !== '') {
          dateVal = row[idx];
          break;
        }
      }

      // 날짜가 없거나 파싱 불가능한 경우, 파일명/시트명/귀속월에서 날짜 자동 유추
      let parsedDate = parseExcelDate(dateVal);
      if (!parsedDate) {
        let yearMonth = '';
        // 1. 파일명에서 YYYY-MM 또는 YYYY.MM 또는 YY.MM 유추
        const fnMatch = filename.match(/(20\d{2}|\d{2})[-._]?(0[1-9]|1[0-2])/);
        if (fnMatch) {
          const y = fnMatch[1].length === 2 ? `20${fnMatch[1]}` : fnMatch[1];
          yearMonth = `${y}-${fnMatch[2].padStart(2, '0')}`;
        } else if (attr_month) {
          const m = attr_month.replace(/[^0-9]/g, '').padStart(2, '0');
          if (m && m !== '00') {
            const y = new Date().getFullYear().toString();
            yearMonth = `${y}-${m}`;
          }
        } else {
          // 2. 시트명에서 월 유추 (예: '1월', '7월', '2026.07')
          const snMatch = sheetName.match(/(20\d{2}|\d{2})?[-._]?([0-1]?[0-9])월?/);
          if (snMatch && snMatch[2]) {
            const y = snMatch[1] ? (snMatch[1].length === 2 ? `20${snMatch[1]}` : snMatch[1]) : new Date().getFullYear().toString();
            const m = snMatch[2].padStart(2, '0');
            if (Number(m) >= 1 && Number(m) <= 12) {
              yearMonth = `${y}-${m}`;
            }
          }
        }
        
        if (yearMonth) {
          parsedDate = new Date(`${yearMonth}-15T00:00:00`);
        } else {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          parsedDate = new Date(`${y}-${m}-15T00:00:00`);
        }
      }

      const project = idxMap.project !== -1 ? String(row[idxMap.project] || '') : '';
      const dept = idxMap.dept !== -1 ? String(row[idxMap.dept] || '') : '';

      // 4. 비용 필터링 로직 (완전 스킵 - 금액 뻥튀기 원천 차단)
      const isExcluded = expenseFilters.some(filter => 
        originalTerm.includes(filter) || description.includes(filter) || project.includes(filter) || dept.includes(filter)
      );
      
      // if (isExcluded) continue; // 사용자가 직접 제외 여부를 결정할 수 있도록 완전 스킵 로직을 제거합니다.

      // 안정적인 고유 서명(Signature) 생성 (수동 교정 기억장치용)
      const sigStr = `${parsedDate.toISOString()}_${amount}_${description}_${vendor}_ROW_${i}`;
      const rowSignature = crypto.createHash('md5').update(sigStr).digest('hex');

      // 1단계: 프로젝트명 1차 할당 (기억장치 우선 확인)
      let assignedProject = '';
      let projRule = '';

      if (projectOverrides[rowSignature]) {
        assignedProject = projectOverrides[rowSignature];
        projRule = `수동 교정 기억장치 자동 복구`;
      } else {
        const contextForInference = `${originalTerm} ${dept} ${description} ${vendor}`;
        const inference = inferAssignedProject(project, contextForInference);
        assignedProject = inference.project;
        projRule = inference.rule;
      }

      // 2단계: 프로젝트명 기반 팀 분류
      const teamContext = `${originalTerm} ${assignedProject} ${project} ${dept} ${description} ${vendor}`;
      let { team, rule: teamRule } = getMappedTeam(assignedProject, teamContext, teamMapping);
      
      if (originalTerm.includes('감가상각')) {
        team = '감가상각비';
        teamRule = '계정과목명 기반 강제 팀 배정 (감가상각비)';
      }

      const mappedTerm = heuristicExpenseTerm(originalTerm, description, vendor);

      // 해시에 ROW_${i}를 포함하여, 내용이 완전히 동일한 여러 행이 서로 덮어쓰여 누락되는 치명적 버그 수정
      const hashStr = `${parsedDate.toISOString()}_${team}_${project}_${mappedTerm}_${amount}_${description}_${vendor}_${sheetName}_ROW_${i}`;
      const hash = crypto.createHash('md5').update(hashStr).digest('hex');

      records.push({
        id: `exp_${hash}`,
        row_signature: rowSignature,
        date: parsedDate,
        month: parsedDate.toISOString().slice(0, 7),
        original_term: originalTerm,
        mapped_term: mappedTerm,
        amount,
        team,
        mapped_rule: `[시트: ${sheetName}] [프로젝트명 부여] ${projRule} -> [팀 분류] ${teamRule}`,
        assigned_project: assignedProject,
        branch_name: project, // raw original project string
        dept_name: dept,
        description,
        vendor,
        approval_number,
        attr_month,
        source_file: filename,
      });
    }
  }

  return records;
}

export async function parseRoomDataBuffer(buffer: Buffer, filename: string) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    if (jsonData[i] && jsonData[i].includes('일자') && jsonData[i].includes('객실번호')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('객실 데이터를 인식할 수 없습니다. 일자, 객실번호 등이 포함된 헤더를 찾지 못했습니다.');
  }

  const headers = jsonData[headerRowIdx];
  const getColIdx = (possibleNames: string[]) => {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (!h) continue;
      const cleanH = String(h).replace(/\s/g, '').toLowerCase();
      for (const name of possibleNames) {
        if (cleanH.includes(name.replace(/\s/g, '').toLowerCase())) {
          return i;
        }
      }
    }
    return -1;
  };

  const roomTypeIdx = getColIdx(['객실타입', '룸타입']);
  const marketTypeIdx = getColIdx(['마켓타입', '마켓']);
  const amountIdx = getColIdx(['합계', '금액', '객실료']);
  const nightsIdx = getColIdx(['박수']);
  const dateIdx = getColIdx(['일자', 'salesdate', '영업일자']);

  if (roomTypeIdx === -1 || amountIdx === -1 || dateIdx === -1) {
    throw new Error('필수 열(일자, 객실타입, 합계)을 찾을 수 없습니다.');
  }

  const records = [];

  for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const dateVal = row[dateIdx];
    if (!dateVal || String(dateVal).includes('합계')) continue;
    
    const parsedDate = parseExcelDate(dateVal);
    if (!parsedDate) continue;

    const rawRoomType = row[roomTypeIdx] ? String(row[roomTypeIdx]).trim() : '미분류';
    let roomType = '';
    if (rawRoomType.includes('16평')) roomType = '16평';
    else if (rawRoomType.includes('35평')) roomType = '35평';
    else if (rawRoomType.includes('51평')) roomType = '51평';
    
    if (!roomType) continue; // 16평, 35평, 51평이 아니면 총계/합계 등 쓰레기 데이터로 판단하여 무시

    const rawMarketType = marketTypeIdx !== -1 && row[marketTypeIdx] ? String(row[marketTypeIdx]).trim() : '미분류 마켓';
    const marketType = rawMarketType || '미분류 마켓';
    
    const rawAmount = String(row[amountIdx] || '0').replace(/,/g, '');
    const amount = parseFloat(rawAmount) || 0;

    const rawNights = nightsIdx !== -1 ? String(row[nightsIdx] || '0').replace(/,/g, '') : '0';
    const nights = parseFloat(rawNights) || 0;

    if (amount === 0) continue;

    const hashStr = `ROOM_${parsedDate.toISOString()}_${roomType}_${marketType}_${amount}_${nights}_ROW_${i}`;
    const hash = crypto.createHash('md5').update(hashStr).digest('hex');

    records.push({
      id: `room_${hash}`,
      date: parsedDate,
      month: parsedDate.toISOString().slice(0, 7),
      room_type: roomType,
      market_type: marketType,
      amount,
      nights,
      source_file: filename,
    });
  }

  return records;
}
