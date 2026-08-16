async function checkDashboardJuly() {
  const BACKEND_URL = 'http://localhost:3000'; // or test against deployed / local Next
  // Or test against the backend API directly:
  const API_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';
  
  // Let's check backend matrix-weekly for 2026-07 (July)
  const res = await fetch(`${API_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const rows = json.data || [];

  console.log(`=== Backend Matrix for 2026-07-01 ~ 2026-07-31 (${rows.length} rows) ===`);
  const leisureRows = rows.filter(r => r.categoryCode === 'TICKET' || r.partName === '액티비티' || r.partName === '목장' || r.partName === '미디어아트' || r.partName === '놀이동산');
  
  console.log('Sample leisure revenue rows:');
  leisureRows.slice(0, 10).forEach(r => {
    console.log(` - [${r.partName}] ${r.shopName || r.facilityName}: mtdActual=${r.mtdActual}, todayActual=${r.todayActual}`);
  });

  const grandTotalRow = rows.find(r => r.isGrandTotal);
  console.log('Grand Total row:', grandTotalRow ? grandTotalRow.mtdActual : 'none');
}

checkDashboardJuly();
