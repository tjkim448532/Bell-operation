import json
import re

with open('scripts/extracted_html_rows.json', 'r', encoding='utf-8') as f:
    html_rows = json.load(f)

# Analyze rows
# A "Master Spot" row is a row where:
# - col 2 (항목/장소) is non-empty, OR
# - col 0 (Sheet Row) is present AND has media/specs
# Sub-rows are rows without col 2, which belong to the preceding Master Spot!

master_spots = []
current_spot = None
current_category = "현장 시설"

for idx in range(1, len(html_rows)):
    r = html_rows[idx]
    cells = r['cells']
    if not cells:
        continue
        
    sheet_row = cells[0]['text'].strip() if len(cells) > 0 else ''
    cat = cells[1]['text'].strip() if len(cells) > 1 else ''
    place = cells[2]['text'].strip() if len(cells) > 2 else ''
    media = cells[4]['text'].strip() if len(cells) > 4 else ''
    spec = cells[5]['text'].strip() if len(cells) > 5 else ''
    qty = cells[6]['text'].strip() if len(cells) > 6 else ''
    manager = cells[7]['text'].strip() if len(cells) > 7 else ''
    front_img = cells[8]['img'].strip() if len(cells) > 8 else ''
    rear_img = cells[9]['img'].strip() if len(cells) > 9 else ''
    banner_status = cells[10]['text'].strip() if len(cells) > 10 else ''
    traffic = cells[11]['text'].strip() if len(cells) > 11 else ''
    check_date = cells[13]['text'].strip() if len(cells) > 13 else ''
    comment = cells[14]['text'].strip() if len(cells) > 14 else ''
    
    # Check if this is a master spot row
    if place:
        if cat:
            current_category = cat
            
        current_spot = {
            "html_index": idx,
            "sheet_row": sheet_row,
            "category": current_category,
            "place": place,
            "media": media,
            "spec": spec,
            "qty": qty,
            "manager": manager,
            "front_img": front_img,
            "rear_img": rear_img,
            "banner_status": banner_status,
            "traffic": traffic,
            "check_date": check_date,
            "comment": comment,
            "sub_banners": []
        }
        master_spots.append(current_spot)
    elif current_spot:
        # This is a sub-row belonging to current_spot!
        # Check if there is an image or banner text
        sub_imgs = [c['img'].strip() for c in cells if c['img'].strip()]
        sub_texts = [c['text'].strip() for c in cells if c['text'].strip() and c['text'].strip() not in (sheet_row, '상', '중', '하', 'TRUE', 'FALSE')]
        
        if sub_imgs or sub_texts:
            current_spot['sub_banners'].append({
                "html_index": idx,
                "sheet_row": sheet_row,
                "images": sub_imgs,
                "texts": sub_texts,
                "comment": comment
            })

print(f"Total Master Spots identified: {len(master_spots)}")
for i, s in enumerate(master_spots, start=1):
    f_stat = "FRONT" if s['front_img'] else "NO_FRONT"
    r_stat = "REAR" if s['rear_img'] else "NO_REAR"
    sub_count = len(s['sub_banners'])
    sub_imgs_count = sum(len(sb['images']) for sb in s['sub_banners'])
    print(f"{i:2d}. Row {s['sheet_row']:3s} | [{s['category']}] {s['place']} ({s['media']}, {s['spec']}) | {f_stat}, {r_stat} | Sub-banners: {sub_count} (imgs: {sub_imgs_count})")
