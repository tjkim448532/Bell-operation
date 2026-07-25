import { db } from '../lib/firebaseAdmin';

const checkFirebase = async () => {
    try {
        console.log('Checking team_mappings...');
        const mappingsSnapshot = await db.collection('team_mappings').get();
        let found = false;
        mappingsSnapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            if (doc.id.includes('주차') || (data.team_name && data.team_name.includes('주차')) || (data.facility_name && data.facility_name.includes('주차'))) {
                console.log(`[team_mappings] ID: ${doc.id} => `, data);
                found = true;
            }
        });
        if (!found) console.log('Not found in team_mappings.');
        
        console.log('Checking macro_mappings...');
        const macroSnapshot = await db.collection('macro_mappings').get();
        found = false;
        macroSnapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            if (doc.id.includes('주차') || (data.part_name && data.part_name.includes('주차')) || (data.team_name && data.team_name.includes('주차'))) {
                console.log(`[macro_mappings] ID: ${doc.id} => `, data);
                found = true;
            }
        });
        if (!found) console.log('Not found in macro_mappings.');

    } catch(e) {
        console.error(e);
    }
};

checkFirebase();
