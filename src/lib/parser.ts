import * as xlsx from 'xlsx';

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
      
      const val = parseFloat(row[j] as string);
      if (isNaN(val)) continue;

      // Map column to team based on user mapping or defaults
      let team = teamMapping[colName];
      if (!team) {
        // Fallbacks
        if (colName.includes('목장')) team = '목장';
        else if (colName.includes('미디어아트센터')) team = '미디어아트센터';
        else if (['마운틴카트', '사계절썰매장', '놀이동산', '놀이동산(2025)', '모토아레나'].includes(colName)) team = '엑티비티';
      }

      if (team && teamSums[team] !== undefined) {
        teamSums[team] += val;
      }
    }

    for (const [team, amount] of Object.entries(teamSums)) {
      if (amount > 0 || amount < 0) { // Keep non-zero values
        records.push({
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

export async function parseExpenseBuffer(buffer: Buffer, filename: string) {
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
    const amount = parseFloat(row[colIdx('차변')] as string) || 0;
    const project = row[colIdx('프로젝트명')] as string || '';
    const description = row[colIdx('적요')] as string || '';
    const vendor = row[colIdx('업체')] as string || '';

    if (amount === 0) continue; // Skip zero expenses

    // Map team from project
    let team = '기타';
    if (project.includes('목장')) team = '목장';
    else if (project.includes('미디어아트센터')) team = '미디어아트센터';
    else if (project.includes('카트') || project.includes('그네') || project.includes('썰매') || project.includes('루지')) team = '엑티비티';

    const mappedTerm = heuristicExpenseTerm(originalTerm, description, vendor);

    records.push({
      date: parsedDate,
      original_term: originalTerm,
      mapped_term: mappedTerm,
      amount,
      team,
      description,
      vendor,
      source_file: filename,
    });
  }

  return records;
}
