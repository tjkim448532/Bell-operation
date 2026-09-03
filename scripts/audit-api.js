import fetch from 'node-fetch';

const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const ENDPOINTS = [
    { url: `${API_BASE}/v6/dashboard/revenue-by-org?startDate=2026-09-01&endDate=2026-09-03`, name: 'V6 경영 조직도 기반 매출 조회 API' },
];

const MASTER_VENUE_COUNT = 38; 

async function runAudit() {
    console.log('단위 테스트 시작: 프론트엔드 API 전수 검사\n' + '-'.repeat(50));
    let hasError = false;

    for (const api of ENDPOINTS) {
        console.log(`[Testing] ${api.name} (${api.url})`);
        try {
            const res = await fetch(api.url);
            
            if (!res.ok) {
                console.error(`  ❌ [FAIL] HTTP Status: ${res.status}`);
                hasError = true;
                continue;
            }
            
            const json = await res.json();
            const data = json.data || json; 

            // 2. 최상단 필수 키값 검증 (SSOT 롤업) - MTD_total / YTD_total 은 공식 스펙에 없음!
            if (!('grandTotal' in data)) {
                console.error(`  ❌ [FAIL] 누락된 필수 집계 필드 존재 (grandTotal)`);
                hasError = true;
            }

            let venueCount = 0;
            const divisions = data.divisions || [];
            
            divisions.forEach(div => {
                if (!('subtotal' in div)) {
                    console.error(`  ❌ [FAIL] 누락된 본부별 소계 필드 존재 (subtotal)`);
                    hasError = true;
                }

                div.venues.forEach(venue => {
                    venueCount++;
                    if (typeof venue.revenue !== 'number' || isNaN(venue.revenue)) {
                        console.error(`  ❌ [FAIL] 데이터 타입 오류: ${venue.venueName}의 revenue 값이 숫자가 아님`);
                        hasError = true;
                    }
                });
            });

            if (venueCount < MASTER_VENUE_COUNT) {
                console.error(`  ❌ [FAIL] 영업장 누락 발생. 예상: ${MASTER_VENUE_COUNT}개, 실제 수신: ${venueCount}개 (0원 데이터 스킵 오류 의심)`);
                hasError = true;
            }

            if (!hasError) console.log(`  ✅ [PASS] 모든 검증 통과`);

        } catch (err) {
            console.error(`  ❌ [FAIL] Network/Parse Error: ${err.message}`);
            hasError = true;
        }
        console.log('-'.repeat(50));
    }

    if (hasError) {
        console.error('🚨 API 무결성 검증 실패. 에러 로그를 확인하십시오.');
        process.exit(1);
    } else {
        console.log('✅ 전 구간 API 데이터 무결성 검증 완료.');
        process.exit(0);
    }
}

runAudit();
