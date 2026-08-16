const API_KEY = "AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo";
const PROJECT_ID = "bell-operation";

async function queryFirestoreRest() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
  
  const body = {
    structuredQuery: {
      from: [{ collectionId: "expenses" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "month" },
          op: "EQUAL",
          value: { stringValue: "2026-07" }
        }
      },
      limit: 100
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  console.log(`Firestore REST returned ${data.length} docs for month: '2026-07'`);
  if (data.length > 0 && data[0].document) {
    const fields = data[0].document.fields;
    console.log('Sample doc:', JSON.stringify(fields, null, 2));
  }
}

queryFirestoreRest();
