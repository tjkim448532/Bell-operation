const https = require('https');

async function testFetch() {
  const BACKEND_URL = 'https://api.belleforet.com';
  const m2mToken = 'belleforet-m2m-secret';

  const getDates = (start, end) => {
    const arr = [];
    const dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
      arr.push(new Date(dt).toISOString().split('T')[0]);
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  };
  
  const dateList = getDates('2026-06-01', '2026-06-05'); // just 5 days
  
  const fetchPromises = dateList.map(dateStr => {
    return new Promise((resolve) => {
      const reqUrl = `${BACKEND_URL}/api/v5/dashboard/revenue-summary?startDate=${dateStr}`;
      https.get(reqUrl, { headers: { 'Authorization': `Bearer ${m2mToken}` } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch(e) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  });

  const results = await Promise.all(fetchPromises);
  
  let externalData = {
    ticketSummary: [],
    fnbSummary: [],
    golfSummary: [],
    roomSummary: [],
    roomTypeBreakdown: [],
    roomMarketBreakdown: [],
    channelBreakdown: [],
    dailyReportBreakdown: [],
    ticketFacilityBreakdown: [],
    leisureProductBreakdown: [],
    leisureVisitorBreakdown: []
  };

  results.forEach(json => {
    if (!json) return;
    const dayData = json.data || json;
    if (dayData.ticketSummary) externalData.ticketSummary.push(...(Array.isArray(dayData.ticketSummary) ? dayData.ticketSummary : [dayData.ticketSummary]));
    if (dayData.fnbSummary) externalData.fnbSummary.push(...(Array.isArray(dayData.fnbSummary) ? dayData.fnbSummary : [dayData.fnbSummary]));
    if (dayData.golfSummary) externalData.golfSummary.push(...(Array.isArray(dayData.golfSummary) ? dayData.golfSummary : [dayData.golfSummary]));
    if (dayData.roomSummary) externalData.roomSummary.push(...(Array.isArray(dayData.roomSummary) ? dayData.roomSummary : [dayData.roomSummary]));
    if (dayData.roomTypeBreakdown) externalData.roomTypeBreakdown.push(...(Array.isArray(dayData.roomTypeBreakdown) ? dayData.roomTypeBreakdown : []));
    if (dayData.roomMarketBreakdown) externalData.roomMarketBreakdown.push(...(Array.isArray(dayData.roomMarketBreakdown) ? dayData.roomMarketBreakdown : []));
  });

  console.log("ticketSummary length:", externalData.ticketSummary.length);
  if (externalData.ticketSummary.length > 0) {
    console.log("ticketSummary first item:", externalData.ticketSummary[0]);
  }
  
  console.log("roomTypeBreakdown length:", externalData.roomTypeBreakdown.length);
  if (externalData.roomTypeBreakdown.length > 0) {
    console.log("roomTypeBreakdown first item:", externalData.roomTypeBreakdown[0]);
  }
}

testFetch();
