import json
import re
import os
import urllib.request

with open('scripts/extracted_html_rows.json', 'r', encoding='utf-8') as f:
    html_rows = json.load(f)

# Helper to parse dimensions mm
def parse_dimensions(spec_str):
    spec = spec_str.replace(',', '').replace(' ', '')
    m = re.search(r'(\d+)[*xX](\d+)', spec)
    if m:
        return int(m.group(1)), int(m.group(2))
    if 'A4' in spec.upper():
        return 210, 297
    if 'A3' in spec.upper():
        return 297, 420
    if 'A1' in spec.upper():
        return 594, 841
    if 'A0' in spec.upper():
        return 841, 1189
    return 600, 1800

# Helper to determine mediaType
def determine_media_type(media_str):
    m = media_str.upper()
    if '현수막' in m or '깃발' in m or 'PLACARD' in m:
        return 'PLACARD'
    if '포맥스' in m or 'POP' in m or '포스터' in m or 'A3' in m or 'A4' in m or '코팅' in m:
        return 'POSTER'
    if '모니터' in m or 'TV' in m or '키오스크' in m or 'DID' in m or '웹' in m or '이미지' in m:
        return 'DIGITAL'
    return 'BANNER'

# Helper for zone classification
def determine_zone(category, place):
    p = place.lower()
    c = category.lower()
    if '정문' in p or '로터리' in p or '몽골텐트' in p:
        return '정문 및 진입로'
    if '웰컴' in p:
        return '웰컴센터'
    if '투썸' in p:
        return '투썸 및 광장'
    if '콘도' in p:
        return '콘도미니엄'
    if '모토' in p or '아레나' in p:
        return '모토아레나'
    if '원더풀' in p:
        return '원더풀 & 렌탈샵'
    if '썸머' in p or '슬라이드' in p:
        return '썸머랜드'
    if '마리나' in p:
        return '마리나클럽'
    if '미디어' in p or '벨포레홀' in p:
        return '미디어아트센터 & 벨포레홀'
    if '목장' in p or '얼룩말' in p or '양먹이' in p:
        return '벨포레 목장 & 얼룩말카페'
    if '썰매' in p:
        return '사계절썰매장'
    if '포렛' in p:
        return '그랜드포렛 & 미니포렛'
    if '남도' in p:
        return '남도예담'
    if '디자인' in c or '웹' in c or '배너' in p or '팝업' in p:
        return '디지털 & 공식 웹'
    if '대외' in c or '도청' in p or '군청' in p:
        return '대외 홍보 네트워크'
    return '사내 공용 거점'

# Iterate through HTML rows
spots_list = []
reservations_list = []

current_category = "현장 시설"
spot_idx = 1
res_idx = 1

