import urllib.request
import re
import csv
import json

url = 'https://docs.google.com/spreadsheets/d/1soTphMOSR5np1V-3ln7pLXv9JOg_W3tJ6dfEvXKffvc/edit'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

# Search for sheet names
tabs = re.findall(r'(\d+),0,"([^"]+)",\d+,\d+,', html)
print('Found tabs:', tabs)

# Also search for "name":"..."
names = re.findall(r'"name":"([^"]+)"', html)
print('Names found:', [n for n in names if len(n) < 30][:20])
