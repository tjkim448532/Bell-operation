const fetch = require('node-fetch');

async function checkTicketRows() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  console.log('--- ALL Rows for categoryCode TICKET ---');
  const ticketRows = rows.filter(r => r.categoryCode === 'TICKET');
  ticketRows.forEach(r => {
    console.log(`isSubtotal: ${r.isSubtotal}, subtotalType: ${r.subtotalType}, part: ${r.partName}, shop: ${r.shopName}, facility: ${r.facilityName}, actual: ${r.rangeActual || r.todayActual}`);
  });
}

checkTicketRows();
