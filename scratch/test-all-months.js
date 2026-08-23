const fetch = require('node-fetch');

async function testYearlyExpenses() {
  const res = await fetch('http://localhost:3000/api/analysis?team=all&startMonth=2026-01&endMonth=2026-12&type=expense');
  console.log('Local status:', res.status);
}

// Let's test with the live deployment url or Firebase admin
async function testFirebaseMonths() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // Check what months exist in 2026
  // 1월 ~ 12월
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthResults = [];

  for (const m of months) {
    const start = `2026-${m}-01`;
    const lastDay = new Date(2026, Number(m), 0).getDate();
    const end = `2026-${m}-${lastDay}`;

    const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${start}&endDate=${end}`, {
      headers: { 'Authorization': `Bearer ${m2mToken}` }
    });
    if (res.ok) {
      const json = await res.json();
      const rows = json.data || [];
      const ticketSubtotal = rows.find(r => r.categoryCode === 'TICKET' && r.isSubtotal && r.subtotalType === 'category');
      const val = ticketSubtotal ? Number(String(ticketSubtotal.todayActual || ticketSubtotal.rangeActual || 0).replace(/,/g, '')) : 0;
      monthResults.push({ month: `2026-${m}`, revenue: val });
    }
  }

  console.log('2026 Monthly Revenues:', monthResults);
}

testFirebaseMonths();
