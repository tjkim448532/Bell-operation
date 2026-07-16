const fetch = require('node-fetch');

fetch('https://belleforet-data.vercel.app/api/v5/dashboard/matrix-weekly?date=2026-06-30', {
  headers: {
    'Authorization': 'Bearer belleforet-m2m-secret'
  }
})
.then(r => r.json())
.then(json => {
  const data = json.data || [];
  const farmData = data.filter(d => 
    ['얼룩말카페', '벨포레 목장', '놀이동산', '목장', '목장체험'].includes(d.teamName) || 
    ['얼룩말카페', '벨포레 목장', '놀이동산', '목장체험'].includes(d.shopName) || 
    (d.partName && d.partName.includes('목장')) || 
    (d.shopName && d.shopName.includes('목장')) || 
    (d.shopName && d.shopName.includes('얼룩말'))
  );
  
  farmData.forEach(d => {
    console.log(`${d.categoryName} > ${d.teamName} > ${d.partName} > ${d.shopName} [isSubtotal: ${d.isSubtotal}, Type: ${d.subtotalType}]: ${d.mtdActual}`);
  });
})
.catch(console.error);
