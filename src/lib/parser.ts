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

function getMappedTeam(itemName: string, mappingDict: Record<string, string>): string {
  // 1. Try exact match first
  if (mappingDict[itemName]) return mappingDict[itemName];

  // 2. Try partial match (if the itemName context contains the mapped keyword)
  // Sort mapping keys by length descending so more specific keywords match first
  const sortedKeys = Object.keys(mappingDict).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (itemName.includes(key)) {
      return mappingDict[key];
    }
  }

  // 2. Comprehensive Fallbacks for the Main Departments
  if (itemName.includes('목장') || itemName.includes('얼룩말카페') || itemName.includes('미니포렛') || itemName.includes('펫포레') || itemName.includes('체험목장') || itemName.includes('디노시네마')) {
    team = '목장';
  } else if (itemName.includes('미디어아트') || itemName.includes('기프트샵') || itemName.includes('뮤지엄카페') || itemName.includes('벨포레홀') || itemName.includes('시네마')) {
    team = '미디어아트센터';
  } else if (itemName.includes('디지털지원') || itemName.includes('디지탈지원')) {
    team = '디지털지원';
  } else if (itemName.includes('레져본부') || itemName.includes('레저본부') || itemName.includes('레저사업본부')) {
    team = '레져본부';
  } else if (itemName.includes('카트') || itemName.includes('썰매') || itemName.includes('그네') || itemName.includes('루지') || itemName.includes('놀이동산') || itemName.includes('골프') || itemName.includes('게임존') || itemName.includes('마리나') || itemName.includes('썸머랜드') || itemName.includes('원더풀') || itemName.includes('콘도')) {
    team = '엑티비티';
  } else {
    // If absolutely nothing matches, default to Activity to prevent '기타' as much as possible, 
    // or keep '기타' so they can explicitly map it. Let's use '기타' to signal missing mapping, 
    // but the exhaustive list above should cover almost everything in the provided excel.
    team = '기타';
  }
  
  return team;
}

export async function parseRevenueBuffer(buffer: Buffer, filename: string, teamMapping: Record<string, string>) {
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

    // Group amounts by team
    const teamSums: Record<string, number> = {
      '목장': 0,
      '미디어아트센터': 0,
      '엑티비티': 0
    };

    for (let j = 1; j < headers.length; j++) {
      const colName = headers[j] as string;
      if (!colName) continue;
      
      const rawVal = String(row[j]).replace(/,/g, '');
      const val = parseFloat(rawVal);
      if (isNaN(val)) continue;

      // Map column to team based on user mapping or defaults
      const team = getMappedTeam(colName, teamMapping);
      if (team === '제외') continue;

      if (teamSums[team] !== undefined) {
        teamSums[team] += val;
      } else {
        teamSums[team] = val; // Initialize if it doesn't exist (e.g. '기타')
      }
    }

    for (const [team, amount] of Object.entries(teamSums)) {
      if (amount > 0 || amount < 0) { // Keep non-zero values
        const hashStr = `${parsedDate.toISOString()}_${team}_${amount}`;
        const hash = crypto.createHash('md5').update(hashStr).digest('hex');
        records.push({
          id: `rev_${hash}`,
          date: parsedDate,
          team,
          amount,
          source_file: filename,
        });
      }
    }
  }

  return records;
}

export async function parseExpenseBuffer(buffer: Buffer, filename: string, teamMapping: Record<string, string>, expenseFilters: string[] = []) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
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
    throw new Error('Could not find header row in Expense file.');
  }

  const headers = jsonData[headerRowIdx];
  const colIdx = (name: string) => headers.indexOf(name);
  
  const records = [];

  for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const dateVal = row[colIdx('작성일')];
    if (!dateVal) continue;
    
    const parsedDate = parseExcelDate(dateVal);
    if (!parsedDate) continue;

    const originalTerm = row[colIdx('계정과목명')] as string || '';
    const rawAmount = String(row[colIdx('차변')] || '0').replace(/,/g, '');
    const amount = parseFloat(rawAmount) || 0;
    const project = row[colIdx('프로젝트명')] as string || '';
    
    // Add logic to search for '부서명' if it exists, as HQ/Support often leaves Project empty
    const deptIdx = colIdx('부서명');
    const dept = deptIdx !== -1 ? (row[deptIdx] as string || '') : '';
    
    const description = row[colIdx('적요')] as string || '';
    const vendor = row[colIdx('업체')] as string || '';

    if (amount === 0) continue; // Skip zero expenses

    // Check exclusion filters
    const isExcluded = expenseFilters.some(filter => 
      originalTerm.includes(filter) || description.includes(filter) || project.includes(filter) || dept.includes(filter)
    );
    if (isExcluded) continue;

    // Use shared team mapping logic on combined project + dept + description context
    // This fixes the issue where "디지털지원" is not in 프로젝트명 but in 부서명 or 적요
    const teamContext = `${project} ${dept} ${description}`;
    const team = getMappedTeam(teamContext, teamMapping);
    if (team === '제외') continue;

    const mappedTerm = heuristicExpenseTerm(originalTerm, description, vendor);

    const hashStr = `${parsedDate.toISOString()}_${team}_${project}_${mappedTerm}_${amount}_${description}_${vendor}`;
    const hash = crypto.createHash('md5').update(hashStr).digest('hex');

    records.push({
      id: `exp_${hash}`,
      date: parsedDate,
      original_term: originalTerm,
      mapped_term: mappedTerm,
      amount,
      team,
      branch_name: project,
      description,
      vendor,
      source_file: filename,
    });
  }

  return records;
}
