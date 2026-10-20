import urllib.request
import re

url = 'https://docs.google.com/spreadsheets/d/1soTphMOSR5np1V-3ln7pLXv9JOg_W3tJ6dfEvXKffvc/edit'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

# Search for gid
gids = set(re.findall(r'gid[=:](\d+)', html) + re.findall(r'"gid":(\d+)', html) + re.findall(r'#gid=(\d+)', html))
print('GIDs found:', gids)

for g in gids:
    export_url = f'https://docs.google.com/spreadsheets/d/1soTphMOSR5np1V-3ln7pLXv9JOg_W3tJ6dfEvXKffvc/export?format=csv&gid={g}'
    try:
        content = urllib.request.urlopen(urllib.request.Request(export_url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
        lines = content.splitlines()
        print(f"GID {g}: {len(lines)} lines. Header: {lines[0] if lines else 'empty'}")
        with open(f"scripts/sheet_gid_{g}.csv", "w", encoding="utf-8") as f:
            f.write(content)
    except Exception as e:
        print(f"Error fetching gid {g}: {e}")
