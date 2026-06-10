import { NextResponse } from 'next/server';

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentWord = '';
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentWord.trim());
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  result.push(currentWord.trim());
  return result;
}

export async function GET() {
  try {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1wlNrE_FvXCYNGfyvIYxEidYLKoEas4pidWe0Z9e_2xs/export?format=csv';
    const response = await fetch(sheetUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n').map(line => line.trim());
    
    let currentSection = '';
    let skipRows = 0;
    
    const goalsByTeam: Record<string, number[]> = {};
    const visitorGoals: Record<string, number[]> = {};
    const visitorActuals: Record<string, number[]> = {};
    const utilizationGoals: Record<string, number[]> = {};
    const utilizationActuals: Record<string, number[]> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      if (line.includes('월별 방문객 목표')) {
        currentSection = 'visitor';
        skipRows = 2;
        continue;
      } else if (line.includes('월별 이용률 목표')) {
        currentSection = 'utilization';
        skipRows = 2;
        continue;
      } else if (line.includes('월별 매출 목표')) {
        currentSection = 'revenue';
        skipRows = 2;
        continue;
      } else if (line.includes('2026년 목표 객단가')) {
        break;
      }

      if (currentSection) {
        if (skipRows > 0) {
          skipRows--;
          continue;
        }

        if (line.startsWith(',,,,,') || line.trim() === '') {
          currentSection = '';
          continue;
        }

        const cols = parseCSVRow(line);
        if (cols.length < 38) continue;

        const teamName = cols[1];
        if (!teamName) continue;

        const monthlyGoals = [];
        const monthlyActuals = [];
        
        for (let m = 0; m < 12; m++) {
          // Goal is 5 + m*3
          const goalStr = cols[5 + m * 3] || '0';
          // Actual is 6 + m*3
          const actualStr = cols[6 + m * 3] || '0';

          let goalVal = parseFloat(goalStr.replace(/,/g, '').replace(/%/g, ''));
          let actualVal = parseFloat(actualStr.replace(/,/g, '').replace(/%/g, ''));
          
          if (isNaN(goalVal)) goalVal = 0;
          if (isNaN(actualVal)) actualVal = 0;

          // For percentages, if they are like 31.15%, the parseFloat gives 31.15. We might want to keep it as 31.15.

          monthlyGoals.push(goalVal);
          monthlyActuals.push(actualVal);
        }

        if (currentSection === 'revenue') {
          goalsByTeam[teamName] = monthlyGoals;
        } else if (currentSection === 'visitor') {
          visitorGoals[teamName] = monthlyGoals;
          visitorActuals[teamName] = monthlyActuals;
        } else if (currentSection === 'utilization') {
          utilizationGoals[teamName] = monthlyGoals;
          utilizationActuals[teamName] = monthlyActuals;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: goalsByTeam, // Keep this for backward compatibility
      revenue: goalsByTeam,
      visitors: { target: visitorGoals, actual: visitorActuals },
      utilization: { target: utilizationGoals, actual: utilizationActuals }
    });

  } catch (error: any) {
    console.error('Goals fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
