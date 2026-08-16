async function testLiveSettingsEndpoints() {
  const BASE = 'https://bell-operation.web.app';

  console.log('Testing live settings endpoints on', BASE);

  // 1. Test /api/settings/board
  const res1 = await fetch(`${BASE}/api/settings/board`);
  const board = await res1.json();
  console.log('1. GET /api/settings/board -> Status:', res1.status, 'Cols:', Object.keys(board));

  // 2. Test /api/settings/leisure-teams
  const res2 = await fetch(`${BASE}/api/settings/leisure-teams`);
  const teams = await res2.json();
  console.log('2. GET /api/settings/leisure-teams -> Status:', res2.status, 'Teams:', teams.teams);

  // 3. Test /api/settings/leisure-selection
  const res3 = await fetch(`${BASE}/api/settings/leisure-selection`);
  const sel = await res3.json();
  console.log('3. GET /api/settings/leisure-selection -> Status:', res3.status, 'Selected:', sel.selectedTeams);

  // 4. Test /api/settings
  const res4 = await fetch(`${BASE}/api/settings`);
  const map = await res4.json();
  console.log('4. GET /api/settings -> Status:', res4.status, 'Mappings count:', Array.isArray(map) ? map.length : 0);
}

testLiveSettingsEndpoints().catch(console.error);
