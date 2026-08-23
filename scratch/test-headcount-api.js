const fetch = require('node-fetch');

async function testHeadcountApi() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v6/report/leisure-organization`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  console.log('API Status:', res.status);
  console.log('JSON structure:', JSON.stringify(json, null, 2));
}

testHeadcountApi();
