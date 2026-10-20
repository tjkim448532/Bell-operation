import json

with open('scripts/local_spots.json', 'r', encoding='utf-8') as f:
    spots = json.load(f)

with open('scripts/local_reservations.json', 'r', encoding='utf-8') as f:
    reservations = json.load(f)

# Clean fields
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

clean_res = []
for r in reservations:
    clean_res.append({
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

spots_js = json.dumps(clean_spots, ensure_ascii=False, indent=2)
res_js = json.dumps(clean_res, ensure_ascii=False, indent=2)

with open('scripts/seed_data_export.js', 'w', encoding='utf-8') as f:
    f.write(f"export const INITIAL_SPOTS = {spots_js};\nexport const INITIAL_RESERVATIONS = {res_js};\n")

print("Generated scripts/seed_data_export.js successfully!")
