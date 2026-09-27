#!/usr/bin/env node

/**
 * 🚨 [DATA INTEGRITY GUARD] 벨포레 대시보드 및 운영 앱 무결성 자동 검증 스크립트
 * 
 * 목적:
 * 프론트엔드 코드베이스 내에 임의의 가짜 숫자, 하드코딩된 단가/매출/퍼센트,
 * 임의의 방어적 폴백 상수(|| [숫자]), 정적 승수(* 45000 등)가 유입되는 것을
 * 물리적으로 차단하고 빌드 및 커밋을 즉시 거부(Exit 1)합니다.
 */

const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next' && file !== 'dist' && file !== 'archive') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
const violations = [];

// 검사 제외 파일 (공식 DB 스냅샷 시드 및 타입 정의)
const EXCLUDED_FILES = [
  'reports-v2.ts',
  'expenseMeta.ts'
];

files.forEach(filePath => {
  const relPath = path.relative('.', filePath);
  const fileName = path.basename(filePath);

  if (EXCLUDED_FILES.includes(fileName)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const l = line.trim();
    const lineNum = idx + 1;

    // 주석 및 임포트, 인터페이스는 제외
    if (l.startsWith('//') || l.startsWith('/*') || l.startsWith('*')) return;
    if (l.startsWith('import ') || l.startsWith('export interface') || l.startsWith('interface ') || l.startsWith('type ')) return;

    // 인라인 주석 제거 후 실제 코드만 검사
    const codeOnly = l.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
    if (!codeOnly) return;

    // 1. 임의 숫자 폴백 검사: || [2-9]\d+ 또는 || \d{3,}
    // 허용: 년도(|| 2024, || 2025, || 2026), ms 단위(|| 1000), 1년 일수(|| 365), 타임아웃, 포트번호
    const fallbackMatch = codeOnly.match(/\|\|\s*([2-9]\d+|[1-9]\d{2,})/);
    if (fallbackMatch) {
      const isAllowed = 
        codeOnly.includes('Year') || codeOnly.includes('year') || 
        codeOnly.includes('1000') || codeOnly.includes('365') || codeOnly.includes('3600') ||
        codeOnly.includes('timeout') || codeOnly.includes('PORT') || codeOnly.includes('limit');

      if (!isAllowed) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'Arbitrary Numeric Fallback (|| [숫자] 사용 금지)',
          code: codeOnly
        });
      }
    }

    // 2. JSX 내 하드코딩된 원화 금액 검사 (₩150,000, 150000원 등)
    // 허용: { ... } 바인딩, formatCurrency, toLocaleString, 헤더 라벨("100만원당")
    const wonMatch = codeOnly.match(/(?:₩|\\)\s*[1-9]\d{1,}(?:,\d{3})+|\d{2,4}만\s*원|\d{1,3}(?:,\d{3})+\s*원/);
    if (wonMatch) {
      const isAllowed = 
        codeOnly.includes('{') || codeOnly.includes('}') || 
        codeOnly.includes('placeholder') || codeOnly.includes('100만원당') ||
        codeOnly.includes('formatCurrency') || codeOnly.includes('formatFinancial') || codeOnly.includes('toLocaleString') ||
        codeOnly.includes('formatNumber');

      if (!isAllowed) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'Hardcoded Currency String in JSX (고정 금액 텍스트 삽입 금지)',
          code: codeOnly
        });
      }
    }

    // 3. JSX 내 하드코딩된 정적 퍼센트 검사 (>64.0%< 등)
    const pctMatch = codeOnly.match(/>\s*[+-]?\d+\.\d+%\s*</);
    if (pctMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Hardcoded Static Percentage in JSX (고정 퍼센트 삽입 금지)',
        code: codeOnly
      });
    }

    // 4. 가짜 승수 계산 검사 (* 45000, * 175000 등)
    const multMatch = codeOnly.match(/\*\s*(?:45000|175000|680000|27500|55000|150000|142500)/);
    if (multMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Synthetic Multiplier Estimation (가짜 단가 승수 곱셈 금지)',
        code: codeOnly
      });
    }

    // 5. 가짜 Mock 변수 선언 검사 (const MOCK_ = ... 등)
    const mockVarMatch = codeOnly.match(/const\s+(?:MOCK_|DUMMY_|INITIAL_MOCK|fake[A-Z0-9_]*|dummy[A-Z0-9_]*)\s*=/i);
    if (mockVarMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Mock / Dummy Constant Declaration (더미/목업 상수 선언 금지)',
        code: codeOnly
      });
    }

    // 6. 가짜 단가 및 객실 인벤토리/정원 프록시 승수 검사 (baseUnitPrice: 20000, * 4 정원 곱셈 등)
    const proxyMultiplierMatch = codeOnly.match(/(?:totalRoomsSold|summaryRoomsSold)\s*\*\s*4|175\s*\*\s*(?:safeDays|days|safeRangeDays)|baseUnitPrice\s*:\s*[1-9]\d+/);
    if (proxyMultiplierMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Synthetic Capacity / Unit Price Estimation (가짜 정원/단가/객실 승수 금지)',
        code: codeOnly
      });
    }

    // 7. 가짜 주중/주말 캘린더 안분 및 왜곡 폴백 검사 (weekdayRatio, totalGolfRev / visitedPlayers, >과반 점유< 등)
    const calendarProxyMatch = codeOnly.match(/weekdayRatio\s*=|totalGolfRev\s*\/\s*visitedPlayers|>과반 점유</);
    if (calendarProxyMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Synthetic Proxy Ratio / Fake Green Fee / Mockup Label (가짜 캘린더 안분/단가 왜곡/목업 라벨 금지)',
        code: codeOnly
      });
    }

    // 8. 가짜 키워드 휴리스틱, 탑승인원 배수 추정, 하드코딩된 시간대 안내 검사 (Rule 8)
    const heuristicMatch = codeOnly.match(/name\.includes\(['"]2인승['"]\)\s*\?\s*2|confidence:\s*85|selectedMonth\s*===?\s*['"]number['"]\s*\?\s*[^:]+:\s*7\b|name\.includes\(['"](?:스마트스코어|골프몬|골프락)['"]\)\s*\?\s*['"][1-3]부/);
    if (heuristicMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Fake Keyword Heuristics / Passenger Multipliers / Guess Time Hints (가짜 키워드 추론/탑승인원 배수/티타임 임의추측 금지)',
        code: codeOnly
      });
    }
  });
});

console.log('='.repeat(80));
console.log('🛡️  [DATA INTEGRITY GUARD] 벨포레 전수 무결성 검증 (Zero-Fake Numbers Audit)');
console.log('='.repeat(80));

if (violations.length > 0) {
  console.error(`\n❌ [FATAL INTEGRITY VIOLATION] 가짜 숫자 및 임의 폴백 위반 ${violations.length}건 적발!\n`);
  violations.forEach((v, i) => {
    console.error(`[위반 ${i + 1}] ${v.file}:${v.line}`);
    console.error(`   규칙: ${v.rule}`);
    console.error(`   코드: ${v.code.substring(0, 100)}`);
    console.error('-'.repeat(80));
  });
  console.error('\n🚨 빌드 및 커밋이 차단되었습니다! 모든 임의의 숫자와 가짜 데이터를 0 또는 실시간 API 데이터로 수정하십시오.\n');
  process.exit(1);
} else {
  console.log(`\n✅ 검사 완료: src/ 내 ${files.length}개 파일 전수 검증 통과!`);
  console.log('💎 가짜 숫자, 하드코딩된 단가, 임의의 숫자 폴백이 0건(Clean Zero)입니다.\n');
  process.exit(0);
}
