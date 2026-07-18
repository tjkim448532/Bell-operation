import { db } from './src/lib/firebaseAdmin';

async function main() {
  const snapshot = await db.collection('expenses').limit(5).get();
  snapshot.forEach(doc => {
    console.log(doc.id, Object.keys(doc.data()));
    console.log("mapped_term:", doc.data().mapped_term);
    console.log("original_term:", doc.data().original_term);
  });
}
main().catch(console.error);
