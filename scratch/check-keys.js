const fetch = require('node-fetch');

async function checkKeys() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  console.log('Testing date=2026-08-16:');
  const resSingle = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?date=2026-08-16`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const jsonSingle = await resSingle.json();
  const sample = (jsonSingle.data || [])[0];
  console.log('Keys in date=2026-08-16:', Object.keys(sample || {}));
  console.log('Sample full object:', sample);
}

checkKeys();
