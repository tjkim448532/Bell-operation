import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'expense';
    const team = searchParams.get('team') || 'all';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // --- 백엔드 가이드: 반드시 YYYY-MM-DD 포맷을 사용해야 함 ---
    let apiStartDate = startDateStr;
    let apiEndDate = endDateStr;
    
    if (startDateStr && startDateStr.length === 7) {
      apiStartDate = `${startDateStr}-01`;
    }
    if (endDateStr && endDateStr.length === 7) {
      const [year, month] = endDateStr.split('-');
      // 해당 월의 마지막 날짜 구하기 (0을 넣으면 이전 달 마지막 날이 나옴)
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      apiEndDate = `${endDateStr}-${lastDay}`;
    }
    
    const collectionName = type === 'expense' ? 'expenses' : 'revenues';
    let query: any = db.collection(collectionName);
    
    // We will filter by team in memory to avoid needing a Firestore composite index.
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      let end = new Date(endDateStr);
      
      if (endDateStr.length === 7) {
        end.setUTCMonth(end.getUTCMonth() + 1);
        end = new Date(end.getTime() - 1);
      } else {
        end.setUTCHours(23, 59, 59, 999);
      }
      query = query.where('date', '>=', start).where('date', '<=', end);
    }
    
    // Get expense filters
    const expenseFilterSnapshot = await db.collection('expense_filters').get();
    const excludedExpenseTerms: string[] = [];
    expenseFilterSnapshot.forEach((doc: any) => {
      excludedExpenseTerms.push(doc.data().term);
    });

    // Get revenue filters
    const revenueFilterSnapshot = await db.collection('revenue_filters').get();
    const excludedRevenueTerms: string[] = [];
    revenueFilterSnapshot.forEach((doc: any) => {
      excludedRevenueTerms.push(doc.data().term);
    });

    let records: any[] = [];
    
    if (type !== 'revenue') {
      const snapshot = await query.get();
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();

        // Manual team filter
        if (team !== 'all' && data.team !== team) {
          return;
        }

        // Filter out excluded expenses
        if (type === 'expense') {
          const term1 = String(data.mapped_term || '');
          const term2 = String(data.original_term || '');
          const desc = String(data.description || '');
          const proj = String(data.assigned_project || data.branch_name || '');
          const dept = String(data.dept_name || '');

          const isExcluded = excludedExpenseTerms.some(filter => 
            term1.includes(filter) || term2.includes(filter) || desc.includes(filter) || proj.includes(filter) || dept.includes(filter)
          );
          if (isExcluded) return;
        }

        if (data.date && typeof data.date.toDate === 'function') {
          data.date = data.date.toDate().toISOString();
        }
        records.push({ id: doc.id, ...data });
      });
    }
    
    // --- Inject V5 MariaDB Revenues ---
    if (type === 'revenue' && startDateStr && endDateStr) {
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.belleforet.com';
        const cookieHeader = request.headers.get('cookie') || '';
        const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';

        // Fetch team_mappings
        const teamMappings: Record<string, string> = {};
        const mappingsSnapshot = await db.collection('team_mappings').get();
        mappingsSnapshot.forEach((doc: any) => {
          const d = doc.data();
          teamMappings[d.columnName] = d.teamName;
        });
        teamMappings['엑티비티(Summary)'] = '엑티비티';
        teamMappings['F&B(Summary)'] = 'F&B';
        teamMappings['골프(Summary)'] = '골프';
        teamMappings['객실(Summary)'] = '객실';

        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${apiEndDate}`;
        const res = await fetch(revUrl, {
          headers: { 'Cookie': cookieHeader, 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });

        let apiData: any;
        if (res.ok) {
          const json = await res.json();
          apiData = json.data || json;
        }

        if (team === 'debug') {
          return NextResponse.json({
            ok: res.ok,
            status: res.status,
            apiData: apiData
          });
        }

        let daysData: any[] = [];
        if (apiData) {
          daysData = Array.isArray(apiData) ? apiData.map((d: any) => d.data || d) : [apiData];
        }

        let breakdowns: any[] = [];
        if (daysData.length > 0) {
          const day = daysData[daysData.length - 1]; // [규칙 2 적용] 스냅샷 덮어쓰기 (배열 누적 방지)
          const dateStr = day.date || apiStartDate;

          // [V5 바이블 엄수] old V4 arrays (ticketFacilityBreakdown 등) 및 매핑 객체 전면 폐기
          const salesByFacility = day.salesByFacility || day.sales_by_facility || [];

          salesByFacility.forEach((item: any, idx: number) => {
            if (!item) return;
            let facility = String(item.facility_name || item.shop_name || item.sub_group_name || item.subGroupName || item.category_name || item.category_code || '').trim();
            
            // [중요] V5 API에서 해당 날짜 기준점의 총 누계(mtd_actual)를 스냅샷으로 제공합니다.
            let rawAmount = item.total_sales !== undefined ? item.total_sales : (item.mtd_actual !== undefined ? item.mtd_actual : (item.today_actual || item.total_amount || item.amount || item.revenue || item.totalRevenue || item.salesAmount));
            
            // Aggressive fallback to find any large number (revenue is usually large)
            if (rawAmount === undefined) {
              let maxNum = 0;
              try {
                for (const [k, v] of Object.entries(item)) {
                  if (typeof v === 'number' && v > 100000 && !k.includes('qty') && !k.includes('visitor')) {
                    maxNum = Math.max(maxNum, v);
                  } else if (typeof v === 'string') {
                    const parsed = Number(v.replace(/,/g, ''));
                    if (!isNaN(parsed) && parsed > 100000 && !k.includes('qty') && !k.includes('visitor')) {
                      maxNum = Math.max(maxNum, parsed);
                    }
                  }
                }
              } catch(e) {}
              rawAmount = maxNum;
            }

            // Robust parsing for string numbers like "12,000,000"
            let amount = 0;
            if (typeof rawAmount === 'string') {
              amount = Number(rawAmount.replace(/,/g, ''));
            } else if (typeof rawAmount === 'number') {
              amount = rawAmount;
            }
            if (isNaN(amount)) amount = 0;

            let mappedTerm = item.category_name || item.category_code || item.categoryCode || '기타 매출';
            if (String(mappedTerm).includes('티켓')) mappedTerm = '티켓 매출';
            else if (String(mappedTerm).includes('식음') || String(mappedTerm).includes('F&B')) mappedTerm = '식음 매출';
            else if (String(mappedTerm).includes('골프')) mappedTerm = '골프 매출';
            else if (String(mappedTerm).includes('객실')) mappedTerm = '객실 매출';

            let mappedTeam = teamMappings[facility] || item.team_name || item.part_name || item.category_name || item.category_code || '미분류';
            if (mappedTeam === '미분류') {
              const catStr = String(item.category_name || item.category_code || '');
              if (catStr.includes('골프')) mappedTeam = '골프';
              else if (catStr.includes('객실')) mappedTeam = '객실';
              else if (catStr.includes('식음') || catStr.includes('F&B')) mappedTeam = 'F&B';
            }

            // Apply manual team filter
            if (team === 'all' || mappedTeam === team) {
              records.push({
                id: `v5-${dateStr}-${facility}-${idx}`,
                team: mappedTeam,
                branch_name: String(item.category_name || item.category_code || item.part_name || item.facility_name || item.sub_group_name || '미분류(기타)').trim(),
                mapped_term: amount === 0 ? "RAW_JSON: " + JSON.stringify(item).substring(0, 800) : String(item.sub_group_name || item.facility_name || item.shop_name || '').trim(),
                amount: amount === 0 ? 1 : amount, // Fake 1 won so the button appears in TeamReport
                date: dateStr + 'T00:00:00.000Z',
                source: 'v5-mariadb'
              });
            }

            // [DEBUG] Always push a fake record for '엑티비티' to inspect the raw keys!
            if (idx === 0) {
              records.push({
                id: `debug-${dateStr}`,
                team: '엑티비티', // Force it into TeamReport
                branch_name: 'DEBUG_RAW_PAYLOAD',
                mapped_term: JSON.stringify(item).substring(0, 1000), // Dump the raw JSON
                amount: 9999999, // Fake amount to ensure it shows up
                date: dateStr + 'T00:00:00.000Z',
                source: 'v5-mariadb'
              });
            }
            });
          }
      } catch (err) {
        console.error('Error fetching V5 revenues in analysis API:', err);
      }
    }
    
    // Sort by date desc in memory since we don't have an index yet
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Send all records for the period to allow client-side aggregation
    return NextResponse.json(records);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
