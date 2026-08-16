async function searchAllZebraSales() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Check daily-sales report
  const dsUrl = `${BACKEND_URL}/api/v5/report/daily-sales?startDate=2026-07-01&endDate=2026-07-31`;
  const dsRes = await fetch(dsUrl, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  if (dsRes.ok) {
    const dsJson = await dsRes.json();
    console.log('Daily Sales Report keys:', Object.keys(dsJson));
    const text = JSON.stringify(dsJson);
    const matches = text.match(/.{0,50}얼룩말.{0,50}/g);
    console.log('Daily Sales matches for 얼룩말:', matches);
  }

  // 2. Check all facility groups in v5 and v6
  const mapV5Url = `${BACKEND_URL}/api/v5/admin/mapping/facility-groups?mode=ALL`;
  const mapV5Res = await fetch(mapV5Url, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  const mapV5Json = await mapV5Res.json();
  console.log('\n=== V5 facility mappings with 얼룩말 or 카페 ===');
  (mapV5Json.data?.venues || []).filter(v => JSON.stringify(v).includes('얼룩말') || JSON.stringify(v).includes('목장')).forEach(v => {
    console.log(v);
  });

  // 3. Check revenue-summary by facility
  const sumUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=2026-07-01&endDate=2026-07-31`;
  const sumRes = await fetch(sumUrl, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  const sumJson = await sumRes.json();
  const salesByFac = sumJson.data?.salesByFacility || sumJson.salesByFacility || [];
  console.log('\n=== salesByFacility for 2026-07 ===');
  salesByFac.filter(f => JSON.stringify(f).includes('얼룩말') || JSON.stringify(f).includes('목장')).forEach(f => {
    console.log(f);
  });
}

searchAllZebraSales();
