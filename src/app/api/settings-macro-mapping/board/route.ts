import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Fetch current macro mappings
    const mappingsSnapshot = await db.collection('expense_macro_mappings').get();
    const mappingDict: Record<string, string> = {};
    mappingsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.rawCategory && data.macroCategory) {
        mappingDict[data.rawCategory] = data.macroCategory;
      }
    });

    // 2. Fetch all unique mapped_terms from expenses
    const uniqueTerms = new Set<string>();
    
    const expensesSnapshot = await db.collection('expenses').get();
    expensesSnapshot.forEach((doc: any) => {
      const data = doc.data();
      // We strictly want to group by mapped_term (계정과목) for macro-categories
      const term = data.mapped_term;
      if (term && term !== '0') {
        uniqueTerms.add(String(term).trim());
      }
    });

    // 3. Group by macro category
    const board: Record<string, string[]> = {};
    
    // Default columns
    ['미분류(기타)', '인건비', '운영비', '마케팅비', '관리비'].forEach(t => {
      board[t] = [];
    });

    uniqueTerms.forEach(term => {
      let macroCat = mappingDict[term] || '미분류(기타)';
      
      if (!board[macroCat]) {
        board[macroCat] = []; // Dynamically support any new macro category
      }
      board[macroCat].push(term);
    });

    // 4. Also add any explicit mappings that might not be in the database yet
    Object.keys(mappingDict).forEach(term => {
      let macroCat = mappingDict[term];
      if (!board[macroCat]) board[macroCat] = [];
      if (!board[macroCat].includes(term)) {
        board[macroCat].push(term);
      }
    });

    return NextResponse.json(board);
  } catch (error: any) {
    console.error('Failed to fetch macro board data:', error);
    return NextResponse.json({ error: 'Failed to fetch board data', details: error.message }, { status: 500 });
  }
}
