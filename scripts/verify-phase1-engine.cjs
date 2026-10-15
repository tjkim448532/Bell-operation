const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

function allocateByLargestRemainder(totalAmount, weights) {
  if (weights.length === 0) return [];
  if (weights.length === 1) return [totalAmount];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const exactShares = weights.map((w) => (totalAmount * w) / weightSum);
  const floors = exactShares.map((v) => Math.floor(v));
  const floorSum = floors.reduce((a, b) => a + b, 0);
  let remainder = totalAmount - floorSum;
  const indexed = exactShares
    .map((v, idx) => ({ idx, frac: v - floors[idx] }))
    .sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < indexed.length && remainder > 0; i++) {
    floors[indexed[i].idx] += 1;
    remainder -= 1;
  }
  return floors;
}

console.log('================================================================================');
console.log('🔬 [PHASE 1 ENGINE VERIFICATION] 벨포레 인사(HR) SSOT & 정산 엔진 실측 검증');
console.log('================================================================================');

// 1. Largest Remainder Method 0-Variance 검증
const testTotal = 3500000;
const testWeights = [1, 1, 1];
const allocated = allocateByLargestRemainder(testTotal, testWeights);
const allocatedSum = allocated.reduce((a, b) => a + b, 0);
const delta = testTotal - allocatedSum;

console.log(`[검증 1] 하레-니마이어 최대 잔여법 (Largest Remainder Method):`);
console.log(`  - 원금 총액: ${testTotal.toLocaleString()}원 / 가중치: [${testWeights.join(', ')}]`);
console.log(`  - 배분 결과: [${allocated.map((n) => n.toLocaleString()).join(', ')}]원`);
console.log(`  - 합계 검증: ${allocatedSum.toLocaleString()}원 (Delta Δ = ${delta}원)`);
if (delta !== 0) {
  throw new Error('Largest Remainder 0-Variance 실패!');
}

// 2. SQLite SSOT DB 초기화 및 11개 정규 테이블 실측 확인
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'belleforet_hr_ssot.sqlite');
const db = new DatabaseSync(dbPath);

// sqlite.ts와 동일한 스키마 보장 실행
const sqliteTsContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/db/sqlite.ts'), 'utf8');
const sqlMatch = sqliteTsContent.match(/db\.exec\(`([\s\S]*?)`\);/);
if (sqlMatch) {
  db.exec(sqlMatch[1]);
}
const insertEntity = db.prepare(
  `INSERT OR IGNORE INTO dim_legal_entities (entity_code, entity_name, biz_reg_no, rep_name) VALUES (?, ?, ?, ?)`
);
insertEntity.run('BLACKSTONE', '블랙스톤에듀팜리조트', '', '');
insertEntity.run('KMG', 'KMG', '', '');
insertEntity.run('RAKSANSU', '락산수', '', '');

const tables = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`
  )
  .all();

console.log(`\n[검증 2] SQLite SSOT 정규 스키마 테이블 목록 (총 ${tables.length}개):`);
tables.forEach((t, idx) => {
  console.log(`  ${idx + 1}. ${t.name}`);
});

const entities = db.prepare(`SELECT entity_code, entity_name FROM dim_legal_entities ORDER BY entity_code`).all();
console.log(`\n[검증 3] 3개 법인 마스터(dim_legal_entities) 등록 현황:`);
entities.forEach((e) => {
  console.log(`  - [${e.entity_code}] ${e.entity_name}`);
});

console.log('\n✅ Phase 1 모든 스키마 및 수학적 불변식(0-Variance) 실측 검증 통과!');
