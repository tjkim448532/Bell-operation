const fetch = require('node-fetch');

async function testApi() {
  const url = 'https://belleforet-data.vercel.app/api/v5/report/channel-correlation?date=2026-07-20';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer belleforet-m2m-secret` }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.slice(0, 500));
  } catch (e) {
    console.error('Error:', e);
  }
}

testApi();
