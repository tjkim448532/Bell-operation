const fetch = require('node-fetch');

async function check() {
  const url = 'https://belleforet-data.vercel.app/api/v5/dashboard/matrix-weekly?date=2026-07-17';
  const token = 'belleforet-m2m-secret';
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const json = await res.json();
  const data = json.data || [];
  
  const matches = data.filter(r => (r.shopName || '').includes('얼룩말카페') || (r.teamName || '').includes('얼룩말카페'));
  console.log(JSON.stringify(matches, null, 2));
}

check();
