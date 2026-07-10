const https = require('https');

async function checkProd() {
  const url = 'https://dashboard.belleforet.com/api/dashboard?startDate=2026-07-01&endDate=2026-07-06';
  console.log('Fetching', url);
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('Total Revenue:', json.totalRevenue);
        console.log('Pre-Calculated Guests:', json.preCalculatedExpectedGuests);
        console.log('Team Data:', json.teamData);
      } catch(e) {
        console.log('Error parsing JSON:', data.slice(0, 500));
      }
    });
  }).on('error', console.error);
}

checkProd();
