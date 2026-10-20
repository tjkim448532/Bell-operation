import json

with open('scripts/extracted_html_rows.json', 'r', encoding='utf-8') as f:
    html_rows = json.load(f)

print(f"Total HTML rows: {len(html_rows)}")

for idx, r in enumerate(html_rows[:25]):
    cells = r['cells']
    texts = [c['text'].replace('\n', ' ') for c in cells[:15]]
    img_cols = [f"Col{i}" for i, c in enumerate(cells) if c['img']]
    print(f"Row {idx:2d} (SheetRow {cells[0]['text'] if cells else ''}): {texts[1:6]} | Imgs in: {img_cols}")
