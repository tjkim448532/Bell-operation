const fetch = require('node-fetch');

async function testFullTeamReport() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const data = json.data || [];

  const teamRevs = {};
  const teamRevGroups = {};
  let grandTotalRevenue = 0;

  data.forEach((row, idx) => {
    const val = Number(String(row.todayActual !== undefined ? row.todayActual : (row.rangeActual !== undefined ? row.rangeActual : 0)).replace(/,/g, '')) || 0;

    const catCode = String(row.categoryCode || '').toUpperCase();
    if (catCode === 'TICKET' && row.isSubtotal && row.subtotalType === 'category') {
      grandTotalRevenue = val;
    }

    let teamName = String(row.teamName || '').trim();
    if (catCode === 'TICKET') teamName = '레저본부';

    const isIndependentCategory = ['MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'UNEARNED'].includes(catCode);
    if (teamName !== '레저본부' && teamName !== '미분류' && !isIndependentCategory) return;

    const partName = String(row.partName || '').trim();
    const shopName = String(row.shopName || '').trim();

    let groupName = teamName;
    if (partName && partName !== '미분류' && partName !== '소계') {
      groupName = partName;
    } else if (teamName && teamName !== '미분류') {
      groupName = teamName;
    }

    if (groupName === '목장') groupName = '벨포레 목장';
    teamName = groupName;

    if (row.isSubtotal && row.subtotalType === 'part') {
      teamRevs[teamName] = (teamRevs[teamName] || 0) + val;
    }
  });

  console.log('Grand Total Leisure Revenue (TICKET subtotal):', grandTotalRevenue.toLocaleString());
  console.log('Team Subtotals:');
  Object.entries(teamRevs).forEach(([t, v]) => {
    console.log(`  - ${t}: ${v.toLocaleString()}원`);
  });

  const activeTeams = ['벨포레 목장', '미디어아트센터', '디지털지원', '액티비티'];
  const activeSum = activeTeams.reduce((sum, t) => sum + (teamRevs[t] || 0), 0);
  console.log(`\nActive 4 Teams Sum: ${activeSum.toLocaleString()}원`);
}

testFullTeamReport();
