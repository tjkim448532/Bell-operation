import fs from 'fs';
import * as admin from 'firebase-admin';

const envContent = fs.readFileSync('E:/앱/Bell-operation/.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1');
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}
const db = admin.firestore();


async function run() {
  const expSnapshot = await db.collection('expenses')
    .where('month', '>=', '2026-01')
    .where('month', '<=', '2026-06')
    .get();

  const filtersSnapshot = await db.collection('expense_filters').get();
  const excludedExpenseTerms: string[] = [];
  filtersSnapshot.forEach(doc => excludedExpenseTerms.push(doc.data().term));

  const leisureTeams = new Set(['본부팀', '목장', '액티비티', '디지털지원팀', '놀이동산', '미디어아트센터']);
  const allKnownTeams = new Set(['본부팀', '목장', '액티비티', '디지털지원팀', '놀이동산', '미디어아트센터', '객실', 'FNB본부', '골프', '경영지원']);

  let droppedByFilter = 0;
  let droppedByNonLeisure = 0;

  const droppedItems: any[] = [];

  expSnapshot.forEach(doc => {
    const data = doc.data();
    const amount = Number(data.amount) || 0;
    
    const originalTerm = String(data.mapped_term || '');
    const description = String(data.description || '');
    const project = String(data.assigned_project || '');
    const dept = String(data.department || '');
    
    const isExcluded = excludedExpenseTerms.some(filter => 
      originalTerm.includes(filter) || description.includes(filter) || project.includes(filter) || dept.includes(filter)
    );

    if (isExcluded) {
      droppedByFilter += amount;
      droppedItems.push({
        reason: '단어 필터링',
        team: data.team || '기타',
        amount,
        project: project,
        desc: description,
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : ''
      });
      return;
    }

    let team = data.team || '기타';
    const isKnownNonLeisure = allKnownTeams.has(team) && !leisureTeams.has(team) && team !== '기타' && team !== '제외' && team !== '미분류';
    if (isKnownNonLeisure) {
      droppedByNonLeisure += amount;
      droppedItems.push({
        reason: `타 본부 (${team})`,
        team,
        amount,
        project: project,
        desc: description,
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : ''
      });
      return;
    }
  });

  // Generate Markdown
  let md = `# 필터링된 지출 내역 (약 821만 원)\n\n`;
  md += `- **단어 필터링에 의해 제외된 금액**: ${droppedByFilter.toLocaleString()}원\n`;
  md += `- **타 본부(레저 외) 소속이라 제외된 금액**: ${droppedByNonLeisure.toLocaleString()}원\n`;
  md += `- **총 제외 금액**: ${(droppedByFilter + droppedByNonLeisure).toLocaleString()}원\n\n`;
  
  md += `| 필터링 사유 | 날짜 | 금액 | 배정된 프로젝트명 | 적요 및 설명 | 원래 팀 |\n`;
  md += `|---|---|---|---|---|---|\n`;
  
  droppedItems.sort((a, b) => b.amount - a.amount).forEach(item => {
    md += `| ${item.reason} | ${item.date} | ${item.amount.toLocaleString()}원 | ${item.project} | ${item.desc} | ${item.team} |\n`;
  });

  const outPath = 'C:/Users/RESOLVE_01/.gemini/antigravity/brain/ed70e1a8-0e26-4145-865a-bf0ed0fac175/dropped_expenses_report.md';
  fs.writeFileSync(outPath, md, 'utf-8');
  console.log(`Report generated at: ${outPath}`);
  console.log(`Total dropped: ${droppedByFilter + droppedByNonLeisure}`);
}

run().catch(console.error);
