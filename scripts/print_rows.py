import csv

with open('sheet_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

with open('scripts/parsed_sheet_utf8.txt', 'w', encoding='utf-8') as out:
    header = rows[0]
    out.write(f"Header ({len(header)} cols): {header}\n\n")

    for i, r in enumerate(rows[1:], start=1):
        if not any(cell.strip() for cell in r):
            continue
        category = r[0].strip() if len(r) > 0 else ""
        place = r[1].strip() if len(r) > 1 else ""
        media = r[2].strip() if len(r) > 2 else ""
        spec = r[3].strip() if len(r) > 3 else ""
        qty = r[4].strip() if len(r) > 4 else ""
        manager = r[5].strip() if len(r) > 5 else ""
        front_img = r[6].strip() if len(r) > 6 else ""
        rear_img = r[7].strip() if len(r) > 7 else ""
        current_status = r[8].strip() if len(r) > 8 else ""
        traffic = r[9].strip() if len(r) > 9 else ""
        last_check = r[11].strip() if len(r) > 11 else ""
        comment = r[12].strip() if len(r) > 12 else ""
        
        out.write(f"[{i:3d}] 분류:{category} | 장소:{place} | 매체:{media} | 규격:{spec} | 수량:{qty} | 사진:{front_img} | 현황:{current_status.replace(chr(10), ' / ')} | 유동인구:{traffic} | 점검일:{last_check} | 코멘트:{comment}\n")
