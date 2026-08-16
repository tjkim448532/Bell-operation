async function testLiveFirebaseApp() {
  try {
    const res = await fetch('https://bell-operation.web.app/api/dashboard?startMonth=2026-07&endMonth=2026-07');
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response body:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testLiveFirebaseApp();
