const fetch = require('node-fetch');

async function testRanges() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // Test weekend range 2026-07-04 ~ 2026-07-05
  const resWeekend = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-04&endDate=2026-07-05`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonWeekend = await resWeekend.json();
  const ticketSubtotalWeekend = (jsonWeekend.data || []).find(r => r.categoryCode === 'TICKET' && r.isSubtotal);
  console.log('Weekend 2026-07-04~05 Ticket Subtotal:', ticketSubtotalWeekend?.rangeActual);

  // Test weekday range 2026-07-06 ~ 2026-07-10
  const resWeekday = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-06&endDate=2026-07-10`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonWeekday = await resWeekday.json();
  const ticketSubtotalWeekday = (jsonWeekday.data || []).find(r => r.categoryCode === 'TICKET' && r.isSubtotal);
  console.log('Weekday 2026-07-06~10 Ticket Subtotal:', ticketSubtotalWeekday?.rangeActual);
}

testRanges();
