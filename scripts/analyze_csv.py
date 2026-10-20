import csv

with open('sheet_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

print(f"Total rows: {len(rows)}")
header = rows[0]
print(f"Header ({len(header)} cols): {header}")

for i, row in enumerate(rows[1:], start=1):
    if any(cell.strip() for cell in row):
        print(f"Row {i:2d}: {row[:10]}")
