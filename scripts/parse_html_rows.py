import re
import json

with open('scripts/sheet_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the main table in HTML
# In Google Sheets HTML export, each row is <tr style="height:..."><th ...>...</th><td ...>...</td></tr>
# Or <tr ...>...</tr>
tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
trs = tr_pattern.findall(html)
print(f"Total <tr> rows found in HTML: {len(trs)}")

rows_data = []
for row_idx, tr in enumerate(trs):
    # Extract all cells
    td_pattern = re.compile(r'<t[dh][^>]*>(.*?)</t[dh]>', re.DOTALL)
    cells = td_pattern.findall(tr)
    
    # Clean text and extract images
    cell_info = []
    for c in cells:
        # Check for img src
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', c)
        img_url = img_match.group(1) if img_match else ""
        
        # Clean html tags
        text = re.sub(r'<[^>]+>', '', c).strip()
        cell_info.append({
            "text": text,
            "img": img_url
        })
    
    if len(cell_info) >= 5:
        rows_data.append({
            "tr_index": row_idx,
            "cells": cell_info
        })

print(f"Parsed {len(rows_data)} rows with cells.")

with open('scripts/extracted_html_rows.json', 'w', encoding='utf-8') as f:
    json.dump(rows_data, f, ensure_ascii=False, indent=2)

print("Saved to scripts/extracted_html_rows.json")
