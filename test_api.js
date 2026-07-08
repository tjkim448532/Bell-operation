const https = require('https');

https.get('https://api.belleforet.com/api/v5/dashboard/revenue-summary?startDate=2026-06-01&endDate=2026-06-30', {
  headers: { 'Authorization': 'Bearer belleforet-m2m-secret' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const roomTypeBreakdown = json.roomTypeBreakdown || json.data?.roomTypeBreakdown || [];
      const leisureVisitorBreakdown = json.leisureVisitorBreakdown || json.data?.leisureVisitorBreakdown || [];
      console.log('roomTypeBreakdown (first 3):', JSON.stringify(roomTypeBreakdown.slice(0, 3), null, 2));
      console.log('leisureVisitorBreakdown (first 3):', JSON.stringify(leisureVisitorBreakdown.slice(0, 3), null, 2));
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
}).on('error', console.error);
