const fetch = require('node-fetch');

async function debugTeamReport() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const data = json.data || [];

  console.log('--- Checking Grand Total row in matrix-weekly ---');
  const grandTotalRow = data.find(r => r.isGrandTotal);
  console.log('Grand Total row:', grandTotalRow);

  console.log('\n--- Checking Ticket Subtotal row ---');
  const ticketSubtotal = data.find(r => r.categoryCode === 'TICKET' && r.isSubtotal);
  console.log('Ticket Subtotal row:', ticketSubtotal);

  console.log('\n--- Checking Ticket Raw Rows partNames and shopNames ---');
  const ticketRows = data.filter(r => r.categoryCode === 'TICKET' && !r.isSubtotal);
  ticketRows.forEach(r => {
    console.log(`part: ${r.partName}, shop: ${r.shopName}, todayActual: ${r.todayActual}, rangeActual: ${r.rangeActual}, isSubtotal: ${r.isSubtotal}, subtotalType: ${r.subtotalType}`);
  });
}

debugTeamReport();
