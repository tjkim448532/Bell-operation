const https = require('https');
const fs = require('fs');
const xlsx = require('xlsx');

const url = 'https://docs.google.com/spreadsheets/d/1oN-bL2UTsHCE7C_XTrvsLY8ZSjJpyhQVbFFFhNO3OU0/export?format=xlsx';
const dest = 'test_download.xlsx';

https.get(url, (response) => {
  if (response.statusCode === 307 || response.statusCode === 302) {
    https.get(response.headers.location, (res) => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const workbook = xlsx.readFile(dest);
          console.log('Sheets found:', workbook.SheetNames);
        });
      });
    });
  } else {
    const file = fs.createWriteStream(dest);
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        const workbook = xlsx.readFile(dest);
        console.log('Sheets found:', workbook.SheetNames);
      });
    });
  }
}).on('error', (err) => {
  console.error(err);
});
