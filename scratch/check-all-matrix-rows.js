const fetch = require('node-fetch');

async function checkLeisureRange() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const data = json.data || [];

  console.log('--- ALL rows in matrix-weekly for July ---');
  data.forEach((r, idx) => {
    if (r.isGrandTotal) {
      console.log(`[GRAND_TOTAL] actual: ${r.todayActual || r.rangeActual}`);
    } else if (r.isSubtotal) {
      console.log(`[SUBTOTAL] cat: ${r.categoryCode}, part: ${r.partName}, shop: ${r.shopName}, type: ${r.subtotalType}, actual: ${r.todayActual || r.rangeActual}`);
    } else {
      console.log(`[RAW] cat: ${r.categoryCode}, part: ${r.partName}, shop: ${r.shopName}, actual: ${r.todayActual || r.rangeActual}`);
    }
  });
}

checkLeisureRange();
