import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let result = [];
    
    // 1. Remove all '외주' variants from leisureSelection
    const selDoc = await db.collection('settings').doc('leisureSelection').get();
    if (selDoc.exists) {
      let teams = selDoc.data()?.selectedTeams || [];
      const originalLength = teams.length;
      teams = teams.filter((t: string) => !t.includes('외주'));
      if (teams.length !== originalLength) {
        await db.collection('settings').doc('leisureSelection').update({ selectedTeams: teams });
        result.push('Removed 외주 teams from leisureSelection');
      }
    }

    // 2. Change team_mappings '외주' -> '외주 놀이공원'
    const mapSnap = await db.collection('team_mappings').where('teamName', '==', '외주').get();
    const batch1 = db.batch();
    mapSnap.forEach((doc: any) => {
      batch1.update(doc.ref, { teamName: '외주 놀이공원' });
    });
    await batch1.commit();
    result.push(`Updated ${mapSnap.size} team_mappings`);

    // 3. Change expenses '외주' -> '외주 놀이공원'
    const expSnap = await db.collection('expenses').where('team', '==', '외주').get();
    const batch2 = db.batch();
    expSnap.forEach((doc: any) => {
      batch2.update(doc.ref, { team: '외주 놀이공원' });
    });
    await batch2.commit();
    result.push(`Updated ${expSnap.size} expenses`);

    // 4. Change customTeams just in case
    const customDoc = await db.collection('settings').doc('customTeams').get();
    if (customDoc.exists) {
      let cTeams = customDoc.data()?.teams || [];
      if (cTeams.includes('외주')) {
        cTeams = cTeams.filter((t: string) => t !== '외주');
        await db.collection('settings').doc('customTeams').update({ teams: cTeams });
        result.push('Updated customTeams');
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
