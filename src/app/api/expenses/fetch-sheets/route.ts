import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { 
  RawExpenseRow, 
  inferTeamFromRawRow, 
  inferAccountCategory,
  linkVenueAndTeam,
  makeFriendlyCategory
} from '@/lib/financeEngine';

export const dynamic = 'force-dynamic';

function extractGoogleSheetCsvUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  
  // 이미 CSV gviz 또는 pub export 링크인 경우
  if (trimmed.includes('gviz/tq?tqx=out:csv') || trimmed.includes('/pub?output=csv')) {
    return trimmed;
  }

  // 표준 구글 스프레드시트 URL 매칭 -> 가장 안정적인 gviz/tq 엔드포인트로 변환
  // 예: https://docs.google.com/spreadsheets/d/1MYx45381kpFua8TG_EjLA95nLNCuHMreSTyybF3_ai0/edit?usp=sharing
  const docMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (docMatch && docMatch[1]) {
    const sheetId = docMatch[1];
    const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  }

  // 웹 게시(pub) 링크인 경우
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    const pubId = pubMatch[1];
    return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`;
  }

  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, yearMonth } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: '구글 스프레드시트 링크 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    const csvUrl = extractGoogleSheetCsvUrl(url);

    // 구글 시트 CSV 엔드포인트 fetch
    const fetchRes = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv,text/plain,*/*',
      },
      next: { revalidate: 0 },
    });

    if (!fetchRes.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `구글 시트에 접근할 수 없습니다 (HTTP ${fetchRes.status}). 링크 공유 권한이 '링크가 있는 모든 사용자에게 공개(뷰어)'로 설정되어 있는지 확인해 주세요.` 
        },
        { status: 400 }
      );
    }

    const csvText = await fetchRes.text();
    if (!csvText || csvText.length < 10) {
      return NextResponse.json(
        { success: false, error: '구글 시트에서 비어 있거나 유효하지 않은 데이터가 반환되었습니다.' },
        { status: 400 }
      );
    }

    // XLSX로 CSV 텍스트 파싱
    const wb = XLSX.read(csvText, { type: 'string' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (!data || data.length < 2) {
      return NextResponse.json(
        { success: false, error: '시트에 데이터 행이 부족합니다.' },
        { status: 400 }
      );
    }

    // 헤더 인덱스 자동 탐색
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const rowStr = (data[i] || []).join(' ');
      if (
        rowStr.includes('계정') || 
        rowStr.includes('금액') || 
        rowStr.includes('부서') || 
        rowStr.includes('프로젝트') || 
        rowStr.includes('과목')
      ) {
        headerRowIdx = i;
        break;
      }
    }

    const rawHeaderRow = data[headerRowIdx] || [];
    const headers = Array.from(rawHeaderRow).map((h: any) => (h != null ? String(h).trim() : ''));
    const codeIdx = headers.findIndex((h) => (h || '').includes('코드') && !(h || '').includes('거래처'));
    const nameIdx = headers.findIndex((h) => (h || '').includes('과목') || (h || '').includes('계정명') || (h || '').includes('차변계정과목'));
    const macroIdx = headers.findIndex((h) => (h || '').includes('비목') || (h || '').includes('대분류') || (h || '').includes('구분') || (h || '').includes('중분류'));
    const projectIdx = headers.findIndex((h) => (h || '').includes('프로젝트') || (h || '').includes('영업장') || (h || '').includes('업장'));
    const deptIdx = headers.findIndex((h) => (h || '').includes('부서') || (h || '').includes('사용부서') || (h || '').includes('팀'));
    let amountIdx = headers.findIndex((h) => (h || '').includes('금액') || (h || '').includes('차변금액') || (h || '').includes('실적') || (h || '').includes('비용') || (h || '').includes('차변') || (h || '').includes('공급가액'));
    const memoIdx = headers.findIndex((h) => (h || '').includes('적요') || (h || '').includes('내용') || (h || '').includes('비고'));
    const clientIdx = headers.findIndex((h) => (h || '').includes('거래처명') || (h || '').includes('거래처') || (h || '').includes('업체'));
    let dateIdx = headers.findIndex((h) => (h || '').includes('일자') || (h || '').includes('날짜') || (h || '').includes('일시'));

    // 스마트 금액 컬럼 감지: 헤더가 비어있거나 '금액' 명칭이 없는 경우 데이터 행 분석
    if (amountIdx === -1) {
      const colScores: Record<number, { count: number; min: number; max: number; isInteger: boolean }> = {};
      const sampleLimit = Math.min(data.length, headerRowIdx + 50);
      for (let r = headerRowIdx + 1; r < sampleLimit; r++) {
        const row = data[r];
        if (!row || !Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          const val = row[c];
          let num: number | null = null;
          if (typeof val === 'number') num = val;
          else if (typeof val === 'string') {
            const clean = val.replace(/,/g, '').trim();
            if (/^-?\d+(\.\d+)?$/.test(clean)) num = parseFloat(clean);
          }
          if (num !== null && !isNaN(num) && num !== 0) {
            if (!colScores[c]) colScores[c] = { count: 0, min: num, max: num, isInteger: true };
            colScores[c].count++;
            colScores[c].min = Math.min(colScores[c].min, num);
            colScores[c].max = Math.max(colScores[c].max, num);
            if (!Number.isInteger(num)) colScores[c].isInteger = false;
          }
        }
      }

      let bestCol = -1;
      let maxScore = 0;
      for (const [colStr, stat] of Object.entries(colScores)) {
        const c = Number(colStr);
        // 엑셀 날짜(소수점 타임스탬프 또는 40000~55000에 좁게 밀집된 시리얼) 제외
        const isDateSerial = !stat.isInteger && stat.min >= 40000 && stat.max <= 55000;
        if (!isDateSerial && stat.count > maxScore) {
          maxScore = stat.count;
          bestCol = c;
        }
      }
      if (bestCol !== -1 && maxScore >= 2) {
        amountIdx = bestCol;
      }
    }

    // 스마트 일자 컬럼 감지
    if (dateIdx === -1) {
      for (let c = 0; c < Math.min(headers.length, 6); c++) {
        if (c === amountIdx || c === nameIdx || c === deptIdx) continue;
        const sampleVal = data[headerRowIdx + 1]?.[c];
        if (typeof sampleVal === 'number' && sampleVal >= 40000 && sampleVal <= 55000) {
          dateIdx = c;
          break;
        } else if (typeof sampleVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sampleVal)) {
          dateIdx = c;
          break;
        }
      }
    }

    // 전사 원장 시트 감지: 사용부서 컬럼에 '골프', '리조트', '경영지원' 등 타 본부가 섞여 있는지 검사
    const hasMultipleDivisions = (() => {
      if (deptIdx === -1) return false;
      let otherDivCount = 0;
      for (let i = headerRowIdx + 1; i < Math.min(data.length, headerRowIdx + 100); i++) {
        const d = String(data[i]?.[deptIdx] || '');
        if (
          d.includes('골프') || d.includes('리조트') || d.includes('경영지원') || 
          d.includes('지원본부') || d.includes('개발') || d.includes('세일즈') ||
          d.includes('콘텐츠') || d === '공통'
        ) {
          otherDivCount++;
        }
      }
      return otherDivCount >= 3;
    })();

    const rows: RawExpenseRow[] = [];

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const rawAmt = row[amountIdx !== -1 ? amountIdx : 3];
      const cleanAmt = typeof rawAmt === 'number' 
        ? rawAmt 
        : parseFloat(String(rawAmt || '0').replace(/[^0-9.-]/g, ''));

      if (isNaN(cleanAmt) || cleanAmt === 0) continue;

      const rawCode = String(row[codeIdx !== -1 ? codeIdx : 0] || '-').trim();
      const rawName = String(row[nameIdx !== -1 ? nameIdx : 2] || '미분류과목').trim();
      const rawProject = projectIdx !== -1 ? String(row[projectIdx] || '').trim() : '';
      const rawDept = deptIdx !== -1 ? String(row[deptIdx] || '').trim() : '';
      const memo = memoIdx !== -1 ? String(row[memoIdx] || '').trim() : '';
      const rawClient = clientIdx !== -1 ? String(row[clientIdx] || '').trim() : '';

      // 일자 변환
      let date = '';
      if (dateIdx !== -1) {
        const dVal = row[dateIdx];
        if (typeof dVal === 'number' && dVal > 40000 && dVal < 55000) {
          const jsDate = new Date((dVal - 25569) * 86400 * 1000);
          date = jsDate.toISOString().substring(0, 10);
        } else if (typeof dVal === 'string') {
          const m = dVal.match(/\d{4}-\d{2}-\d{2}/);
          if (m) date = m[0];
        }
      }

      // 소계, 합계, 총계, 누계 등 요약 행 자동 필터링 (중복 뻥튀기 원천 방어)
      const isSummaryRow = 
        rawName.includes('소계') || rawName.includes('합계') || rawName.includes('총계') || rawName.includes('누계') ||
        rawCode.includes('소계') || rawCode.includes('합계') || rawCode.includes('총계') ||
        memo.includes('합계') || memo.includes('월계');
      if (isSummaryRow) continue;

      // 전사 원장 시트인 경우 레저사업본부 및 레저 업장 데이터만 필터링 (Bell-operation 특수 규칙 절대 준수)
      if (hasMultipleDivisions) {
        const isOtherDivision = 
          rawDept.includes('골프') || rawDept.includes('리조트') || rawDept.includes('경영지원') || 
          rawDept.includes('지원본부') || rawDept.includes('개발') || rawDept.includes('세일즈') || 
          rawDept.includes('콘텐츠') || rawDept.includes('골재') || rawDept === '공통';
        
        const combined = `${rawDept} ${rawProject} ${memo}`.toLowerCase();
        const isLeisureKeyword = 
          rawDept.includes('레저') || 
          combined.includes('목장') || 
          combined.includes('미디어') || 
          combined.includes('카트') || 
          combined.includes('마리나') || 
          combined.includes('썰매') ||
          combined.includes('루지') ||
          combined.includes('얼룩말') ||
          combined.includes('액티비티') ||
          combined.includes('디지털');

        if (isOtherDivision && !isLeisureKeyword) continue;
      }

      // 4대 팀 및 백엔드 영업장 연결, 6대 비목 & 초등학생도 이해하는 쉬운 한글 항목 도출
      const effectiveDept = rawProject || rawDept || '본부공통';
      const { team: assignedTeam, venue: assignedVenue } = linkVenueAndTeam(rawProject, rawDept, memo);
      const assignedCategory = inferAccountCategory(rawCode, rawName);
      const { category: friendlyCategory } = makeFriendlyCategory(rawCode, rawName, memo, rawClient);

      rows.push({
        date,
        accountCode: rawCode,
        accountName: rawName,
        macroCategory: macroIdx !== -1 ? String(row[macroIdx] || assignedCategory).trim() : assignedCategory,
        rawDepartment: effectiveDept,
        amount: Math.round(cleanAmt),
        memo,
        clientName: rawClient,
        assignedTeam,
        assignedVenue,
        assignedCategory,
        friendlyCategory,
      });
    }

    return NextResponse.json({
      success: true,
      count: rows.length,
      rows,
      parsedUrl: csvUrl,
    });
  } catch (error: any) {
    console.error('Error fetching Google Sheet:', error);
    return NextResponse.json(
      { success: false, error: `구글 스프레드시트 연동 중 오류 발생: ${error.message}` },
      { status: 500 }
    );
  }
}
