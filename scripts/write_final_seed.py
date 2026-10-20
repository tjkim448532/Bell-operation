import json

with open('scripts/real_spots_data.json', 'r', encoding='utf-8') as f:
    spots = json.load(f)

with open('scripts/real_reservations_data.json', 'r', encoding='utf-8') as f:
    reservations = json.load(f)

ts_content = f"""import {{ AdSpot, AdReservation }} from '@/types/adSpot';

// 100% Genuine Belleforet Ad-Spots Master (Extracted from Google Spreadsheet)
export const INITIAL_SPOTS: AdSpot[] = {json.dumps(spots, ensure_ascii=False, indent=2)};

// 100% Genuine Belleforet Current Active & Historical Reservations
export const INITIAL_RESERVATIONS: AdReservation[] = {json.dumps(reservations, ensure_ascii=False, indent=2)};
"""

with open('src/data/seedData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Generated src/data/seedData.ts: {len(spots)} spots and {len(reservations)} reservations.")
