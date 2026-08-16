async function inspectKartDaily() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Check daily-sales report for 2026-07-31 to see monthly accumulation
  const dsRes = await fetch(`${BACKEND_URL}/api/v5/report/daily-sales?date=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  if (dsRes.ok) {
    const dsJson = await dsRes.json();
    console.log('=== Daily Sales Report on 2026-07-31 for 마운틴카트 ===');
    const text = JSON.stringify(dsJson);
    const matches = text.match(/.{0,60}마운틴카트.{0,60}/g);
    console.log(matches);
  }

  // 2. Check if there are raw POS products or daily entries
  // Check daily-sales for a single day, e.g. 2026-07-15
  const d15Res = await fetch(`${BACKEND_URL}/api/v5/report/daily-sales?date=2026-07-15`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  if (d15Res.ok) {
    const d15Json = await d15Res.json();
    const text = JSON.stringify(d15Json);
    const matches = text.match(/.{0,60}마운틴카트.{0,60}/g);
    console.log('\n=== Daily Sales Report on 2026-07-15 for 마운틴카트 ===', matches);
  }
}

inspectKartDaily();
