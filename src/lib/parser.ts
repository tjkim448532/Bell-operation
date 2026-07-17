import * as xlsx from 'xlsx';
import crypto from 'crypto';

// Helper function to extract date from Excel serial number or string
export function parseExcelDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'number') {
    // Excel date serial number
    const date = new Date((dateVal - (25569)) * 86400 * 1000);
    return date;
  }
  if (typeof dateVal === 'string') {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
  }
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
  
  // Find the header row (assume row index 2 based on previous analysis)
  // Let's dynamically find it by looking for '영업일자' or 'Date'
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    if (jsonData[i].includes('영업일자') || jsonData[i].includes('Sales Date')) {
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
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const records = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const rowStr = JSON.stringify(jsonData[i]);
      if ((rowStr.includes('작성일') || rowStr.includes('승인일') || rowStr.includes('일자')) && 
          (rowStr.includes('계정과목') || rowStr.includes('과목'))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      console.warn(`Could not find header row in sheet: ${sheetName}`);
      continue;
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
    
    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      const dateIdx = getColIdx(['작성일', '일자', 'date', '전표일자', '승인일']);
      const dateVal = dateIdx !== -1 ? row[dateIdx] : null;
      if (!dateVal) continue;
      
      const parsedDate = parseExcelDate(dateVal);
      if (!parsedDate) continue;

      const termIdx = getColIdx(['계정과목명', '계정과목', '과목', '차변계정과목']);
      const originalTerm = termIdx !== -1 ? String(row[termIdx] || '') : '';
      
      const amountIdx = getColIdx(['차변', '금액', '차변금액']);
      const rawAmount = amountIdx !== -1 ? String(row[amountIdx] || '0').replace(/,/g, '') : '0';
      const amount = parseFloat(rawAmount) || 0;
      
      const projIdx = getColIdx(['프로젝트명', '프로젝트', 'project']);
      const project = projIdx !== -1 ? String(row[projIdx] || '') : '';
      
      const deptIdx = getColIdx(['부서명', '부서', 'dept', '사용부서명']);
      const dept = deptIdx !== -1 ? String(row[deptIdx] || '') : '';
      
      const descIdx = getColIdx(['적요', '내용', 'desc']);
      const description = descIdx !== -1 ? String(row[descIdx] || '') : '';
      
      const vendorIdx = getColIdx(['업체명', '업체', '거래처', '거래처명', 'vendor']);
      const vendor = vendorIdx !== -1 ? String(row[vendorIdx] || '') : '';

      const approvalIdx = getColIdx(['승인번호', '승인번호(세금계산서)', 'approval']);
      const approval_number = approvalIdx !== -1 ? String(row[approvalIdx] || '') : '';

      const attrMonthIdx = getColIdx(['귀속월', '귀속', 'attr_month']);
      const attr_month = attrMonthIdx !== -1 ? String(row[attrMonthIdx] || '') : '';

      let isDropped = false;
      if (amount === 0) {
        isDropped = true;
      }

      // Check exclusion filters
      const isExcluded = expenseFilters.some(filter => 
        originalTerm.includes(filter) || description.includes(filter) || project.includes(filter) || dept.includes(filter)
      );
      if (isExcluded) {
        isDropped = true;
      }

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

      if (isDropped) {
        team = '제외';
        teamRule = '비용 통제 정책에 의한 제외 또는 0원 내역';
      }

      const mappedTerm = heuristicExpenseTerm(originalTerm, description, vendor);

      const hashStr = `${parsedDate.toISOString()}_${team}_${project}_${mappedTerm}_${amount}_${description}_${vendor}_${sheetName}`;
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
