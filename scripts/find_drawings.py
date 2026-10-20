import re
import json

with open('scripts/sheet_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Look for embedded objects or drawings
drawings = re.findall(r'\"embeddedObjects\":\[.*?\]', html)
print(f"embeddedObjects blocks: {len(drawings)}")

# Find any drive file links or image links
drive_links = re.findall(r'https://drive\.google\.com/file/d/([-\w]+)', html)
print(f"Drive file links: {len(drive_links)}")
for dl in set(drive_links):
    print("  Drive file:", dl)

# Search for any cell containing URL
urls_in_cells = re.findall(r'https?://[^\s"\'\\<>]+', html)
photo_urls = [u for u in urls_in_cells if any(k in u.lower() for k in ['photo', 'drive', 'image', 'googleusercontent'])]
print(f"Photo-like URLs in HTML: {len(photo_urls)}")
for u in set(photo_urls):
    print("  ", u)
