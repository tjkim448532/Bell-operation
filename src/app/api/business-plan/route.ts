import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Fetch Revenue & Visitors from External V5 API (Simulation/Mock if external is unavailable)
    let v5Data: any = null;
    try {
      const v5Url = process.env.V5_API_URL 
        ? `${process.env.V5_API_URL}/api/v5/report/business-plan?date=${date}`
        : 'http://localhost:3000/api/mock/v5/business-plan'; // Fallback for local dev
      
      const res = await fetch(v5Url, { next: { revalidate: 60 } });
      if (res.ok) {
        const json = await res.json();
        v5Data = json.data;
      }
    } catch (e) {
      console.log('V5 API fetch failed, using fallback mock data for Revenue');
    }

    // Remove Mock V5 Data assignment - strictly forbidden
    if (!v5Data) {
      v5Data = {
        summary: { totalRevenue: 0, totalVisitors: 0 },
        facilitiesPerformance: [],
        weatherImpact: [] // Placeholder for future actual data
      };
    }

    // 2. Fetch Customer Journey from External V5 API
    let journeyData: any = null;
    try {
      const journeyUrl = process.env.V5_API_URL 
        ? `${process.env.V5_API_URL}/api/v5/report/guest-journey?date=${date}`
        : 'http://localhost:3000/api/mock/v5/guest-journey';
      
      const res = await fetch(journeyUrl, { next: { revalidate: 60 } });
      if (res.ok) {
        const json = await res.json();
        journeyData = json.data;
      }
    } catch (e) {
      console.log('V5 Journey API fetch failed');
    }

    if (!journeyData) {
      journeyData = {
        trackingCoverage: { totalRoomsSold: 0, trackedRooms: 0, trackingRate: 0 },
        behaviorSummary: { averageFacilitiesUsed: 0, topFirstTouchpoint: "-", topLastTouchpoint: "-" },
        facilityTouchpoints: []
      };
    }

    // 3. Fetch Expenses from Firebase
    const expensesSnapshot = await db.collection('expenses').get();
    const commonExpensesSnapshot = await db.collection('common_expenses').get();

    // Aggregate Operational Expenses by Facility
    const expenseByFacility: Record<string, number> = {};
    let totalOperationalExpense = 0;
    expensesSnapshot.forEach(doc => {
      const data = doc.data();
      const amount = Number(data.amount || data.금액 || 0);
      const team = data.team || data.팀명 || '미분류';
      expenseByFacility[team] = (expenseByFacility[team] || 0) + amount;
      totalOperationalExpense += amount;
    });

    // Aggregate Common Expenses
    let totalCommonExpense = 0;
    commonExpensesSnapshot.forEach(doc => {
      const data = doc.data();
      const amount = Number(data.amount || data.금액 || 0);
      totalCommonExpense += amount;
    });

    // 4. McKinsey Analytical Insights Computation & Filtering

    // B. Calculate True P&L, ARPU
    let bestFacility = { name: '', margin: -Infinity };
    let worstFacility = { name: '', margin: Infinity };
    
    const facilitiesPerformance = v5Data.facilitiesPerformance.map((fac: any) => {
      const cleanName = fac.facilityName;
      const expense = expenseByFacility[cleanName] || 0;
      const contributionMargin = fac.revenue - expense;
      const arpu = fac.totalVisitors > 0 ? Math.round(fac.revenue / fac.totalVisitors) : 0;

      if (contributionMargin > bestFacility.margin) bestFacility = { name: cleanName, margin: contributionMargin };
      if (contributionMargin < worstFacility.margin) worstFacility = { name: cleanName, margin: contributionMargin };

      return {
        ...fac,
        facilityName: cleanName,
        expense,
        contributionMargin,
        arpu
      };
    });

    // C. Marketing ROI (simplified proxy)
    const operatingMargin = v5Data.summary.totalRevenue > 0 
      ? ((v5Data.summary.totalRevenue - totalOperationalExpense - totalCommonExpense) / v5Data.summary.totalRevenue * 100).toFixed(1)
      : 0;

    // Build the Final Flat JSON for the Dumb Viewer Frontend
    const responseData = {
      summary: {
        totalRevenue: v5Data.summary.totalRevenue,
        totalOperationalExpense,
        totalCommonExpense,
        totalVisitors: v5Data.summary.totalVisitors,
        operatingMargin: Number(operatingMargin),
        bestFacility: bestFacility.name || "-",
        worstFacility: worstFacility.name || "-"
      },
      customerJourney: {
        trackingRate: journeyData.trackingCoverage.trackingRate,
        averageFacilitiesUsed: journeyData.behaviorSummary.averageFacilitiesUsed,
        topFirstTouchpoint: journeyData.behaviorSummary.topFirstTouchpoint,
        topLastTouchpoint: journeyData.behaviorSummary.topLastTouchpoint,
        touchpoints: journeyData.facilityTouchpoints.map((tp: any) => ({
          ...tp,
          facilityName: tp.facilityName
        }))
      },
      weatherImpact: v5Data.weatherImpact || [], // Pass weather data if V5 provides it
      facilitiesPerformance
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error: any) {
    console.error('Business Plan API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate business plan report' }, { status: 500 });
  }
}
