import { GET } from './src/app/api/dashboard/route.ts';

const mockRequest = {
  url: 'http://localhost/api/dashboard?month=2026-06',
  headers: {
    get: (key) => ''
  }
};

(async () => {
  try {
    const res = await GET(mockRequest);
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Keys:", Object.keys(json));
    console.log("Revenue:", json.totalRevenue);
    console.log("minDate:", json.minDate);
  } catch (err) {
    console.error("FATAL:", err);
  }
})();
