import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

function inferCorrectMonth(docData: any): string | null {
  const currentYear = String(new Date().getFullYear());

  // 1. Check attr_month
  const attrMonth = String(docData.attr_month || '').trim();
  if (attrMonth) {
    const num = attrMonth.replace(/[^0-9]/g, '');
    if (num.length >= 6) {
      return `${num.slice(0, 4)}-${num.slice(4, 6)}`;
    } else if (num.length >= 1 && num.length <= 2) {
      const m = num.padStart(2, '0');
      if (Number(m) >= 1 && Number(m) <= 12) {
        return `${currentYear}-${m}`;
      }
    }
  }

  // 2. Check mapped_rule (contains sheet name e.g. [시트: 1월], [시트: 06월], [시트: 2026.02])
  const rule = String(docData.mapped_rule || '');
  const sheetMatch = rule.match(/\[시트:\s*([^\]]+)\]/);
  if (sheetMatch) {
    const sheetName = sheetMatch[1].trim();
    const snMatch = sheetName.match(/(20\d{2}|\d{2})?[-._]?([0-1]?[0-9])월?/);
    if (snMatch && snMatch[2]) {
      const y = snMatch[1] ? (snMatch[1].length === 2 ? `20${snMatch[1]}` : snMatch[1]) : currentYear;
      const m = snMatch[2].padStart(2, '0');
      if (Number(m) >= 1 && Number(m) <= 12) {
        return `${y}-${m}`;
      }
    }
  }

  // 3. Check source_file filename
  const sf = String(docData.source_file || '');
  if (sf) {
    const fnMatch = sf.match(/(20\d{2}|\d{2})[-._]?(0[1-9]|1[0-2])/);
    if (fnMatch) {
      const y = fnMatch[1].length === 2 ? `20${fnMatch[1]}` : fnMatch[1];
      return `${y}-${fnMatch[2].padStart(2, '0')}`;
    }
  }

  // 4. Check description or terms (e.g. '1월분', '6월 급여', '2026.03')
  const desc = String(docData.description || '') + ' ' + String(docData.original_term || '');
  const descMatch = desc.match(/([1-9]|1[0-2])월\s*(분|급여|사용|정산|비용|지출)/);
  if (descMatch && descMatch[1]) {
    const m = descMatch[1].padStart(2, '0');
    return `${currentYear}-${m}`;
  }

  // 5. Check if date has a timestamp with specific month
  if (docData.date) {
    try {
      let dStr = '';
      if (typeof docData.date === 'string') dStr = docData.date;
      else if (docData.date.toDate) dStr = docData.date.toDate().toISOString();
      else if (docData.date instanceof Date) dStr = docData.date.toISOString();
      
      if (dStr && dStr.length >= 7) {
        const extracted = dStr.slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(extracted)) {
          return extracted;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return null;
}

export async function GET() {
  try {
    const collections = ['expenses', 'common_expenses'];
    let totalScanned = 0;
    let totalUpdated = 0;
    const monthStatsBefore: Record<string, { count: number; sum: number }> = {};
    const monthStatsAfter: Record<string, { count: number; sum: number }> = {};

    for (const col of collections) {
      const snap = await db.collection(col).get();
      totalScanned += snap.size;

      const batches: any[] = [];
      let currentBatch = db.batch();
      let batchOps = 0;

      snap.forEach((doc: any) => {
        const data = doc.data();
        const curMonth = String(data.month || 'unknown');
        const amt = Number(data.amount) || 0;

        // Stats before
        if (!monthStatsBefore[curMonth]) monthStatsBefore[curMonth] = { count: 0, sum: 0 };
        monthStatsBefore[curMonth].count++;
        monthStatsBefore[curMonth].sum += amt;

        const correctMonth = inferCorrectMonth(data);
        const targetMonth = correctMonth || curMonth;

        // Stats after
        if (!monthStatsAfter[targetMonth]) monthStatsAfter[targetMonth] = { count: 0, sum: 0 };
        monthStatsAfter[targetMonth].count++;
        monthStatsAfter[targetMonth].sum += amt;

        if (correctMonth && correctMonth !== curMonth) {
          currentBatch.update(doc.ref, { month: correctMonth });
          batchOps++;
          totalUpdated++;

          if (batchOps === 400) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            batchOps = 0;
          }
        }
      });

      if (batchOps > 0) {
        batches.push(currentBatch);
      }

      for (const b of batches) {
        await b.commit();
      }
    }

    return NextResponse.json({
      success: true,
      totalScanned,
      totalUpdated,
      monthStatsBefore,
      monthStatsAfter,
      message: `총 ${totalScanned}개 전표 중 ${totalUpdated}개의 월별 귀속을 원래 발생 월로 자동 복구 완료하였습니다.`
    });
  } catch (error: any) {
    console.error('Error repairing expense months:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
