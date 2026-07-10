import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
    const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
    
    // Fetch today's data to get the active facility list
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${dateStr}`;
    const res = await fetch(revUrl, {
      headers: { 'Authorization': `Bearer ${m2mToken}` },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch V5 API');
    }
    
    const json = await res.json();
    const apiData = json.data || json;
    
    const salesByFacility = apiData.salesByFacility || apiData.sales_by_facility || [];
    
    // Extract Leisure Division ('티켓' category) subgroups
    const leisureSubgroups = new Set<string>();
    salesByFacility.forEach((item: any) => {
      const category = String(item.category_code || '').trim();
      const subGroup = String(item.sub_group_name || '').trim();
      if (category === '티켓' && subGroup) {
        leisureSubgroups.add(subGroup);
      }
    });
    
    return NextResponse.json({
      success: true,
      teams: Array.from(leisureSubgroups).sort()
    });
    
  } catch (error: any) {
    console.error('Error fetching leisure teams:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
