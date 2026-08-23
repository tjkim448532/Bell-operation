const fetch = require('node-fetch');

async function testOrgApi() {
  const url = 'https://belleforet-data-git-main-tjkim448532s-projects.vercel.app/api/v6/report/leisure-organization';
  try {
    const res = await fetch(url);
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

testOrgApi();
