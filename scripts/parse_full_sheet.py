import csv
import json

with open('sheet_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

header = rows[0]
print("Columns:", header)

data_rows = []
for idx, r in enumerate(rows[1:], start=1):
    category = r[0].strip() if len(r) > 0 else ""
    place = r[1].strip() if len(r) > 1 else ""
    media = r[2].strip() if len(r) > 2 else ""
    spec = r[3].strip() if len(r) > 3 else ""
    qty = r[4].strip() if len(r) > 4 else ""
    manager = r[5].strip() if len(r) > 5 else ""
    front_img = r[6].strip() if len(r) > 6 else ""
    rear_img = r[7].strip() if len(r) > 7 else ""
    status = r[8].strip() if len(r) > 8 else ""
    traffic = r[9].strip() if len(r) > 9 else ""
    last_date = r[11].strip() if len(r) > 11 else ""
    comment = r[12].strip() if len(r) > 12 else ""
    
    # Event columns (from col 13 to end)
    events = {}
    for col_idx in range(13, len(header)):
        if col_idx < len(r):
            events[header[col_idx]] = r[col_idx].strip()

    if place or media or spec or status:
        data_rows.append({
            "row_index": idx,
            "category": category,
            "place": place,
            "media": media,
            "spec": spec,
            "qty": qty,
            "manager": manager,
            "front_img": front_img,
            "rear_img": rear_img,
            "status": status,
            "traffic": traffic,
            "last_date": last_date,
            "comment": comment,
            "events": events
        })

print(f"Total valid data rows: {len(data_rows)}")
with open('scripts/parsed_sheet_full.json', 'w', encoding='utf-8') as f:
    json.dump(data_rows, f, ensure_ascii=False, indent=2)

print("Saved to scripts/parsed_sheet_full.json")
