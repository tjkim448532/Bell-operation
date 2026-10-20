import json
import codecs

with open('scripts/extracted_html_rows.json', 'r', encoding='utf-8') as f:
    html_rows = json.load(f)

# Write a clean UTF-8 inspection file
with codecs.open('scripts/clean_sheet_inspection.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total HTML rows: {len(html_rows)}\n\n")
    
    for idx, r in enumerate(html_rows):
        cells = r['cells']
        row_id = cells[0]['text'].strip() if cells else ''
        
        # Gather all non-empty texts and images
        cell_desc = []
        for c_idx, c in enumerate(cells):
            t = c['text'].strip().replace('\n', ' / ')
            img = c['img'].strip()
            if t or img:
                img_tag = f" [IMG: {img.split('=')[0][-30:]}]" if img else ""
                cell_desc.append(f"col{c_idx}('{t}'{img_tag})")
                
        out.write(f"HTML#{idx:3d} (Row {row_id:4s}): {' | '.join(cell_desc)}\n")

print("Generated scripts/clean_sheet_inspection.txt")
