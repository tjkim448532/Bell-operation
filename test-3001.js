const { spawn } = require('child_process');

const server = spawn('npx', ['next', 'dev', '-p', '3001'], { shell: true });

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  if (output.includes('Ready') || output.includes('compiled client and server')) {
    setTimeout(() => {
      fetch('http://localhost:3001/api/dashboard?month=2026-06')
        .then(res => res.text().then(text => ({ status: res.status, text })))
        .then(({ status, text }) => {
          console.log(`--- RESPONSE STATUS: ${status} ---`);
          console.log(text.substring(0, 1000));
          process.exit(0);
        })
        .catch(err => {
          console.error('Fetch error:', err);
          process.exit(1);
        });
    }, 2000);
  }
});

server.stderr.on('data', (data) => {
  console.error(data.toString());
});
