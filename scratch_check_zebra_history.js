async function checkZebraHistory() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const periods = [
    { name: '2026-05 (5월)', start: '2026-05-01', end: '2026-05-31' },
    { name: '2026-06 (6월)', start: '2026-06-01', end: '2026-06-30' },
    { name: '2026-07 (7월)', start: '2026-07-01', end: '2026-07-31' },
    { name: '2026-08 (8월)', start: '2026-08-01', end: '2026-08-16' },
  ];

  console.log('=== History of 얼룩말카페 and 목장 across Months ===');
  for (const p of periods) {
    const matrixUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${p.start}&endDate=${p.end}`;
    const res = await fetch(matrixUrl, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    });
    if (!res.ok) continue;
    const json = await res.json();
    const rows = json.data || [];

    const zebra = rows.find(r => r.shopName === '얼룩말카페');
    const ranch = rows.find(r => r.shopName === '벨포레 목장');
    const ranchSub = rows.find(r => r.partName === '목장' && r.isSubtotal);

    console.log(`\n[${p.name}]`);
    console.log(` - 얼룩말카페: ${zebra ? zebra.mtdActual : '없음'}`);
    console.log(` - 벨포레 목장: ${ranch ? ranch.mtdActual : '없음'}`);
    console.log(` - [목장 소계]: ${ranchSub ? ranchSub.mtdActual : '없음'}`);
  }
}

checkZebraHistory();
