const fetch = require('node-fetch');

async function verifyNewLyVisitors() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  console.log('Testing 2026-08-01 ~ 2026-08-16:');
  const res1 = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-08-01&endDate=2026-08-16`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json1 = await res1.json();
  const rows1 = json1.data || [];
  const ticketRows1 = rows1.filter(r => r.categoryCode === 'TICKET');
  console.log(`Found ${ticketRows1.length} ticket rows in Aug 1-16:`);
  ticketRows1.slice(0, 5).forEach(r => {
    console.log(`part: ${r.partName}, shop: ${r.shopName}, visitors: ${r.visitors || r.rangeVisitors}, lyVisitors: ${r.lyVisitors || r.rangeLyVisitors}, lyGrowth: ${r.lyGrowthVisitors || r.rangeGrowthVisitors}%`);
  });

  console.log('\nTesting 2026-07-01 ~ 2026-07-31:');
  const res2 = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json2 = await res2.json();
  const rows2 = json2.data || [];
  const ticketRows2 = rows2.filter(r => r.categoryCode === 'TICKET');
  console.log(`Found ${ticketRows2.length} ticket rows in July:`);
  ticketRows2.slice(0, 5).forEach(r => {
    console.log(`part: ${r.partName}, shop: ${r.shopName}, visitors: ${r.visitors || r.rangeVisitors}, lyVisitors: ${r.lyVisitors || r.rangeLyVisitors}, lyGrowth: ${r.lyGrowthVisitors || r.rangeGrowthVisitors}%`);
  });
}

verifyNewLyVisitors();
