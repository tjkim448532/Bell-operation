async function testKanbanSaveTimes() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const API_SECRET = 'belleforet-m2m-secret';

  // 1. Test /api/v6/admin/mapping/facility-groups on backend
  console.log('Testing V6 mapping save to backend...');
  const t0 = Date.now();
  const v6Payload = {
    updates: [
      {
        venueName: '디노 시네마',
        targetPart: '목장',
        targetTeam: '레저본부'
      }
    ]
  };
  const v6Res = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(v6Payload)
  });
  console.log(`V6 Backend Save Status: ${v6Res.status} in ${((Date.now() - t0)/1000).toFixed(2)}s`);
  const v6Data = await v6Res.json();
  console.log('V6 Backend Save Response:', v6Data);
}

testKanbanSaveTimes().catch(console.error);
