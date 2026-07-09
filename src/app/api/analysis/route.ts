import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

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
        daysData.forEach((day: any) => {
          if (!day) return;
          const ticketSummary = day.ticketSummary || [];
          const fnbSummary = day.fnbSummary || [];
          const golfSummary = day.golfSummary || [];
          const roomSummary = day.roomSummary || [];
          const dateStr = day.date || apiStartDate;

          // [규칙 3 적용] 티켓 매핑 O(1) 사전
          const productMap: Record<string, string> = {};
          if (ticketSummary.productLevelMapping) {
            ticketSummary.productLevelMapping.forEach((item: any) => {
              productMap[item.ticketName] = item.groupName;
            });
          }
          
          const facilityMap: Record<string, string> = {};
          if (ticketSummary.facilityLevelMapping) {
            ticketSummary.facilityLevelMapping.forEach((item: any) => {
              facilityMap[item.facilityName] = item.groupName;
            });
          }

          const tBreakdown = day.ticketFacilityBreakdown?.length > 0 ? day.ticketFacilityBreakdown : (ticketSummary.facilityBreakdown || (Object.keys(ticketSummary).length > 0 && !Array.isArray(ticketSummary) ? [ticketSummary] : (Array.isArray(ticketSummary) ? ticketSummary : [])));
          const fBreakdown = day.fnbFacilityBreakdown?.length > 0 ? day.fnbFacilityBreakdown : (fnbSummary.facilityBreakdown || (Object.keys(fnbSummary).length > 0 && !Array.isArray(fnbSummary) ? [fnbSummary] : (Array.isArray(fnbSummary) ? fnbSummary : [])));
          const gBreakdown = day.golfFacilityBreakdown?.length > 0 ? day.golfFacilityBreakdown : (golfSummary.facilityBreakdown || (Object.keys(golfSummary).length > 0 && !Array.isArray(golfSummary) ? [golfSummary] : (Array.isArray(golfSummary) ? golfSummary : [])));
          const rBreakdown = day.roomMarketBreakdown?.length > 0 ? day.roomMarketBreakdown : (roomSummary.roomMarketBreakdown || (Object.keys(roomSummary).length > 0 && !Array.isArray(roomSummary) ? [roomSummary] : (Array.isArray(roomSummary) ? roomSummary : [])));

          breakdowns.push(
            ...tBreakdown.map((i: any) => {
              let mappedTeam = productMap[i.ticketName || i.facility_name] || facilityMap[i.facility_name];
              return { ...i, _source: 'ticket', _date: dateStr, _mappedTeam: mappedTeam };
            }),
            ...fBreakdown.map((i: any) => ({ ...i, _source: 'fnb', _date: dateStr })),
            ...gBreakdown.map((i: any) => ({ ...i, _source: 'golf', _date: dateStr })),
            ...rBreakdown.map((i: any) => ({ ...i, _source: 'room', _date: dateStr }))
          );
        });

        if (breakdowns.length > 0) {
          const getFallbackTeam = (name: string, source?: string): string => {
            // First, check for explicit Leisure teams that might come from the ticket array
            if (name.includes('놀이동산') || name.includes('회전목마') || name.includes('범퍼카') || name.includes('바이킹') || name.includes('UFO')) return '놀이동산';
            if (name.includes('미디어아트센터') || name.includes('미디어') || name.includes('기프트샵')) return '미디어아트센터';
            if (name.includes('목장') || name.includes('양떼') || name.includes('먹이')) return '목장';
            if (name.includes('사계절썰매') || name.includes('마운틴카트') || name.includes('모토아레나') || name.includes('마리나') || name.includes('요트') || name.includes('제트보트') || name.includes('원더풀') || name.includes('썸머랜드')) return '엑티비티';

            // If we know the source array, we can safely fallback to its core team
            if (source === 'fnb') return 'F&B';
            if (source === 'golf') return '골프';
            if (source === 'room') return '객실';
            if (source === 'ticket') return '미분류 티켓';

            if (!name) return '기타';

            // Old fallbacks just in case
            if (name.includes('딜라이트') || name.includes('남도예담') || name.includes('벼루재촌') || name.includes('브리스킷346') || name.includes('투썸') || name.includes('얼룩말카페') || name.includes('클럽하우스') || name.includes('밤밤') || name.includes('핏스탑') || name.includes('BHC') || name.includes('CU') || name.includes('벨포레홀') || name.includes('FNB') || name.includes('기획전')) return 'F&B';
            if (name.includes('평') || name.includes('객실') || name.includes('펫룸') || name.includes('리조트') || name.includes('콘도') || name.includes('미지정')) return '객실';
            if (name.includes('그린피') || name.includes('카트대여') || name.includes('골프')) return '골프';
            
            return '기타';
          };

          breakdowns.forEach((item: any, idx: number) => {
            let facility = String(item.facility_name || item.shop_name || item.category_name || '').trim();
            const dateStr = item.date || apiStartDate;
            
            const isSummaryObject = item.totalTicketRevenue !== undefined || 
                                    item.totalFnbRevenue !== undefined || 
                                    item.totalGolfRevenue !== undefined || 
                                    item.totalRoomRevenue !== undefined;

            // Prevent double-counting from API-provided total/summary rows inside the breakdown arrays
            if (!isSummaryObject) {
              if (['합계', '총계', '소계', '전체'].some(kw => facility.includes(kw))) return;
              if (facility.toLowerCase() === 'total') return;
            }

            let amount = item.mtd_actual || item.total_amount || item.amount || item.today_actual || item.revenue || 0;

            // V5 에서는 배열 아이템 내부에 요약 필드가 존재하지 않음 (day.golfSummary 등으로 분리됨)
            // 따라서 레거시 V4 필드 체크는 생략하거나 무시합니다.
            if (item.totalTicketRevenue !== undefined) { amount = item.totalTicketRevenue; facility = '티켓(Summary)'; }
            else if (item.totalFnbRevenue !== undefined) { amount = item.totalFnbRevenue; facility = 'F&B(Summary)'; }
            else if (item.totalGolfRevenue !== undefined) { amount = item.totalGolfRevenue; facility = '골프(Summary)'; }
            else if (item.totalRoomRevenue !== undefined) { amount = item.totalRoomRevenue; facility = '객실(Summary)'; }

            let mappedTeam = item._mappedTeam;
            
            if (!mappedTeam) {
              mappedTeam = teamMappings[facility];
              if (!mappedTeam || mappedTeam === '기타') {
                mappedTeam = getFallbackTeam(facility, item._source);
                if (mappedTeam === '기타' && facility) console.log(`[UNMAPPED FACILITY in Analysis] ${facility}`);
              }
            }

            if (amount > 0) {
              const isExcluded = !isSummaryObject && excludedRevenueTerms.some(filter => facility.includes(filter));
              if (!isExcluded) {
                // Apply manual team filter
                if (team === 'all' || mappedTeam === team) {
                  records.push({
                    id: `v5-${dateStr}-${facility}-${idx}`,
                    team: mappedTeam,
                    branch_name: facility,
                    amount: amount,
                    date: dateStr + 'T00:00:00.000Z',
                    source: 'v5-mariadb'
                  });
                }
              }
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
