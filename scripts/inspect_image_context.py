import re

with open('scripts/sheet_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find occurrences of sheets-images-rt and inspect the context
matches = [m.start() for m in re.finditer(r'https://docs\.google\.com/sheets-images-rt/', html)]
print(f"Total occurrences of sheets-images-rt: {len(matches)}")

for idx, pos in enumerate(matches[:15]):
    start = max(0, pos - 150)
    end = min(len(html), pos + 300)
    context = html[start:end]
    print(f"\n--- Match {idx + 1} at {pos} ---")
    print(repr(context))