today_str = "2026-10-20"

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
    
    # Skip header row and footer summary row
    if sheet_row == '1' or '통합 DB 구축' in place:
        continue
        
    # If place is present, this is a distinct Master Spot!
    if place:
        if cat:
            current_category = cat
            
        width_mm, height_mm = parse_dimensions(spec)
        media_type = determine_media_type(media)
        zone_name = determine_zone(current_category, place)
        
        spot_id = f"SPOT-{spot_idx:03d}"
        spot_idx += 1
        
        # Finishing guide
        guides = []
        if qty: guides.append(f"수량: {qty}")
        if spec: guides.append(f"규격: {spec}")
        if manager: guides.append(f"관리포인트: {manager}")
        finishing_guide = " / ".join(guides) if guides else "규격 및 마감 준수"
        
        desc = comment if comment else f"{zone_name} 내 {place} 거점입니다. (통행량: {traffic or '중'})"
        
        spot_obj = {
            "spotId": spot_id,
            "sheetRow": sheet_row,
            "zoneName": zone_name,
            "spotName": f"{place} ({media})" if media else place,
            "rawPlace": place,
            "mediaType": media_type,
            "specWidthMm": width_mm,
            "specHeightMm": height_mm,
            "finishingGuide": finishing_guide,
            "description": desc,
            "spotImageUrl": front_img,
            "rearImageUrl": rear_img if rear_img else None,
            "trafficLevel": traffic if traffic in ['상', '중', '하'] else '중',
            "isActive": not ('폐기완료' in comment or '철거' in comment and '완료' in comment),
            "htmlIndex": idx
        }
        spots_list.append(spot_obj)
        
        # If there's an active banner status installed in this spot
        if banner_status and banner_status != '미노출':
            res_id = f"RES-LIVE-{res_idx:03d}"
            res_idx += 1
            
            res_status = 'INSTALLED'
            if '폐기요청' in comment or '기간만료' in comment:
                res_status = 'EXPIRED_OVERDUE'
            elif '폐기완료' in comment or '철거완료' in comment:
                res_status = 'REMOVED'
                
            reservations_list.append({
                "reservationId": res_id,
                "spotId": spot_id,
                "zoneName": zone_name,
                "spotName": spot_obj["spotName"],
                "mediaType": media_type,
                "specSummary": f"{width_mm:,} × {height_mm:,} mm",
                "requesterName": manager if manager else "운영관리팀",
                "requesterDept": "벨포레 운영팀",
                "title": banner_status.split('\n')[0] if '\n' in banner_status else banner_status[:40],
                "purpose": banner_status.replace('\n', ' / '),
                "startDate": "2026-08-01",
                "endDate": "2026-10-15" if res_status == 'EXPIRED_OVERDUE' else "2026-11-30",
                "draftImageUrl": front_img if front_img else "",
                "installedImageUrl": front_img if front_img else None,
                "status": res_status,
                "rejectReason": None,
                "createdAt": "2026-08-01T09:00:00.000Z",
                "updatedAt": "2026-10-20T09:00:00.000Z"
            })
    else:
        # Check sub-banner row belonging to previous spot
        if spots_list:
            last_spot = spots_list[-1]
            sub_imgs = [c['img'].strip() for c in cells if c['img'].strip()]
            sub_texts = [c['text'].strip() for c in cells if c['text'].strip() and c['text'].strip() not in (sheet_row, '상', '중', '하', 'TRUE', 'FALSE', '미노출')]
            
            if sub_imgs or sub_texts:
                res_id = f"RES-SUB-{res_idx:03d}"
                res_idx += 1
                
                sub_title = sub_texts[0] if sub_texts else f"{last_spot['rawPlace']} 게시물"
                sub_img = sub_imgs[0] if sub_imgs else last_spot['spotImageUrl']
                
                res_status = 'INSTALLED'
                if comment and ('폐기요청' in comment or '기간만료' in comment):
                    res_status = 'EXPIRED_OVERDUE'
                elif comment and ('폐기완료' in comment or '철거완료' in comment):
                    res_status = 'REMOVED'
                    
                reservations_list.append({
                    "reservationId": res_id,
                    "spotId": last_spot['spotId'],
                    "zoneName": last_spot['zoneName'],
                    "spotName": last_spot['spotName'],
                    "mediaType": last_spot['mediaType'],
                    "specSummary": f"{last_spot['specWidthMm']:,} × {last_spot['specHeightMm']:,} mm",
                    "requesterName": last_spot['finishingGuide'].split('관리포인트:')[-1].strip() if '관리포인트:' in last_spot['finishingGuide'] else "운영관리팀",
                    "requesterDept": "벨포레 운영팀",
                    "title": sub_title.split('\n')[0][:40],
                    "purpose": " / ".join(sub_texts) if sub_texts else sub_title,
                    "startDate": "2026-08-15",
                    "endDate": "2026-10-15" if res_status == 'EXPIRED_OVERDUE' else "2026-11-30",
                    "draftImageUrl": sub_img,
                    "installedImageUrl": sub_img if sub_img else None,
                    "status": res_status,
                    "rejectReason": None,
                    "createdAt": "2026-08-15T09:00:00.000Z",
                    "updatedAt": "2026-10-20T09:00:00.000Z"
                })

print(f"Reconstructed {len(spots_list)} Master Spots")
print(f"Reconstructed {len(reservations_list)} Active/Historical Reservations")

with open('scripts/reconstructed_spots.json', 'w', encoding='utf-8') as f:
    json.dump(spots_list, f, ensure_ascii=False, indent=2)

with open('scripts/reconstructed_reservations.json', 'w', encoding='utf-8') as f:
    json.dump(reservations_list, f, ensure_ascii=False, indent=2)

print("Saved to scripts/reconstructed_spots.json and reconstructed_reservations.json")
