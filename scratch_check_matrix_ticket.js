async function checkRawMatrixRows() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  console.log('=== All Ticket / Leisure Rows from Backend Matrix-Weekly ===');
  rows.filter(r => r.categoryCode === 'TICKET').forEach(r => {
    console.log(`part: [${r.partName}] shop: "${r.shopName}" isSub: ${r.isSubtotal} mtd: ${r.mtdActual}`);
  });
}

checkRawMatrixRows();
