const fetch = require('node-fetch');

async function check() {
  const url = 'https://belleforet-data.vercel.app/api/v5/dashboard/matrix-weekly?date=2026-07-17';
  const token = 'belleforet-m2m-secret';
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const json = await res.json();
  const data = json.data || [];
  
  const shops = data
    .filter(r => (r.shopName || '').includes('주차') || (r.shopName || '').includes('얼룩말'))
    .map(r => ({ shopName: r.shopName, teamName: r.teamName }));
    
  console.log(shops);
}

check();
