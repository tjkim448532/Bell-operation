const https = require('https');
const url = 'https://api.belleforet.com/api/v5/dashboard/revenue-summary?startDate=2026-06-01&endDate=2026-06-30';
const token = 'belleforet-m2m-secret';

https.get(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Top level keys:', Object.keys(json));
      if (json.data) {
        console.log('Data keys:', Object.keys(json.data));
        console.log('roomSummary:', json.data.roomSummary?.length);
        console.log('roomTypeBreakdown:', json.data.roomTypeBreakdown?.length);
        if (json.data.roomTypeBreakdown && json.data.roomTypeBreakdown.length > 0) {
          console.log('First roomTypeBreakdown item:', json.data.roomTypeBreakdown[0]);
        }
        console.log('ticketSummary:', json.data.ticketSummary?.length);
        if (json.data.ticketSummary && json.data.ticketSummary.length > 0) {
          console.log('First ticketSummary item:', json.data.ticketSummary[0]);
        }
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('Raw data:', data.slice(0, 500));
    }
  });
}).on('error', console.error);
