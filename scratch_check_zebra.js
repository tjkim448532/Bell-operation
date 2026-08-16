async function checkZebraCafe() {
  const API_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Check matrix-weekly for 2026-07-01 ~ 2026-07-31
  const res = await fetch(`${API_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  console.log('=== Searching all rows for "얼룩말" in Matrix-Weekly (2026-07) ===');
  const zebraRows = rows.filter(r => 
    JSON.stringify(r).includes('얼룩말') || 
    JSON.stringify(r).includes('목장')
  );
  
  zebraRows.forEach(r => {
    console.log(`category: [${r.categoryCode}] [${r.categoryName}], team: [${r.teamName}], part: [${r.partName}], shop: [${r.shopName}], fac: [${r.facilityName}], isSub: ${r.isSubtotal}, mtdActual: ${r.mtdActual}, todayActual: ${r.todayActual}`);
  });

  // 2. Check facility groups / mode=ALL
  const fgRes = await fetch(`${API_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const fgJson = await fgRes.json();
  const allVenues = fgJson.data?.venues || [];
  const zebraVenues = allVenues.filter(v => JSON.stringify(v).includes('얼룩말') || JSON.stringify(v).includes('목장'));
  console.log('\n=== Venues for Zebra / Ranch in mode=ALL ===');
  console.log(zebraVenues);

  // 3. Also check V6 matrix-weekly
  const v6Res = await fetch(`${API_URL}/api/v6/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const v6Json = await v6Res.json();
  const v6Rows = v6Json.data || [];
  console.log('\n=== V6 Matrix Rows for Zebra ===');
  v6Rows.filter(r => JSON.stringify(r).includes('얼룩말')).forEach(r => {
    console.log(`category: [${r.categoryCode}] [${r.categoryName}], team: [${r.teamName}], part: [${r.partName}], shop: [${r.shopName}], fac: [${r.facilityName}], isSub: ${r.isSubtotal}, mtdActual: ${r.mtdActual}, todayActual: ${r.todayActual}`);
  });
}

checkZebraCafe();
