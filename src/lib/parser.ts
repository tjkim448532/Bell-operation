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

import { applyHeuristicRules } from './rules';

export function heuristicExpenseTerm(originalTerm: string, description: string | undefined, vendor: string | undefined): string {
  return applyHeuristicRules(originalTerm, description || '', vendor || '');
}

export function inferAssignedProject(branchName: string, context: string): { project: string, rule: string } {
  // 1. 엑셀 원본에 프로젝트명이 명시되어 있으면 최우선 사용
  if (branchName && branchName !== '0' && branchName.trim() !== '' && branchName !== '미분류') {
    return { project: branchName.trim(), rule: '엑셀 원본 프로젝트명 명시됨' };
  }

  // 2. 적요/업체명 등 단서에서 프로젝트명 추론
  const projectKeywords = [
    '목장', '얼룩말카페', '미니포렛', '펫포레', '체험목장', '디노시네마',
    '미디어아트', '기프트샵', '뮤지엄카페', '벨포레홀', '시네마',
    '카트', '썰매', '그네', '루지', '놀이동산', '골프', '게임존', '마리나', '썸머랜드', '원더풀', '콘도', '투어버스',
    '디지털지원', '디지탈지원', '레져본부', '레저본부', '레저사업본부', '레져사업본부'
  ];

  for (const keyword of projectKeywords) {
    if (context.includes(keyword)) {
      return { project: keyword, rule: `단서에서 프로젝트명(${keyword}) 추론` };
    }
  }

  return { project: '미분류 프로젝트', rule: '추론 불가 (기본값)' };
}

export const ALLOWED_TEAMS = ['목장', '미디어아트센터', '엑티비티', '디지털지원', '레져본부', '기타', '제외'];

export function normalizeTeamName(rawTeam: string): string {
  const t = rawTeam.trim();
  if (ALLOWED_TEAMS.includes(t)) return t;

  // Auto-correction for common typos
  if (t.includes('액티비티')) return '엑티비티';
  if (t.includes('미디어')) return '미디어아트센터';
  if (t.includes('레저')) return '레져본부';
  if (t.includes('디지탈')) return '디지털지원';
  
  // Fallback
  return '기타';
}

export function getMappedTeam(assignedProject: string, context: string, mappingDict: Record<string, string>): { team: string, rule: string } {
  let resultTeam = '';
  let resultRule = '';

  // 1. Try exact match on user mapping using the context first (highest priority override)
  if (mappingDict[context]) {
    resultTeam = mappingDict[context];
    resultRule = '사용자 지정 규칙 (정확히 일치)';
  } else {
    // 2. Try partial match on user mapping using the context
    let matched = false;
    const sortedKeys = Object.keys(mappingDict).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (context.includes(key)) {
        resultTeam = mappingDict[key];
        resultRule = `사용자 지정 규칙 포함 ("${key}")`;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // 3. Team is STRICTLY determined by the Assigned Project (할당된 프로젝트명 기반 분류)
      const proj = assignedProject;
      if (proj.includes('목장') || proj.includes('얼룩말카페') || proj.includes('얼룩말까페') || proj.includes('카페') || proj.includes('까페') || proj.includes('미니포렛') || proj.includes('펫포레') || proj.includes('체험목장') || proj.includes('디노시네마')) {
        resultTeam = '목장'; resultRule = `프로젝트명 기반 팀 배정 (${proj} -> 목장)`;
      } else if (proj.includes('미디어아트') || proj.includes('기프트샵') || proj.includes('뮤지엄카페') || proj.includes('벨포레홀') || proj.includes('시네마')) {
        resultTeam = '미디어아트센터'; resultRule = `프로젝트명 기반 팀 배정 (${proj} -> 미디어아트센터)`;
      } else if (proj.includes('카트') || proj.includes('썰매') || proj.includes('그네') || proj.includes('루지') || proj.includes('놀이동산') || proj.includes('골프') || proj.includes('게임존') || proj.includes('마리나') || proj.includes('썸머랜드') || proj.includes('원더풀') || proj.includes('콘도') || proj.includes('투어버스') || proj.includes('엑티비티') || proj.includes('액티비티') || proj.toLowerCase().includes('activity') || proj.includes('모토아레나')) {
        resultTeam = '엑티비티'; resultRule = `프로젝트명 기반 팀 배정 (${proj} -> 엑티비티)`;
      } else if (proj.includes('디지털지원') || proj.includes('디지탈지원')) {
        resultTeam = '디지털지원'; resultRule = `프로젝트명 기반 팀 배정 (${proj} -> 디지털지원)`;
      } else if (proj.includes('레져본부') || proj.includes('레저본부') || proj.includes('레저사업본부') || proj.includes('레져사업본부')) {
        resultTeam = '레져본부'; resultRule = `프로젝트명 기반 팀 배정 (${proj} -> 레져본부)`;
      } else {
        resultTeam = '기타'; resultRule = `프로젝트명(${proj})에 해당하는 팀 없음`;
      }
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
      const sigStr = `REV_${parsedDate.toISOString()}_${colName}_${amount}`;
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
      if (jsonData[i].includes('작성일') && jsonData[i].includes('계정과목명')) {
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

      const dateIdx = getColIdx(['작성일', '일자', 'date', '전표일자']);
      const dateVal = dateIdx !== -1 ? row[dateIdx] : null;
      if (!dateVal) continue;
      
      const parsedDate = parseExcelDate(dateVal);
      if (!parsedDate) continue;

      const termIdx = getColIdx(['계정과목명', '계정과목', '과목']);
      const originalTerm = termIdx !== -1 ? String(row[termIdx] || '') : '';
      
      const amountIdx = getColIdx(['차변', '금액']);
      const rawAmount = amountIdx !== -1 ? String(row[amountIdx] || '0').replace(/,/g, '') : '0';
      const amount = parseFloat(rawAmount) || 0;
      
      const projIdx = getColIdx(['프로젝트명', '프로젝트', 'project']);
      const project = projIdx !== -1 ? String(row[projIdx] || '') : '';
      
      const deptIdx = getColIdx(['부서명', '부서', 'dept']);
      const dept = deptIdx !== -1 ? String(row[deptIdx] || '') : '';
      
      const descIdx = getColIdx(['적요', '내용', 'desc']);
      const description = descIdx !== -1 ? String(row[descIdx] || '') : '';
      
      const vendorIdx = getColIdx(['업체명', '업체', '거래처', '거래처명', 'vendor']);
      const vendor = vendorIdx !== -1 ? String(row[vendorIdx] || '') : '';

      if (amount === 0) continue; // Skip zero expenses

      // Check exclusion filters
      const isExcluded = expenseFilters.some(filter => 
        originalTerm.includes(filter) || description.includes(filter) || project.includes(filter) || dept.includes(filter)
      );
      if (isExcluded) continue;

      // 안정적인 고유 서명(Signature) 생성 (수동 교정 기억장치용)
      const sigStr = `${parsedDate.toISOString()}_${amount}_${description}_${vendor}`;
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
      const teamContext = `${originalTerm} ${project} ${dept} ${description} ${vendor}`;
      const { team, rule: teamRule } = getMappedTeam(assignedProject, teamContext, teamMapping);
      
      if (team === '제외') continue;

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
        source_file: filename,
      });
    }
  }

  return records;
}
