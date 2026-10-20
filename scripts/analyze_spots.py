import json

with open('scripts/parsed_sheet_full.json', 'r', encoding='utf-8') as f:
    rows = json.load(f)

categories = {}
media_types = {}
spots = []

current_cat = ""
for r in rows:
    cat = r['category'] or current_cat
    if r['category']:
        current_cat = r['category']
    categories[cat] = categories.get(cat, 0) + 1
    
    media = r['media'] or "기타"
    media_types[media] = media_types.get(media, 0) + 1
    
    place = r['place']
    if place:
        spots.append({
            "category": cat,
            "place": place,
            "media": r['media'],
            "spec": r['spec'],
            "qty": r['qty'],
            "status": r['status'],
            "traffic": r['traffic'],
            "comment": r['comment']
        })

print(f"Categories: {categories}")
print(f"Media types: {media_types}")
print(f"Total distinct places/spots: {len(spots)}")

with open('scripts/spots_summary.txt', 'w', encoding='utf-8') as f:
    for idx, s in enumerate(spots, start=1):
        f.write(f"[{idx:2d}] {s['category']} | {s['place']} | {s['media']} | {s['spec']} | Qty:{s['qty']} | Status:{s['status'][:30]} | Traffic:{s['traffic']}\n")

print("Saved spots_summary.txt")
