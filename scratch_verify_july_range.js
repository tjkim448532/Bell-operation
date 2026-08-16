async function verifyJulyRange() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  console.log('=== Checking 2026-07 Full Month Query ===');
  const url = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  const json = await res.json();
  
  console.log('Query URL:', url);
  console.log('Success:', json.success || !!json.data);
  
  const rows = json.data || [];
  const kart = rows.find(r => r.shopName === '마운틴카트');
  const total = rows.find(r => r.isGrandTotal);
  const leisureSub = rows.find(r => r.categoryCode === 'TICKET' && r.isSubtotal && r.partName === '소계');

  console.log('\n[2026-07-01 ~ 2026-07-31 (7월 1일~31일 전체 31일 누계)]');
  console.log(' - 마운틴카트 (7월 31일 누계):', kart?.mtdActual || kart?.todayActual);
  console.log(' - 레저본부 소계 (7월 31일 누계):', leisureSub?.mtdActual);
  console.log(' - 전사 총계 (7월 31일 누계):', total?.mtdActual);

  // Compare with half month: 2026-07-01 ~ 2026-07-15
  const halfUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-15`;
  const halfRes = await fetch(halfUrl, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  const halfJson = await halfRes.json();
  const halfRows = halfJson.data || [];
  const halfKart = halfRows.find(r => r.shopName === '마운틴카트');
  console.log('\n[2026-07-01 ~ 2026-07-15 (7월 보름 누계)]');
  console.log(' - 마운틴카트 (7월 15일 보름 누계):', halfKart?.mtdActual || halfKart?.todayActual || halfKart?.rangeActual);
}

verifyJulyRange();
