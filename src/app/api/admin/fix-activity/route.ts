import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const expensesRef = db.collection('expenses');
    
    // Fetch all 엑티비티
    const typoSnapshot = await expensesRef.where('team', '==', '엑티비티').get();
    
    // Fetch all 액티비티
    const correctSnapshot = await expensesRef.where('team', '==', '액티비티').get();
    
    const correctRecords = correctSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let mergedCount = 0;
    let deletedDuplicateCount = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of typoSnapshot.docs) {
      const data = doc.data();
      
      // Safety mechanism: Check if an exact duplicate exists in '액티비티'
      // Identical means: same amount, same date, same description, same assigned_project
      const isDuplicate = correctRecords.some((correctData: any) => {
        return correctData.amount === data.amount &&
               correctData.date === data.date &&
               correctData.description === data.description &&
               correctData.assigned_project === data.assigned_project;
      });

      if (isDuplicate) {
        // If duplicate exists, delete the typo record to prevent duplication
        batch.delete(doc.ref);
        deletedDuplicateCount++;
      } else {
        // If not a duplicate, update it to the correct team name
        batch.update(doc.ref, { team: '액티비티' });
        mergedCount++;
      }
      
      batchCount++;
      
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed safely.',
      mergedCount,
      deletedDuplicateCount
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
