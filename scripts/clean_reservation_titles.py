import json
import re

with open('scripts/local_reservations.json', 'r', encoding='utf-8') as f:
    reservations = json.load(f)

for r in reservations:
    title = r['title'].strip()
    purpose = r['purpose'].strip()
    
    # If title is just a date like 20260819 or 20260820
    if re.match(r'^\d{8}$', title) or title in ('상', '중', '하', 'TRUE', 'FALSE', '미노출'):
        # Pick from purpose if possible
        parts = [p.strip() for p in purpose.split('/') if p.strip() and not re.match(r'^\d{8}$', p.strip())]
        if parts:
            r['title'] = parts[0]
        else:
            r['title'] = f"{r['spotName']} 부착 홍보물"
            
    # Clean up multi-item text if merged
    if len(r['title']) > 50:
        r['title'] = r['title'][:48] + '...'

with open('scripts/local_reservations.json', 'w', encoding='utf-8') as f:
    json.dump(reservations, f, ensure_ascii=False, indent=2)

print("Cleaned reservation titles successfully!")
