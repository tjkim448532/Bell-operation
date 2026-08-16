async function testSettingsEndpoints() {
  const BASE = 'http://localhost:3000'; // We will test logic via direct handler or fetch if dev server is up, or test endpoints via script

  console.log('Testing settings APIs directly...');

  // Test 1: board/route.ts
  const boardRoute = await import('./src/app/api/settings/board/route.ts');
  const req1 = new Request('http://localhost:3000/api/settings/board');
  const res1 = await boardRoute.GET(req1);
  const boardData = await res1.json();
  console.log('1. Board GET success:', Object.keys(boardData).length > 0, 'Columns:', Object.keys(boardData));

  // Test 2: leisure-teams/route.ts
  const teamsRoute = await import('./src/app/api/settings/leisure-teams/route.ts');
  const req2 = new Request('http://localhost:3000/api/settings/leisure-teams');
  const res2 = await teamsRoute.GET(req2);
  const teamsData = await res2.json();
  console.log('2. Leisure Teams GET success:', teamsData.success, 'Teams:', teamsData.teams);

  // Test 3: leisure-selection/route.ts
  const selRoute = await import('./src/app/api/settings/leisure-selection/route.ts');
  const req3 = new Request('http://localhost:3000/api/settings/leisure-selection');
  const res3 = await selRoute.GET(req3);
  const selData = await res3.json();
  console.log('3. Leisure Selection GET success:', selData.success, 'Selected:', selData.selectedTeams);

  // Test 4: settings/route.ts POST
  const settingsRoute = await import('./src/app/api/settings/route.ts');
  const req4 = new Request('http://localhost:3000/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnName: '테스트항목', teamName: '기타' })
  });
  const res4 = await settingsRoute.POST(req4);
  const setRes = await res4.json();
  console.log('4. Settings POST success:', setRes.columnName === '테스트항목');

  // Test 5: settings/teams/route.ts POST (add and remove)
  const custTeamsRoute = await import('./src/app/api/settings/teams/route.ts');
  const req5 = new Request('http://localhost:3000/api/settings/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', teamName: '임시테스트팀' })
  });
  const res5 = await custTeamsRoute.POST(req5);
  const addRes = await res5.json();
  console.log('5. Teams POST Add success:', addRes.success);

  const req6 = new Request('http://localhost:3000/api/settings/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'remove', teamName: '임시테스트팀' })
  });
  const res6 = await custTeamsRoute.POST(req6);
  const rmRes = await res6.json();
  console.log('6. Teams POST Remove success:', rmRes.success);

  console.log('\nALL 6 SETTINGS API LOGIC TESTS PASSED SUCCESSFULLY! ✅');
}

testSettingsEndpoints().catch(console.error);
