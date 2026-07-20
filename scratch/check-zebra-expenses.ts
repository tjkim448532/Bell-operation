import { db } from './src/lib/firebaseAdmin';

async function run() {
  const snapshot = await db.collection('expenses').get();
  
  let totalZebra = 0;
  let totalZebraWithActivity = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const rawFacilityName = data.branch_name || data.영업장명 || data.dept_name || '미분류';
    
    if (rawFacilityName.includes('얼룩말카페')) {
      totalZebra += data.amount || 0;
      if (rawFacilityName.toLowerCase().includes('activity')) {
        totalZebraWithActivity += data.amount || 0;
        console.log(rawFacilityName, data.amount);
      }
    }
  });
  
  console.log("Total Zebra Expenses:", totalZebra);
  console.log("Total Zebra Expenses with 'activity':", totalZebraWithActivity);
}

run();
