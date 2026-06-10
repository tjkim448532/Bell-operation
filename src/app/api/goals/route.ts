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
    
    let isTargetSection = false;
    let skipRows = 0;
    const goalsByTeam: Record<string, number[]> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      if (line.includes('월별 매출 목표')) {
        isTargetSection = true;
        skipRows = 2; // Skip headers: '업장,2026년 전체...', ',,목표,실적...'
        continue;
      }

      if (isTargetSection) {
        if (skipRows > 0) {
          skipRows--;
          continue;
        }

        // End of section or next section
        if (line.startsWith(',,,,,') || line.includes('2026년 목표 객단가')) {
          break;
        }

        const cols = parseCSVRow(line);
        if (cols.length < 38) continue; // safety check

        const teamName = cols[1];
        if (!teamName) continue;

        // Indices: 5 (Jan), 8 (Feb), 11 (Mar), 14 (Apr), 17 (May), 20 (Jun)
        // 23 (Jul), 26 (Aug), 29 (Sep), 32 (Oct), 35 (Nov), 38 (Dec)
        const monthlyGoals = [];
        for (let m = 0; m < 12; m++) {
          const idx = 5 + m * 3;
          const valStr = cols[idx] || '0';
          const val = parseInt(valStr.replace(/,/g, ''), 10);
          monthlyGoals.push(isNaN(val) ? 0 : val);
        }

        goalsByTeam[teamName] = monthlyGoals;
      }
    }

    return NextResponse.json({ success: true, data: goalsByTeam });

  } catch (error: any) {
    console.error('Goals fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
