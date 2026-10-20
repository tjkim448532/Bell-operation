import json
import re

with open('scripts/full_mapped_sheet.json', 'r', encoding='utf-8') as f:
    rows = json.load(f)

# Helper to parse dimensions mm
def parse_dimensions(spec_str):
    spec = spec_str.replace(',', '').replace(' ', '')
    # Check for formats like 5000*600, 5000x600, 5600X1300
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
    if '포맥스' in m or 'POP' in m or '포스터' in m or 'A3' in m or 'A4' in m:
        return 'POSTER'
    if '모니터' in m or 'TV' in m or '키오스크' in m or 'DID' in m or '웹' in m or '이미지' in m:
        return 'DIGITAL'
    return 'BANNER'

# Helper for zone classification
def determine_zone(category, place):
    p = place.lower()
    if '정문' in p or '로터리' in p or '몽골텐트' in p:
        return '정문 및 진입로'
    if '웰컴' in p:
        return '웰컴센터'
    if '투썸' in p:
        return '투썸 및 광장 정류장'
    if '콘도' in p:
        return '콘도미니엄'
    if '모토' in p or '아레나' in p or '카트' in p:
        return '모토아레나'
    if '원더풀' in p or '썸머' in p or '슬라이드' in p:
        return '원더풀 & 썸머랜드'
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
        return '남도예담 식음거리'
    if '디자인' in category or '웹' in category or '배너' in p or '팝업' in p:
        return '디지털 & 공식 웹'
    if '대외' in category or '도청' in p or '군청' in p or 'did' in p:
        return '대외 홍보 네트워크'
    return '사내 공용 거점'

ad_spots = []
ad_reservations = []

current_category = "현장 시설"
spot_code_map = {}
spot_counter = 1
res_counter = 1

today_str = "2026-10-20"

for idx, r in enumerate(rows, start=1):
    cat = r['csv_category'].strip() or current_category
    if r['csv_category'].strip():
        current_category = r['csv_category'].strip()
        
    place = r['csv_place'].strip()
    if not place:
        continue
        
    media = r['csv_media'].strip() or "배너"
    spec = r['csv_spec'].strip()
    qty = r['csv_qty'].strip() or "1개"
    manager = r['csv_manager'].strip()
    front_img = r['front_img'].strip()
    rear_img = r['rear_img'].strip()
    status_raw = r['csv_status'].strip()
    traffic = r['csv_traffic'].strip() or "중"
    inspection = r['csv_inspection'].strip()
    comment = r['csv_comment'].strip()
    
    width_mm, height_mm = parse_dimensions(spec)
    media_type = determine_media_type(media)
    zone_name = determine_zone(cat, place)
    
    spot_id = f"SPOT-{spot_counter:03d}"
    spot_counter += 1
    
    # Finishing guide & description
    finishing_parts = []
    if qty: finishing_parts.append(f"수량: {qty}")
    if spec: finishing_parts.append(f"규격: {spec}")
    if manager: finishing_parts.append(f"관리포인트: {manager}")
    finishing_guide = " / ".join(finishing_parts) if finishing_parts else "규격 및 마감 준수"
    
    description = comment if comment else f"{zone_name} 내 {place} 거점입니다. (통행량: {traffic})"
    
    ad_spots.append({
        "spotId": spot_id,
        "zoneName": zone_name,
        "spotName": f"{place} ({media})",
        "mediaType": media_type,
        "specWidthMm": width_mm,
        "specHeightMm": height_mm,
        "finishingGuide": finishing_guide,
        "description": description,
        "spotImageUrl": front_img if front_img else (rear_img if rear_img else "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80"),
        "rearImageUrl": rear_img if rear_img else None,
        "trafficLevel": traffic if traffic in ['상', '중', '하'] else '중',
        "isActive": not ('폐기완료' in comment or '철거완료' in comment),
    })
    
    # Check if there is an active banner/content installed in this spot
    if status_raw and status_raw != '미노출':
        res_id = f"RES-LIVE-{res_counter:03d}"
        res_counter += 1
        
        # Determine status: if comment says '폐기요청' or '기간만료' -> EXPIRED_OVERDUE, else INSTALLED
        res_status = 'INSTALLED'
        if '폐기요청' in comment or '기간만료' in comment:
            res_status = 'EXPIRED_OVERDUE'
        elif '철거' in comment or '폐기완료' in comment:
            res_status = 'REMOVED'
            
        ad_reservations.append({
            "reservationId": res_id,
            "spotId": spot_id,
            "zoneName": zone_name,
            "spotName": f"{place} ({media})",
            "mediaType": media_type,
            "specSummary": f"{width_mm:,} × {height_mm:,} mm",
            "requesterName": manager if manager else "운영관리팀",
            "requesterDept": "벨포레 운영팀",
            "title": status_raw.splitlines()[0] if status_raw else "운영 홍보물",
            "purpose": status_raw.replace("\n", " / "),
            "startDate": "2026-08-01",
            "endDate": "2026-10-15" if res_status == 'EXPIRED_OVERDUE' else "2026-11-30",
            "draftImageUrl": front_img if front_img else "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",
            "installedImageUrl": front_img if front_img else None,
            "status": res_status,
            "rejectReason": None,
            "createdAt": "2026-08-01T09:00:00.000Z",
            "updatedAt": "2026-10-20T09:00:00.000Z"
        })

print(f"Total Ad Spots parsed from Sheet: {len(ad_spots)}")
print(f"Total Active Reservations parsed from Sheet: {len(ad_reservations)}")

with open('scripts/real_spots_data.json', 'w', encoding='utf-8') as f:
    json.dump(ad_spots, f, ensure_ascii=False, indent=2)

with open('scripts/real_reservations_data.json', 'w', encoding='utf-8') as f:
    json.dump(ad_reservations, f, ensure_ascii=False, indent=2)

print("Saved real_spots_data.json and real_reservations_data.json successfully!")
