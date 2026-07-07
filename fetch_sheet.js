const https = require('https');
const fs = require('fs');

const url = "https://docs.google.com/spreadsheets/d/1wlNrE_FvXCYNGfyvIYxEidYLKoEas4pidWe0Z9e_2xs/export?format=csv";

https.get(url, (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    https.get(res.headers.location, (res2) => {
      let data = '';
      res2.on('data', chunk => data += chunk);
      res2.on('end', () => {
        fs.writeFileSync('sheet.csv', data);
        console.log('Downloaded sheet.csv successfully. Length:', data.length);
      });
    });
  } else {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      fs.writeFileSync('sheet.csv', data);
      console.log('Downloaded sheet.csv successfully. Length:', data.length);
    });
  }
}).on('error', (err) => {
  console.error('Error:', err.message);
});
