const https = require('https');
https.get('https://bell-operation.vercel.app/api/dashboard?startDate=2026-06-01&endDate=2026-06-30', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.debugExternalData) {
        console.log('Keys in debugExternalData:', Object.keys(json.debugExternalData));
        const ed = json.debugExternalData;
        
        console.log('dailyReportBreakdown length:', ed.dailyReportBreakdown ? ed.dailyReportBreakdown.length : 'undefined');
        if (ed.dailyReportBreakdown && ed.dailyReportBreakdown.length > 0) {
          console.log('dailyReportBreakdown first item:', ed.dailyReportBreakdown[0]);
        }
        
        console.log('channelBreakdown length:', ed.channelBreakdown ? ed.channelBreakdown.length : 'undefined');
        if (ed.channelBreakdown && ed.channelBreakdown.length > 0) {
          console.log('channelBreakdown first item:', ed.channelBreakdown[0]);
        }
      } else {
        console.log('No debugExternalData found in response.');
      }
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Raw text:', data.substring(0, 200));
    }
  });
}).on('error', e => console.error(e));
