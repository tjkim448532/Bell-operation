import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const targetDate = new Date(date);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0-indexed
    const last6Months: string[] = [];
    const targetEndDates: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      last6Months.push(`${yyyy}-${mm}`);
      
      const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
      targetEndDates.push(`${yyyy}-${mm}-${lastDay}`);
    }

    const envToken = process.env.M2M_API_TOKEN;
    const m2mToken = (!envToken || envToken === 'undefined') ? 'belleforet-m2m-secret' : envToken;
    const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app').replace(/\/$/, '');

    let totalRevenue = 0;
    let totalRoomCap = 0;
    const revenueByFacility: Record<string, number> = {};

    // 1. Fetch Revenue from External V5 API (API 1: revenue-summary) across 6 months
    const fetchPromises = targetEndDates.map(async (apiEndDate) => {
      try {
        const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=${apiEndDate}`;
        const res = await fetch(revUrl, {
          headers: { 'Authorization': `Bearer ${m2mToken}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          return json.data || json;
        }
      } catch (e) {
        console.error('V5 API fetch failed for', apiEndDate);
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    results.forEach(revData => {
      if (!revData) return;
      const summary = revData.summary || {};
      totalRevenue += summary.totalRevenue || 0;
      totalRoomCap += summary.totalRoomCap || 0;

      const salesByFacility = revData.salesByFacility || [];
      salesByFacility.forEach((fac: any) => {
        const facName = fac.facilityName || fac.name || '미분류';
        revenueByFacility[facName] = (revenueByFacility[facName] || 0) + (fac.revenue || fac.amount || fac.todayActual || 0);
      });
    });

    // 2. Fetch Customer Journey (Placeholder as V5 does not support it yet)
    const journeyData = {
      trackingRate: 0,
      topFirstTouchpoint: "-",
      topLastTouchpoint: "-",
      touchpoints: []
    };

    // 3. Fetch Expenses from Firebase
    const expensesSnapshot = await db.collection('expenses').get();
    const commonExpensesSnapshot = await db.collection('common_expenses').get();

    const expenseByFacility: Record<string, number> = {};
    const teamToPartMap: Record<string, string> = {};
    let totalOperationalExpense = 0;

    expensesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!last6Months.includes(data.month)) return; 
      
      // 특수 규칙: 레저본부 및 미분류만 렌더링
      if (data.team !== '레저본부' && data.team !== '미분류' && data.team !== '제외') return;
      if (data.team === '제외') return; // 제외 항목은 P&L 계산에서 제외

      const amount = Number(data.amount || data.금액 || 0);
      const facilityName = data.branch_name || data.영업장명 || data.dept_name || '미분류';
      
      expenseByFacility[facilityName] = (expenseByFacility[facilityName] || 0) + amount;
      teamToPartMap[facilityName] = data.team; // Map facility to its team
      totalOperationalExpense += amount;
    });

    let totalCommonExpense = 0;
    commonExpensesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!last6Months.includes(data.month)) return;
      const amount = Number(data.amount || data.금액 || 0);
      totalCommonExpense += amount;
    });

    // 4. McKinsey Analytical Insights Computation & Filtering
    let bestFacility = { name: '-', margin: -Infinity };
    let worstFacility = { name: '-', margin: Infinity };
    
    // Merge revenue and expenses to create True P&L per facility
    const allFacilities = Array.from(new Set([...Object.keys(revenueByFacility), ...Object.keys(expenseByFacility)]));
    
    const facilitiesPerformance = allFacilities.map(facilityName => {
      const revenue = revenueByFacility[facilityName] || 0;
      const expense = expenseByFacility[facilityName] || 0;
      const contributionMargin = revenue - expense;

      // Only consider facilities that actually have revenue or expense
      if (revenue > 0 || expense > 0) {
        if (contributionMargin > bestFacility.margin) {
          bestFacility = { name: facilityName, margin: contributionMargin };
        }
        if (contributionMargin < worstFacility.margin) {
          worstFacility = { name: facilityName, margin: contributionMargin };
        }
      }

      return {
        facilityName,
        teamName: teamToPartMap[facilityName] || '레저본부',
        categoryCode: '영업장',
        revenue,
        expense,
        contributionMargin
      };
    }).filter(fac => fac.revenue > 0 || fac.expense > 0)
      .sort((a, b) => b.contributionMargin - a.contributionMargin);

    const operatingMargin = totalRevenue > 0 
      ? Math.round(((totalRevenue - totalOperationalExpense - totalCommonExpense) / totalRevenue) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalVisitors: totalRoomCap || 1, // avoid div by 0
          totalOperationalExpense,
          totalCommonExpense,
          operatingMargin,
          bestFacility: bestFacility.name,
          worstFacility: worstFacility.name
        },
        facilitiesPerformance,
        customerJourney: journeyData,
        weatherImpact: []
      }
    });
  } catch (error: any) {
    console.error('Business Plan API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate business plan report' }, { status: 500 });
  }
}
