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

    const headers = (data[headerRowIdx] || []).map((h: any) => String(h || '').trim());
    const codeIdx = headers.findIndex((h) => h.includes('코드') && !h.includes('거래처'));
    const nameIdx = headers.findIndex((h) => h.includes('과목') || h.includes('계정명') || h.includes('차변계정과목'));
    const macroIdx = headers.findIndex((h) => h.includes('비목') || h.includes('대분류') || h.includes('구분'));
    const projectIdx = headers.findIndex((h) => h.includes('프로젝트') || h.includes('영업장'));
    const deptIdx = headers.findIndex((h) => h.includes('부서') || h.includes('사용부서') || h.includes('팀'));
    const amountIdx = headers.findIndex((h) => h.includes('금액') || h.includes('차변금액') || h.includes('실적') || h.includes('비용'));
    const memoIdx = headers.findIndex((h) => h.includes('적요') || h.includes('내용') || h.includes('비고'));
    const clientIdx = headers.findIndex((h) => h.includes('거래처명') || h.includes('거래처'));

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

      // 4대 팀 및 백엔드 영업장 연결, 6대 비목 & 초등학생도 이해하는 쉬운 한글 항목 도출
      const effectiveDept = rawProject || rawDept || '본부공통';
      const { team: assignedTeam, venue: assignedVenue } = linkVenueAndTeam(rawProject, rawDept, memo);
      const assignedCategory = inferAccountCategory(rawCode, rawName);
      const { category: friendlyCategory } = makeFriendlyCategory(rawCode, rawName, memo, rawClient);

      rows.push({
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
