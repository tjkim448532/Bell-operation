import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1fnoiG8gTRqZJlMFZ_DLYX3Ac_ROgofXbWKbhEJVRkso/edit?usp=sharing';

function extractGoogleSheetCsvUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  if (trimmed.includes('gviz/tq?tqx=out:csv') || trimmed.includes('/pub?output=csv')) {
    return trimmed;
  }
  const docMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (docMatch && docMatch[1]) {
    const sheetId = docMatch[1];
    const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  }
  return trimmed;
}

const SPECIES_CATEGORY_MAP: Record<string, { group: string; icon: string }> = {
  '셔틀랜드 포니': { group: '포니 / 승용마', icon: '🐴' },
  '아메리카 포니': { group: '포니 / 승용마', icon: '🐴' },
  '미니어쳐말': { group: '포니 / 승용마', icon: '🐴' },
  '한라마': { group: '포니 / 승용마', icon: '🐴' },
  '면양': { group: '초식 / 가축', icon: '🐑' },
  '염소': { group: '초식 / 가축', icon: '🐐' },
  '토끼': { group: '초식 / 가축', icon: '🐇' },
  '미니돼지': { group: '초식 / 가축', icon: '🐖' },
  '거위': { group: '조류 / 앵무새', icon: '🪿' },
  '오리': { group: '조류 / 앵무새', icon: '🦆' },
  '닭': { group: '조류 / 앵무새', icon: '🐔' },
  '공작': { group: '조류 / 앵무새', icon: '🦚' },
  '황금계': { group: '조류 / 앵무새', icon: '🦜' },
  '은계': { group: '조류 / 앵무새', icon: '🦜' },
  '백한': { group: '조류 / 앵무새', icon: '🦜' },
  '사랑앵무': { group: '조류 / 앵무새', icon: '🦜' },
  '할리퀸 마카우': { group: '조류 / 앵무새', icon: '🦜' },
  '뉴기니아앵무새': { group: '조류 / 앵무새', icon: '🦜' },
  '보더콜리': { group: '양몰이견 (보더콜리)', icon: '🐕' },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('sheetUrl') || DEFAULT_SHEET_URL;
    const csvUrl = extractGoogleSheetCsvUrl(targetUrl);

    const fetchRes = await fetch(csvUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,*/*',
      },
    });

    if (!fetchRes.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `구글 스프레드시트에 접근할 수 없습니다 (HTTP ${fetchRes.status}). 링크 공유 권한이 '링크가 있는 모든 사용자에게 공개(뷰어)'로 설정되어 있는지 확인해 주세요.` 
        },
        { status: 502 }
      );
    }

    const csvText = await fetchRes.text();
    if (!csvText || csvText.length < 10) {
      return NextResponse.json(
        { success: false, error: '구글 스프레드시트에서 비어 있는 데이터가 반환되었습니다.' },
        { status: 502 }
      );
    }

    const wb = XLSX.read(csvText, { type: 'string' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (!rawRows || rawRows.length < 2) {
      return NextResponse.json(
        { success: false, error: '구글 스프레드시트에 유효한 데이터 행이 없습니다.' },
        { status: 502 }
      );
    }

    // 헤더 행 탐색
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      const rowStr = (rawRows[i] || []).join(' ');
      if (rowStr.includes('동물 종류') || rowStr.includes('이름') || rowStr.includes('건강 상태')) {
        headerIdx = i;
        break;
      }
    }

    const dataRows = rawRows.slice(headerIdx + 1);
    const animals = dataRows
      .filter((r) => r && (r[1] || r[2])) // 동물 종류나 이름이 존재하는 행만
      .map((r, index) => {
        const no = r[0] !== undefined && r[0] !== null && r[0] !== '' ? String(r[0]).trim() : String(index + 1);
        const species = r[1] ? String(r[1]).trim() : '미분류';
        const name = r[2] ? String(r[2]).trim() : '';
        const gender = r[3] ? String(r[3]).trim() : '';
        const age = r[4] ? String(r[4]).trim() : '';
        const admissionDate = r[5] ? String(r[5]).trim() : '';
        const source = r[6] ? String(r[6]).trim() : '';
        const healthStatus = r[7] ? String(r[7]).trim() : '';
        const vaccination = r[8] ? String(r[8]).trim() : '';
        const specialNotes = r[9] ? String(r[9]).trim() : '';
        const keeper = r[10] ? String(r[10]).trim() : '';
        const photo = r[11] ? String(r[11]).trim() : '';
        const notes = r[12] ? String(r[12]).trim() : '';

        const meta = SPECIES_CATEGORY_MAP[species] || { group: '기타 동물', icon: '🐾' };

        return {
          no,
          species,
          name,
          gender,
          age,
          admissionDate,
          source,
          healthStatus,
          vaccination,
          specialNotes,
          keeper,
          photo,
          notes,
          categoryGroup: meta.group,
          categoryIcon: meta.icon,
        };
      });

    // 통계 집계
    const uniqueSpecies = Array.from(new Set(animals.map((a) => a.species)));
    const healthyCount = animals.filter((a) => a.healthStatus.includes('양호')).length;
    const borderCollieCount = animals.filter((a) => a.species === '보더콜리').length;
    const horseCount = animals.filter((a) => a.categoryGroup === '포니 / 승용마').length;

    // 카테고리별 두수/항목 수
    const groupCounts: Record<string, number> = {};
    animals.forEach((a) => {
      groupCounts[a.categoryGroup] = (groupCounts[a.categoryGroup] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      sheetUrl: targetUrl,
      lastSync: new Date().toISOString(),
      stats: {
        totalEntries: animals.length,
        totalSpecies: uniqueSpecies.length,
        healthyCount,
        borderCollieCount,
        horseCount,
        groupCounts,
      },
      animals,
    });
  } catch (error: any) {
    console.error('Error fetching ranch animal sheet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || '구글 시트 동기화 처리 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
