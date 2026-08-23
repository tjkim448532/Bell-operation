const fetch = require('node-fetch');

async function inspectLuge() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Check July 2026 matrix
  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  console.log('--- Searching for 루지 or 익스트림 루지 in July 2026 matrix ---');
  const lugeRows = rows.filter(r => JSON.stringify(r).includes('루지'));
  console.log('Luge rows found in July 2026:', lugeRows);

  // 2. Check top-ticket-items or ticket sales for 루지
  const ticketRes = await fetch(`${BACKEND_URL}/api/v5/report/top-ticket-items?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  if (ticketRes.ok) {
    const tJson = await ticketRes.json();
    const tItems = (tJson.data?.items || tJson.items || []).filter(i => JSON.stringify(i).includes('루지'));
    console.log('\nLuge items in online ticket report:', tItems);
  }

  // 3. Check single date e.g. 2026-08-22
  const augRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=2026-08-22`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const augJson = await augRes.json();
  const augLuge = (augJson.data || []).filter(r => JSON.stringify(r).includes('루지'));
  console.log('\nLuge row on 2026-08-22:', augLuge);
}

inspectLuge();
