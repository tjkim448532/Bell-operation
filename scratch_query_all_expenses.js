const API_KEY = "AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo";
const PROJECT_ID = "bell-operation";

async function queryAllExpenses() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/expenses?key=${API_KEY}&pageSize=50`;
  const res = await fetch(url);
  const data = await res.json();
  console.log('Expenses list status:', res.status);
  if (data.documents) {
    console.log(`Found ${data.documents.length} sample docs in expenses:`);
    data.documents.slice(0, 5).forEach(doc => {
      const f = doc.fields;
      console.log(` - month: ${f.month?.stringValue}, team: ${f.team?.stringValue}, amount: ${f.amount?.doubleValue || f.amount?.integerValue}, term: ${f.original_term?.stringValue}`);
    });
  } else {
    console.log('Response:', data);
  }
}

queryAllExpenses();
