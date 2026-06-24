import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');

    // Default to current month if not provided
    if (!startDate || !endDate) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      startDate = `${year}-${month}`;
      endDate = `${year}-${month}`;
    }

    let query: any = db.collection('room_data');
    if (startDate) query = query.where('month', '>=', startDate);
    if (endDate) query = query.where('month', '<=', endDate);

    const snapshot = await query.get();
    
    // Aggregate logic
    const results: Record<string, any> = {};
    let totalRevenue = 0;
    let totalNights = 0;

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const roomType = data.room_type || '기타 평형';
      const marketType = data.market_type || '미분류 마켓';
      const amount = data.amount || 0;
      const nights = data.nights || 0;

      if (amount === 0) return;

      if (!results[roomType]) {
        results[roomType] = { totalRevenue: 0, totalNights: 0, markets: {} };
      }
      if (!results[roomType].markets[marketType]) {
        results[roomType].markets[marketType] = { revenue: 0, nights: 0 };
      }

      results[roomType].totalRevenue += amount;
      results[roomType].totalNights += nights;
      results[roomType].markets[marketType].revenue += amount;
      results[roomType].markets[marketType].nights += nights;

      totalRevenue += amount;
      totalNights += nights;
    });

    return NextResponse.json({ 
      success: true, 
      data: results,
      summary: {
        totalRevenue,
        totalNights
      }
    });

  } catch (error: any) {
    console.error('Room Data Fetch Error:', error);
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
