const fetch = require('node-fetch');

async function testLeisureSelection() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  console.log('--- ALL Matrix Subtotal Rows ---');
  rows.filter(r => r.isSubtotal).forEach(r => {
    console.log(`categoryCode: ${r.categoryCode}, teamName: ${r.teamName}, partName: ${r.partName}, subtotalType: ${r.subtotalType}, actual: ${r.rangeActual || r.todayActual}`);
  });
}

testLeisureSelection();
