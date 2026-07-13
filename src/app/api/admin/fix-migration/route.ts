import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snap = await db.collection('team_mappings').where('teamName', '==', '외주').get();
    const batch = db.batch();
    let count = 0;
    
    snap.forEach(doc => {
      batch.update(doc.ref, { teamName: '외주_놀이공원' });
      count++;
    });
    
    await batch.commit();

    const customDoc = await db.collection('settings').doc('customTeams').get();
    if(customDoc.exists) {
      const teams = customDoc.data()?.teams || [];
      const newTeams = teams.filter((t: string) => t !== '놀이동산');
      if (teams.length !== newTeams.length) {
        await customDoc.ref.update({ teams: newTeams });
      }
    }
    
    return NextResponse.json({ success: true, migrated: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
