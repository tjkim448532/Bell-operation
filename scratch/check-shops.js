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
    .filter(r => r.teamName === '레저본부' && !r.isSubtotal)
    .map(r => r.shopName);
    
  console.log([...new Set(shops)]);
}

check();
