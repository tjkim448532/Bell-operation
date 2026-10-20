import json
import csv

with open('scripts/extracted_html_rows.json', 'r', encoding='utf-8') as f:
    html_rows = json.load(f)

with open('sheet_data.csv', 'r', encoding='utf-8') as f:
    csv_rows = list(csv.reader(f))

print(f"Total HTML rows: {len(html_rows)}")
print(f"Total CSV rows: {len(csv_rows)}")

print("\n--- HTML rows details (first 30) ---")
for idx in range(1, min(35, len(html_rows))):
    r = html_rows[idx]
    cells = r['cells']
    row_num = cells[0]['text'] if cells else ''
    cat = cells[1]['text'] if len(cells) > 1 else ''
    place = cells[2]['text'] if len(cells) > 2 else ''
    c3 = cells[3]['text'] if len(cells) > 3 else ''
    media = cells[4]['text'] if len(cells) > 4 else ''
    spec = cells[5]['text'] if len(cells) > 5 else ''
    imgs = [(i, c['img']) for i, c in enumerate(cells) if c['img']]
    print(f"HTML #{idx:2d} (Sheet Row {row_num:3s}): place='{place}' | cat='{cat}' | media='{media}' | spec='{spec}' | imgs count={len(imgs)}")
    for col_idx, img_url in imgs:
        print(f"    -> col {col_idx}: {img_url[:75]}...")
