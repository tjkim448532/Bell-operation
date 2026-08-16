async function inspectKartAliases() {
  const BACKEND_URL = 'https://belleforet-data.vercel.app';
  const m2mToken = 'belleforet-m2m-secret';

  // 1. Check V6 facility groups and aliases
  const fgRes = await fetch(`${BACKEND_URL}/api/v6/admin/mapping/facility-groups?mode=ALL`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  const fgJson = await fgRes.json();
  const venues = fgJson.data?.venues || [];

  console.log('=== Venues with "카트" or "마운틴" or "루지" ===');
  venues.filter(v => JSON.stringify(v).includes('마운틴') || JSON.stringify(v).includes('카트') || JSON.stringify(v).includes('루지')).forEach(v => {
    console.log(v);
  });

  // 2. Check full raw mapping from /api/v5/admin/mapping/facility-groups?mode=TICKET
  const mapRes = await fetch(`${BACKEND_URL}/api/v5/admin/mapping/facility-groups?mode=TICKET`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  if (mapRes.ok) {
    const mapJson = await mapRes.json();
    console.log('\n=== TICKET Mapping groups and items ===');
    const groups = mapJson.data?.groups || mapJson.groups || [];
    groups.forEach(g => {
      console.log(`Group: ${g.groupName || g.name} (Part: ${g.partName})`);
      (g.items || g.facilities || []).forEach(item => {
        if (JSON.stringify(item).includes('마운틴') || JSON.stringify(item).includes('카트') || JSON.stringify(item).includes('루지')) {
          console.log('  -', item);
        }
      });
    });
  }

  // 3. Check /api/v5/admin/mapping/team
  const teamRes = await fetch(`${BACKEND_URL}/api/v5/admin/mapping/team`, {
    headers: { 'Authorization': `Bearer ${m2mToken}` }
  });
  if (teamRes.ok) {
    const teamJson = await teamRes.json();
    const rows = Array.isArray(teamJson) ? teamJson : (teamJson.data || []);
    console.log('\n=== Raw Team Mapping rows with "마운틴" or "카트" or "루지" ===');
    rows.filter(r => JSON.stringify(r).includes('마운틴') || JSON.stringify(r).includes('카트') || JSON.stringify(r).includes('루지')).forEach(r => {
      console.log(r);
    });
  }
}

inspectKartAliases();
