const fetch = require('node-fetch');

async function checkTrackData() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Check revenue-summary response structure
  const res1 = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=2026-08-22`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json1 = await res1.json();
  console.log('revenue-summary status:', res1.status, 'keys:', Object.keys(json1));
  console.log('summary object:', json1.data?.summary || json1.summary);

  // 2. Check matrix-weekly for 2026-08-22
  const res2 = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=2026-08-22`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json2 = await res2.json();
  const rows2 = json2.data || [];
  const grandTotalRow = rows2.find(r => r.isGrandTotal);
  console.log('\n2026-08-22 matrix Grand Total:', {
    todayActual: grandTotalRow?.todayActual,
    mtdActual: grandTotalRow?.mtdActual,
    ytdActual: grandTotalRow?.ytdActual
  });

  // 3. Check July 2026 matrix
  const res3 = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json3 = await res3.json();
  const rows3 = json3.data || [];
  const ticketSubtotal = rows3.find(r => r.categoryCode === 'TICKET' && r.isSubtotal && r.subtotalType === 'category');
  console.log('\nJuly 2026 TICKET (레저본부) Subtotal:', ticketSubtotal?.todayActual || ticketSubtotal?.rangeActual);

  // 4. Check whether matrix-weekly has track parameter
  const res4 = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=2026-08-22&track=UNIFIED`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json4 = await res4.json();
  const grandTotalTrack3 = (json4.data || []).find(r => r.isGrandTotal);
  console.log('\nExplicit ?track=UNIFIED 2026-08-22 matrix Grand Total:', grandTotalTrack3?.todayActual);

  const res5 = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=2026-08-22&track=LEDGER`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json5 = await res5.json();
  const grandTotalTrack1 = (json5.data || []).find(r => r.isGrandTotal);
  console.log('Explicit ?track=LEDGER 2026-08-22 matrix Grand Total:', grandTotalTrack1?.todayActual);
}

checkTrackData();
