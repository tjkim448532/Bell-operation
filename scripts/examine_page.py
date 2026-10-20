import re

with open('scripts/sheet_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

tables = re.findall(r'<table[^>]*>', html)
print('Tables count:', len(tables))

imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
print('Imgs count:', len(imgs))
print('Unique imgs count:', len(set(imgs)))

for u in list(set(imgs))[:10]:
    print('  IMG:', u[:100])
