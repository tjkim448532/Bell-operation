#!/usr/bin/env node

/**
 * 🚨 [DATA INTEGRITY & FRANKENSTEIN DEFENSE GUARD]
 * 벨포레 인사(HR) 자동화 시스템 무결성 자동 검증 스크립트
 */

const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (
        file !== 'node_modules' &&
        file !== '.git' &&
        file !== '.next' &&
        file !== 'dist'
      ) {
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

files.forEach((filePath) => {
  const relPath = path.relative('.', filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const l = line.trim();
    const lineNum = idx + 1;

    if (l.startsWith('//') || l.startsWith('/*') || l.startsWith('*')) return;
    if (
      l.startsWith('import ') ||
      l.startsWith('export interface') ||
      l.startsWith('interface ') ||
      l.startsWith('type ')
    )
      return;

    const codeOnly = l
      .replace(/\/\/.*$/, '')
      .replace(/\/\*.*?\*\//g, '')
      .trim();
    if (!codeOnly) return;

    // 1. 임의 숫자 폴백 검사: || [2-9]\d+ 또는 || \d{3,}
    const fallbackMatch = codeOnly.match(/\|\|\s*([2-9]\d+|[1-9]\d{2,})/);
    if (fallbackMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Arbitrary Numeric Fallback (|| [숫자] 사용 금지)',
        code: codeOnly,
      });
    }

    // 2. JSX 내 하드코딩된 원화 금액 검사
    const wonMatch = codeOnly.match(
      /(?:₩|\\)\s*[1-9]\d{1,}(?:,\d{3})+|\d{2,4}만\s*원|\d{1,3}(?:,\d{3})+\s*원/
    );
    if (wonMatch) {
      const isAllowed =
        codeOnly.includes('{') ||
        codeOnly.includes('}') ||
        codeOnly.includes('placeholder') ||
        codeOnly.includes('formatNumber') ||
        codeOnly.includes('toLocaleString');
      if (!isAllowed) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: 'Hardcoded Currency String in JSX (고정 금액 텍스트 삽입 금지)',
          code: codeOnly,
        });
      }
    }

    // 3. JSX 내 하드코딩된 정적 퍼센트 검사
    const pctMatch = codeOnly.match(/>\s*[+-]?\d+\.\d+%\s*</);
    if (pctMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Hardcoded Static Percentage in JSX (고정 퍼센트 삽입 금지)',
        code: codeOnly,
      });
    }

    // 4. Mock / Dummy 상수 선언 검사
    const mockVarMatch = codeOnly.match(
      /const\s+(?:MOCK_|DUMMY_|INITIAL_MOCK|fake[A-Z0-9_]*|dummy[A-Z0-9_]*)\s*=/i
    );
    if (mockVarMatch) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Mock / Dummy Constant Declaration (더미/목업 상수 선언 금지)',
        code: codeOnly,
      });
    }

    // 5. 프론트엔드(.tsx) 내 .reduce( 합산 금지 (NO SLICE SUMMATION)
    if (filePath.endsWith('.tsx') && codeOnly.includes('.reduce(')) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'No Slice Summation on Frontend (.tsx 내 .reduce 합산 금지)',
        code: codeOnly,
      });
    }

    // 6. 임시/섀도우 테이블(_temp, _backup, _shadow) 및 RLIKE 정규식 추론 금지
    if (
      /\bRLIKE\b/i.test(codeOnly) ||
      /_(?:temp|backup|shadow)\b/i.test(codeOnly)
    ) {
      violations.push({
        file: relPath,
        line: lineNum,
        rule: 'Frankenstein Defense Violation (임시 테이블 또는 RLIKE 사용 금지)',
        code: codeOnly,
      });
    }
  });
});

console.log('='.repeat(80));
console.log(
  '🛡️  [DATA INTEGRITY & FRANKENSTEIN GUARD] 벨포레 인사(HR) 전수 무결성 검증'
);
console.log('='.repeat(80));

if (violations.length > 0) {
  console.error(
    `\n❌ [FATAL INTEGRITY VIOLATION] 무결성 규칙 위반 ${violations.length}건 적발!\n`
  );
  violations.forEach((v, i) => {
    console.error(`[위반 ${i + 1}] ${v.file}:${v.line}`);
    console.error(`   규칙: ${v.rule}`);
    console.error(`   코드: ${v.code.substring(0, 100)}`);
    console.error('-'.repeat(80));
  });
  process.exit(1);
} else {
  console.log(`\n✅ 검사 완료: src/ 내 ${files.length}개 파일 전수 검증 통과!`);
  console.log(
    '💎 가짜 숫자, 임의 폴백, 프론트엔드 reduce 합산, 임시 테이블/RLIKE가 0건(Clean Zero)입니다.\n'
  );
  process.exit(0);
}
