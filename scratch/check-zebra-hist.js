const fetch = require('node-fetch');

async function check() {
  const dates = ['2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30'];
  const token = 'belleforet-m2m-secret';
  
  for (const date of dates) {
    const url = `https://belleforet-data.vercel.app/api/v5/dashboard/matrix-weekly?date=${date}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    const data = json.data || [];
    
    const zebra = data.filter(r => (r.shopName || '').includes('얼룩말'));
    console.log(`--- ${date} ---`);
    zebra.forEach(z => console.log(z.shopName, z.mtdActual));
  }
}

check();
