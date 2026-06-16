import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const snapshot = await db.collection('expenses').where('team', '==', '기타').get();
    const uniqueItems = new Set<string>();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.description) uniqueItems.add(data.description.trim());
      if (data.branch_name) uniqueItems.add(data.branch_name.trim());
      if (data.vendor) uniqueItems.add(data.vendor.trim());
    });

    return NextResponse.json({ items: Array.from(uniqueItems).filter(Boolean) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
