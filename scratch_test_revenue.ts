import * as fs from 'fs';
import * as path from 'path';
import { parseRevenueBuffer } from './src/lib/parser';

async function run() {
  const dir = 'G:/내 드라이브/시너지 자료/매출구분별실적_전체매출집계';
  const files = ['매출 구분별 실적_1월부터3월.xlsx', '매출 구분별 실적_4월부터5월.xlsx'];
  
  for (const file of files) {
    console.log(`\n--- Parsing ${file} ---`);
    const filePath = path.join(dir, file);
    const buffer = fs.readFileSync(filePath);
    
    try {
      const records = await parseRevenueBuffer(buffer, file, {}, {});
      console.log(`Successfully parsed ${records.length} records.`);
      if (records.length > 0) {
        console.log('Sample Record:', records[0]);
        // Also print unique project names / teams
        const summary = records.reduce((acc: any, curr: any) => {
          const key = `${curr.assigned_project} -> ${curr.team}`;
          acc[key] = (acc[key] || 0) + curr.amount;
          return acc;
        }, {});
        console.log('Summary (Project -> Team):');
        for (const [k, v] of Object.entries(summary)) {
          console.log(`  ${k}: ${v}`);
        }
      }
    } catch (e: any) {
      console.error(`Failed to parse ${file}:`, e.message);
    }
  }
}

run();
