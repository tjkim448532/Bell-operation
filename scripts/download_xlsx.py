import urllib.request
import os

url = 'https://docs.google.com/spreadsheets/d/1soTphMOSR5np1V-3ln7pLXv9JOg_W3tJ6dfEvXKffvc/export?format=xlsx'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

print("Downloading XLSX...")
try:
    with urllib.request.urlopen(req, timeout=30) as resp, open('sheet_data.xlsx', 'wb') as f:
        data = resp.read()
        f.write(data)
    size_mb = os.path.getsize('sheet_data.xlsx') / (1024 * 1024)
    print(f"Downloaded sheet_data.xlsx: {size_mb:.2f} MB")
except Exception as e:
    print(f"Error downloading: {e}")
