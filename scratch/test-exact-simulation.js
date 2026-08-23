const fetch = require('node-fetch');

// 1. Simulate exact route.ts
async function simulateLeisureRange() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  const startMonth = '2026-07';
  const endMonth = '2026-07';
  const startDate = '2026-07-01';
  const endDate = '2026-07-31';

  const url = `${BACKEND_URL}/api/v5/dashboard/matrix-weekly?startDate=${startDate}&endDate=${endDate}`;
  const matrixRes = await fetch(url, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const json = await matrixRes.json();
  const data = json.data || [];

  const records = [];

  data.forEach((row, idx) => {
    const val = Number(String(row.todayActual !== undefined ? row.todayActual : (row.rangeActual !== undefined ? row.rangeActual : 0)).replace(/,/g, '')) || 0;
    
    if (row.isGrandTotal) {
      return;
    }
    
    let teamName = String(row.teamName || '').trim();
    const catCode = String(row.categoryCode || '').toUpperCase();
    
    if (catCode === 'TICKET') {
       teamName = '레저본부';
       row.teamName = '레저본부';
       row.categoryName = '레저본부';
       if (row.shopName === '소계') row.shopName = '레저본부 소계';
    }

    if (catCode === 'TICKET' && row.isSubtotal && row.subtotalType === 'category') {
      records.push({
        id: `v5-${startMonth}-leisure-grandtotal-${idx}`,
        team: '총계',
        branchName: '레저본부 총계',
        amount: val || 0,
        date: startMonth + '-01T00:00:00.000Z',
        source: 'v5-api',
        isSubtotal: true,
        isGrandTotal: true
      });
      return;
    }

    const isIndependentCategory = ['MOTO', 'PROMOTION', 'PARKING', 'GOODS', 'UNEARNED'].includes(catCode);
    if (teamName !== '레저본부' && teamName !== '미분류' && !isIndependentCategory) {
      return;
    }

    const partName = String(row.partName || '').trim();
    const shopName = String(row.shopName || '').trim();
    const categoryCode = String(row.categoryCode || '').trim();
    
    let groupName = teamName;
    if (partName && partName !== '미분류' && partName !== '소계') {
      groupName = partName;
    } else if (teamName && teamName !== '미분류') {
      groupName = teamName;
    }

    if (groupName === '목장') {
      groupName = '벨포레 목장';
    }
    teamName = groupName;
    
    if (teamName) {
      const amount = val || 0;
      
      if (row.isSubtotal) {
        records.push({
          id: `v5-${startMonth}-${teamName}-subtotal-${idx}`,
          team: teamName,
          branchName: partName || teamName,
          mappedTerm: partName || teamName,
          description: partName || teamName,
          amount: amount,
          date: startMonth + '-01T00:00:00.000Z',
          source: 'v5-api',
          isSubtotal: true,
          subtotalType: row.subtotalType || 'part',
          categoryCode: row.categoryCode || '',
          categoryName: row.categoryName || ''
        });
      } else if (shopName && amount !== 0) {
        records.push({
          id: `v5-${startMonth}-${shopName}-${idx}`,
          team: teamName,
          branchName: shopName,
          mappedTerm: shopName,
          description: shopName,
          amount: amount,
          date: startMonth + '-01T00:00:00.000Z',
          source: 'v5-api',
          isSubtotal: false,
          subtotalType: row.subtotalType || '',
          categoryCode: row.categoryCode || '',
          categoryName: row.categoryName || ''
        });
      }
    }
  });

  return records;
}

// 2. Simulate exact TeamReport.tsx useMemo
async function simulateTeamReport() {
  const revenues = await simulateLeisureRange();
  const apiTeams = ['벨포레 목장', '미디어아트센터', '디지털지원', '액티비티'];

  const teamRevGroups = {};
  const teamRevs = {};
  let grandTotalRevenue = 0;

  revenues.forEach(rev => {
    const amount = rev.amount || 0;
    if (rev.isGrandTotal) {
      grandTotalRevenue = amount;
      return;
    }

    let t = rev.team || '미분류(기타)';
    if (t === '목장') t = '벨포레 목장';
    if (t === '기타') t = '미분류(기타)';
    if (t === '제외') return;

    if (rev.isSubtotal) {
      if (rev.subtotalType === 'team') {
        teamRevs[t] = amount;
      } else if (rev.subtotalType === 'part') {
        teamRevs[t] = (teamRevs[t] || 0) + amount;
        if (!teamRevGroups[t]) teamRevGroups[t] = {};
        const cat = rev.categoryName || rev.categoryCode || '미분류';
        if (!teamRevGroups[t][cat]) teamRevGroups[t][cat] = { items: [], total: 0 };
        teamRevGroups[t][cat].total += amount;
      }
    } else {
      if (!teamRevGroups[t]) teamRevGroups[t] = {};
      const cat = rev.categoryName || rev.categoryCode || '미분류';
      if (!teamRevGroups[t][cat]) teamRevGroups[t][cat] = { items: [], total: 0 };
      teamRevGroups[t][cat].items.push(rev);
    }
  });

  console.log('teamRevs in component:', teamRevs);

  const sortedTeams = apiTeams.map(team => {
    let teamRevenue = teamRevs[team] || 0;
    if (!teamRevenue && team === '벨포레 목장') teamRevenue = teamRevs['목장'] || 0;
    if (!teamRevenue && team === '목장') teamRevenue = teamRevs['벨포레 목장'] || 0;
    return { team, teamRevenue };
  });

  console.log('sortedTeams in component:', sortedTeams);

  let leisureTotalRevenue = grandTotalRevenue;
  Object.keys(teamRevs).forEach(team => {
    const isIncluded = sortedTeams.some(ft => ft.team === team || (team === '목장' && ft.team === '벨포레 목장') || (team === '벨포레 목장' && ft.team === '목장'));
    if (!isIncluded) {
      leisureTotalRevenue -= (teamRevs[team] || 0);
    }
  });

  if (leisureTotalRevenue <= 0 || leisureTotalRevenue > 1000000000) {
    leisureTotalRevenue = sortedTeams.reduce((sum, t) => sum + (t.teamRevenue || 0), 0);
  }

  console.log('leisureTotalRevenue in component:', leisureTotalRevenue.toLocaleString());
}

simulateTeamReport();
