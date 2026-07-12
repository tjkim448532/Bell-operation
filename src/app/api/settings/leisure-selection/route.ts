import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const docRef = db.collection('settings').doc('leisureSelection');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      // Default fallback
      return NextResponse.json({ success: true, selectedTeams: [] });
    }
    
    const data = doc.data() || {};
    const selectedTeams = data.selectedTeams || [];
    
    return NextResponse.json({ success: true, selectedTeams });
  } catch (error) {
    console.error('Failed to get leisure selection:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { selectedTeams } = await request.json();
    
    if (!Array.isArray(selectedTeams)) {
      return NextResponse.json({ success: false, error: 'Invalid selectedTeams format' }, { status: 400 });
    }

    const docRef = db.collection('settings').doc('leisureSelection');
    await docRef.set({ selectedTeams }, { merge: true });

    return NextResponse.json({ success: true, selectedTeams });
  } catch (error) {
    console.error('Failed to save leisure selection:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
