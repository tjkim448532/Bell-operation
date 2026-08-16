async function test() {
  console.log('Sending request to bell-operation.web.app...');
  const start = Date.now();
  const res = await fetch('https://bell-operation.web.app/api/dashboard?startMonth=2026-07&endMonth=2026-07');
  console.log(`Received response in ${((Date.now() - start)/1000).toFixed(1)}s. Status: ${res.status}`);
  const json = await res.json();
  console.log('TotalRevenue:', json.totalRevenue);
  console.log('TotalExpense:', json.totalExpense);
  console.log('Error:', json.error);
  if (json.venueSalesDetails) {
    console.log('Venues count:', json.venueSalesDetails.length);
  }
}
test().catch(console.error);
