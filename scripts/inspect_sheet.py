import urllib.request
import re
import json

url = 'https://docs.google.com/spreadsheets/d/1soTphMOSR5np1V-3ln7pLXv9JOg_W3tJ6dfEvXKffvc/edit?usp=sharing'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

print('HTML length:', len(html))

# Find sheet names and gids
# Pattern in bootstrap data or sheet tabs
matches = re.findall(r'(\d+),\[\"([^\"]+)\"', html)
print('Matches 1:', matches[:10])

# Look for sheet metadata
gids = re.findall(r'\"gid\":(\d+)', html)
names = re.findall(r'\"name\":\"([^\"]+)\"', html)
print('gids:', set(gids))
print('names:', names[:20])

# Look for waza sheet data
sheets_meta = re.findall(r'\[(\d+),\"([^\"]+)\",\d+', html)
print('sheets_meta:', sheets_meta[:10])
