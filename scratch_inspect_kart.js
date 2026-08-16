async function inspectMountainKart() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Check Matrix Weekly for July 2026
  const mRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const mJson = await mRes.json();
  const matrixRows = mJson.data || [];

  console.log('=== Matrix Rows matching 마운틴카트 or 카트 in 2026-07 ===');
  matrixRows.filter(r => JSON.stringify(r).includes('마운틴') || JSON.stringify(r).includes('카트') || JSON.stringify(r).includes('루지')).forEach(r => {
    console.log(r);
  });

  // 2. Check salesByFacility in revenue-summary for July 2026
  const sRes = await fetch(`${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const sJson = await sRes.json();
  const facs = sJson.data?.salesByFacility || sJson.salesByFacility || [];
  console.log('\n=== salesByFacility matching 마운틴카트 in 2026-07 ===');
  facs.filter(f => JSON.stringify(f).includes('마운틴') || JSON.stringify(f).includes('루지') || JSON.stringify(f).includes('카트')).forEach(f => {
    console.log(f);
  });

  // 3. Check V6 and V5 facility mappings
  const fgRes = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const fgJson = await fgRes.json();
  console.log('\n=== V6 Venues matching 마운틴카트 ===');
  (fgJson.data?.venues || []).filter(v => JSON.stringify(v).includes('마운틴') || JSON.stringify(v).includes('루지') || JSON.stringify(v).includes('카트')).forEach(v => {
    console.log(v);
  });

  // 4. Check monthly history of 마운틴카트 across 2026-05, 2026-06, 2026-07, 2026-08
  const periods = [
    { name: '2026-05 (5월 1달)', start: '2026-05-01', end: '2026-05-31' },
    { name: '2026-06 (6월 1달)', start: '2026-06-01', end: '2026-06-30' },
    { name: '2026-07 (7월 1달)', start: '2026-07-01', end: '2026-07-31' },
    { name: '2026-08 (8월 1~16일)', start: '2026-08-01', end: '2026-08-16' },
  ];

  console.log('\n=== Monthly History of 마운틴카트 ===');
  for (const p of periods) {
    const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${p.start}&endDate=${p.end}`, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    });
    if (!res.ok) continue;
    const j = await res.json();
    const rows = j.data || [];
    const mk = rows.find(r => r.shopName === '마운틴카트' || r.facilityName === '마운틴카트');
    console.log(`[${p.name}] 마운틴카트 mtdActual: ${mk ? mk.mtdActual : '없음'}`);
  }
}

inspectMountainKart();
