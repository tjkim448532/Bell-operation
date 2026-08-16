async function testParallelFetch() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';
  const startDate = '2026-07-01';
  const endDate = '2026-07-31';

  console.log('Testing Parallel Fetch...');
  const t0 = Date.now();

  const [revRes, matrixRes, utilRes, v6Res, teamMapRes] = await Promise.all([
    fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${startDate}&endDate=${endDate}`, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    }),
    fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    }),
    fetch(`${BACKEND_URL}/api/v5/dashboard/utilization-mtd?date=${endDate}`, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    }),
    fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    }),
    fetch(`${BACKEND_URL}/api/v6/admin/mapping/team`, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    })
  ]);

  const [revJson, matrixJson, utilJson, v6Json, teamMapJson] = await Promise.all([
    revRes.ok ? revRes.json() : null,
    matrixRes.ok ? matrixRes.json() : null,
    utilRes.ok ? utilRes.json() : null,
    v6Res.ok ? v6Res.json() : null,
    teamMapRes.ok ? teamMapRes.json() : null
  ]);

  console.log(`All 5 external APIs completed in ${((Date.now() - t0)/1000).toFixed(2)}s!`);
}

testParallelFetch();
