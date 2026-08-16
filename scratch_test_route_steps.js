const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

// Let's test calling http://localhost:3000/api/dashboard?startMonth=2026-07&endMonth=2026-07 or simulate route.ts directly
async function testRouteLocally() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://belleforet-data.vercel.app';
  const m2mToken = process.env.M2M_API_TOKEN || 'belleforet-m2m-secret';
  
  const startDate = '2026-07-01';
  const endDate = '2026-07-31';

  console.log('Testing route steps...');

  // 1. revUrl
  const revUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`;
  console.log('Fetching revenue-summary:', revUrl);
  const revRes = await fetch(revUrl, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  const revJson = await revRes.json();
  console.log('revRes status:', revRes.status, 'has summary:', !!revJson.data?.summary || !!revJson.summary);

  // 2. matrixUrl
  const matrixUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`;
  console.log('Fetching matrix-weekly:', matrixUrl);
  const matrixRes = await fetch(matrixUrl, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  const matrixJson = await matrixRes.json();
  console.log('matrixRes status:', matrixRes.status, 'rows count:', matrixJson.data?.length);

  // 3. v6 facility-groups
  const v6Url = `${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`;
  console.log('Fetching v6 facility-groups:', v6Url);
  const v6Res = await fetch(v6Url, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  const v6Json = await v6Res.json();
  console.log('v6Res status:', v6Res.status, 'venues count:', v6Json.data?.venues?.length);

  // 4. Check v5 mapping
  const v5Url = `${BACKEND_URL}/api/v5/admin/mapping/team`;
  console.log('Fetching v5 mapping:', v5Url);
  const v5Res = await fetch(v5Url, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  console.log('v5Res status:', v5Res.status);
  const v5Json = await v5Res.json().catch(() => ({}));
  console.log('v5Json keys:', Object.keys(v5Json));
}

testRouteLocally().catch(console.error);
