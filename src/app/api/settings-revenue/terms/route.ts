import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    const cookieHeader = request.headers.get('cookie') || '';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr1 = yesterday.toISOString().split('T')[0];

    const lastMonth = new Date(yesterday.getFullYear(), yesterday.getMonth(), 0);
    const dateStr2 = lastMonth.toISOString().split('T')[0];

    const uniqueTerms = new Set<string>();

    const fetchTerms = async (dateStr: string) => {
      try {
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${dateStr}`;
        const res = await fetch(revUrl, {
          headers: { 'Cookie': cookieHeader, 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          const apiData = json.data || json;
          const daysData = Array.isArray(apiData) ? apiData.map((d: any) => d.data || d) : [apiData];
          if (daysData.length > 0) {
            const day = daysData[daysData.length - 1];
            const salesByFacility = day.salesByFacility || day.sales_by_facility || [];
            salesByFacility.forEach((item: any) => {
              if (!item) return;
              const term = String(item.subGroupName || item.sub_group_name || item.facilityName  || item.shopName  || item.categoryName  || item.categoryCode  || '').trim();
              if (term) uniqueTerms.add(term);
            });
          }
        }
      } catch (e) {
        console.error(`Failed to fetch terms for ${dateStr}:`, e);
      }
    };

    await Promise.all([fetchTerms(dateStr1), fetchTerms(dateStr2)]);

    const termsArray = Array.from(uniqueTerms).sort();
    return NextResponse.json(termsArray);
  } catch (error) {
    console.error('Failed to fetch revenue terms:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue terms' }, { status: 500 });
  }
}
