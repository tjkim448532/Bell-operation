async function testFixedRevenue() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const res = await fetch(`${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await res.json();
  const matrixData = json.data || [];

  const parseNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const num = Number(String(val).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Active leisure teams (Kanban columns)
  const activeTeams = ['액티비티', '목장', '미디어아트', '놀이동산'];

  // 1. Base Leisure Subtotal (TICKET category)
  const ticketSubtotalRow = matrixData.find(r => 
    String(r.categoryCode || '').toUpperCase() === 'TICKET' && 
    r.isSubtotal === true && 
    (r.partName === '소계' || r.subtotalType === 'category')
  );
  const baseLeisureRevenue = ticketSubtotalRow ? parseNumber(ticketSubtotalRow.mtdActual) : 0;
  console.log(`Base Leisure Subtotal (TICKET): ${baseLeisureRevenue.toLocaleString()} 원 (308,210,562 원)`);

  // 2. Part Subtotals check (Minus Rule)
  let excludedRevenue = 0;
  let addedIndependentRevenue = 0;

  matrixData.forEach(row => {
    const catCode = String(row.categoryCode || '').toUpperCase();
    const isSubtotal = !!row.isSubtotal;
    const subtotalType = row.subtotalType;
    const amount = parseNumber(row.mtdActual);
    const isIndependentCategory = ['MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'UNEARNED'].includes(catCode);

    let team = row.partName || row.teamName || row.categoryName;
    if (isSubtotal && !row.isGrandTotal) {
      if (catCode === 'TICKET' && subtotalType === 'part' && team !== '소계') {
        if (!activeTeams.includes(team)) {
          excludedRevenue += amount;
          console.log(` - Excluded team [${team}]: -${amount.toLocaleString()} 원`);
        }
      } else if (isIndependentCategory) {
        if (activeTeams.includes(team)) {
          addedIndependentRevenue += amount;
          console.log(` + Added independent category [${team}]: +${amount.toLocaleString()} 원`);
        }
      }
    }
  });

  const displayTotalRevenue = baseLeisureRevenue - excludedRevenue + addedIndependentRevenue;
  console.log(`\nFinal Pure Leisure Total Revenue: ${displayTotalRevenue.toLocaleString()} 원`);

  // 3. Check Venue details
  const rawMatrixRows = matrixData.filter(r => !r.isSubtotal && !r.isGrandTotal);
  console.log(`\nRaw Matrix Rows count: ${rawMatrixRows.length}`);
  
  const fgUrl = `${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`;
  const fgRes = await fetch(fgUrl, { headers: { 'Authorization': `Bearer ${m2mToken}` } });
  const fgJson = await fgRes.json();
  const allVenues = fgJson.data?.venues || [];

  const isLeisure = (v) => {
    const t = String(v.teamName || '').trim();
    const c = String(v.categoryCode || '').trim();
    return t === '레저본부' || c === 'TICKET';
  };

  const v6Venues = allVenues.filter(isLeisure).map(v => ({
    venueName: v.venueName || v.facilityName,
    partName: v.partName || '미분류'
  }));

  const venueSalesDetails = [];
  const teamSums = {};

  v6Venues.forEach(v => {
    const vName = v.venueName;
    const group = v.partName;
    if (!activeTeams.includes(group) && group !== '미분류') return;

    let amount = 0;
    const matches = rawMatrixRows.filter(m => {
      const mShop = String(m.shopName || '').trim();
      const mFac = String(m.facilityName || '').trim();
      return mShop === vName || mFac === vName;
    });

    if (matches.length > 0) {
      amount = matches.reduce((sum, m) => sum + parseNumber(m.mtdActual || m.todayActual), 0);
    }

    teamSums[group] = (teamSums[group] || 0) + amount;
    venueSalesDetails.push({ venueName: vName, groupName: group, revenue: amount });
  });

  console.log('\n=== Department Breakdown (1:1 with Backend Subtotals) ===');
  Object.keys(teamSums).forEach(t => {
    console.log(`[${t}]: ${teamSums[t].toLocaleString()} 원`);
  });
}

testFixedRevenue();
