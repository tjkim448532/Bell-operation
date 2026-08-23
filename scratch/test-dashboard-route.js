const fetch = require('node-fetch');

async function testDashboard() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';
  
  // 1. Test utilization-mtd
  console.log('Testing utilization-mtd:');
  const utilRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/utilization-mtd?date=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  console.log('util status:', utilRes.status);
  const utilText = await utilRes.text();
  console.log('util body:', utilText);

  // 2. Test revenue-summary
  console.log('\nTesting revenue-summary:');
  const revRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  console.log('rev status:', revRes.status);
  const revJson = await revRes.json();
  console.log('rev summary:', revJson?.summary || revJson?.data?.summary);

  // 3. Test matrix-weekly for facilities visitors
  console.log('\nTesting matrix-weekly:');
  const matrixRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const matrixJson = await matrixRes.json();
  const ticketRows = (matrixJson.data || []).filter(r => r.categoryCode === 'TICKET');
  console.log('ticketRows count:', ticketRows.length);
  ticketRows.forEach(r => {
    console.log(`part: ${r.partName}, shop: ${r.shopName}, visitors: ${r.visitors || r.rangeVisitors || r.todayVisitors}`);
  });
}

testDashboard();
