async function testBusinessPlan() {
  const BASE = 'https://bell-operation.web.app';

  const res = await fetch(`${BASE}/api/business-plan?startMonth=2026-07&endMonth=2026-07`);
  const json = await res.json();
  console.log('API Status:', res.status);
  console.log('Success:', json.success);
  console.log('Summary:', json.data?.summary);
}

testBusinessPlan().catch(console.error);
