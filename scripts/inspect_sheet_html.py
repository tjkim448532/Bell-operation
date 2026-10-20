import re

with open('scripts/sheet_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Search for any cell formulas or IMAGE()
formulas = re.findall(r'=IMAGE\([^)]+\)', html, re.IGNORECASE)
print(f"IMAGE() formulas found: {len(formulas)}")
for f in formulas:
    print("  ", f)

# Search for any image file names (.png, .jpg, .jpeg)
filenames = re.findall(r'[\w\-_\.]+\.(?:png|jpg|jpeg|webp)', html, re.IGNORECASE)
print(f"Image filenames found: {len(filenames)}")
print("Sample filenames:", list(set(filenames))[:20])

# Search for Google Drive file IDs
drive_ids = re.findall(r'[-\w]{25,}(?:/view|\?usp=sharing|")', html)
print(f"Potential drive IDs: {len(drive_ids)}")
