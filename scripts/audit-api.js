import fetch from 'node-fetch';

const ENDPOINTS = [
    { url: 'https://belleforet-data.vercel.app/api/v6/dashboard/revenue-summary?startDate=2026-09-01&endDate=2026-09-04', name: 'V6 통합 실적 Summary API (Live)' },
];

async function runAudit() {
    console.log('단위 테스트 시작: 프론트엔드 API 전수 검사 (SSOT 기준)\n' + '-'.repeat(50));
    let hasError = false;

    for (const api of ENDPOINTS) {
        console.log('[Testing] ' + api.name + ' (' + api.url + ')');
        try {
            const res = await fetch(api.url);
            
            if (!res.ok) {
                console.error('  ❌ [FAIL] HTTP Status: ' + res.status);
                hasError = true;
                continue;
            }
            
            let json = await res.json();
            
            if (json.success === false || json.status >= 400) {
                console.error('  ❌ [FAIL] Backend returned error');
                hasError = true;
                continue;
            }

            json = json.data || json;

            if (!json.summary || typeof json.summary.totalRevenue !== 'number') {
                console.error('  ❌ [FAIL] 누락된 필수 집계 필드 존재 (summary.totalRevenue)');
                hasError = true;
            }

            if (json.summary.trevPar === undefined) {
                console.error('  ❌ [FAIL] 누락된 TrevPAR 필드 존재');
                hasError = true;
            }

            if (typeof json.summary.availableRooms !== 'number') {
                console.error('  ❌ [FAIL] availableRooms 필드 누락 또는 숫자 타입이 아님');
                hasError = true;
            }

            if (!Array.isArray(json.salesByCategory)) {
                console.error('  ❌ [FAIL] salesByCategory 배열 누락');
                hasError = true;
            }

            if (!hasError) console.log('  ✅ [PASS] 모든 검증 통과');

        } catch (err) {
            console.error('  ❌ [FAIL] Network/Parse Error: ' + err.message);
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
