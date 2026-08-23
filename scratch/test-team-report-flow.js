const fetch = require('node-fetch');

async function testTeamReportFlow() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const data = json.data || [];

  const teamRevGroups = {};
  const teamRevs = {};

  data.forEach(row => {
    const catCode = String(row.categoryCode || '').toUpperCase();
    if (catCode !== 'TICKET' && !['MOTO', 'GOODS', 'PARKING'].includes(catCode)) return;

    const partName = String(row.partName || '').trim();
    const shopName = String(row.shopName || row.facilityName || '').trim();
    const amount = Number(String(row.rangeActual || row.todayActual || 0).replace(/,/g, '')) || 0;
    
    if (row.isSubtotal) {
      console.log('Subtotal row:', row.partName, row.shopName, amount, row.subtotalType);
      return;
    }

    if (partName.includes('리조트') || shopName.includes('리조트') || partName === '소계') return;

    const t = (catCode === 'TICKET' ? partName : (row.categoryName || catCode)) || '미분류';
    if (!teamRevs[t]) teamRevs[t] = 0;
    teamRevs[t] += amount;
  });

  console.log('\nCalculated Team Revenues from raw shop rows:');
  console.log(teamRevs);
  const totalLeisureRev = Object.values(teamRevs).reduce((a, b) => a + b, 0);
  console.log('Total Pure Leisure Revenue (sum of active teams):', totalLeisureRev.toLocaleString());
}

testTeamReportFlow();
