const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
    
    // Test the API
    fetch('http://localhost:3000/api/dashboard?month=2026-06')
      .then(res => res.text())
      .then(text => {
         console.log('--- RESPONSE ---');
         console.log(text.substring(0, 500));
         process.exit(0);
      })
      .catch(err => {
         console.error('--- FETCH ERROR ---');
         console.error(err);
         process.exit(1);
      });
  });
});
