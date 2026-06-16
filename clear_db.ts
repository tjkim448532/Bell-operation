import { db } from './src/lib/firebaseAdmin';

async function clearCollection(collectionName: string) {
  const snapshot = await db.collection(collectionName).get();
  
  if (snapshot.empty) {
    console.log(`No documents found in ${collectionName}.`);
    return;
  }

  console.log(`Deleting ${snapshot.size} documents from ${collectionName}...`);
  
  const chunks = [];
  let currentChunk: any[] = [];
  
  snapshot.docs.forEach((doc: any) => {
    currentChunk.push(doc);
    if (currentChunk.length === 500) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  });
  if (currentChunk.length > 0) chunks.push(currentChunk);
  
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();
  }
  
  console.log(`Successfully deleted all documents from ${collectionName}.`);
}

async function main() {
  try {
    console.log('Starting database cleanup...');
    await clearCollection('revenues');
    await clearCollection('expenses');
    console.log('Cleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

main();
