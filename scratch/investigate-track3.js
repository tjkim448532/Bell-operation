const fetch = require('node-fetch');

async function investigateTrack3() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  console.log('=== 1. Checking 2026-08-22 revenue-summary ===');
  const resSummaryDefault = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=2026-08-22`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonSummaryDefault = await resSummaryDefault.json();
  console.log('Default revenue-summary (2026-08-22):', {
    totalRevenue: jsonSummaryDefault?.summary?.totalRevenue,
    ytdRevenue: jsonSummaryDefault?.summary?.ytdRevenue,
    mtdRevenue: jsonSummaryDefault?.summary?.mtdRevenue
  });

  console.log('\n=== 2. Checking with ?track=UNIFIED vs ?track=LEDGER on revenue-summary ===');
  const resSummaryUnified = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=2026-08-22&track=UNIFIED`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonSummaryUnified = await resSummaryUnified.json();
  console.log('UNIFIED track totalRevenue:', jsonSummaryUnified?.summary?.totalRevenue, 'ytdRevenue:', jsonSummaryUnified?.summary?.ytdRevenue);

  const resSummaryLedger = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=2026-08-22&track=LEDGER`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonSummaryLedger = await resSummaryLedger.json();
  console.log('LEDGER track totalRevenue:', jsonSummaryLedger?.summary?.totalRevenue, 'ytdRevenue:', jsonSummaryLedger?.summary?.ytdRevenue);

  console.log('\n=== 3. Checking matrix-weekly for 2026-07-01 ~ 2026-07-31 ===');
  const resMatrixDefault = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonMatrixDefault = await resMatrixDefault.json();
  const grandTotalDefault = (jsonMatrixDefault.data || []).find(r => r.isGrandTotal);
  const ticketSubtotalDefault = (jsonMatrixDefault.data || []).find(r => r.categoryCode === 'TICKET' && r.isSubtotal && r.subtotalType === 'category');
  console.log('Default matrix Grand Total:', grandTotalDefault?.todayActual || grandTotalDefault?.rangeActual);
  console.log('Default matrix Ticket (레저본부) Subtotal:', ticketSubtotalDefault?.todayActual || ticketSubtotalDefault?.rangeActual);

  const resMatrixUnified = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31&track=UNIFIED`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonMatrixUnified = await resMatrixUnified.json();
  const grandTotalUnified = (jsonMatrixUnified.data || []).find(r => r.isGrandTotal);
  const ticketSubtotalUnified = (jsonMatrixUnified.data || []).find(r => r.categoryCode === 'TICKET' && r.isSubtotal && r.subtotalType === 'category');
  console.log('\nExplicit track=UNIFIED matrix Grand Total:', grandTotalUnified?.todayActual || grandTotalUnified?.rangeActual);
  console.log('Explicit track=UNIFIED matrix Ticket Subtotal:', ticketSubtotalUnified?.todayActual || ticketSubtotalUnified?.rangeActual);

  console.log('\n=== 4. Checking sales-hierarchy (Track 3 endpoint) ===');
  const resHierarchy = await fetch(`${BACKEND_URL}/api/v6/dashboard/sales-hierarchy?date=2026-08-22`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  console.log('sales-hierarchy status:', resHierarchy.status);
  if (resHierarchy.ok) {
    const jsonHierarchy = await resHierarchy.json();
    console.log('sales-hierarchy totalRevenue:', jsonHierarchy?.data?.totalRevenue || jsonHierarchy?.totalRevenue);
  }
}

investigateTrack3();
