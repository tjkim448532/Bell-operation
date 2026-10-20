import json
import os
import urllib.request
import time

with open('scripts/reconstructed_spots.json', 'r', encoding='utf-8') as f:
    spots = json.load(f)

with open('scripts/reconstructed_reservations.json', 'r', encoding='utf-8') as f:
    reservations = json.load(f)

os.makedirs('public/images/spots', exist_ok=True)
os.makedirs('public/images/reservations', exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

print(f"Downloading images for {len(spots)} spots...")

downloaded_spots = 0
failed_spots = 0

for s in spots:
    spot_id = s['spotId']
    
    # 1. Front image
    front_url = s['spotImageUrl']
    if front_url and 'docs.google.com' in front_url:
        front_filename = f"spot_{spot_id.lower()}_front.jpg"
        front_path = os.path.join('public/images/spots', front_filename)
        
        try:
            req = urllib.request.Request(front_url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                with open(front_path, 'wb') as img_f:
                    img_f.write(data)
            s['spotImageUrl'] = f"/images/spots/{front_filename}"
            downloaded_spots += 1
        except Exception as e:
            print(f"Failed front for {spot_id}: {e}")
            failed_spots += 1
    elif not front_url:
        # Default placeholder for online/app channels
        s['spotImageUrl'] = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
            
    # 2. Rear image
    rear_url = s['rearImageUrl']
    if rear_url and 'docs.google.com' in rear_url:
        rear_filename = f"spot_{spot_id.lower()}_rear.jpg"
        rear_path = os.path.join('public/images/spots', rear_filename)
        
        try:
            req = urllib.request.Request(rear_url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                with open(rear_path, 'wb') as img_f:
                    img_f.write(data)
            s['rearImageUrl'] = f"/images/spots/{rear_filename}"
            downloaded_spots += 1
        except Exception as e:
            print(f"Failed rear for {spot_id}: {e}")
            failed_spots += 1

print(f"Spot images downloaded: {downloaded_spots}, failed: {failed_spots}")

# Now reservations
print(f"\nDownloading images for {len(reservations)} reservations...")
downloaded_res = 0
failed_res = 0

for idx, r in enumerate(reservations, start=1):
    res_id = r['reservationId']
    img_url = r['draftImageUrl']
    
    if img_url and 'docs.google.com' in img_url:
        res_filename = f"res_{res_id.lower()}.jpg"
        res_path = os.path.join('public/images/reservations', res_filename)
        
        try:
            req = urllib.request.Request(img_url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                with open(res_path, 'wb') as img_f:
                    img_f.write(data)
            r['draftImageUrl'] = f"/images/reservations/{res_filename}"
            r['installedImageUrl'] = f"/images/reservations/{res_filename}"
            downloaded_res += 1
        except Exception as e:
            print(f"Failed res {res_id}: {e}")
            failed_res += 1
    elif not img_url:
        r['draftImageUrl'] = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80'
        r['installedImageUrl'] = None

print(f"Reservation images downloaded: {downloaded_res}, failed: {failed_res}")

with open('scripts/local_spots.json', 'w', encoding='utf-8') as f:
    json.dump(spots, f, ensure_ascii=False, indent=2)

with open('scripts/local_reservations.json', 'w', encoding='utf-8') as f:
    json.dump(reservations, f, ensure_ascii=False, indent=2)

print("Saved scripts/local_spots.json and scripts/local_reservations.json successfully!")
