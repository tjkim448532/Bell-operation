import urllib.request
import re
import json

url = 'https://docs.google.com/spreadsheets/d/1soTphMOSR5np1V-3ln7pLXv9JOg_W3tJ6dfEvXKffvc/edit?usp=sharing'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
html = urllib.request.urlopen(req).read().decode('utf-8')

# Save html for deep inspection
with open('scripts/sheet_page.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved sheet_page.html, size:", len(html))

# Search for googleusercontent URLs
urls = re.findall(r'https://[a-zA-Z0-9\-\.]+\.googleusercontent\.com/[^\s"\'\\<>&]+', html)
print(f"googleusercontent URLs ({len(urls)}):")
for u in set(urls):
    print("  ", u)

# Search for drive.google.com links
drive_urls = re.findall(r'https://drive\.google\.com/[^\s"\'\\<>&]+', html)
print(f"drive URLs ({len(drive_urls)}):")
for u in set(drive_urls):
    print("  ", u)
