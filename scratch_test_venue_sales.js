async function testVenueSales() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const matrixUrl = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=2026-07-01&endDate=2026-07-31`;
  const mRes = await fetch(matrixUrl, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const mJson = await mRes.json();
  const matrixData = mJson.data || [];

  const fgUrl = `${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`;
  const fgRes = await fetch(fgUrl, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const fgJson = await fgRes.json();
  const allVenues = fgJson.data?.venues || [];

  const isLeisure = (v) => {
    const t = String(v.teamName || '').trim();
    const c = String(v.categoryCode || '').trim();
    return t === '레저본부' || c === 'TICKET';
  };

  const v6Venues = allVenues.filter(isLeisure).map(v => ({
    facilityName: v.venueName || v.facilityName,
    venueName: v.venueName || v.facilityName,
    teamName: v.teamName || '레저본부',
    partName: v.partName || '미분류',
    categoryCode: v.categoryCode || 'TICKET'
  }));

  const rawMatrixRows = matrixData.filter(r => !r.isSubtotal && !r.isGrandTotal);

  console.log('=== Venue Sales for July (2026-07) ===');
  const groupSums = {};

  v6Venues.forEach(venue => {
    const vName = venue.venueName || venue.facilityName;
    const group = venue.partName || venue.teamName || '미분류';

    let amount = 0;
    const matches = rawMatrixRows.filter(m => {
      const mShop = String(m.shopName || '').trim();
      const mFac = String(m.facilityName || '').trim();
      if (mShop === vName || mFac === vName) return true;
      if (vName === '놀이동산' && mShop.includes('놀이동산')) return true;
      return false;
    });

    if (matches.length > 0) {
      amount = matches.reduce((sum, m) => {
        const val = typeof m.mtdActual === 'string' ? parseFloat(m.mtdActual.replace(/,/g, '')) : Number(m.mtdActual || m.todayActual || 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
    }

    groupSums[group] = (groupSums[group] || 0) + amount;
    console.log(`[그룹: ${group}] ${vName}: ${amount.toLocaleString()} 원 (${matches.length} matches)`);
  });

  console.log('\n=== Group Sums ===');
  console.log(groupSums);
}

testVenueSales();
