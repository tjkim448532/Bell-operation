const fetch = require('node-fetch');

async function testNormalizedLeisure() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const data = json.data || [];

  const teamRevs = {};
  const teamRevGroups = {};

  data.forEach((row, idx) => {
    const val = Number(String(row.todayActual !== undefined ? row.todayActual : (row.rangeActual !== undefined ? row.rangeActual : 0)).replace(/,/g, '')) || 0;
    
    // Check ticket category subtotal
    if (row.categoryCode === 'TICKET' && row.isSubtotal && row.subtotalType === 'category') {
      console.log('Ticket Category Subtotal (레저본부 총계):', val.toLocaleString());
    }

    const catCode = String(row.categoryCode || '').toUpperCase();
    let teamName = String(row.teamName || '').trim();
    if (catCode === 'TICKET') {
      teamName = '레저본부';
    }

    const isIndependentCategory = ['MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'UNEARNED'].includes(catCode);
    if (teamName !== '레저본부' && teamName !== '미분류' && !isIndependentCategory) {
      return;
    }

    const partName = String(row.partName || '').trim();
    const shopName = String(row.shopName || '').trim();

    let groupName = teamName;
    if (partName && partName !== '미분류' && partName !== '소계') {
      groupName = partName;
    } else if (teamName && teamName !== '미분류') {
      groupName = teamName;
    }

    // NORMALIZE 목장 -> 벨포레 목장
    if (groupName === '목장') {
      groupName = '벨포레 목장';
    }
    teamName = groupName;

    if (row.isSubtotal) {
      if (row.subtotalType === 'part') {
        teamRevs[teamName] = (teamRevs[teamName] || 0) + val;
        console.log(`Subtotal for ${teamName}: ${val.toLocaleString()}`);
      }
    }
  });

  console.log('\nFinal Team Revenues:');
  console.log(teamRevs);
}

testNormalizedLeisure();
