import re

with open('scripts/sheet_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

matches = [m for m in re.findall(r'https://docs\.google\.com/sheets-images-rt/[^\s"\'<>]+', html) if 'AO43MLbnK11aOXIh' in m]
for m in matches:
    print('Exact URL in HTML:', m)

# Let's test downloading this exact URL
import urllib.request
if matches:
    url = matches[0]
    print("\nAttempting download of:", url)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req) as resp:
            print("Status:", resp.status)
            print("Bytes:", len(resp.read()))
    except Exception as e:
        print("Download error:", e)
