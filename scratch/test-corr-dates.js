const fetch = require('node-fetch');

async function testDates() {
  const dates = ['2026-07-31', '2026-07-20', '2026-06-30', '2026-08-17', '2026-05-31'];
  for (const d of dates) {
    const url = `https://belleforet-data.vercel.app/api/v5/report/channel-correlation?date=${d}`;
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer belleforet-m2m-secret` }
      });
      const json = await res.json();
      const leisureCount = json?.data?.dailyLeisure?.length || 0;
      const roomsCount = json?.data?.dailyRooms?.length || 0;
      console.log(`Date: ${d} => status: ${res.status}, dailyLeisure: ${leisureCount}, dailyRooms: ${roomsCount}`);
      if (roomsCount > 0) {
        console.log('Sample dailyRooms:', json.data.dailyRooms.slice(0, 3));
      }
    } catch (e) {
      console.error(`Error for ${d}:`, e.message);
    }
  }
}

testDates();
