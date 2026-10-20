import json
import re

with open('src/data/seedData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract spots
m = re.search(r'export const INITIAL_SPOTS: AdSpot\[\] = (\[.*?\]);', content, re.DOTALL)
if m:
    spots = json.loads(m.group(1))
    print(f"Total spots in seedData.ts: {len(spots)}")
    
    unsplash_count = 0
    sheets_count = 0
    other_count = 0
    for s in spots:
        url = s.get('spotImageUrl', '')
        rear = s.get('rearImageUrl', '')
        if 'unsplash' in url:
            unsplash_count += 1
        elif 'docs.google.com' in url:
            sheets_count += 1
        else:
            other_count += 1
            
    print(f"Spots with unsplash: {unsplash_count}")
    print(f"Spots with docs.google.com: {sheets_count}")
    print(f"Spots with other: {other_count}")
    
    # Print first 15 spots:
    print("\n--- First 15 spots ---")
    for s in spots[:15]:
        print(f"{s['spotId']} | {s['zoneName']} | {s['spotName']} | Img: {s['spotImageUrl'][:65]}... | Rear: {bool(s['rearImageUrl'])}")
else:
    print("Could not find INITIAL_SPOTS in seedData.ts")
