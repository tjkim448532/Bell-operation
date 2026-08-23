const fetch = require('node-fetch');

async function debugCorrelation() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';
  const date = '2026-07-31';

  const corrUrl = `${BACKEND_URL}/api/v5/report/channel-correlation?date=${date}`;
  console.log('Fetching:', corrUrl);
  const res = await fetch(corrUrl, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  console.log('Response status:', res.status, 'success:', json.success);
  if (!json.success || !json.data) {
    console.log('No data:', json);
    return;
  }

  const { dailyLeisure, dailyRooms } = json.data;
  console.log('dailyLeisure length:', dailyLeisure?.length);
  console.log('dailyRooms length:', dailyRooms?.length);

  const leisureMap = {};
  (dailyLeisure || []).forEach(r => {
    leisureMap[r.date] = r.leisureRev;
  });

  const roomsMap = {};
  (dailyRooms || []).forEach(r => {
    if (!roomsMap[r.date]) roomsMap[r.date] = {};
    roomsMap[r.date][r.channelName] = r.roomsSold;
  });

  const dailyData = [];
  Object.keys(leisureMap).forEach(dStr => {
    dailyData.push({
      date: dStr,
      leisureRev: leisureMap[dStr] || 0,
      channelRooms: roomsMap[dStr] || {}
    });
  });

  console.log('dailyData count:', dailyData.length);

  const isWeekend = (dateStr) => {
    const day = new Date(dateStr).getDay();
    return day === 5 || day === 6;
  };

  const channels = new Set();
  dailyData.forEach(d => Object.keys(d.channelRooms).forEach(c => channels.add(c)));
  console.log('Channels found:', Array.from(channels));

  const calculatePearson = (x, y) => {
    const n = x.length;
    if (n === 0) return 0;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const num = (n * sumXY) - (sumX * sumY);
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (den === 0) return 0;
    return num / den;
  };

  const correlations = [];
  channels.forEach(ch => {
    const totalX = [], totalY = [];
    const weekdayX = [], weekdayY = [];
    const weekendX = [], weekendY = [];

    dailyData.forEach(d => {
      const xVal = d.channelRooms[ch] || 0;
      const yVal = d.leisureRev;
      totalX.push(xVal);
      totalY.push(yVal);

      if (isWeekend(d.date)) {
        weekendX.push(xVal);
        weekendY.push(yVal);
      } else {
        weekdayX.push(xVal);
        weekdayY.push(yVal);
      }
    });

    const rTotal = calculatePearson(totalX, totalY);
    const rWeekday = calculatePearson(weekdayX, weekdayY);
    const rWeekend = calculatePearson(weekendX, weekendY);

    const avgTotal = totalX.reduce((a, b) => a + b, 0) / (totalX.length || 1);
    const avgWeekday = weekdayX.reduce((a, b) => a + b, 0) / (weekdayX.length || 1);
    const avgWeekend = weekendX.reduce((a, b) => a + b, 0) / (weekendX.length || 1);

    console.log(`Channel ${ch}: rTotal=${rTotal}, avgTotal=${avgTotal}`);

    if (!isNaN(rTotal) && Math.round(avgTotal) > 0) {
      correlations.push({
        channelName: ch,
        correlationTotal: isNaN(rTotal) ? 0 : rTotal,
        correlationWeekday: isNaN(rWeekday) ? 0 : rWeekday,
        correlationWeekend: isNaN(rWeekend) ? 0 : rWeekend,
        avgRoomsTotal: avgTotal,
        avgRoomsWeekday: avgWeekday,
        avgRoomsWeekend: avgWeekend
      });
    }
  });

  console.log('Final correlations:', correlations);
}

debugCorrelation();
