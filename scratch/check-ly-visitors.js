const fetch = require('node-fetch');

async function checkLyFields() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  console.log('Sample ticket rows keys:');
  const sampleTicket = rows.find(r => r.categoryCode === 'TICKET' && !r.isSubtotal);
  if (sampleTicket) {
    console.log('Keys in ticket row:', Object.keys(sampleTicket));
    console.log('Sample row object:', sampleTicket);
  }

  // Also check revenue-summary
  const revRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const revJson = await revRes.json();
  console.log('\nRevenue-summary summary keys:', Object.keys(revJson?.summary || {}));
  console.log('totalVisitors:', revJson?.summary?.totalVisitors, 'visitorsLy / lyVisitors:', revJson?.summary?.totalVisitorsLy || revJson?.summary?.lyVisitors || revJson?.summary?.rangeVisitorsLy);

  // Check 2025 matrix directly (1 year ago)
  const lyRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2025-07-01&endDate=2025-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  console.log('\n2025-07-01~2025-07-31 matrix status:', lyRes.status);
  if (lyRes.ok) {
    const lyJson = await lyRes.json();
    const lyRows = lyJson.data || [];
    console.log('2025 matrix rows count:', lyRows.length);
    const sampleLyTicket = lyRows.find(r => r.categoryCode === 'TICKET' && !r.isSubtotal);
    console.log('Sample 2025 ticket row:', sampleLyTicket);
  }
}

checkLyFields();
