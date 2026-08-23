const fetch = require('node-fetch');

async function testTicketVenues() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';
  const url = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  const ticketRows = rows.filter(r => r.categoryCode === 'TICKET' && !r.isSubtotal && !r.isGrandTotal);
  console.log('Ticket raw shop rows:');
  ticketRows.forEach(r => {
    console.log(`part: ${r.partName}, shop: ${r.shopName}, actual: ${r.rangeActual || r.todayActual}`);
  });
}

testTicketVenues();
