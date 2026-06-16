import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const snapshot = await db.collection('expenses').orderBy('date', 'desc').get();
    const allItems = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date,
        original_term: data.original_term,
        branch_name: data.branch_name || '',
        dept_name: data.dept_name || '',
        description: data.description || '',
        vendor: data.vendor || '',
        amount: data.amount || 0,
        team: data.team || '기타',
        assigned_project: data.assigned_project || '미분류 프로젝트',
        mapped_rule: data.mapped_rule || '알 수 없음',
      };
    });

    return NextResponse.json({ success: true, data: allItems });
  } catch (error) {
    console.error('Error fetching validation items:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch validation items' }, { status: 500 });
  }
}
