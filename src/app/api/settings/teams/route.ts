import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const docRef = db.collection('settings').doc('customTeams');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({ success: true, teams: [] });
    }
    
    const data = doc.data() || {};
    const teams = data.teams || [];
    
    return NextResponse.json({ success: true, teams });
  } catch (error) {
    console.error('Failed to get custom teams:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, teamName } = await request.json();
    
    if (!teamName || typeof teamName !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid team name' }, { status: 400 });
    }

    const docRef = db.collection('settings').doc('customTeams');
    const doc = await docRef.get();
    let teams: string[] = [];
    
    if (doc.exists) {
      teams = doc.data()?.teams || [];
    }

    if (action === 'add') {
      if (!teams.includes(teamName)) {
        teams.push(teamName);
      }
    } else if (action === 'remove') {
      teams = teams.filter(t => t !== teamName);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    await docRef.set({ teams }, { merge: true });

    return NextResponse.json({ success: true, teams });
  } catch (error) {
    console.error('Failed to update custom teams:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
