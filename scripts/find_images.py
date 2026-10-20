import urllib.request
import re
import json

url = 'https://docs.google.com/spreadsheets/d/1soTphMOSR5np1V-3ln7pLXv9JOg_W3tJ6dfEvXKffvc/edit'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
html = urllib.request.urlopen(req).read().decode('utf-8')

image_urls = re.findall(r'https://[^"\'\s<>]+(?:lh3\.googleusercontent\.com|drive\.google\.com|googleusercontent\.com|docs\.google\.com)[^"\'\s<>]*', html)
print(f"Total image URLs found: {len(image_urls)}")
for u in list(set(image_urls))[:15]:
    print("  ", u[:100])

# Check for export html
html_export_url = 'https://docs.google.com/spreadsheets/d/1soTphMOSR5np1V-3ln7pLXv9JOg_W3tJ6dfEvXKffvc/export?format=html'
try:
    exp_html = urllib.request.urlopen(urllib.request.Request(html_export_url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
    with open('scripts/sheet_export.html', 'w', encoding='utf-8') as f:
        f.write(exp_html)
    imgs_in_export = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', exp_html)
    print(f"Images in HTML export: {len(imgs_in_export)}")
    for img in imgs_in_export[:10]:
        print("  HTML img:", img[:120])
except Exception as e:
    print("HTML export error:", e)
