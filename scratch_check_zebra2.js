async function checkZebra() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const matrixUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`;
  const res = await fetch(matrixUrl, {
    headers: {
      'Authorization': `Bearer ${m2mToken}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bell-Operation/1.0',
      'Accept': 'application/json'
    }
  });

  const json = await res.json();
  const rows = json.data || [];
  console.log(`Total matrix rows: ${rows.length}`);

  console.log('=== All rows containing "얼룩말", "목장", or FNB / Cafe ===');
  rows.forEach(r => {
    const s = JSON.stringify(r);
    if (s.includes('얼룩말') || s.includes('목장') || s.includes('카페') || s.includes('FNB')) {
      console.log(`- [${r.categoryCode}] [${r.categoryName}] [${r.teamName}] [${r.partName}] shop: "${r.shopName}", fac: "${r.facilityName}", isSub: ${r.isSubtotal}, mtdActual: ${r.mtdActual}, todayActual: ${r.todayActual}`);
    }
  });
}

checkZebra();
