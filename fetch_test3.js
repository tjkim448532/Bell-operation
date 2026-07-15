const BACKEND_URL = 'https://belleforet-data.vercel.app';
const API_SECRET = 'belleforet-m2m-secret';

async function test() {
  const revRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?date=2026-06-30`, {
      headers: { 'Authorization': `Bearer ${API_SECRET}` },
      cache: 'no-store'
  });
  const revData = await revRes.json();
  console.log('revenue-summary:', Object.keys(revData.data || {}).join(', '));
  console.log('revenue-summary summary:', Object.keys((revData.data || {}).summary || {}).join(', '));
  
  const matRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=2026-06-30`, {
      headers: { 'Authorization': `Bearer ${API_SECRET}` },
      cache: 'no-store'
  });
  const matData = await matRes.json();
  console.log('matrix-weekly keys:', Object.keys(matData.data?.[0] || {}).join(', '));
}

test();
