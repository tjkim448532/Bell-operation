const BACKEND_URL = 'https://belleforet-data.vercel.app';
const API_SECRET = 'belleforet-m2m-secret';

async function test() {
  const res = await fetch(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
      headers: { 'Authorization': `Bearer ${API_SECRET}` },
      cache: 'no-store'
  });
  const data = await res.json();
  console.log(JSON.stringify(data.data.slice(0, 2), null, 2));
}

test();
