import { db } from './src/lib/firebaseAdmin';

async function run() {
  const snapshot = await db.collection('revenues').limit(3).get();
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
  process.exit(0);
}
run();
