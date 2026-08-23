const fetch = require('node-fetch');

async function testRevSummary() {
  const url = 'https://belleforet-data.vercel.app/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-31';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer belleforet-m2m-secret' }
  });
  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Summary:', json?.data?.summary || json?.summary);
}

testRevSummary();
