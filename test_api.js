const https = require('https');

https.get('https://api.belleforet.com/api/v5/dashboard/revenue-summary?startDate=2026-06-01&endDate=2026-06-30', {
  headers: { 'Authorization': 'Bearer belleforet-m2m-secret' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const cb = json.channelBreakdown || json.data?.channelBreakdown;
    console.log(cb ? JSON.stringify(cb.slice(0, 3), null, 2) : 'No channelBreakdown');
  });
}).on('error', console.error);
