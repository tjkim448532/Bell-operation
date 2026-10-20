import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { INITIAL_SPOTS, INITIAL_RESERVATIONS } from './seed_data_export.js';

const firebaseConfig = {
  apiKey: "AIzaSyC3cAL9Qr3ke0pVsMENWQNp75OLFjECpxo",
  authDomain: "bell-operation.firebaseapp.com",
  projectId: "bell-operation",
  storageBucket: "bell-operation.firebasestorage.app",
  messagingSenderId: "593133920835",
  appId: "1:593133920835:web:61f25b39170b2f62ce6af6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log(`Seeding ${INITIAL_SPOTS.length} spots and ${INITIAL_RESERVATIONS.length} reservations to Firestore...`);
  
  for (const s of INITIAL_SPOTS) {
    await setDoc(doc(db, 'ad_spots', s.spotId), s);
    console.log(`  [Spot] ${s.spotId}: ${s.zoneName} · ${s.spotName}`);
  }

  for (const r of INITIAL_RESERVATIONS) {
    await setDoc(doc(db, 'ad_reservations', r.reservationId), r);
    console.log(`  [Reservation] ${r.reservationId}: ${r.title}`);
  }

  console.log("Firestore successfully updated with real Belleforet Google Sheet data!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
