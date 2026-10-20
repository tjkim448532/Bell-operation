import json
import re

with open('scripts/extracted_html_rows.json', 'r', encoding='utf-8') as f:
    html_rows = json.load(f)

# Inspect column headers from HTML row 1
header_cells = html_rows[1]['cells']
print("Headers count:", len(header_cells))
for i, c in enumerate(header_cells):
    print(f"Col {i:2d}: {repr(c['text'])}")

# Now inspect each HTML row, printing the sheet row number and what's in Col 8 (정면) and Col 9 (원면/원경)
print("\n" + "="*80)
print(f"{'HTML#':5s} | {'SheetRow':8s} | {'Category (Col 1)':15s} | {'Place (Col 2)':25s} | {'Col 8 (Front)':15s} | {'Col 9 (Rear)':15s} | {'Other Image Cols'}")
print("="*80)

for idx in range(1, len(html_rows)):
    r = html_rows[idx]
    cells = r['cells']
    if not cells:
        continue
    sheet_row = cells[0]['text'].strip() if len(cells) > 0 else ''
    cat = cells[1]['text'].strip() if len(cells) > 1 else ''
    place = cells[2]['text'].strip() if len(cells) > 2 else ''
    
    col8_img = cells[8]['img'] if len(cells) > 8 else ''
    col9_img = cells[9]['img'] if len(cells) > 9 else ''
    
    other_imgs = [f"col{i}" for i, c in enumerate(cells) if c['img'] and i not in (8, 9)]
    
    has_any = bool(col8_img or col9_img or other_imgs or place)
    if has_any:
        print(f"{idx:5d} | {sheet_row:8s} | {cat[:14]:15s} | {place[:24]:25s} | {'YES' if col8_img else 'no':15s} | {'YES' if col9_img else 'no':15s} | {', '.join(other_imgs)}")
