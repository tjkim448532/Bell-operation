import json

def generate_seed():
    with open('scripts/local_spots.json', 'r', encoding='utf-8') as f:
        spots = json.load(f)

    with open('scripts/local_reservations.json', 'r', encoding='utf-8') as f:
        reservations = json.load(f)

    # Clean spots fields to match AdSpot interface exactly
    clean_spots = []
    for s in spots:
        clean_spots.append({
            "spotId": s["spotId"],
            "zoneName": s["zoneName"],
            "spotName": s["spotName"],
            "mediaType": s["mediaType"],
            "specWidthMm": s["specWidthMm"],
            "specHeightMm": s["specHeightMm"],
            "finishingGuide": s["finishingGuide"],
            "description": s["description"],
            "spotImageUrl": s["spotImageUrl"],
            "rearImageUrl": s["rearImageUrl"],
            "trafficLevel": s["trafficLevel"],
            "isActive": s["isActive"]
        })

    # Clean reservations fields to match AdReservation interface
    clean_reservations = []
    for r in reservations:
        clean_reservations.append({
            "reservationId": r["reservationId"],
            "spotId": r["spotId"],
            "zoneName": r["zoneName"],
            "spotName": r["spotName"],
            "mediaType": r["mediaType"],
            "specSummary": r["specSummary"],
            "requesterName": r["requesterName"],
            "requesterDept": r["requesterDept"],
            "title": r["title"],
            "purpose": r["purpose"],
            "startDate": r["startDate"],
            "endDate": r["endDate"],
            "draftImageUrl": r["draftImageUrl"],
            "installedImageUrl": r["installedImageUrl"],
            "status": r["status"],
            "rejectReason": r["rejectReason"],
            "createdAt": r["createdAt"],
            "updatedAt": r["updatedAt"]
        })

    spots_json = json.dumps(clean_spots, ensure_ascii=False, indent=2)
    res_json = json.dumps(clean_reservations, ensure_ascii=False, indent=2)

    ts_content = f"""import {{ AdSpot, AdReservation }} from '@/types/adSpot';

// 100% Genuine Belleforet Ad-Spots Master (Extracted cell-by-cell from Google Spreadsheet)
export const INITIAL_SPOTS: AdSpot[] = {spots_json};

// Active and historical reservations mapped directly from spreadsheet banner statuses
export const INITIAL_RESERVATIONS: AdReservation[] = {res_json};
"""

    with open('src/data/seedData.ts', 'w', encoding='utf-8') as f:
        f.write(ts_content)

    print(f"Successfully generated src/data/seedData.ts with {len(clean_spots)} spots and {len(clean_reservations)} reservations!")

if __name__ == '__main__':
    generate_seed()
