import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

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

    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: '구글 시트 다운로드 실패. 공유 설정이 "링크가 있는 모든 사용자에게 공개" 인지 확인해주세요.' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // 헤더 행 찾기
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      if (jsonData[i].includes('일자') && jsonData[i].includes('객실번호')) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return NextResponse.json({ error: '데이터 양식을 인식할 수 없습니다. "일자", "객실번호" 등이 포함된 헤더를 찾지 못했습니다.' }, { status: 400 });
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
    const amountIdx = getColIdx(['합계', '금액']);
    const nightsIdx = getColIdx(['박수']);

    if (roomTypeIdx === -1 || amountIdx === -1) {
      return NextResponse.json({ error: '필수 열(객실타입, 합계)을 찾을 수 없습니다.' }, { status: 400 });
    }

    // 데이터 집계
    // 구조: { [roomType]: { totalRevenue: number, totalNights: number, markets: { [marketName]: { revenue: number, nights: number } } } }
    const results: Record<string, any> = {};
    let totalRevenue = 0;
    let totalNights = 0;

    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      const rawRoomType = row[roomTypeIdx] ? String(row[roomTypeIdx]).trim() : '미분류';
      if (!rawRoomType || String(row[0]).includes('합계')) continue;

      // 16평, 35평, 51평 등 핵심 평수만 추출
      let roomType = '기타 평형';
      if (rawRoomType.includes('16평')) roomType = '16평';
      else if (rawRoomType.includes('35평')) roomType = '35평';
      else if (rawRoomType.includes('51평')) roomType = '51평';
      else roomType = rawRoomType; // 매칭되지 않는 평수는 원본 유지

      const rawMarketType = marketTypeIdx !== -1 && row[marketTypeIdx] ? String(row[marketTypeIdx]).trim() : '미분류 마켓';
      const marketType = rawMarketType || '미분류 마켓';
      
      const rawAmount = String(row[amountIdx] || '0').replace(/,/g, '');
      const amount = parseFloat(rawAmount) || 0;

      const rawNights = nightsIdx !== -1 ? String(row[nightsIdx] || '0').replace(/,/g, '') : '0';
      const nights = parseFloat(rawNights) || 0;

      if (amount === 0) continue;

      if (!results[roomType]) {
        results[roomType] = { totalRevenue: 0, totalNights: 0, markets: {} };
      }
      if (!results[roomType].markets[marketType]) {
        results[roomType].markets[marketType] = { revenue: 0, nights: 0 };
      }

      results[roomType].totalRevenue += amount;
      results[roomType].totalNights += nights;
      results[roomType].markets[marketType].revenue += amount;
      results[roomType].markets[marketType].nights += nights;

      totalRevenue += amount;
      totalNights += nights;
    }

    return NextResponse.json({ 
      success: true, 
      data: results,
      summary: {
        totalRevenue,
        totalNights
      }
    });

  } catch (error: any) {
    console.error('Analyze Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
