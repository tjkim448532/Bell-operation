import urllib.request

url = 'https://docs.google.com/sheets-images-rt/AO43MLb2re8rsrL0T_y3-W6b2oEijNwf26TePmWNYjhzOHXOZ16N0JOK_b0ImKfmx71-Xtbn_fvTpmrLc1A8QlWsHiJqzh4dJLWz9f1IKuTam55P3QPwJVGAii2nyn4nAyRLwwFx7wWMMDokmVvq2ZD5Bc79RQwhQTU4ayXhnCaAEw=w407-h941'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req)
data = resp.read()
print("Content-Type:", resp.headers.get('Content-Type'))
print("Downloaded bytes:", len(data))
with open('scripts/sample_test_img.png', 'wb') as f:
    f.write(data)
print("Saved scripts/sample_test_img.png successfully!")
