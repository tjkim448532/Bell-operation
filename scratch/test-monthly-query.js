const fetch = require('node-fetch');

async function testMonthlyRevenues() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Test fetching each month or full range
  // Let's test July 2026
  const resJuly = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonJuly = await resJuly.json();
  const ticketJuly = (jsonJuly.data || []).find(r => r.categoryCode === 'TICKET' && r.isSubtotal && r.subtotalType === 'category');
  console.log('July 2026 Leisure Subtotal:', ticketJuly?.rangeActual || ticketJuly?.todayActual);

  // 2. Let's test August 2026
  const resAug = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-08-01&endDate=2026-08-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonAug = await resAug.json();
  const ticketAug = (jsonAug.data || []).find(r => r.categoryCode === 'TICKET' && r.isSubtotal && r.subtotalType === 'category');
  console.log('Aug 2026 Leisure Subtotal:', ticketAug?.rangeActual || ticketAug?.todayActual);

  // 3. Let's test monthly trend endpoint if exists
  const resTrend = await fetch(`${BACKEND_URL}/api/v5/dashboard/monthly-trend?year=2026`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  console.log('monthly-trend status:', resTrend.status);
  if (resTrend.ok) {
    const jsonTrend = await resTrend.json();
    console.log('Trend data:', jsonTrend);
  }
}

testMonthlyRevenues();
