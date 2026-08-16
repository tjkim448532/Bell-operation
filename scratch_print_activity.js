async function printAllActivityShops() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Matrix Weekly
  const mRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const mJson = await mRes.json();
  const matrixRows = mJson.data || [];

  console.log('=== All Activity Shops in Matrix-Weekly (2026-07) ===');
  matrixRows.filter(r => r.partName === '액티비티').forEach(r => {
    console.log(`shopName: "${r.shopName}", isSubtotal: ${r.isSubtotal}, mtdActual: ${r.mtdActual}, visitors: ${r.visitors}`);
  });

  // 2. SalesByFacility in Revenue-Summary
  const sRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const sJson = await sRes.json();
  const facs = sJson.data?.salesByFacility || sJson.salesByFacility || [];
  console.log('\n=== All Facilities in salesByFacility (2026-07) ===');
  facs.filter(f => f.teamName === '레저본부' || f.categoryCode === 'TICKET').forEach(f => {
    console.log(`cat: [${f.categoryCode}] team: [${f.teamName}] shop: "${f.shopName}" fac: "${f.facilityName}" todayActual: ${f.todayActual}`);
  });
}

printAllActivityShops();
