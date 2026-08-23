const fetch = require('node-fetch');

async function testMainOrgApi() {
  const url = 'https://belleforet-data.vercel.app/api/v6/report/leisure-organization';
  const m2mToken = 'belleforet-m2m-secret';
  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
    console.log('leisure-organization status:', res.status);
    if (res.ok) {
      const json = await res.json();
      console.log('Org summary:', json.summary);
      console.log('Org parts count:', json.parts?.length);
    }
  } catch (e) {
    console.error('Error fetching org api:', e.message);
  }
}

testMainOrgApi();
