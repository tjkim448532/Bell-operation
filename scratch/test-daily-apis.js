const fetch = require('node-fetch');

async function testDailyApis() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Test daily-sales report
  console.log('Testing daily-sales report:');
  const dailyRes = await fetch(`${BACKEND_URL}/api/v5/report/daily-sales?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  console.log('daily-sales status:', dailyRes.status);
  if (dailyRes.ok) {
    const dailyJson = await dailyRes.json();
    const rows = dailyJson.data || [];
    console.log('daily rows count:', rows.length);
    if (rows.length > 0) {
      console.log('Sample daily row:', rows[0]);
    }
  }

  // 2. Test channel-correlation dailyLeisure
  console.log('\nTesting channel-correlation:');
  const corrRes = await fetch(`${BACKEND_URL}/api/v5/report/channel-correlation?date=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  console.log('channel-correlation status:', corrRes.status);
  if (corrRes.ok) {
    const corrJson = await corrRes.json();
    console.log('dailyLeisure count:', corrJson.dailyLeisure?.length);
    if (corrJson.dailyLeisure?.length > 0) {
      console.log('Sample dailyLeisure item:', corrJson.dailyLeisure[0]);
    }
  }
}

testDailyApis();
