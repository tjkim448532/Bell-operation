import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

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
  // Remove starting and ending quotes if present
  let finalWord = currentWord.trim();
  if (finalWord.startsWith('"') && finalWord.endsWith('"')) {
    finalWord = finalWord.substring(1, finalWord.length - 1);
  }
  result.push(finalWord.trim());
  return result.map(word => {
    if (word.startsWith('"') && word.endsWith('"')) {
      return word.substring(1, word.length - 1).trim();
    }
    return word;
  });
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return NextResponse.json({ error: '유효한 구글 스프레드시트 링크가 아닙니다.' }, { status: 400 });
    }
    const spreadsheetId = match[1];

    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    const response = await fetch(exportUrl, { cache: 'no-store' });
    
    if (!response.ok) {
      return NextResponse.json({ error: '구글 시트 다운로드 실패. 시트가 "링크가 있는 모든 사용자에게 공개" 상태인지 확인해주세요.' }, { status: 400 });
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
          const goalStr = cols[5 + m * 3] || '0';
          const actualStr = cols[6 + m * 3] || '0';

          let goalVal = parseFloat(goalStr.replace(/,/g, '').replace(/%/g, ''));
          let actualVal = parseFloat(actualStr.replace(/,/g, '').replace(/%/g, ''));
          
          if (isNaN(goalVal)) goalVal = 0;
          if (isNaN(actualVal)) actualVal = 0;

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

    const lastSyncedAt = new Date().toISOString();

    const dataObj = {
      revenue: goalsByTeam,
      visitors: { target: visitorGoals, actual: visitorActuals },
      utilization: { target: utilizationGoals, actual: utilizationActuals },
      lastSyncedAt
    };

    await db.collection('goals').doc('2026').set(dataObj);

    return NextResponse.json({ 
      success: true, 
      message: '구글 시트의 목표/이용률 데이터가 성공적으로 동기화되었습니다.',
      lastSyncedAt 
    });

  } catch (error: any) {
    console.error('Google Sheet Goals Sync Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
