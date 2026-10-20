import json
import csv

# Read csv for text verification
with open('sheet_data.csv', 'r', encoding='utf-8') as f:
    csv_rows = list(csv.reader(f))

csv_header = csv_rows[0]

with open('scripts/extracted_html_rows.json', 'r', encoding='utf-8') as f:
    html_rows = json.load(f)

print(f"CSV header ({len(csv_header)}): {csv_header}")
print(f"HTML rows count: {len(html_rows)}")

# Let's inspect rows 1 to 20
mapped = []
for h_idx, hr in enumerate(html_rows[1:], start=1):
    cells = hr['cells']
    # Filter out empty or th
    imgs = [c['img'] for c in cells if c['img']]
    texts = [c['text'] for c in cells if c['text']]
    
    # Check corresponding csv row
    csv_r = csv_rows[h_idx] if h_idx < len(csv_rows) else []
    
    front_img = ""
    rear_img = ""
    # In table cells, see which cell has img
    for c_idx, c in enumerate(cells):
        if c['img']:
            if not front_img:
                front_img = c['img']
            elif not rear_img:
                rear_img = c['img']
    
    mapped.append({
        "row_num": h_idx,
        "csv_category": csv_r[0] if len(csv_r) > 0 else "",
        "csv_place": csv_r[1] if len(csv_r) > 1 else "",
        "csv_media": csv_r[2] if len(csv_r) > 2 else "",
        "csv_spec": csv_r[3] if len(csv_r) > 3 else "",
        "csv_qty": csv_r[4] if len(csv_r) > 4 else "",
        "csv_manager": csv_r[5] if len(csv_r) > 5 else "",
        "front_img": front_img,
        "rear_img": rear_img,
        "csv_status": csv_r[8] if len(csv_r) > 8 else "",
        "csv_traffic": csv_r[9] if len(csv_r) > 9 else "",
        "csv_inspection": csv_r[11] if len(csv_r) > 11 else "",
        "csv_comment": csv_r[12] if len(csv_r) > 12 else "",
    })

print("\n--- Sample mapped with images ---")
count_with_img = 0
for m in mapped:
    if m['front_img']:
        count_with_img += 1
        if count_with_img <= 15:
            print(f"Row {m['row_num']:2d} | Place: {m['csv_place']} | Media: {m['csv_media']} | Front: {m['front_img'][:60]}... | Rear: {bool(m['rear_img'])}")

print(f"\nTotal rows with real photos: {count_with_img}")

with open('scripts/full_mapped_sheet.json', 'w', encoding='utf-8') as f:
    json.dump(mapped, f, ensure_ascii=False, indent=2)

print("Saved scripts/full_mapped_sheet.json")
