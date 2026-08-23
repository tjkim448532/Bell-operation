const fetch = require('node-fetch');

async function testUtil() {
  const url = 'https://belleforet-data.vercel.app/api/v5/dashboard/utilization-mtd?date=2026-07-31';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer belleforet-m2m-secret' }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

testUtil();
