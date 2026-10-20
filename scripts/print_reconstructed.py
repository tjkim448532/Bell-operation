import json

with open('scripts/reconstructed_spots.json', 'r', encoding='utf-8') as f:
    spots = json.load(f)

print(f"{'ID':8s} | {'SheetRow':8s} | {'Zone':15s} | {'Spot Name':28s} | {'Front Img':10s} | {'Rear Img':10s}")
print("-" * 90)

for s in spots:
    f_has = "YES" if s['spotImageUrl'] else "NO"
    r_has = "YES" if s['rearImageUrl'] else "NO"
    print(f"{s['spotId']:8s} | {s['sheetRow']:8s} | {s['zoneName'][:14]:15s} | {s['spotName'][:26]:28s} | {f_has:10s} | {r_has:10s}")
