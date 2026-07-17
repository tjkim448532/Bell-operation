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

    // Mock V5 Data if external call fails
    if (!v5Data) {
      v5Data = {
        summary: {
          totalRevenue: 15000000000,
          totalVisitors: 500000
        },
        facilitiesPerformance: [
          { teamName: "액티비티", facilityName: "마운틴카트", categoryCode: "TICKET", revenue: 300000000, totalVisitors: 10000 },
          { teamName: "액티비티", facilityName: "루지", categoryCode: "TICKET", revenue: 1200000000, totalVisitors: 80000 },
          { teamName: "목장", facilityName: "양떼목장", categoryCode: "TICKET", revenue: 500000000, totalVisitors: 50000 },
          { teamName: "미디어아트", facilityName: "VR", categoryCode: "TICKET", revenue: 150000000, totalVisitors: 5000 },
          { teamName: "익스트림", facilityName: "스피드", categoryCode: "TICKET", revenue: 80000000, totalVisitors: 2000 }
        ]
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
      console.log('V5 Journey API fetch failed, using fallback mock data');
    }

    if (!journeyData) {
      journeyData = {
        trackingCoverage: { totalRoomsSold: 15000, trackedRooms: 10500, trackingRate: 70.0 },
        behaviorSummary: { averageFacilitiesUsed: 2.5, topFirstTouchpoint: "루지", topLastTouchpoint: "양떼목장" },
        facilityTouchpoints: [
          { facilityName: "루지", asFirstTouchCount: 5000, asFirstTouchPeakTime: "14:00", asLastTouchCount: 1000, asLastTouchPeakTime: "11:00" },
          { facilityName: "양떼목장", asFirstTouchCount: 2000, asFirstTouchPeakTime: "15:00", asLastTouchCount: 4500, asLastTouchPeakTime: "10:30" }
        ]
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

    // A. Filter forbidden words
    const filterFacilityName = (name: string) => {
      if (name.includes('VR')) return name.replace(/VR/g, '미디어아트 장비');
      if (name.includes('스피드')) return name.replace(/스피드/g, '익스트림');
      return name;
    };

    // B. Calculate True P&L, ARPU
    let bestFacility = { name: '', margin: -Infinity };
    let worstFacility = { name: '', margin: Infinity };
    
    const facilitiesPerformance = v5Data.facilitiesPerformance.map((fac: any) => {
      const cleanName = filterFacilityName(fac.facilityName);
      const expense = expenseByFacility[cleanName] || expenseByFacility[fac.facilityName] || 0;
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
        bestFacility: bestFacility.name,
        worstFacility: worstFacility.name
      },
      customerJourney: {
        trackingRate: journeyData.trackingCoverage.trackingRate,
        averageFacilitiesUsed: journeyData.behaviorSummary.averageFacilitiesUsed,
        topFirstTouchpoint: filterFacilityName(journeyData.behaviorSummary.topFirstTouchpoint),
        topLastTouchpoint: filterFacilityName(journeyData.behaviorSummary.topLastTouchpoint),
        touchpoints: journeyData.facilityTouchpoints.map((tp: any) => ({
          ...tp,
          facilityName: filterFacilityName(tp.facilityName)
        }))
      },
      facilitiesPerformance
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error: any) {
    console.error('Business Plan API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate business plan report' }, { status: 500 });
  }
}
