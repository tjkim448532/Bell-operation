const fetch = require('node-fetch');

const KOREAN_HOLIDAYS_SET = new Set([
  '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-03-01', '2025-03-03',
  '2025-05-05', '2025-05-06', '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05',
  '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '2025-12-25',
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02',
  '2026-05-05', '2026-05-24', '2026-05-25', '2026-06-06', '2026-08-15', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25'
]);

function isWeekendOrHoliday(dateStr) {
  if (KOREAN_HOLIDAYS_SET.has(dateStr)) return true;
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function getMonthRanges(startMonth, endMonth) {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  const lastDay = new Date(ey, em, 0).getDate();

  const ranges = [];
  let currentYear = sy;
  let currentMonth = sm;
  
  const curDate = new Date(Date.UTC(sy, sm - 1, 1));
  const endDate = new Date(Date.UTC(ey, em - 1, lastDay));

  let currentType = isWeekendOrHoliday(curDate.toISOString().slice(0, 10)) ? 'weekend' : 'weekday';
  let rangeStart = curDate.toISOString().slice(0, 10);

  while (curDate <= endDate) {
    const dateStr = curDate.toISOString().slice(0, 10);
    const dayType = isWeekendOrHoliday(dateStr) ? 'weekend' : 'weekday';

    if (dayType !== currentType) {
      const prevDate = new Date(curDate);
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      ranges.push({
        type: currentType,
        startDate: rangeStart,
        endDate: prevDate.toISOString().slice(0, 10)
      });
      rangeStart = dateStr;
      currentType = dayType;
    }

    curDate.setUTCDate(curDate.getUTCDate() + 1);
  }

  ranges.push({
    type: currentType,
    startDate: rangeStart,
    endDate: endDate.toISOString().slice(0, 10)
  });

  return ranges;
}

async function testContiguousRanges() {
  const ranges = getMonthRanges('2026-07', '2026-07');
  console.log('Total ranges generated for 2026-07:', ranges.length);
  ranges.forEach(r => console.log(`[${r.type}] ${r.startDate} ~ ${r.endDate}`));

  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const t0 = Date.now();
  const results = await Promise.all(
    ranges.map(async r => {
      const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${r.startDate}&endDate=${r.endDate}`, {
        headers: { 'Authorization': `Bearer ${m2mToken}` }
      });
      const json = await res.json();
      return { type: r.type, rows: json.data || [] };
    })
  );

  console.log(`Fetched ${ranges.length} ranges in ${Date.now() - t0}ms`);

  let weekdayTicket = 0;
  let weekendTicket = 0;

  results.forEach(res => {
    const rawRows = res.rows.filter(r => r.categoryCode === 'TICKET' && !r.isSubtotal && !r.partName.includes('리조트'));
    const amount = rawRows.reduce((sum, r) => sum + (Number(String(r.rangeActual || 0).replace(/,/g, '')) || 0), 0);
    if (res.type === 'weekday') weekdayTicket += amount;
    else weekendTicket += amount;
  });

  console.log('Weekday Ticket (Pure Leisure):', Math.round(weekdayTicket).toLocaleString());
  console.log('Weekend Ticket (Pure Leisure):', Math.round(weekendTicket).toLocaleString());
  console.log('Total:', Math.round(weekdayTicket + weekendTicket).toLocaleString());
}

testContiguousRanges();
