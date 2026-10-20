import json
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

with open('scripts/reconstructed_spots.json', 'r', encoding='utf-8') as f:
    spots = json.load(f)

with open('scripts/reconstructed_reservations.json', 'r', encoding='utf-8') as f:
    reservations = json.load(f)

os.makedirs('public/images/spots', exist_ok=True)
os.makedirs('public/images/reservations', exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def download_file(url, target_path):
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        return True
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            if len(data) < 100:
                return False
            with open(target_path, 'wb') as f:
                f.write(data)
        return True
    except Exception as e:
        print(f"Error downloading {target_path}: {e}")
        return False

tasks = []

# Prepare spots download tasks
for s in spots:
    spot_id = s['spotId']
    
    front_url = s['spotImageUrl']
    if front_url and 'docs.google.com' in front_url:
        front_filename = f"spot_{spot_id.lower()}_front.jpg"
        front_path = os.path.join('public/images/spots', front_filename)
        tasks.append((front_url, front_path, s, 'spotImageUrl', f"/images/spots/{front_filename}"))
    elif not front_url:
        s['spotImageUrl'] = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
        
    rear_url = s['rearImageUrl']
    if rear_url and 'docs.google.com' in rear_url:
        rear_filename = f"spot_{spot_id.lower()}_rear.jpg"
        rear_path = os.path.join('public/images/spots', rear_filename)
        tasks.append((rear_url, rear_path, s, 'rearImageUrl', f"/images/spots/{rear_filename}"))

# Prepare reservations download tasks
for r in reservations:
    res_id = r['reservationId']
    img_url = r['draftImageUrl']
    if img_url and 'docs.google.com' in img_url:
        res_filename = f"res_{res_id.lower()}.jpg"
        res_path = os.path.join('public/images/reservations', res_filename)
        tasks.append((img_url, res_path, r, 'bothImages', f"/images/reservations/{res_filename}"))
    elif not img_url:
        r['draftImageUrl'] = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80'
        r['installedImageUrl'] = None

print(f"Total images to download in parallel: {len(tasks)}")

with ThreadPoolExecutor(max_workers=16) as executor:
    future_to_task = {
        executor.submit(download_file, t[0], t[1]): t for t in tasks
    }
    
    success = 0
    fail = 0
    for future in as_completed(future_to_task):
        url, path, obj, field_key, local_url = future_to_task[future]
        ok = future.result()
        if ok:
            success += 1
            if field_key == 'bothImages':
                obj['draftImageUrl'] = local_url
                obj['installedImageUrl'] = local_url
            else:
                obj[field_key] = local_url
        else:
            fail += 1

print(f"Download complete: {success} succeeded, {fail} failed.")

with open('scripts/local_spots.json', 'w', encoding='utf-8') as f:
    json.dump(spots, f, ensure_ascii=False, indent=2)

with open('scripts/local_reservations.json', 'w', encoding='utf-8') as f:
    json.dump(reservations, f, ensure_ascii=False, indent=2)

print("Saved updated local_spots.json and local_reservations.json")
