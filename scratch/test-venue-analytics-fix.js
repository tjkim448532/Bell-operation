const fetch = require('node-fetch');

async function testVenueFix() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  const rawRows = rows.filter(r => !r.isSubtotal && !r.isGrandTotal);
  
  const departmentMap = {};
  
  rawRows.forEach(row => {
    const catCode = String(row.categoryCode || '').toUpperCase();
    if (catCode !== 'TICKET' && !['MOTO', 'GOODS', 'PARKING'].includes(catCode)) return;

    const partName = String(row.partName || '').trim();
    const shopName = String(row.shopName || row.facilityName || '').trim();
    const amount = Number(String(row.rangeActual || row.todayActual || 0).replace(/,/g, '')) || 0;
    const lyAmount = Number(String(row.rangeLy || row.todayLy || 0).replace(/,/g, '')) || 0;
    const visitors = Number(row.visitors || row.rangeVisitors || row.todayVisitors || 0);
    const lyVisitors = Number(row.lyVisitors || row.rangeLyVisitors || row.todayLyVisitors || 0);

    // Skip generic rows like 벨포레 리조트
    if (partName.includes('리조트') || shopName.includes('리조트') || partName === '소계') return;

    const deptKey = (catCode === 'TICKET' ? partName : (row.categoryName || catCode)) || '미분류';
    if (!deptKey || deptKey === '미분류') return;

    if (!departmentMap[deptKey]) {
      departmentMap[deptKey] = {
        departmentName: deptKey,
        teamName: '레저본부',
        revenue: 0,
        lyRevenue: 0,
        visitors: 0,
        lyVisitors: 0,
        venues: []
      };
    }

    departmentMap[deptKey].revenue += amount;
    departmentMap[deptKey].lyRevenue += lyAmount;
    departmentMap[deptKey].visitors += visitors;
    departmentMap[deptKey].lyVisitors += lyVisitors;

    departmentMap[deptKey].venues.push({
      venueName: shopName,
      revenue: amount,
      lyRevenue: lyAmount,
      visitors: visitors,
      lyVisitors: lyVisitors,
      spendPerGuest: visitors > 0 ? Math.round(amount / visitors) : 0,
      lySpendPerGuest: lyVisitors > 0 ? Math.round(lyAmount / lyVisitors) : 0
    });
  });

  console.log('Resulting departments:');
  Object.values(departmentMap).forEach(d => {
    console.log(`Dept: ${d.departmentName}, Revenue: ${d.revenue}, Visitors: ${d.visitors}, Spend: ${d.visitors > 0 ? Math.round(d.revenue / d.visitors) : 0}, Venues Count: ${d.venues.length}`);
    d.venues.forEach(v => {
      console.log(`  - Venue: ${v.venueName}, Revenue: ${v.revenue}, Visitors: ${v.visitors}, Spend: ${v.spendPerGuest}`);
    });
  });
}

testVenueFix();
