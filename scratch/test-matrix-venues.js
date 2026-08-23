const fetch = require('node-fetch');

async function testMatrix() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';
  const url = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];
  console.log('Total matrix rows:', rows.length);

  const subtotalRows = rows.filter(r => r.isSubtotal);
  console.log('Subtotal rows:');
  subtotalRows.forEach(r => {
    console.log(`categoryCode: ${r.categoryCode}, teamName: ${r.teamName}, partName: ${r.partName}, subtotalType: ${r.subtotalType}, rangeActual: ${r.rangeActual || r.todayActual}`);
  });

  const rawRows = rows.filter(r => !r.isSubtotal && !r.isGrandTotal);
  console.log('Sample raw rows:');
  rawRows.slice(0, 15).forEach(r => {
    console.log(`cat: ${r.categoryCode}, team: ${r.teamName}, part: ${r.partName}, shop: ${r.shopName}, facility: ${r.facilityName}, actual: ${r.rangeActual || r.todayActual}`);
  });
}

testMatrix();
