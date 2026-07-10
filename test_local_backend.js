const http = require('http');

async function testFetch() {
  const reqUrl = `http://localhost:3000/api/v5/dashboard/revenue-summary?startDate=2026-07-06`;
  const m2mToken = 'belleforet-m2m-secret';

  return new Promise((resolve) => {
    http.get(reqUrl, { headers: { 'Authorization': `Bearer ${m2mToken}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const dayData = json.data || json;
          console.log('ticketSummary type:', Array.isArray(dayData.ticketSummary) ? 'array' : typeof dayData.ticketSummary);
          console.log('fnbSummary type:', Array.isArray(dayData.fnbSummary) ? 'array' : typeof dayData.fnbSummary);
          console.log('roomSummary type:', Array.isArray(dayData.roomSummary) ? 'array' : typeof dayData.roomSummary);
          console.log('roomTypeBreakdown type:', Array.isArray(dayData.roomTypeBreakdown) ? 'array' : typeof dayData.roomTypeBreakdown);
          
          if (Array.isArray(dayData.ticketSummary) && dayData.ticketSummary.length > 0) {
            console.log('ticketSummary first item:', dayData.ticketSummary[0]);
          }
          if (Array.isArray(dayData.roomTypeBreakdown) && dayData.roomTypeBreakdown.length > 0) {
            console.log('roomTypeBreakdown first item:', dayData.roomTypeBreakdown[0]);
          }
        } catch(e) {
          console.log('Error:', e.message);
        }
        resolve();
      });
    }).on('error', (e) => {
      console.log('Network error:', e.message);
      resolve();
    });
  });
}

testFetch();
