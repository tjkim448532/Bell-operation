import re

with open('scripts/sheet_page.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Search for any https links
links = re.findall(r'https?://[^\s"\'\\<>]+', content)
print(f"Total links: {len(links)}")

img_links = [l for l in links if any(ext in l.lower() for ext in ['.png', '.jpg', '.jpeg', '.webp', 'googleusercontent', 'drive'])]
print(f"Img links: {len(img_links)}")
for l in list(set(img_links))[:30]:
    print("  ", l[:120])
